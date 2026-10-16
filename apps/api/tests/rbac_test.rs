use axum::{
    body::Body,
    http::{header::AUTHORIZATION, Request, StatusCode},
    routing::{get, post},
    Router,
};
use chrono::Utc;
use gmc_api::domain::models::User;
use gmc_api::handlers::{admin_audit, admin_dashboard, auth};
use gmc_api::state::{create_jwt_token, AppState};
use tower::ServiceExt;
use uuid::Uuid;

async fn setup_test_app() -> (Router, AppState, String, String, String) {
    let jwt_secret = "test_super_secret_jwt_key_surabaya_2026".to_string();
    let state = AppState::new(None, jwt_secret.clone(), "./uploads/test".to_string()).await;

    // Create 3 test users: Owner, Admin, Staff
    let owner_id = Uuid::new_v4();
    let owner = User {
        id: owner_id,
        email: "owner@gmc.co.id".to_string(),
        password_hash: "hash".to_string(),
        full_name: "Owner GMC".to_string(),
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

    let admin_id = Uuid::new_v4();
    let admin = User {
        id: admin_id,
        email: "admin_user@gmc.co.id".to_string(),
        password_hash: "hash".to_string(),
        full_name: "Admin GMC".to_string(),
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
        store.users.insert(owner_id, owner.clone());
        store.users.insert(admin_id, admin.clone());
        store.users.insert(staff_id, staff.clone());
    }

    let owner_token = create_jwt_token(&owner, &jwt_secret, 2).unwrap();
    let admin_token = create_jwt_token(&admin, &jwt_secret, 2).unwrap();
    let staff_token = create_jwt_token(&staff, &jwt_secret, 2).unwrap();

    let router = Router::new()
        .route("/api/v1/auth/me", get(auth::get_current_user))
        .route(
            "/api/v1/admin/dashboard/overview",
            get(admin_dashboard::get_dashboard_overview),
        )
        .route("/api/v1/admin/audit-logs", get(admin_audit::list_audit_logs))
        .route(
            "/api/v1/admin/settings/verify-bank-access",
            post(auth::verify_bank_access),
        )
        .with_state(state.clone());

    (router, state, owner_token, admin_token, staff_token)
}

#[tokio::test]
async fn test_unauthenticated_request_gets_401() {
    let (app, _, _, _, _) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/admin/audit-logs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_staff_token_forbidden_on_audit_logs_gets_403() {
    let (app, _, _, _, staff_token) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/admin/audit-logs")
                .header(AUTHORIZATION, format!("Bearer {}", staff_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_staff_token_forbidden_on_bank_access_gets_403() {
    let (app, _, _, _, staff_token) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/admin/settings/verify-bank-access")
                .header(AUTHORIZATION, format!("Bearer {}", staff_token))
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"password":"somepassword"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_admin_token_forbidden_on_bank_access_gets_403() {
    let (app, _, _, admin_token, _) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/admin/settings/verify-bank-access")
                .header(AUTHORIZATION, format!("Bearer {}", admin_token))
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"password":"somepassword"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_staff_token_allowed_on_dashboard_overview_gets_200() {
    let (app, _, _, _, staff_token) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/admin/dashboard/overview")
                .header(AUTHORIZATION, format!("Bearer {}", staff_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_owner_token_allowed_on_audit_logs_gets_200() {
    let (app, _, owner_token, _, _) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/admin/audit-logs")
                .header(AUTHORIZATION, format!("Bearer {}", owner_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
