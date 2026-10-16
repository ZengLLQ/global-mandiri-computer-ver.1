use crate::domain::models::User;
use crate::error::AppError;
use crate::middleware::{AuthUser, RequireOwner};
use crate::state::{create_jwt_token, hash_password, verify_password, AppState};
use axum::{extract::State, Json};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use totp_rs::{Algorithm, Builder, Secret, Totp};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub totp_code: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub access_token: Option<String>,
    pub require_2fa: bool,
    pub user: Option<UserInfo>,
}

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub is_totp_enabled: bool,
    pub must_change_password: bool,
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login berhasil", body = AuthResponse),
        (status = 401, description = "Kredensial tidak valid"),
        (status = 429, description = "Akun terkunci sementara karena proteksi serangan")
    ),
    tag = "Auth"
)]
pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<LoginRequest>,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    let email = payload.email.trim().to_lowercase();
    let now = Utc::now();

    // 1. Fetch user from DB or memory store
    let user_opt = if let Some(pool) = &state.pool {
        sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, password_hash, full_name, phone, role,
                   totp_secret, is_totp_enabled, recovery_codes,
                   failed_login_attempts, lockout_until, password_changed_at,
                   deleted_at, created_at, updated_at
            FROM users
            WHERE LOWER(email) = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(&email)
        .fetch_optional(pool)
        .await
        .map_err(AppError::Database)?
    } else {
        let store = state.store.read().await;
        store
            .users
            .values()
            .find(|u| u.email.to_lowercase() == email && u.deleted_at.is_none())
            .cloned()
    };

    let user = match user_opt {
        Some(u) => u,
        None => {
            let _ = verify_password(
                "$argon2id$v=19$m=65536,t=3,p=4$uzZbE1LVKym+4LbJj+znkw$5iPRYpAjFVtUlsFWDvebgiigq/WarVMWzAEG86+IZl8",
                &payload.password,
            );
            state
                .record_audit_log(
                    None,
                    Some(email),
                    "LOGIN_FAILED_UNKNOWN_USER",
                    "user",
                    None,
                    None,
                    None,
                    None,
                    None,
                )
                .await;
            return Err(AppError::Unauthorized(
                "Email atau kata sandi yang Anda masukkan salah.".to_string(),
            ));
        }
    };

    // 2. Progressive lockout check
    if let Some(lock_time) = user.lockout_until {
        if lock_time > now {
            let remaining_secs = (lock_time - now).num_seconds().max(1);
            return Err(AppError::Unauthorized(format!(
                "Akses terkunci sementara karena percobaan berulang. Silakan coba lagi dalam {} detik.",
                remaining_secs
            )));
        }
    }

    // 3. Verify password with Argon2
    let is_valid = verify_password(&user.password_hash, &payload.password);
    if !is_valid {
        let next_fails = user.failed_login_attempts + 1;
        let lockout = if next_fails >= 5 {
            Some(now + Duration::seconds(60))
        } else {
            None
        };

        if let Some(pool) = &state.pool {
            let _ = sqlx::query(
                "UPDATE users SET failed_login_attempts = $1, lockout_until = $2 WHERE id = $3",
            )
            .bind(next_fails)
            .bind(lockout)
            .bind(user.id)
            .execute(pool)
            .await;
        } else {
            let mut store = state.store.write().await;
            if let Some(u) = store.users.get_mut(&user.id) {
                u.failed_login_attempts = next_fails;
                u.lockout_until = lockout;
            }
        }

        state
            .record_audit_log(
                Some(user.id),
                Some(user.email.clone()),
                "LOGIN_FAILED_WRONG_PASSWORD",
                "user",
                Some(&user.id.to_string()),
                None,
                None,
                None,
                None,
            )
            .await;

        let msg = if next_fails >= 5 {
            "Terlalu banyak percobaan gagal. Akun dikunci sementara selama 60 detik.".to_string()
        } else {
            format!("Kata sandi salah. Sisa kesempatan: {}.", 5 - next_fails)
        };
        return Err(AppError::Unauthorized(msg));
    }

    // 4. Check TOTP 2FA if enabled
    if user.is_totp_enabled {
        let code = payload.totp_code.as_deref().unwrap_or("").trim();
        if code.is_empty() {
            return Ok((
                jar,
                Json(AuthResponse {
                    success: true,
                    message: "Kode autentikasi 2FA diperlukan.".to_string(),
                    access_token: None,
                    require_2fa: true,
                    user: Some(UserInfo {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name,
                        role: user.role,
                        is_totp_enabled: true,
                        must_change_password: false,
                    }),
                }),
            ));
        }

        let mut valid_2fa = false;
        if let Some(secret_str) = &user.totp_secret {
            if let Ok(secret) = Secret::try_from_base32(secret_str) {
                if let Ok(totp) = Builder::new()
                    .with_algorithm(Algorithm::SHA1)
                    .with_digits(6)
                    .with_step_duration(30)
                    .with_secret(secret)
                    .with_account_name(user.email.clone())
                    .with_issuer(Some("GMC Surabaya"))
                    .build()
                {
                    valid_2fa = totp.check_current(code).is_some();
                }
            }
        }

        if !valid_2fa {
            if let Some(recovery) = &user.recovery_codes {
                if recovery.iter().any(|r| r == code) {
                    valid_2fa = true;
                }
            }
        }

        if !valid_2fa {
            state
                .record_audit_log(
                    Some(user.id),
                    Some(user.email.clone()),
                    "LOGIN_FAILED_INVALID_2FA",
                    "user",
                    Some(&user.id.to_string()),
                    None,
                    None,
                    None,
                    None,
                )
                .await;
            return Err(AppError::Unauthorized(
                "Kode 2FA / kode pemulihan tidak valid.".to_string(),
            ));
        }
    }

    // 5. Successful login: reset failed attempts
    if let Some(pool) = &state.pool {
        let _ = sqlx::query(
            "UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1",
        )
        .bind(user.id)
        .execute(pool)
        .await;
    } else {
        let mut store = state.store.write().await;
        if let Some(u) = store.users.get_mut(&user.id) {
            u.failed_login_attempts = 0;
            u.lockout_until = None;
        }
    }

    // 6. Generate JWT token (12 hours)
    let token = create_jwt_token(&user, &state.jwt_secret, 12).map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Gagal membuat token otorisasi: {}", e))
    })?;

    // 7. Set httpOnly Cookie
    let cookie = Cookie::build(("gmc_admin_session", token.clone()))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .build();

    let updated_jar = jar.add(cookie);

    state
        .record_audit_log(
            Some(user.id),
            Some(user.email.clone()),
            "LOGIN_SUCCESS",
            "user",
            Some(&user.id.to_string()),
            None,
            None,
            None,
            None,
        )
        .await;

    let must_change_password = user.password_changed_at.is_none() && user.role == "owner";

    Ok((
        updated_jar,
        Json(AuthResponse {
            success: true,
            message: "Login berhasil. Selamat datang di Panel Admin GMC.".to_string(),
            access_token: Some(token),
            require_2fa: false,
            user: Some(UserInfo {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_totp_enabled: user.is_totp_enabled,
                must_change_password,
            }),
        }),
    ))
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TotpSetupResponse {
    pub secret: String,
    pub otpauth_url: String,
    pub recovery_codes: Vec<String>,
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/totp/setup",
    responses(
        (status = 200, description = "Secret 2FA & URL berhasil di-generate", body = TotpSetupResponse)
    ),
    tag = "Auth"
)]
pub async fn setup_totp(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<TotpSetupResponse>, AppError> {
    let user = auth.user;
    let secret = Secret::generate();
    let secret_str = secret.to_base32();

    let totp: Totp = Builder::new()
        .with_algorithm(Algorithm::SHA1)
        .with_digits(6)
        .with_step_duration(30)
        .with_secret(secret)
        .with_account_name(user.email.clone())
        .with_issuer(Some("Global Mandiri Computer"))
        .build()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal konfigurasi TOTP: {}", e)))?;

    let otpauth_url = totp.to_url().unwrap_or_default();

    let recovery_codes: Vec<String> = (0..8)
        .map(|_| {
            let rand_val: u32 = rand::random::<u32>() % 90000000 + 10000000;
            format!(
                "{}-{}",
                &rand_val.to_string()[0..4],
                &rand_val.to_string()[4..8]
            )
        })
        .collect();

    if let Some(pool) = &state.pool {
        let _ = sqlx::query(
            "UPDATE users SET totp_secret = $1, recovery_codes = $2 WHERE id = $3",
        )
        .bind(&secret_str)
        .bind(&recovery_codes)
        .bind(user.id)
        .execute(pool)
        .await;
    } else {
        let mut store = state.store.write().await;
        if let Some(u) = store.users.get_mut(&user.id) {
            u.totp_secret = Some(secret_str.clone());
            u.recovery_codes = Some(recovery_codes.clone());
        }
    }

    Ok(Json(TotpSetupResponse {
        secret: secret_str,
        otpauth_url,
        recovery_codes,
    }))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct TotpVerifyRequest {
    pub code: String,
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/totp/verify",
    request_body = TotpVerifyRequest,
    responses(
        (status = 200, description = "2FA berhasil diaktifkan")
    ),
    tag = "Auth"
)]
pub async fn verify_totp(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<TotpVerifyRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = auth.user;
    let secret_str = user.totp_secret.ok_or_else(|| {
        AppError::BadRequest(
            "Konfigurasi 2FA belum dimulai. Silakan inisialisasi setup.".to_string(),
        )
    })?;

    let secret = Secret::try_from_base32(&secret_str).map_err(|_| {
        AppError::BadRequest("Format secret 2FA di database tidak valid.".to_string())
    })?;

    let totp: Totp = Builder::new()
        .with_algorithm(Algorithm::SHA1)
        .with_digits(6)
        .with_step_duration(30)
        .with_secret(secret)
        .with_account_name(user.email.clone())
        .with_issuer(Some("Global Mandiri Computer"))
        .build()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Error TOTP: {}", e)))?;

    let is_valid = totp.check_current(payload.code.trim()).is_some();
    if !is_valid {
        return Err(AppError::BadRequest(
            "Kode 6-digit tidak valid. Pastikan waktu di HP Anda tersinkronisasi.".to_string(),
        ));
    }

    if let Some(pool) = &state.pool {
        let _ = sqlx::query("UPDATE users SET is_totp_enabled = TRUE WHERE id = $1")
            .bind(user.id)
            .execute(pool)
            .await;
    } else {
        let mut store = state.store.write().await;
        if let Some(u) = store.users.get_mut(&user.id) {
            u.is_totp_enabled = true;
        }
    }

    state
        .record_audit_log(
            Some(user.id),
            Some(user.email),
            "TOTP_ACTIVATED",
            "user",
            Some(&user.id.to_string()),
            None,
            None,
            None,
            None,
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Autentikasi 2FA berhasil diaktifkan untuk akun Anda."
    })))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    responses(
        (status = 200, description = "Logout berhasil")
    ),
    tag = "Auth"
)]
pub async fn logout(jar: CookieJar) -> Result<(CookieJar, Json<serde_json::Value>), AppError> {
    let removal_cookie = Cookie::build(("gmc_admin_session", "")).path("/").build();
    let updated_jar = jar.remove(removal_cookie);

    Ok((
        updated_jar,
        Json(serde_json::json!({
            "success": true,
            "message": "Sesi telah berhasil ditutup."
        })),
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    responses(
        (status = 200, description = "Profil akun saat ini", body = UserInfo)
    ),
    tag = "Auth"
)]
pub async fn get_current_user(auth: AuthUser) -> Result<Json<UserInfo>, AppError> {
    let user = auth.user;
    let must_change_password = user.password_changed_at.is_none() && user.role == "owner";

    Ok(Json(UserInfo {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_totp_enabled: user.is_totp_enabled,
        must_change_password,
    }))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/change-password",
    request_body = ChangePasswordRequest,
    responses(
        (status = 200, description = "Kata sandi berhasil diubah")
    ),
    tag = "Auth"
)]
pub async fn change_password(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = auth.user;

    if !verify_password(&user.password_hash, &payload.current_password) {
        return Err(AppError::BadRequest(
            "Kata sandi lama yang Anda masukkan tidak cocok.".to_string(),
        ));
    }

    if payload.new_password.len() < 8 {
        return Err(AppError::BadRequest(
            "Kata sandi baru minimal 8 karakter.".to_string(),
        ));
    }

    let new_hash = hash_password(&payload.new_password).map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Gagal mengamankan kata sandi baru: {}", e))
    })?;

    let now = Utc::now();

    if let Some(pool) = &state.pool {
        let _ = sqlx::query(
            "UPDATE users SET password_hash = $1, password_changed_at = $2, updated_at = $2 WHERE id = $3",
        )
        .bind(new_hash)
        .bind(now)
        .bind(user.id)
        .execute(pool)
        .await;
    } else {
        let mut store = state.store.write().await;
        if let Some(u) = store.users.get_mut(&user.id) {
            u.password_hash = new_hash;
            u.password_changed_at = Some(now);
            u.updated_at = now;
        }
    }

    state
        .record_audit_log(
            Some(user.id),
            Some(user.email),
            "PASSWORD_CHANGED",
            "user",
            Some(&user.id.to_string()),
            None,
            None,
            None,
            None,
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Kata sandi Anda berhasil diperbarui."
    })))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyBankPasswordRequest {
    pub password: String,
}

#[utoipa::path(
    post,
    path = "/api/v1/admin/settings/verify-bank-access",
    request_body = VerifyBankPasswordRequest,
    responses(
        (status = 200, description = "Verifikasi sandi berhasil untuk akses informasi rekening bank")
    ),
    tag = "Settings"
)]
pub async fn verify_bank_access(
    owner: RequireOwner,
    Json(payload): Json<VerifyBankPasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = owner.0.user;
    if !verify_password(&user.password_hash, &payload.password) {
        return Err(AppError::Unauthorized(
            "Kata sandi salah. Verifikasi otorisasi rekening gagal.".to_string(),
        ));
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Otorisasi pemilik gerai diverifikasi."
    })))
}
