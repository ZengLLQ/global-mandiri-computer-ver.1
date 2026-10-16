use crate::domain::models::{Role, User};
use crate::error::AppError;
use crate::state::{verify_jwt_token, AppState};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts},
};
use axum_extra::extract::cookie::CookieJar;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user: User,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let mut token_opt = None;

        // 1. Try extracting from httpOnly cookie 'gmc_admin_session' or 'gmc_session'
        let jar = CookieJar::from_headers(&parts.headers);
        if let Some(cookie) = jar.get("gmc_admin_session").or_else(|| jar.get("gmc_session")) {
            token_opt = Some(cookie.value().to_string());
        }

        // 2. Fallback to Authorization: Bearer <token>
        if token_opt.is_none() {
            if let Some(auth_header) = parts.headers.get(AUTHORIZATION) {
                if let Ok(header_str) = auth_header.to_str() {
                    if let Some(token) = header_str.strip_prefix("Bearer ") {
                        token_opt = Some(token.trim().to_string());
                    }
                }
            }
        }

        let token = token_opt.ok_or_else(|| {
            AppError::Unauthorized("Silakan login terlebih dahulu untuk mengakses fitur ini.".to_string())
        })?;

        // 3. Verify JWT
        let claims = verify_jwt_token(&token, &state.jwt_secret).map_err(|_| {
            AppError::Unauthorized("Sesi login tidak valid atau telah berakhir.".to_string())
        })?;

        let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
            AppError::Unauthorized("Format identitas sesi tidak valid.".to_string())
        })?;

        // 4. Lookup user from DB if available, else memory store
        let user = if let Some(pool) = &state.pool {
            let db_user = sqlx::query_as::<_, User>(
                r#"
                SELECT id, email, password_hash, full_name, phone, role,
                       totp_secret, is_totp_enabled, recovery_codes,
                       failed_login_attempts, lockout_until, password_changed_at,
                       deleted_at, created_at, updated_at
                FROM users
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::Database)?;

            db_user
        } else {
            let store = state.store.read().await;
            store.users.get(&user_id).cloned()
        };

        let user = user.ok_or_else(|| {
            AppError::Unauthorized("Akun pengguna tidak ditemukan atau telah dinonaktifkan.".to_string())
        })?;

        Ok(AuthUser { user })
    }
}

// -------------------------------------------------------------
// Role-based Extractors
// -------------------------------------------------------------

/// Require OWNER role only
#[derive(Debug, Clone)]
pub struct RequireOwner(pub AuthUser);

#[async_trait]
impl FromRequestParts<AppState> for RequireOwner {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth = AuthUser::from_request_parts(parts, state).await?;
        let role = Role::from_str(&auth.user.role);

        if role == Role::Owner {
            Ok(RequireOwner(auth))
        } else {
            Err(AppError::Forbidden(
                "Akses ditolak: Hanya OWNER toko yang memiliki otorisasi tindakan ini.".to_string(),
            ))
        }
    }
}

/// Require ADMIN or OWNER role
#[derive(Debug, Clone)]
pub struct RequireAdmin(pub AuthUser);

#[async_trait]
impl FromRequestParts<AppState> for RequireAdmin {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth = AuthUser::from_request_parts(parts, state).await?;
        let role = Role::from_str(&auth.user.role);

        if role == Role::Owner || role == Role::Admin {
            Ok(RequireAdmin(auth))
        } else {
            Err(AppError::Forbidden(
                "Akses ditolak: Diperlukan kewenangan ADMIN atau OWNER.".to_string(),
            ))
        }
    }
}

/// Require STAFF, ADMIN or OWNER role
#[derive(Debug, Clone)]
pub struct RequireStaff(pub AuthUser);

#[async_trait]
impl FromRequestParts<AppState> for RequireStaff {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth = AuthUser::from_request_parts(parts, state).await?;
        let role = Role::from_str(&auth.user.role);

        if role == Role::Owner || role == Role::Admin || role == Role::Staff {
            Ok(RequireStaff(auth))
        } else {
            Err(AppError::Forbidden(
                "Akses ditolak: Diperlukan hak akses staf internal GMC.".to_string(),
            ))
        }
    }
}
