use crate::domain::models::*;
use crate::error::AppError;
use crate::middleware::RequireAdmin;
use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdatePageRequest {
    pub title: String,
    pub content_markdown: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct FaqItemRequest {
    pub category: String,
    pub question: String,
    pub answer: String,
    pub sort_order: Option<i32>,
    pub is_published: Option<bool>,
}

/// GET /api/v1/admin/content/pages
pub async fn list_pages(
    State(state): State<AppState>,
    _admin: RequireAdmin,
) -> Result<Json<Vec<StaticPage>>, AppError> {
    let store = state.store.read().await;
    let mut pages: Vec<StaticPage> = store.static_pages.values().cloned().collect();
    if pages.is_empty() {
        // Provide standard GMC pages if not yet populated
        pages = vec![
            StaticPage {
                slug: "tentang-kami".to_string(),
                title: "Tentang Global Mandiri Computer".to_string(),
                content_markdown: "## Sejarah & Dedikasi Sejak 2008\n\nGlobal Mandiri Computer (GMC) berdiri di ITC Mega Grosir Surabaya...".to_string(),
                updated_by: None,
                updated_at: Utc::now(),
            },
            StaticPage {
                slug: "pengiriman-garansi".to_string(),
                title: "Kebijakan Pengiriman & Garansi Resmi".to_string(),
                content_markdown: "## Garansi Resmi Distributor\n\nSemua produk laptop dan aksesoris di GMC bergaransi resmi distributor Indonesia...".to_string(),
                updated_by: None,
                updated_at: Utc::now(),
            },
        ];
    }
    pages.sort_by(|a, b| a.slug.cmp(&b.slug));
    Ok(Json(pages))
}

/// GET /api/v1/admin/content/pages/:slug
pub async fn get_page(
    State(state): State<AppState>,
    _admin: RequireAdmin,
    Path(slug): Path<String>,
) -> Result<Json<StaticPage>, AppError> {
    let store = state.store.read().await;
    if let Some(page) = store.static_pages.get(&slug) {
        return Ok(Json(page.clone()));
    }

    // Default template if missing
    Ok(Json(StaticPage {
        slug: slug.clone(),
        title: slug.replace('-', " ").to_uppercase(),
        content_markdown: format!("# Konten {}\n\nTulis isi markdown di sini...", slug),
        updated_by: None,
        updated_at: Utc::now(),
    }))
}

/// PUT /api/v1/admin/content/pages/:slug
pub async fn update_page(
    State(state): State<AppState>,
    admin: RequireAdmin,
    Path(slug): Path<String>,
    Json(payload): Json<UpdatePageRequest>,
) -> Result<Json<StaticPage>, AppError> {
    // Sanitize markdown content using ammonia to prevent XSS
    let sanitized_markdown = ammonia::clean(&payload.content_markdown);

    let mut store = state.store.write().await;
    let now = Utc::now();
    let page = StaticPage {
        slug: slug.clone(),
        title: payload.title.trim().to_string(),
        content_markdown: sanitized_markdown,
        updated_by: Some(admin.0.user.id),
        updated_at: now,
    };

    store.static_pages.insert(slug.clone(), page.clone());
    drop(store);

    state
        .record_audit_log(
            Some(admin.0.user.id),
            Some(admin.0.user.email.clone()),
            "update_static_page",
            "content",
            Some(&slug),
            None,
            None,
            None,
            Some(serde_json::json!({ "title": payload.title })),
        )
        .await;

    Ok(Json(page))
}

/// GET /api/v1/admin/content/faqs
pub async fn list_faqs(
    State(state): State<AppState>,
    _admin: RequireAdmin,
) -> Result<Json<Vec<FaqItem>>, AppError> {
    let store = state.store.read().await;
    let mut faqs = store.faq_items.clone();
    faqs.sort_by(|a, b| a.sort_order.cmp(&b.sort_order));
    Ok(Json(faqs))
}

/// POST /api/v1/admin/content/faqs
pub async fn create_faq(
    State(state): State<AppState>,
    admin: RequireAdmin,
    Json(payload): Json<FaqItemRequest>,
) -> Result<(StatusCode, Json<FaqItem>), AppError> {
    let sanitized_answer = ammonia::clean(&payload.answer);
    let mut store = state.store.write().await;
    let id = Uuid::new_v4();
    let now = Utc::now();

    let faq = FaqItem {
        id,
        category: payload.category.trim().to_string(),
        question: payload.question.trim().to_string(),
        answer: sanitized_answer,
        sort_order: payload.sort_order.unwrap_or(0),
        is_published: payload.is_published.unwrap_or(true),
        created_at: now,
        updated_at: now,
    };

    store.faq_items.push(faq.clone());
    drop(store);

    state
        .record_audit_log(
            Some(admin.0.user.id),
            Some(admin.0.user.email.clone()),
            "create_faq",
            "faq",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "question": payload.question })),
        )
        .await;

    Ok((StatusCode::CREATED, Json(faq)))
}

/// PUT /api/v1/admin/content/faqs/:id
pub async fn update_faq(
    State(state): State<AppState>,
    admin: RequireAdmin,
    Path(id): Path<Uuid>,
    Json(payload): Json<FaqItemRequest>,
) -> Result<Json<FaqItem>, AppError> {
    let sanitized_answer = ammonia::clean(&payload.answer);
    let mut store = state.store.write().await;
    let faq = store
        .faq_items
        .iter_mut()
        .find(|f| f.id == id)
        .ok_or_else(|| AppError::NotFound(format!("FAQ dengan ID {} tidak ditemukan", id)))?;

    faq.category = payload.category.trim().to_string();
    faq.question = payload.question.trim().to_string();
    faq.answer = sanitized_answer;
    if let Some(so) = payload.sort_order {
        faq.sort_order = so;
    }
    if let Some(publ) = payload.is_published {
        faq.is_published = publ;
    }
    faq.updated_at = Utc::now();

    let updated = faq.clone();
    drop(store);

    state
        .record_audit_log(
            Some(admin.0.user.id),
            Some(admin.0.user.email.clone()),
            "update_faq",
            "faq",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "question": payload.question })),
        )
        .await;

    Ok(Json(updated))
}

/// DELETE /api/v1/admin/content/faqs/:id
pub async fn delete_faq(
    State(state): State<AppState>,
    admin: RequireAdmin,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let before = store.faq_items.len();
    store.faq_items.retain(|f| f.id != id);

    if store.faq_items.len() == before {
        return Err(AppError::NotFound(format!("FAQ dengan ID {} tidak ditemukan", id)));
    }
    drop(store);

    state
        .record_audit_log(
            Some(admin.0.user.id),
            Some(admin.0.user.email.clone()),
            "delete_faq",
            "faq",
            Some(&id.to_string()),
            None,
            None,
            None,
            None,
        )
        .await;

    Ok(Json(serde_json::json!({ "success": true })))
}
