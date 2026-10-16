use anyhow::Result;
use axum::{
    http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    routing::{delete, get, patch, post, put},
    Router,
};
use gmc_api::handlers::{
    admin_audit, admin_content, admin_customers, admin_dashboard, admin_import, admin_orders,
    admin_products, admin_reviews, admin_settings, auth, orders, products, settings,
};
use gmc_api::state::AppState;
use std::net::SocketAddr;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[derive(OpenApi)]
#[openapi(
    paths(
        products::list_products,
        products::get_product_by_slug,
        settings::get_public_settings,
        orders::create_order,
        orders::get_order,
        orders::upload_payment_proof,
        auth::login,
        auth::logout,
        auth::get_current_user,
        auth::setup_totp,
        auth::verify_totp,
        auth::change_password,
    ),
    components(
        schemas(
            products::ProductListResponse,
            settings::StoreSettingsResponse,
            orders::CreateOrderRequest,
            orders::CreateOrderItem,
            orders::OrderItemResponseDto,
            orders::OrderResponse,
            auth::LoginRequest,
            auth::AuthResponse,
            auth::UserInfo,
            auth::TotpSetupResponse,
            auth::TotpVerifyRequest,
            auth::ChangePasswordRequest,
        )
    ),
    tags(
        (name = "Products", description = "Product catalog & inventory endpoints"),
        (name = "Orders", description = "Checkout, order tracking & payment proof endpoints"),
        (name = "Settings", description = "Public store configurations & BCA payment info"),
        (name = "Auth", description = "Authentication & session management"),
    ),
    info(
        title = "Global Mandiri Computer (GMC) API",
        version = "1.0.0",
        description = "Production REST API for GMC Surabaya — Retailer Laptop, PC, Apple & Tablet."
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,gmc_api=debug,server=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Global Mandiri Computer (GMC) API server...");

    // 1. Database Connection & Migration Attempt
    let db_url = std::env::var("DATABASE_URL").ok();
    let pool = if let Some(url) = db_url {
        match sqlx::postgres::PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(std::time::Duration::from_secs(3))
            .connect(&url)
            .await
        {
            Ok(p) => {
                tracing::info!("Connected to PostgreSQL database at {}", url);
                // Attempt running migrations
                match sqlx::migrate!("./migrations").run(&p).await {
                    Ok(_) => tracing::info!("Database migrations applied successfully!"),
                    Err(e) => tracing::warn!("Migration notice: {:?}", e),
                }
                Some(p)
            }
            Err(e) => {
                tracing::warn!("PostgreSQL connection unavailable ({}). Falling back to resilient in-memory data store for local dev.", e);
                None
            }
        }
    } else {
        tracing::info!("DATABASE_URL not set. Running in local memory store mode.");
        None
    };

    // 2. Initialize AppState
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "gmc_super_secret_jwt_key_surabaya_2026_change_in_production".to_string());
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads/proofs".to_string());

    let state = AppState::new(pool, jwt_secret, upload_dir).await;

    // 3. CORS Layer (Permit localhost:3000 with credentials for httpOnly cookies)
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|_, _| true)) // Allow all origins including localhost:3000
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT])
        .allow_credentials(true);

    // 4. Router Construction
    let app = Router::new()
        .route("/health", get(|| async { "GMC API is healthy!" }))
        // Public Catalog & Store
        .route("/api/v1/products", get(products::list_products))
        .route("/api/v1/products/:slug", get(products::get_product_by_slug))
        .route("/api/v1/settings", get(settings::get_public_settings))
        .route("/api/v1/orders", post(orders::create_order))
        .route("/api/v1/orders/:order_number", get(orders::get_order))
        .route("/api/v1/orders/:order_number/proof", post(orders::upload_payment_proof))
        // Auth Endpoints
        .route("/api/v1/auth/login", post(auth::login))
        .route("/api/v1/auth/logout", post(auth::logout))
        .route("/api/v1/auth/me", get(auth::get_current_user))
        .route("/api/v1/auth/totp/setup", post(auth::setup_totp))
        .route("/api/v1/auth/totp/verify", post(auth::verify_totp))
        .route("/api/v1/auth/change-password", post(auth::change_password))
        // Admin Protected Routes
        .route("/api/v1/admin/dashboard/overview", get(admin_dashboard::get_dashboard_overview))
        .route("/api/v1/admin/audit-logs", get(admin_audit::list_audit_logs))
        .route("/api/v1/admin/audit", get(admin_audit::list_audit_logs))
        .route("/api/v1/admin/settings/verify-bank-access", post(auth::verify_bank_access))
        // Admin Orders & Verification
        .route("/api/v1/admin/orders", get(admin_orders::list_orders))
        .route("/api/v1/admin/orders/manual", post(admin_orders::create_manual_order))
        .route("/api/v1/admin/orders/export-csv", get(admin_orders::export_orders_csv))
        .route("/api/v1/admin/orders/:id", get(admin_orders::get_order_detail))
        .route("/api/v1/admin/orders/:id/status", patch(admin_orders::update_order_status))
        .route("/api/v1/admin/orders/:id/verify-payment", post(admin_orders::verify_payment))
        .route("/api/v1/admin/orders/:id/notes", patch(admin_orders::update_order_notes))
        .route("/api/v1/admin/orders/:id/proof-file", get(admin_orders::serve_proof_file))
        // Admin Catalog, Inventory & Data Quality
        .route("/api/v1/admin/products", get(admin_products::list_admin_products))
        .route("/api/v1/admin/products", post(admin_products::create_product))
        .route("/api/v1/admin/products/bulk", post(admin_products::bulk_product_action))
        .route("/api/v1/admin/products/data-quality", get(admin_products::get_data_quality_queue))
        .route("/api/v1/admin/products/:id", get(admin_products::get_admin_product_detail))
        .route("/api/v1/admin/products/:id", put(admin_products::update_product))
        .route("/api/v1/admin/products/:id", delete(admin_products::soft_delete_product))
        .route("/api/v1/admin/products/:id/inline", patch(admin_products::inline_update_product))
        .route("/api/v1/admin/products/:id/restore", post(admin_products::restore_product))
        .route("/api/v1/admin/products/:id/duplicate", post(admin_products::duplicate_product))
        // Admin Categories & Brands
        .route("/api/v1/admin/categories", get(admin_products::list_categories))
        .route("/api/v1/admin/categories", post(admin_products::create_category))
        .route("/api/v1/admin/categories/merge", post(admin_products::merge_categories))
        .route("/api/v1/admin/brands", get(admin_products::list_brands))
        .route("/api/v1/admin/brands", post(admin_products::create_brand))
        .route("/api/v1/admin/brands/merge", post(admin_products::merge_brands))
        // Admin Customers
        .route("/api/v1/admin/customers", get(admin_customers::list_customers))
        .route("/api/v1/admin/customers/export-csv", get(admin_customers::export_customers_csv))
        .route("/api/v1/admin/customers/:id", get(admin_customers::get_customer_detail))
        .route("/api/v1/admin/customers/:id/notes", post(admin_customers::add_customer_note))
        .route("/api/v1/admin/customers/:id/tags", post(admin_customers::add_customer_tag))
        .route("/api/v1/admin/customers/:id/tags/:tag", delete(admin_customers::remove_customer_tag))
        // Admin Reviews Moderation
        .route("/api/v1/admin/reviews", get(admin_reviews::list_reviews))
        .route("/api/v1/admin/reviews/bulk", post(admin_reviews::bulk_moderate_reviews))
        .route("/api/v1/admin/reviews/:id", delete(admin_reviews::delete_review))
        .route("/api/v1/admin/reviews/:id/status", patch(admin_reviews::moderate_review))
        .route("/api/v1/admin/reviews/:id/reply", post(admin_reviews::reply_review))
        // Admin Catalog Import
        .route("/api/v1/admin/import/preview", post(admin_import::preview_import))
        .route("/api/v1/admin/import/apply", post(admin_import::apply_import))
        .route("/api/v1/admin/import/history", get(admin_import::list_import_history))
        // Admin Settings & Masked BCA Access
        .route("/api/v1/admin/settings", get(admin_settings::get_admin_settings))
        .route("/api/v1/admin/settings", put(admin_settings::update_admin_settings))
        .route("/api/v1/admin/settings/verify-password", post(admin_settings::verify_admin_password))
        // Admin Content & Static Pages CMS
        .route("/api/v1/admin/content/pages", get(admin_content::list_pages))
        .route("/api/v1/admin/content/pages/:slug", get(admin_content::get_page))
        .route("/api/v1/admin/content/pages/:slug", put(admin_content::update_page))
        .route("/api/v1/admin/content/faqs", get(admin_content::list_faqs))
        .route("/api/v1/admin/content/faqs", post(admin_content::create_faq))
        .route("/api/v1/admin/content/faqs/:id", put(admin_content::update_faq))
        .route("/api/v1/admin/content/faqs/:id", delete(admin_content::delete_faq))
        // System Health
        .route("/api/v1/health", get(|| async { axum::Json(serde_json::json!({ "status": "ok", "service": "gmc-api", "timestamp": chrono::Utc::now() })) }))
        // Real-Time Server-Sent Events (SSE)
        .route("/api/v1/admin/events/sse", get(admin_orders::sse_events))
        .merge(SwaggerUi::new("/docs").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    // Spawn Background Task: Auto-Expiry for Unpaid Orders
    let cron_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let now = chrono::Utc::now();
            let mut expired_orders = Vec::new();

            {
                let mut store = cron_state.store.write().await;
                for order in store.orders.values_mut() {
                    if order.status == "pending_payment" {
                        if let Some(exp) = order.expires_at {
                            if now > exp {
                                order.status = "cancelled".to_string();
                                order.updated_at = now;
                                expired_orders.push((order.id, order.order_number.clone()));
                            }
                        }
                    }
                }

                for (oid, onum) in &expired_orders {
                    store.order_status_history.push(gmc_api::domain::models::OrderStatusHistory {
                        id: uuid::Uuid::new_v4(),
                        order_id: *oid,
                        from_status: Some("pending_payment".to_string()),
                        to_status: "cancelled".to_string(),
                        actor_id: None,
                        actor_name: Some("Sistem Auto-Expiry GMC".to_string()),
                        actor_role: Some("system".to_string()),
                        note: Some("Dibatalkan otomatis karena melewati batas waktu pembayaran 24 jam".to_string()),
                        created_at: now,
                    });
                    tracing::info!("Pesanan {} kadaluarsa dan dibatalkan otomatis oleh sistem", onum);
                }
            }

            for (oid, onum) in expired_orders {
                cron_state.broadcast_event(gmc_api::state::AdminServerEvent {
                    event_type: "order_status_updated".to_string(),
                    order_number: Some(onum),
                    order_id: Some(oid),
                    message: "Pesanan dibatalkan otomatis karena melewati batas waktu pembayaran 24 jam".to_string(),
                    timestamp: chrono::Utc::now(),
                    payload: Some(serde_json::json!({
                        "status": "cancelled",
                    })),
                });
            }
        }
    });

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    let host = std::env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;

    tracing::info!("GMC Server listening on http://{}", addr);
    tracing::info!("OpenAPI Swagger UI available at http://{}:{}/docs", host, port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
