use axum::{
    body::Body,
    http::{header::AUTHORIZATION, Request, StatusCode},
    routing::{delete, get, post, put},
    Router,
};
use chrono::Utc;
use gmc_api::domain::models::User;
use gmc_api::handlers::{admin_content, admin_import, admin_settings};
use gmc_api::state::{create_jwt_token, hash_password, AppState};
use tower::ServiceExt;
use uuid::Uuid;

async fn setup_app() -> (Router, AppState, String, String, Uuid, Uuid) {
    let jwt_secret = "test_super_secret_jwt_key_surabaya_2026".to_string();
    let state = AppState::new(None, jwt_secret.clone(), "./uploads/test".to_string()).await;

    let owner_id = Uuid::new_v4();
    let owner_password = "owner_secret_password_123";
    let owner_pwd_hash = hash_password(owner_password).unwrap();

    let owner = User {
        id: owner_id,
        email: "owner@gmc.co.id".to_string(),
        password_hash: owner_pwd_hash,
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

    let staff_id = Uuid::new_v4();
    let staff = User {
        id: staff_id,
        email: "staff@gmc.co.id".to_string(),
        password_hash: "hash".to_string(),
        full_name: "Staff GMC".to_string(),
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
        store.users.insert(owner_id, owner.clone());
        store.users.insert(staff_id, staff.clone());
    }

    let owner_token = create_jwt_token(&owner, &jwt_secret, 2).unwrap();
    let staff_token = create_jwt_token(&staff, &jwt_secret, 2).unwrap();

    let router = Router::new()
        // Import
        .route("/api/v1/admin/import/preview", post(admin_import::preview_import))
        .route("/api/v1/admin/import/apply", post(admin_import::apply_import))
        .route("/api/v1/admin/import/history", get(admin_import::list_import_history))
        // Settings
        .route("/api/v1/admin/settings", get(admin_settings::get_admin_settings))
        .route("/api/v1/admin/settings", put(admin_settings::update_admin_settings))
        .route("/api/v1/admin/settings/verify-password", post(admin_settings::verify_admin_password))
        // Content
        .route("/api/v1/admin/content/pages", get(admin_content::list_pages))
        .route("/api/v1/admin/content/pages/:slug", get(admin_content::get_page))
        .route("/api/v1/admin/content/pages/:slug", put(admin_content::update_page))
        .route("/api/v1/admin/content/faqs", get(admin_content::list_faqs))
        .route("/api/v1/admin/content/faqs", post(admin_content::create_faq))
        .route("/api/v1/admin/content/faqs/:id", put(admin_content::update_faq))
        .route("/api/v1/admin/content/faqs/:id", delete(admin_content::delete_faq))
        .with_state(state.clone());

    (router, state, owner_token, staff_token, owner_id, staff_id)
}

#[tokio::test]
async fn test_masked_bca_settings_and_password_reveal() {
    let (app, _state, owner_token, staff_token, _owner_id, _staff_id) = setup_app().await;

    // 1. Staff is forbidden from accessing settings (gets 403)
    let req_staff = Request::builder()
        .uri("/api/v1/admin/settings")
        .header(AUTHORIZATION, format!("Bearer {}", staff_token))
        .body(Body::empty())
        .unwrap();
    let res_staff = app.clone().oneshot(req_staff).await.unwrap();
    assert_eq!(res_staff.status(), StatusCode::FORBIDDEN);

    // 2. Owner gets settings masked by default
    let req_owner = Request::builder()
        .uri("/api/v1/admin/settings")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .body(Body::empty())
        .unwrap();
    let res_owner = app.clone().oneshot(req_owner).await.unwrap();
    assert_eq!(res_owner.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res_owner.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(body["is_bca_revealed"].as_bool(), Some(false));
    assert!(body["bca_account_number_masked"].as_str().unwrap().contains('*'));

    // 3. Password verification check
    let req_verify = Request::builder()
        .method("POST")
        .uri("/api/v1/admin/settings/verify-password")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"password":"owner_secret_password_123"}"#))
        .unwrap();
    let res_verify = app.clone().oneshot(req_verify).await.unwrap();
    assert_eq!(res_verify.status(), StatusCode::OK);

    // 4. Owner passes x-reveal-sensitive header -> returns unmasked BCA
    let req_reveal = Request::builder()
        .uri("/api/v1/admin/settings")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .header("X-Reveal-Sensitive", "true")
        .body(Body::empty())
        .unwrap();
    let res_reveal = app.clone().oneshot(req_reveal).await.unwrap();
    assert_eq!(res_reveal.status(), StatusCode::OK);
    let bytes_r = axum::body::to_bytes(res_reveal.into_body(), 1024 * 1024).await.unwrap();
    let body_r: serde_json::Value = serde_json::from_slice(&bytes_r).unwrap();
    assert_eq!(body_r["is_bca_revealed"].as_bool(), Some(true));
    assert_eq!(body_r["bca_account_number_masked"].as_str(), Some("1301510191"));
}

#[tokio::test]
async fn test_update_settings_bank_requires_confirmation() {
    let (app, _state, owner_token, _staff_token, _owner_id, _staff_id) = setup_app().await;

    // Attempting to change bank info without confirm_password -> 403 Forbidden
    let req_fail = Request::builder()
        .method("PUT")
        .uri("/api/v1/admin/settings")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"bca_account_number":"9999888877"}"#))
        .unwrap();
    let res_fail = app.clone().oneshot(req_fail).await.unwrap();
    assert_eq!(res_fail.status(), StatusCode::FORBIDDEN);

    // With valid confirm_password -> 200 OK
    let req_ok = Request::builder()
        .method("PUT")
        .uri("/api/v1/admin/settings")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"bca_account_number":"9999888877","confirm_password":"owner_secret_password_123"}"#))
        .unwrap();
    let res_ok = app.clone().oneshot(req_ok).await.unwrap();
    assert_eq!(res_ok.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_content_pages_and_ammonia_sanitization() {
    let (app, _state, owner_token, _staff_token, _owner_id, _staff_id) = setup_app().await;

    // Update static page with raw script tag to test ammonia sanitization
    let xss_payload = r#"# Tentang GMC\n<script>alert('pwned')</script>\nGaransi Resmi Sejak 2008"#;
    let req = Request::builder()
        .method("PUT")
        .uri("/api/v1/admin/content/pages/tentang-kami")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&serde_json::json!({
            "title": "Tentang Global Mandiri Computer",
            "content_markdown": xss_payload,
        })).unwrap()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let sanitized = body["content_markdown"].as_str().unwrap();
    assert!(!sanitized.contains("<script>"), "Ammonia must sanitize malicious script tags");
}

#[tokio::test]
async fn test_faq_crud_flow() {
    let (app, _state, owner_token, _staff_token, _owner_id, _staff_id) = setup_app().await;

    // 1. Create FAQ
    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/admin/content/faqs")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{
            "category": "Pengiriman",
            "question": "Apakah bisa kirim hari yang sama di Surabaya?",
            "answer": "Bisa, untuk order sebelum pukul 15.00 WIB diantar kurir toko.",
            "sort_order": 1,
            "is_published": true
        }"#))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let faq_id = body["id"].as_str().unwrap();

    // 2. List FAQs
    let req_list = Request::builder()
        .uri("/api/v1/admin/content/faqs")
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .body(Body::empty())
        .unwrap();
    let res_list = app.clone().oneshot(req_list).await.unwrap();
    assert_eq!(res_list.status(), StatusCode::OK);

    // 3. Delete FAQ
    let req_del = Request::builder()
        .method("DELETE")
        .uri(format!("/api/v1/admin/content/faqs/{}", faq_id))
        .header(AUTHORIZATION, format!("Bearer {}", owner_token))
        .body(Body::empty())
        .unwrap();
    let res_del = app.clone().oneshot(req_del).await.unwrap();
    assert_eq!(res_del.status(), StatusCode::OK);
}
