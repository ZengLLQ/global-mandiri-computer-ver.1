use crate::error::AppError;
use crate::middleware::RequireStaff;
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListReviewsQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
    pub status: Option<String>,
    pub rating: Option<i32>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ReviewListItemDto {
    pub id: Uuid,
    pub product_id: Uuid,
    pub product_name: String,
    pub user_id: Uuid,
    pub customer_name: String,
    pub rating: i32,
    pub headline: String,
    pub content: String,
    pub is_verified_purchase: bool,
    pub status: String,
    pub admin_reply: Option<String>,
    pub admin_reply_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListReviewsResponse {
    pub reviews: Vec<ReviewListItemDto>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
    pub pending_count: usize,
    pub approved_count: usize,
    pub rejected_count: usize,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ModerateReviewRequest {
    pub status: String, // "approved" | "rejected" | "pending"
    pub rejection_reason: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReplyReviewRequest {
    pub reply: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BulkModerateReviewRequest {
    pub action: String, // "approve" | "reject" | "delete"
    pub review_ids: Vec<Uuid>,
    pub reason: Option<String>,
}

/// GET /api/v1/admin/reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    _staff: RequireStaff,
    Query(query): Query<ListReviewsQuery>,
) -> Result<Json<ListReviewsResponse>, AppError> {
    let store = state.store.read().await;

    let pending_count = store.reviews.iter().filter(|r| r.status == "pending").count();
    let approved_count = store.reviews.iter().filter(|r| r.status == "approved").count();
    let rejected_count = store.reviews.iter().filter(|r| r.status == "rejected").count();

    let search = query.search.as_deref().unwrap_or("").trim().to_lowercase();
    let status_filter = query.status.as_deref().unwrap_or("all").to_lowercase();

    let mut list: Vec<ReviewListItemDto> = store
        .reviews
        .iter()
        .filter(|r| {
            if status_filter != "all" && r.status != status_filter {
                return false;
            }
            if let Some(rating) = query.rating {
                if r.rating != rating {
                    return false;
                }
            }
            true
        })
        .map(|r| {
            let product_name = store
                .products
                .iter()
                .find(|p| p.id == r.product_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| "Produk GMC".to_string());

            let customer_name = store
                .users
                .get(&r.user_id)
                .map(|u| u.full_name.clone())
                .unwrap_or_else(|| "Pelanggan".to_string());

            ReviewListItemDto {
                id: r.id,
                product_id: r.product_id,
                product_name,
                user_id: r.user_id,
                customer_name,
                rating: r.rating,
                headline: r.headline.clone(),
                content: r.content.clone(),
                is_verified_purchase: r.is_verified_purchase,
                status: r.status.clone(),
                admin_reply: r.admin_reply.clone(),
                admin_reply_at: r.admin_reply_at,
                rejection_reason: r.rejection_reason.clone(),
                created_at: r.created_at,
            }
        })
        .filter(|dto| {
            if search.is_empty() {
                return true;
            }
            dto.product_name.to_lowercase().contains(&search)
                || dto.customer_name.to_lowercase().contains(&search)
                || dto.headline.to_lowercase().contains(&search)
                || dto.content.to_lowercase().contains(&search)
        })
        .collect();

    let sort_order = query.sort_order.as_deref().unwrap_or("desc");
    list.sort_by(|a, b| {
        let cmp = a.created_at.cmp(&b.created_at);
        if sort_order == "desc" {
            cmp.reverse()
        } else {
            cmp
        }
    });

    let total = list.len();
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).max(1).min(100);
    let total_pages = (total + per_page - 1) / per_page;

    let start = (page - 1) * per_page;
    let paginated_reviews = if start >= total {
        Vec::new()
    } else {
        list.into_iter().skip(start).take(per_page).collect()
    };

    Ok(Json(ListReviewsResponse {
        reviews: paginated_reviews,
        total,
        page,
        per_page,
        total_pages: total_pages.max(1),
        pending_count,
        approved_count,
        rejected_count,
    }))
}

/// PATCH /api/v1/admin/reviews/:id/status
pub async fn moderate_review(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
    Json(payload): Json<ModerateReviewRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let review = store
        .reviews
        .iter_mut()
        .find(|r| r.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Ulasan dengan ID {} tidak ditemukan", id)))?;

    let valid_status = matches!(payload.status.as_str(), "approved" | "rejected" | "pending");
    if !valid_status {
        return Err(AppError::BadRequest("Status moderasi tidak valid".to_string()));
    }

    let old_status = review.status.clone();
    review.status = payload.status.clone();
    if payload.status == "rejected" {
        review.rejection_reason = payload.rejection_reason.clone();
    } else {
        review.rejection_reason = None;
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "moderate_review",
            "review",
            Some(&id.to_string()),
            None,
            None,
            Some(serde_json::json!({ "status": old_status })),
            Some(serde_json::json!({
                "new_status": payload.status,
                "rejection_reason": payload.rejection_reason
            })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "status": payload.status
    })))
}

/// POST /api/v1/admin/reviews/:id/reply
pub async fn reply_review(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
    Json(payload): Json<ReplyReviewRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if payload.reply.trim().is_empty() {
        return Err(AppError::BadRequest("Balasan tidak boleh kosong".to_string()));
    }

    let mut store = state.store.write().await;
    let review = store
        .reviews
        .iter_mut()
        .find(|r| r.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Ulasan dengan ID {} tidak ditemukan", id)))?;

    let now = Utc::now();
    review.admin_reply = Some(payload.reply.trim().to_string());
    review.admin_reply_at = Some(now);

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "reply_review",
            "review",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "reply": payload.reply })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "admin_reply": payload.reply.trim(),
        "admin_reply_at": now
    })))
}

/// DELETE /api/v1/admin/reviews/:id
pub async fn delete_review(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let before_len = store.reviews.len();
    store.reviews.retain(|r| r.id != id);

    if store.reviews.len() == before_len {
        return Err(AppError::NotFound(format!("Ulasan dengan ID {} tidak ditemukan", id)));
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "delete_review",
            "review",
            Some(&id.to_string()),
            None,
            None,
            None,
            None,
        )
        .await;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/v1/admin/reviews/bulk
pub async fn bulk_moderate_reviews(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<BulkModerateReviewRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let mut affected_count = 0;

    match payload.action.as_str() {
        "approve" => {
            for r in store.reviews.iter_mut() {
                if payload.review_ids.contains(&r.id) {
                    r.status = "approved".to_string();
                    r.rejection_reason = None;
                    affected_count += 1;
                }
            }
        }
        "reject" => {
            for r in store.reviews.iter_mut() {
                if payload.review_ids.contains(&r.id) {
                    r.status = "rejected".to_string();
                    r.rejection_reason = payload.reason.clone();
                    affected_count += 1;
                }
            }
        }
        "delete" => {
            let before = store.reviews.len();
            store.reviews.retain(|r| !payload.review_ids.contains(&r.id));
            affected_count = before - store.reviews.len();
        }
        _ => return Err(AppError::BadRequest("Aksi bulk tidak valid".to_string())),
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "bulk_moderate_reviews",
            "review",
            None,
            None,
            None,
            None,
            Some(serde_json::json!({
                "action": payload.action,
                "affected_count": affected_count,
            })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "affected_count": affected_count
    })))
}
