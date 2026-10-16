use axum::{
    body::Body,
    http::{header::AUTHORIZATION, Request, StatusCode},
    routing::{get, patch, post},
    Router,
};
use chrono::Utc;
use gmc_api::domain::models::User;
use gmc_api::handlers::admin_orders;
use gmc_api::state::{create_jwt_token, AppState};
use tower::ServiceExt;
use uuid::Uuid;

async fn setup_orders_test_app() -> (Router, AppState, String, Uuid) {
    let jwt_secret = "test_super_secret_jwt_key_surabaya_2026".to_string();
    let state = AppState::new(None, jwt_secret.clone(), "./uploads/test".to_string()).await;

    let staff_id = Uuid::new_v4();
    let staff = User {
        id: staff_id,
        email: "staff@gmc.co.id".to_string(),
        password_hash: "hash".to_string(),
        full_name: "Staff Kasir GMC".to_string(),
        phone: None,
        role: "staff".to_string(),
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
        store.users.insert(staff_id, staff.clone());
    }

    let staff_token = create_jwt_token(&staff, &jwt_secret, 2).unwrap();

    let router = Router::new()
        .route("/api/v1/admin/orders", get(admin_orders::list_orders))
        .route("/api/v1/admin/orders/manual", post(admin_orders::create_manual_order))
        .route("/api/v1/admin/orders/export-csv", get(admin_orders::export_orders_csv))
        .route("/api/v1/admin/orders/:id", get(admin_orders::get_order_detail))
        .route("/api/v1/admin/orders/:id/status", patch(admin_orders::update_order_status))
        .route("/api/v1/admin/orders/:id/verify-payment", post(admin_orders::verify_payment))
        .route("/api/v1/admin/orders/:id/notes", patch(admin_orders::update_order_notes))
        .route("/api/v1/admin/orders/:id/proof-file", get(admin_orders::serve_proof_file))
        .with_state(state.clone());

    (router, state, staff_token, staff_id)
}

#[tokio::test]
async fn test_list_orders_and_filtering() {
    let (app, _state, token, _staff_id) = setup_orders_test_app().await;

    // 1. List all orders
    let req = Request::builder()
        .uri("/api/v1/admin/orders")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["total"].as_u64().unwrap() >= 5);

    // 2. Filter by status: paid
    let req = Request::builder()
        .uri("/api/v1/admin/orders?status=paid")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    for o in json["orders"].as_array().unwrap() {
        assert_eq!(o["status"].as_str().unwrap(), "paid");
    }

    // 3. Search by customer name: Budi
    let req = Request::builder()
        .uri("/api/v1/admin/orders?search=Budi")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["total"].as_u64().unwrap() >= 1);
    assert_eq!(json["orders"][0]["customer_name"].as_str().unwrap(), "Budi Santoso");
}

#[tokio::test]
async fn test_order_detail_and_whatsapp_templates() {
    let (app, state, token, _staff_id) = setup_orders_test_app().await;

    // Pick an existing order
    let order_id = {
        let store = state.store.read().await;
        *store.orders.keys().next().unwrap()
    };

    let req = Request::builder()
        .uri(format!("/api/v1/admin/orders/{}", order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["order"]["id"].as_str().unwrap(), order_id.to_string());
    assert!(!json["whatsapp_links"]["reminder"].as_str().unwrap().is_empty());
    assert!(!json["whatsapp_links"]["paid"].as_str().unwrap().is_empty());
}

#[tokio::test]
async fn test_status_transitions_valid_and_invalid() {
    let (app, state, token, _staff_id) = setup_orders_test_app().await;

    // Find pending_payment order
    let pending_order_id = {
        let store = state.store.read().await;
        store
            .orders
            .values()
            .find(|o| o.status == "pending_payment")
            .unwrap()
            .id
    };

    // 1. Invalid transition: pending_payment directly to packed should be 422
    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/orders/{}/status", pending_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "status": "packed"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNPROCESSABLE_ENTITY);

    // 2. Valid transition: pending_payment -> proof_uploaded should be 200
    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/orders/{}/status", pending_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "status": "proof_uploaded",
            "note": "Bukti transfer diverifikasi manual"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // 3. Valid transition: proof_uploaded -> paid
    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/orders/{}/status", pending_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "status": "paid"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // 4. Valid transition: paid -> packed
    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/orders/{}/status", pending_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "status": "packed"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // 5. Valid transition: packed -> done
    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/orders/{}/status", pending_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "status": "done"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // 6. Terminal state: done cannot transition back to anything
    let req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/orders/{}/status", pending_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "status": "cancelled"
        })).unwrap()))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_payment_verification_approve_and_reject() {
    let (app, state, token, _staff_id) = setup_orders_test_app().await;

    // Find proof_uploaded order
    let proof_order_id = {
        let store = state.store.read().await;
        store
            .orders
            .values()
            .find(|o| o.status == "proof_uploaded")
            .unwrap()
            .id
    };

    // 1. Reject without reason -> 400 Bad Request
    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/orders/{}/verify-payment", proof_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "action": "reject",
            "rejection_reason": ""
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);

    // 2. Reject with reason -> 200 OK and status returns to pending_payment
    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/orders/{}/verify-payment", proof_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "action": "reject",
            "rejection_reason": "Nominal transfer tidak sesuai dengan total tagihan"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["order"]["status"].as_str().unwrap(), "pending_payment");

    // 3. Transition back to proof_uploaded then Approve
    {
        let mut store = state.store.write().await;
        let o = store.orders.get_mut(&proof_order_id).unwrap();
        o.status = "proof_uploaded".to_string();
    }

    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/orders/{}/verify-payment", proof_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "action": "approve"
        })).unwrap()))
        .unwrap();

    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["order"]["status"].as_str().unwrap(), "paid");

    // 4. Idempotent: approve again should succeed without error
    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/orders/{}/verify-payment", proof_order_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "action": "approve"
        })).unwrap()))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_create_manual_order() {
    let (app, _state, token, _staff_id) = setup_orders_test_app().await;

    let payload = serde_json::json!({
        "customer_name": "Agus Pratama Walk-in",
        "customer_phone": "081234112233",
        "shipping_address": "Ambil di tempat (ITC Lt. B5 No. 7)",
        "customer_note": "Beli langsung di counter GMC",
        "source": "in_store",
        "is_paid": true,
        "payment_method": "cash",
        "gift_wrapping": false,
        "items": [
            {
                "product_name": "ASUS TUF Gaming A15",
                "variant_sku": "SKU-ASUS-TUF-A15",
                "color_name": "Mecha Gray",
                "specs_snapshot": "Ryzen 7 7735HS / 16GB / 512GB / RTX 4050",
                "quantity": 1,
                "unit_price_idr": 15800000
            }
        ]
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/admin/orders/manual")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&payload).unwrap()))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["order"]["customer_name"].as_str().unwrap(), "Agus Pratama Walk-in");
    assert_eq!(json["order"]["status"].as_str().unwrap(), "paid");
    assert_eq!(json["order"]["source"].as_str().unwrap(), "in_store");
    assert_eq!(json["order"]["total_amount_idr"].as_i64().unwrap(), 15800000);
}

#[tokio::test]
async fn test_export_orders_csv() {
    let (app, _state, token, _staff_id) = setup_orders_test_app().await;

    let req = Request::builder()
        .uri("/api/v1/admin/orders/export-csv")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.headers().get("content-type").unwrap(),
        "text/csv; charset=utf-8"
    );

    let body = axum::body::to_bytes(resp.into_body(), 100_000).await.unwrap();
    let csv = String::from_utf8(body.to_vec()).unwrap();
    assert!(csv.contains("No Pesanan,Tanggal (WIB),Nama Pelanggan"));
    assert!(csv.contains("Budi Santoso"));
}
