use axum::{
    body::Body,
    http::{header::AUTHORIZATION, Request, StatusCode},
    routing::{delete, get, patch, post, put},
    Router,
};
use chrono::Utc;
use gmc_api::domain::models::User;
use gmc_api::handlers::admin_products;
use gmc_api::state::{create_jwt_token, AppState};
use tower::ServiceExt;
use uuid::Uuid;

async fn setup_products_test_app() -> (Router, AppState, String, Uuid) {
    let jwt_secret = "test_super_secret_jwt_key_surabaya_2026".to_string();
    let state = AppState::new(None, jwt_secret.clone(), "./uploads/test".to_string()).await;

    let admin_id = Uuid::new_v4();
    let admin = User {
        id: admin_id,
        email: "admin@gmc.co.id".to_string(),
        password_hash: "hash".to_string(),
        full_name: "Admin GMC Surabaya".to_string(),
        phone: None,
        role: "admin".to_string(),
        totp_secret: None,
        is_totp_enabled: false,
        recovery_codes: None,
        failed_login_attempts: 0,
        lockout_until: None,
        password_changed_at: None,
        deleted_at: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    {
        let mut store = state.store.write().await;
        store.users.insert(admin_id, admin.clone());
    }

    let admin_token = create_jwt_token(&admin, &jwt_secret, 2).unwrap();

    let router = Router::new()
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
        .route("/api/v1/admin/categories", get(admin_products::list_categories))
        .route("/api/v1/admin/categories", post(admin_products::create_category))
        .route("/api/v1/admin/categories/merge", post(admin_products::merge_categories))
        .route("/api/v1/admin/brands", get(admin_products::list_brands))
        .route("/api/v1/admin/brands", post(admin_products::create_brand))
        .route("/api/v1/admin/brands/merge", post(admin_products::merge_brands))
        .with_state(state.clone());

    (router, state, admin_token, admin_id)
}

#[tokio::test]
async fn test_list_and_search_products() {
    let (app, _state, token, _admin_id) = setup_products_test_app().await;

    let req = Request::builder()
        .uri("/api/v1/admin/products")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["total"].as_u64().unwrap() > 0);
}

#[tokio::test]
async fn test_create_product_and_price_history() {
    let (app, state, token, _admin_id) = setup_products_test_app().await;

    let (brand_id, cat_id) = {
        let store = state.store.read().await;
        (store.brands[0].id, store.categories[0].id)
    };

    let payload = serde_json::json!({
        "name": "Lenovo Yoga Pro 9i 16",
        "slug": "lenovo-yoga-pro-9i-16-test",
        "brand_id": brand_id,
        "category_id": cat_id,
        "segment": "Flagship",
        "is_new": true,
        "is_visible": true,
        "tracked_quantity": 4,
        "min_stock_alert": 2,
        "variants": [
            {
                "sku": "SKU-YOGA-PRO-9I",
                "color_name": "Tidal Teal",
                "price_idr": 31500000,
                "stock_status": "in_stock",
                "tracked_quantity": 4
            }
        ],
        "specs": {
            "cpu": "Intel Core Ultra 9 185H",
            "ram_gb": 32,
            "storage": "1TB NVMe PCIe 4.0",
            "gpu": "NVIDIA GeForce RTX 4070 8GB",
            "screen_size": "16 inch 3.2K Mini-LED 165Hz",
            "os": "Windows 11 Home + OHS 2021",
            "warranty": "3 Tahun Garansi Resmi Lenovo Indonesia"
        }
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/admin/products")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&payload).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let product_id = json["product"]["id"].as_str().unwrap();

    // Now update price to test price history recording
    let update_payload = serde_json::json!({
        "name": "Lenovo Yoga Pro 9i 16",
        "slug": "lenovo-yoga-pro-9i-16-test",
        "brand_id": brand_id,
        "category_id": cat_id,
        "segment": "Flagship",
        "is_new": true,
        "is_visible": true,
        "is_whatsapp_only": false,
        "stock_status": "in_stock",
        "tracked_quantity": 4,
        "min_stock_alert": 2,
        "variants": [
            {
                "sku": "SKU-YOGA-PRO-9I",
                "color_name": "Tidal Teal",
                "price_idr": 29999000, // Price dropped
                "stock_status": "in_stock",
                "tracked_quantity": 4
            }
        ]
    });

    let req = Request::builder()
        .method("PUT")
        .uri(format!("/api/v1/admin/products/{}", product_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&update_payload).unwrap()))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["price_history"].as_array().unwrap().len() >= 2);
    assert_eq!(json["price_history"][0]["new_price_idr"].as_i64().unwrap(), 29999000);
}

#[tokio::test]
async fn test_soft_delete_and_restore_product() {
    let (app, state, token, _admin_id) = setup_products_test_app().await;

    let product_id = {
        let store = state.store.read().await;
        store.products[0].id
    };

    // 1. Soft Delete
    let req = Request::builder()
        .method("DELETE")
        .uri(format!("/api/v1/admin/products/{}", product_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // 2. Check Trash List
    let req = Request::builder()
        .uri("/api/v1/admin/products?in_trash=true")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let has_id = json["products"].as_array().unwrap().iter().any(|p| p["id"].as_str().unwrap() == product_id.to_string());
    assert!(has_id);

    // 3. Restore
    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/products/{}/restore", product_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_duplicate_product() {
    let (app, state, token, _admin_id) = setup_products_test_app().await;

    let product_id = {
        let store = state.store.read().await;
        store.products[0].id
    };

    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/products/{}/duplicate", product_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["product"]["slug"].as_str().unwrap().contains("-copy-"));
    assert!(json["product"]["name"].as_str().unwrap().contains("(Salinan)"));
}

#[tokio::test]
async fn test_data_quality_queue() {
    let (app, _state, token, _admin_id) = setup_products_test_app().await;

    let req = Request::builder()
        .uri("/api/v1/admin/products/data-quality")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let body = axum::body::to_bytes(resp.into_body(), 10_000_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json.get("zero_price_products").is_some());
    assert!(json.get("missing_specs_products").is_some());
    assert!(json.get("low_stock_products").is_some());
}
