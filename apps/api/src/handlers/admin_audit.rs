use crate::domain::models::AuditLog;
use crate::error::AppError;
use crate::middleware::RequireAdmin;
use crate::state::AppState;
use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::IntoParams;

#[derive(Debug, Deserialize, IntoParams)]
pub struct AuditQuery {
    pub page: Option<usize>,
    pub limit: Option<usize>,
    pub action: Option<String>,
    pub entity_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuditListResponse {
    pub total: usize,
    pub page: usize,
    pub limit: usize,
    pub items: Vec<AuditLog>,
}

pub async fn list_audit_logs(
    State(state): State<AppState>,
    _admin: RequireAdmin,
    Query(params): Query<AuditQuery>,
) -> Result<Json<AuditListResponse>, AppError> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page.saturating_sub(1)) * limit;

    let logs = if let Some(pool) = &state.pool {
        sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT id, user_id, user_email, action, entity_type, entity_id,
                   ip_address, user_agent, before_json, after_json, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(pool)
        .await
        .map_err(AppError::Database)?
    } else {
        let store = state.store.read().await;
        store
            .audit_logs
            .iter()
            .filter(|log| {
                if let Some(ref a) = params.action {
                    if !log.action.to_lowercase().contains(&a.to_lowercase()) {
                        return false;
                    }
                }
                if let Some(ref e) = params.entity_type {
                    if !log.entity_type.to_lowercase().contains(&e.to_lowercase()) {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .skip(offset)
            .take(limit)
            .collect()
    };

    let total = if let Some(pool) = &state.pool {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM audit_logs")
            .fetch_one(pool)
            .await
            .map_err(AppError::Database)?;
        count.0 as usize
    } else {
        let store = state.store.read().await;
        store.audit_logs.len()
    };

    Ok(Json(AuditListResponse {
        total,
        page,
        limit,
        items: logs,
    }))
}
