use axum::{
    body::Body,
    http::{header::AUTHORIZATION, Request, StatusCode},
    routing::{delete, get, patch, post},
    Router,
};
use chrono::Utc;
use gmc_api::domain::models::User;
use gmc_api::handlers::{admin_customers, admin_reviews};
use gmc_api::state::{create_jwt_token, AppState};
use tower::ServiceExt;
use uuid::Uuid;

async fn setup_customers_reviews_test_app() -> (Router, AppState, String, Uuid) {
    let jwt_secret = "test_super_secret_jwt_key_surabaya_2026".to_string();
    let state = AppState::new(None, jwt_secret.clone(), "./uploads/test".to_string()).await;

    let admin_id = Uuid::new_v4();
    let admin = User {
        id: admin_id,
        email: "owner@gmc.co.id".to_string(),
        password_hash: "hash".to_string(),
        full_name: "Owner GMC Surabaya".to_string(),
        phone: None,
        role: "owner".to_string(),
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
        // Customers
        .route("/api/v1/admin/customers", get(admin_customers::list_customers))
        .route("/api/v1/admin/customers/export-csv", get(admin_customers::export_customers_csv))
        .route("/api/v1/admin/customers/:id", get(admin_customers::get_customer_detail))
        .route("/api/v1/admin/customers/:id/notes", post(admin_customers::add_customer_note))
        .route("/api/v1/admin/customers/:id/tags", post(admin_customers::add_customer_tag))
        .route("/api/v1/admin/customers/:id/tags/:tag", delete(admin_customers::remove_customer_tag))
        // Reviews
        .route("/api/v1/admin/reviews", get(admin_reviews::list_reviews))
        .route("/api/v1/admin/reviews/bulk", post(admin_reviews::bulk_moderate_reviews))
        .route("/api/v1/admin/reviews/:id", delete(admin_reviews::delete_review))
        .route("/api/v1/admin/reviews/:id/status", patch(admin_reviews::moderate_review))
        .route("/api/v1/admin/reviews/:id/reply", post(admin_reviews::reply_review))
        .with_state(state.clone());

    (router, state, admin_token, admin_id)
}

#[tokio::test]
async fn test_list_and_filter_customers() {
    let (app, _state, token, _admin_id) = setup_customers_reviews_test_app().await;

    // 1. List all customers
    let req = Request::builder()
        .uri("/api/v1/admin/customers")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let customers = body["customers"].as_array().unwrap();
    assert!(!customers.is_empty(), "Customers list should contain seeded customers");

    // 2. Filter by tag "VIP"
    let req_vip = Request::builder()
        .uri("/api/v1/admin/customers?tag=VIP")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let res_vip = app.clone().oneshot(req_vip).await.unwrap();
    assert_eq!(res_vip.status(), StatusCode::OK);
    let bytes_vip = axum::body::to_bytes(res_vip.into_body(), 1024 * 1024).await.unwrap();
    let body_vip: serde_json::Value = serde_json::from_slice(&bytes_vip).unwrap();
    let vip_custs = body_vip["customers"].as_array().unwrap();
    assert!(vip_custs.iter().any(|c| c["name"].as_str() == Some("Budi Santoso")));
}

#[tokio::test]
async fn test_customer_notes_and_tags_flow() {
    let (app, _state, token, _admin_id) = setup_customers_reviews_test_app().await;

    // Fetch customer list first to get an ID
    let req = Request::builder()
        .uri("/api/v1/admin/customers")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let cust_id = body["customers"][0]["id"].as_str().unwrap();

    // Add note
    let req_note = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/customers/{}/notes", cust_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"note":"Pelanggan minta nota cetak format A4"}"#))
        .unwrap();
    let res_note = app.clone().oneshot(req_note).await.unwrap();
    assert_eq!(res_note.status(), StatusCode::CREATED);

    // Add tag
    let req_tag = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/customers/{}/tags", cust_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"tag":"Klien Prioritas"}"#))
        .unwrap();
    let res_tag = app.clone().oneshot(req_tag).await.unwrap();
    assert_eq!(res_tag.status(), StatusCode::OK);

    // Get customer detail
    let req_detail = Request::builder()
        .uri(format!("/api/v1/admin/customers/{}", cust_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let res_detail = app.clone().oneshot(req_detail).await.unwrap();
    assert_eq!(res_detail.status(), StatusCode::OK);
    let bytes_det = axum::body::to_bytes(res_detail.into_body(), 1024 * 1024).await.unwrap();
    let body_det: serde_json::Value = serde_json::from_slice(&bytes_det).unwrap();
    let tags = body_det["tags"].as_array().unwrap();
    assert!(tags.iter().any(|t| t.as_str() == Some("Klien Prioritas")));

    // Remove tag
    let req_rm_tag = Request::builder()
        .method("DELETE")
        .uri(format!("/api/v1/admin/customers/{}/tags/Klien%20Prioritas", cust_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let res_rm = app.clone().oneshot(req_rm_tag).await.unwrap();
    assert_eq!(res_rm.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_export_customers_csv() {
    let (app, _state, token, _admin_id) = setup_customers_reviews_test_app().await;

    let req = Request::builder()
        .uri("/api/v1/admin/customers/export-csv")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    // Check UTF-8 BOM
    assert!(bytes.starts_with(&[0xEF, 0xBB, 0xBF]));
    let csv_str = String::from_utf8_lossy(&bytes);
    assert!(csv_str.contains("Nama Pelanggan,No. Telepon,Email"));
    assert!(csv_str.contains("Budi Santoso"));
}

#[tokio::test]
async fn test_list_and_moderate_reviews() {
    let (app, _state, token, _admin_id) = setup_customers_reviews_test_app().await;

    // 1. List reviews
    let req = Request::builder()
        .uri("/api/v1/admin/reviews")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let reviews = body["reviews"].as_array().unwrap();
    assert!(!reviews.is_empty());

    let pending_review = reviews
        .iter()
        .find(|r| r["status"].as_str() == Some("pending"))
        .expect("Should have at least 1 pending review");
    let review_id = pending_review["id"].as_str().unwrap();

    // 2. Moderate review: approve
    let req_mod = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/admin/reviews/{}/status", review_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"status":"approved"}"#))
        .unwrap();

    let res_mod = app.clone().oneshot(req_mod).await.unwrap();
    assert_eq!(res_mod.status(), StatusCode::OK);

    // 3. Staff reply to review
    let req_reply = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/admin/reviews/{}/reply", review_id))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"reply":"Terima kasih atas ulasan positifnya!"}"#))
        .unwrap();

    let res_reply = app.clone().oneshot(req_reply).await.unwrap();
    assert_eq!(res_reply.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_bulk_moderate_reviews() {
    let (app, _state, token, _admin_id) = setup_customers_reviews_test_app().await;

    // List reviews to get IDs
    let req = Request::builder()
        .uri("/api/v1/admin/reviews")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let ids: Vec<String> = body["reviews"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r["id"].as_str().unwrap().to_string())
        .collect();

    // Bulk approve
    let req_bulk = Request::builder()
        .method("POST")
        .uri("/api/v1/admin/reviews/bulk")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "action": "approve",
            "review_ids": ids,
        })).unwrap()))
        .unwrap();

    let res_bulk = app.clone().oneshot(req_bulk).await.unwrap();
    assert_eq!(res_bulk.status(), StatusCode::OK);
    let bytes_b = axum::body::to_bytes(res_bulk.into_body(), 1024 * 1024).await.unwrap();
    let body_b: serde_json::Value = serde_json::from_slice(&bytes_b).unwrap();
    assert_eq!(body_b["success"].as_bool(), Some(true));
}
