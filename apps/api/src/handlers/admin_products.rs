use crate::domain::models::*;
use crate::error::AppError;
use crate::middleware::RequireStaff;
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListAdminProductsQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
    pub search: Option<String>,
    pub brand_id: Option<Uuid>,
    pub category_id: Option<Uuid>,
    pub segment: Option<String>,
    pub stock_status: Option<String>,
    pub price_zero: Option<bool>,
    pub is_new: Option<bool>,
    pub is_visible: Option<bool>,
    pub needs_attention: Option<bool>,
    pub in_trash: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AdminProductListItemDto {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub brand_id: Uuid,
    pub brand_name: String,
    pub category_id: Uuid,
    pub category_name: String,
    pub segment: String,
    pub is_new: bool,
    pub is_visible: bool,
    pub stock_status: String,
    pub tracked_quantity: Option<i32>,
    pub min_stock_alert: i32,
    pub is_whatsapp_only: bool,
    pub min_price_idr: i64,
    pub max_price_idr: i64,
    pub variants_count: usize,
    pub primary_sku: String,
    pub deleted_at: Option<chrono::DateTime<Utc>>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListAdminProductsResponse {
    pub products: Vec<AdminProductListItemDto>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminProductDetailResponse {
    pub product: Product,
    pub brand_name: String,
    pub category_name: String,
    pub variants: Vec<ProductVariant>,
    pub specs: Option<ProductSpec>,
    pub price_history: Vec<PriceHistory>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProductVariantDto {
    pub sku: String,
    pub barcode: Option<String>,
    pub color_name: String,
    pub price_idr: i64,
    pub stock_status: String,
    pub unit: Option<String>,
    pub tracked_quantity: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProductSpecDto {
    pub cpu: Option<String>,
    pub ram_gb: Option<i32>,
    pub storage: Option<String>,
    pub gpu: Option<String>,
    pub screen_size: Option<String>,
    pub os: Option<String>,
    pub warranty: Option<String>,
    pub bundled_items: Option<String>,
    pub raw_spec_text: Option<String>,
    pub cleaned_description: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProductRequest {
    pub name: String,
    pub slug: String,
    pub brand_id: Uuid,
    pub category_id: Uuid,
    pub segment: String,
    pub is_new: Option<bool>,
    pub is_visible: Option<bool>,
    pub is_whatsapp_only: Option<bool>,
    pub tracked_quantity: Option<i32>,
    pub min_stock_alert: Option<i32>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub variants: Vec<CreateProductVariantDto>,
    pub specs: Option<CreateProductSpecDto>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateProductRequest {
    pub name: String,
    pub slug: String,
    pub brand_id: Uuid,
    pub category_id: Uuid,
    pub segment: String,
    pub is_new: bool,
    pub is_visible: bool,
    pub is_whatsapp_only: bool,
    pub stock_status: String,
    pub tracked_quantity: Option<i32>,
    pub min_stock_alert: i32,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub variants: Vec<CreateProductVariantDto>,
    pub specs: Option<CreateProductSpecDto>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct InlineUpdateProductRequest {
    pub price_idr: Option<i64>,
    pub stock_status: Option<String>,
    pub tracked_quantity: Option<i32>,
    pub is_visible: Option<bool>,
    pub is_new: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BulkProductActionRequest {
    pub action: String, // "set_stock_status" | "set_visibility" | "set_is_new" | "set_category" | "delete" | "restore"
    pub product_ids: Vec<Uuid>,
    pub value: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DataQualityQueueResponse {
    pub zero_price_products: Vec<AdminProductListItemDto>,
    pub missing_specs_products: Vec<AdminProductListItemDto>,
    pub low_stock_products: Vec<AdminProductListItemDto>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CategoryRequest {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BrandRequest {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeRequest {
    pub source_id: Uuid,
    pub target_id: Uuid,
}

// -------------------------------------------------------------------------------------------------
// HANDLERS
// -------------------------------------------------------------------------------------------------

/// GET /api/v1/admin/products
pub async fn list_admin_products(
    State(state): State<AppState>,
    _staff: RequireStaff,
    Query(query): Query<ListAdminProductsQuery>,
) -> Result<Json<ListAdminProductsResponse>, AppError> {
    let store = state.store.read().await;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).max(1).min(100);

    let search = query.search.as_deref().unwrap_or("").trim().to_lowercase();
    let in_trash = query.in_trash.unwrap_or(false);

    let mut list: Vec<AdminProductListItemDto> = store
        .products
        .iter()
        .filter(|p| {
            if in_trash {
                p.deleted_at.is_some()
            } else {
                p.deleted_at.is_none()
            }
        })
        .filter(|p| {
            if let Some(bid) = query.brand_id {
                if p.brand_id != bid {
                    return false;
                }
            }
            if let Some(cid) = query.category_id {
                if p.category_id != cid {
                    return false;
                }
            }
            if let Some(ref seg) = query.segment {
                if !p.segment.eq_ignore_ascii_case(seg) {
                    return false;
                }
            }
            if let Some(ref ss) = query.stock_status {
                if !p.stock_status.eq_ignore_ascii_case(ss) {
                    return false;
                }
            }
            if let Some(vis) = query.is_visible {
                if p.is_visible != vis {
                    return false;
                }
            }
            if let Some(is_new) = query.is_new {
                if p.is_new != is_new {
                    return false;
                }
            }

            // Variants check
            let variants: Vec<&ProductVariant> = store
                .product_variants
                .iter()
                .filter(|v| v.product_id == p.id && v.deleted_at.is_none())
                .collect();

            let min_price = variants.iter().map(|v| v.price_idr).min().unwrap_or(0);

            if let Some(pz) = query.price_zero {
                if pz && min_price > 0 {
                    return false;
                }
            }

            if let Some(attn) = query.needs_attention {
                if attn {
                    let is_low_stock = p.tracked_quantity.map(|q| q <= p.min_stock_alert).unwrap_or(false);
                    let is_zero_price = min_price == 0;
                    let has_missing_specs = !store.product_specs.contains_key(&p.id);
                    if !is_low_stock && !is_zero_price && !has_missing_specs {
                        return false;
                    }
                }
            }

            if !search.is_empty() {
                let matches_name = p.name.to_lowercase().contains(&search);
                let matches_slug = p.slug.to_lowercase().contains(&search);
                let matches_sku = variants.iter().any(|v| v.sku.to_lowercase().contains(&search));
                if !matches_name && !matches_slug && !matches_sku {
                    return false;
                }
            }

            true
        })
        .map(|p| {
            let brand_name = store
                .brands
                .iter()
                .find(|b| b.id == p.brand_id)
                .map(|b| b.name.clone())
                .unwrap_or_else(|| "GMC".to_string());

            let category_name = store
                .categories
                .iter()
                .find(|c| c.id == p.category_id)
                .map(|c| c.name.clone())
                .unwrap_or_else(|| "Laptop".to_string());

            let variants: Vec<&ProductVariant> = store
                .product_variants
                .iter()
                .filter(|v| v.product_id == p.id && v.deleted_at.is_none())
                .collect();

            let min_price = variants.iter().map(|v| v.price_idr).min().unwrap_or(0);
            let max_price = variants.iter().map(|v| v.price_idr).max().unwrap_or(0);
            let primary_sku = variants
                .first()
                .map(|v| v.sku.clone())
                .unwrap_or_else(|| format!("SKU-{}", &p.slug.chars().take(8).collect::<String>()));

            AdminProductListItemDto {
                id: p.id,
                slug: p.slug.clone(),
                name: p.name.clone(),
                brand_id: p.brand_id,
                brand_name,
                category_id: p.category_id,
                category_name,
                segment: p.segment.clone(),
                is_new: p.is_new,
                is_visible: p.is_visible,
                stock_status: p.stock_status.clone(),
                tracked_quantity: p.tracked_quantity,
                min_stock_alert: p.min_stock_alert,
                is_whatsapp_only: p.is_whatsapp_only,
                min_price_idr: min_price,
                max_price_idr: max_price,
                variants_count: variants.len(),
                primary_sku,
                deleted_at: p.deleted_at,
                created_at: p.created_at,
                updated_at: p.updated_at,
            }
        })
        .collect();

    // Sort
    let sort_by = query.sort_by.as_deref().unwrap_or("updated_at");
    let sort_order = query.sort_order.as_deref().unwrap_or("desc");

    list.sort_by(|a, b| match sort_by {
        "name" => {
            if sort_order == "asc" {
                a.name.cmp(&b.name)
            } else {
                b.name.cmp(&a.name)
            }
        }
        "price_idr" => {
            if sort_order == "asc" {
                a.min_price_idr.cmp(&b.min_price_idr)
            } else {
                b.min_price_idr.cmp(&a.min_price_idr)
            }
        }
        "tracked_quantity" => {
            let qa = a.tracked_quantity.unwrap_or(0);
            let qb = b.tracked_quantity.unwrap_or(0);
            if sort_order == "asc" {
                qa.cmp(&qb)
            } else {
                qb.cmp(&qa)
            }
        }
        _ => {
            // updated_at
            if sort_order == "asc" {
                a.updated_at.cmp(&b.updated_at)
            } else {
                b.updated_at.cmp(&a.updated_at)
            }
        }
    });

    let total = list.len();
    let total_pages = if total == 0 { 1 } else { (total + per_page - 1) / per_page };
    let offset = (page - 1) * per_page;

    let paged = list.into_iter().skip(offset).take(per_page).collect();

    Ok(Json(ListAdminProductsResponse {
        products: paged,
        total,
        page,
        per_page,
        total_pages,
    }))
}

/// GET /api/v1/admin/products/:id
pub async fn get_admin_product_detail(
    State(state): State<AppState>,
    _staff: RequireStaff,
    Path(id): Path<Uuid>,
) -> Result<Json<AdminProductDetailResponse>, AppError> {
    let store = state.store.read().await;

    let product = store
        .products
        .iter()
        .find(|p| p.id == id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("Produk ID {} tidak ditemukan", id)))?;

    let brand_name = store
        .brands
        .iter()
        .find(|b| b.id == product.brand_id)
        .map(|b| b.name.clone())
        .unwrap_or_else(|| "GMC".to_string());

    let category_name = store
        .categories
        .iter()
        .find(|c| c.id == product.category_id)
        .map(|c| c.name.clone())
        .unwrap_or_else(|| "Laptop".to_string());

    let variants: Vec<ProductVariant> = store
        .product_variants
        .iter()
        .filter(|v| v.product_id == id && v.deleted_at.is_none())
        .cloned()
        .collect();

    let specs = store.product_specs.get(&id).cloned();

    let variant_ids: Vec<Uuid> = variants.iter().map(|v| v.id).collect();
    let mut price_history: Vec<PriceHistory> = store
        .price_history
        .iter()
        .filter(|h| variant_ids.contains(&h.variant_id))
        .cloned()
        .collect();
    price_history.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(Json(AdminProductDetailResponse {
        product,
        brand_name,
        category_name,
        variants,
        specs,
        price_history,
    }))
}

/// POST /api/v1/admin/products
pub async fn create_product(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<CreateProductRequest>,
) -> Result<(StatusCode, Json<AdminProductDetailResponse>), AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("Nama produk wajib diisi.".to_string()));
    }
    if payload.slug.trim().is_empty() {
        return Err(AppError::BadRequest("Slug produk wajib diisi.".to_string()));
    }
    if payload.variants.is_empty() {
        return Err(AppError::BadRequest("Produk harus memiliki minimal 1 varian / SKU.".to_string()));
    }

    let mut store = state.store.write().await;

    // Check slug uniqueness
    if store.products.iter().any(|p| p.slug == payload.slug) {
        return Err(AppError::BadRequest(format!("Slug '{}' sudah digunakan oleh produk lain.", payload.slug)));
    }

    let now = Utc::now();
    let product_id = Uuid::new_v4();

    let product = Product {
        id: product_id,
        slug: payload.slug.trim().to_lowercase(),
        name: payload.name.trim().to_string(),
        brand_id: payload.brand_id,
        category_id: payload.category_id,
        segment: payload.segment.trim().to_string(),
        is_new: payload.is_new.unwrap_or(false),
        stock_status: payload.variants.first().map(|v| v.stock_status.clone()).unwrap_or_else(|| "in_stock".to_string()),
        is_visible: payload.is_visible.unwrap_or(true),
        is_featured: false,
        tracked_quantity: payload.tracked_quantity,
        min_stock_alert: payload.min_stock_alert.unwrap_or(2),
        is_whatsapp_only: payload.is_whatsapp_only.unwrap_or(false),
        seo_title: payload.seo_title.or_else(|| Some(payload.name.clone())),
        seo_description: payload.seo_description,
        view_count: 0,
        deleted_at: None,
        created_at: now,
        updated_at: now,
    };

    store.products.push(product);

    // Variants
    for v in &payload.variants {
        let variant_id = Uuid::new_v4();
        store.product_variants.push(ProductVariant {
            id: variant_id,
            product_id,
            sku: v.sku.trim().to_uppercase(),
            barcode: v.barcode.clone(),
            color_name: v.color_name.trim().to_string(),
            price_idr: v.price_idr.max(0),
            stock_status: v.stock_status.clone(),
            unit: v.unit.clone().unwrap_or_else(|| "UNIT".to_string()),
            tracked_quantity: v.tracked_quantity,
            is_active: true,
            sort_order: 0,
            deleted_at: None,
            created_at: now,
            updated_at: now,
        });

        // Record initial price history
        store.price_history.push(PriceHistory {
            id: Uuid::new_v4(),
            variant_id,
            old_price_idr: 0,
            new_price_idr: v.price_idr.max(0),
            changed_by: Some(staff.0.user.id),
            source: "create".to_string(),
            created_at: now,
        });
    }

    // Specs
    if let Some(specs_dto) = payload.specs {
        store.product_specs.insert(
            product_id,
            ProductSpec {
                product_id,
                cpu: specs_dto.cpu,
                ram_gb: specs_dto.ram_gb,
                storage: specs_dto.storage,
                gpu: specs_dto.gpu,
                screen_size: specs_dto.screen_size,
                os: specs_dto.os,
                warranty: specs_dto.warranty,
                bundled_items: specs_dto.bundled_items,
                raw_spec_text: specs_dto.raw_spec_text,
                cleaned_description: specs_dto.cleaned_description,
                updated_at: now,
            },
        );
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "create_product",
            "product",
            Some(&product_id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({
                "name": payload.name,
                "slug": payload.slug,
            })),
        )
        .await;

    let detail = get_admin_product_detail(State(state), staff, Path(product_id)).await?;
    Ok((StatusCode::CREATED, detail))
}

/// PUT /api/v1/admin/products/:id
pub async fn update_product(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateProductRequest>,
) -> Result<Json<AdminProductDetailResponse>, AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();

    let product = store
        .products
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Produk ID {} tidak ditemukan", id)))?;

    product.name = payload.name.trim().to_string();
    product.slug = payload.slug.trim().to_lowercase();
    product.brand_id = payload.brand_id;
    product.category_id = payload.category_id;
    product.segment = payload.segment.trim().to_string();
    product.is_new = payload.is_new;
    product.is_visible = payload.is_visible;
    product.is_whatsapp_only = payload.is_whatsapp_only;
    product.stock_status = payload.stock_status;
    product.tracked_quantity = payload.tracked_quantity;
    product.min_stock_alert = payload.min_stock_alert;
    product.seo_title = payload.seo_title;
    product.seo_description = payload.seo_description;
    product.updated_at = now;

    // Check variant price changes to record PriceHistory
    let mut price_changes = Vec::new();
    for v_dto in &payload.variants {
        if let Some(existing_v) = store.product_variants.iter_mut().find(|v| v.product_id == id && v.sku == v_dto.sku) {
            if existing_v.price_idr != v_dto.price_idr {
                price_changes.push((existing_v.id, existing_v.price_idr, v_dto.price_idr));
                existing_v.price_idr = v_dto.price_idr;
            }
            existing_v.stock_status = v_dto.stock_status.clone();
            existing_v.color_name = v_dto.color_name.clone();
            existing_v.tracked_quantity = v_dto.tracked_quantity;
            existing_v.updated_at = now;
        } else {
            // New variant added
            let new_v_id = Uuid::new_v4();
            store.product_variants.push(ProductVariant {
                id: new_v_id,
                product_id: id,
                sku: v_dto.sku.trim().to_uppercase(),
                barcode: v_dto.barcode.clone(),
                color_name: v_dto.color_name.trim().to_string(),
                price_idr: v_dto.price_idr,
                stock_status: v_dto.stock_status.clone(),
                unit: v_dto.unit.clone().unwrap_or_else(|| "UNIT".to_string()),
                tracked_quantity: v_dto.tracked_quantity,
                is_active: true,
                sort_order: 0,
                deleted_at: None,
                created_at: now,
                updated_at: now,
            });
        }
    }

    for (variant_id, old_p, new_p) in price_changes {
        store.price_history.push(PriceHistory {
            id: Uuid::new_v4(),
            variant_id,
            old_price_idr: old_p,
            new_price_idr: new_p,
            changed_by: Some(staff.0.user.id),
            source: "manual".to_string(),
            created_at: now,
        });
    }

    // Specs
    if let Some(specs_dto) = payload.specs {
        store.product_specs.insert(
            id,
            ProductSpec {
                product_id: id,
                cpu: specs_dto.cpu,
                ram_gb: specs_dto.ram_gb,
                storage: specs_dto.storage,
                gpu: specs_dto.gpu,
                screen_size: specs_dto.screen_size,
                os: specs_dto.os,
                warranty: specs_dto.warranty,
                bundled_items: specs_dto.bundled_items,
                raw_spec_text: specs_dto.raw_spec_text,
                cleaned_description: specs_dto.cleaned_description,
                updated_at: now,
            },
        );
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "update_product",
            "product",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "name": payload.name, "slug": payload.slug })),
        )
        .await;

    get_admin_product_detail(State(state), staff, Path(id)).await
}

/// PATCH /api/v1/admin/products/:id/inline
pub async fn inline_update_product(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
    Json(payload): Json<InlineUpdateProductRequest>,
) -> Result<Json<AdminProductDetailResponse>, AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();

    let product = store
        .products
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Produk ID {} tidak ditemukan", id)))?;

    if let Some(stock_status) = payload.stock_status {
        product.stock_status = stock_status;
    }
    if let Some(qty) = payload.tracked_quantity {
        product.tracked_quantity = Some(qty);
    }
    if let Some(vis) = payload.is_visible {
        product.is_visible = vis;
    }
    if let Some(is_new) = payload.is_new {
        product.is_new = is_new;
    }
    product.updated_at = now;

    // Price update across primary variant
    if let Some(new_price) = payload.price_idr {
        let mut price_change = None;
        if let Some(primary_v) = store.product_variants.iter_mut().find(|v| v.product_id == id) {
            if primary_v.price_idr != new_price {
                price_change = Some((primary_v.id, primary_v.price_idr, new_price));
                primary_v.price_idr = new_price;
                primary_v.updated_at = now;
            }
        }
        if let Some((v_id, old_p, new_p)) = price_change {
            store.price_history.push(PriceHistory {
                id: Uuid::new_v4(),
                variant_id: v_id,
                old_price_idr: old_p,
                new_price_idr: new_p,
                changed_by: Some(staff.0.user.id),
                source: "inline".to_string(),
                created_at: now,
            });
        }
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "inline_update_product",
            "product",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "product_id": id })),
        )
        .await;

    get_admin_product_detail(State(state), staff, Path(id)).await
}

/// DELETE /api/v1/admin/products/:id (Soft delete)
pub async fn soft_delete_product(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();

    let product = store
        .products
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Produk ID {} tidak ditemukan", id)))?;

    product.deleted_at = Some(now);
    product.updated_at = now;

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "soft_delete_product",
            "product",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "deleted_at": now })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Produk berhasil dipindahkan ke kotak sampah (trash)"
    })))
}

/// POST /api/v1/admin/products/:id/restore
pub async fn restore_product(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();

    let product = store
        .products
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Produk ID {} tidak ditemukan", id)))?;

    product.deleted_at = None;
    product.updated_at = now;

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "restore_product",
            "product",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "restored": true })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Produk berhasil dipulihkan dari sampah"
    })))
}

/// POST /api/v1/admin/products/:id/duplicate
pub async fn duplicate_product(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
) -> Result<(StatusCode, Json<AdminProductDetailResponse>), AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();

    let original = store
        .products
        .iter()
        .find(|p| p.id == id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("Produk ID {} tidak ditemukan", id)))?;

    let new_id = Uuid::new_v4();
    let rand_suffix = rand::random::<u16>() % 9000 + 1000;
    let new_slug = format!("{}-copy-{}", original.slug, rand_suffix);
    let new_name = format!("{} (Salinan)", original.name);

    let dup_product = Product {
        id: new_id,
        slug: new_slug,
        name: new_name,
        brand_id: original.brand_id,
        category_id: original.category_id,
        segment: original.segment,
        is_new: true,
        stock_status: original.stock_status,
        is_visible: false, // Default hidden so admin can edit first
        is_featured: false,
        tracked_quantity: original.tracked_quantity,
        min_stock_alert: original.min_stock_alert,
        is_whatsapp_only: original.is_whatsapp_only,
        seo_title: Some(format!("{} (Salinan)", original.name)),
        seo_description: original.seo_description,
        view_count: 0,
        deleted_at: None,
        created_at: now,
        updated_at: now,
    };

    store.products.push(dup_product);

    // Duplicate variants
    let orig_variants: Vec<ProductVariant> = store
        .product_variants
        .iter()
        .filter(|v| v.product_id == id && v.deleted_at.is_none())
        .cloned()
        .collect();

    for v in orig_variants {
        let new_v_id = Uuid::new_v4();
        let new_sku = format!("{}-DUP-{}", v.sku, rand_suffix);
        store.product_variants.push(ProductVariant {
            id: new_v_id,
            product_id: new_id,
            sku: new_sku,
            barcode: None,
            color_name: v.color_name,
            price_idr: v.price_idr,
            stock_status: v.stock_status,
            unit: v.unit,
            tracked_quantity: v.tracked_quantity,
            is_active: true,
            sort_order: v.sort_order,
            deleted_at: None,
            created_at: now,
            updated_at: now,
        });
    }

    // Duplicate specs
    if let Some(specs) = store.product_specs.get(&id).cloned() {
        let mut dup_specs = specs;
        dup_specs.product_id = new_id;
        dup_specs.updated_at = now;
        store.product_specs.insert(new_id, dup_specs);
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "duplicate_product",
            "product",
            Some(&new_id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "original_id": id })),
        )
        .await;

    let detail = get_admin_product_detail(State(state), staff, Path(new_id)).await?;
    Ok((StatusCode::CREATED, detail))
}

/// POST /api/v1/admin/products/bulk
pub async fn bulk_product_action(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<BulkProductActionRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();
    let count = payload.product_ids.len();

    match payload.action.as_str() {
        "set_stock_status" => {
            let status_val = payload
                .value
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| "in_stock".to_string());

            for id in &payload.product_ids {
                if let Some(p) = store.products.iter_mut().find(|p| p.id == *id) {
                    p.stock_status = status_val.clone();
                    p.updated_at = now;
                }
                for v in store.product_variants.iter_mut().filter(|v| v.product_id == *id) {
                    v.stock_status = status_val.clone();
                    v.updated_at = now;
                }
            }
        }
        "set_visibility" => {
            let vis_val = payload.value.and_then(|v| v.as_bool()).unwrap_or(true);
            for id in &payload.product_ids {
                if let Some(p) = store.products.iter_mut().find(|p| p.id == *id) {
                    p.is_visible = vis_val;
                    p.updated_at = now;
                }
            }
        }
        "set_is_new" => {
            let is_new_val = payload.value.and_then(|v| v.as_bool()).unwrap_or(true);
            for id in &payload.product_ids {
                if let Some(p) = store.products.iter_mut().find(|p| p.id == *id) {
                    p.is_new = is_new_val;
                    p.updated_at = now;
                }
            }
        }
        "delete" => {
            for id in &payload.product_ids {
                if let Some(p) = store.products.iter_mut().find(|p| p.id == *id) {
                    p.deleted_at = Some(now);
                    p.updated_at = now;
                }
            }
        }
        "restore" => {
            for id in &payload.product_ids {
                if let Some(p) = store.products.iter_mut().find(|p| p.id == *id) {
                    p.deleted_at = None;
                    p.updated_at = now;
                }
            }
        }
        _ => return Err(AppError::BadRequest("Aksi bulk tidak dikenali.".to_string())),
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "bulk_product_action",
            "product",
            None,
            None,
            None,
            None,
            Some(serde_json::json!({
                "action": payload.action,
                "count": count,
            })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "action": payload.action,
        "affected_count": count
    })))
}

/// GET /api/v1/admin/products/data-quality
pub async fn get_data_quality_queue(
    State(state): State<AppState>,
    _staff: RequireStaff,
) -> Result<Json<DataQualityQueueResponse>, AppError> {
    let store = state.store.read().await;

    let mut zero_price_products = Vec::new();
    let mut missing_specs_products = Vec::new();
    let mut low_stock_products = Vec::new();

    for p in store.products.iter().filter(|p| p.deleted_at.is_none()) {
        let brand_name = store
            .brands
            .iter()
            .find(|b| b.id == p.brand_id)
            .map(|b| b.name.clone())
            .unwrap_or_else(|| "GMC".to_string());

        let category_name = store
            .categories
            .iter()
            .find(|c| c.id == p.category_id)
            .map(|c| c.name.clone())
            .unwrap_or_else(|| "Laptop".to_string());

        let variants: Vec<&ProductVariant> = store
            .product_variants
            .iter()
            .filter(|v| v.product_id == p.id && v.deleted_at.is_none())
            .collect();

        let min_price = variants.iter().map(|v| v.price_idr).min().unwrap_or(0);
        let max_price = variants.iter().map(|v| v.price_idr).max().unwrap_or(0);
        let primary_sku = variants
            .first()
            .map(|v| v.sku.clone())
            .unwrap_or_else(|| "SKU-EMPTY".to_string());

        let item_dto = AdminProductListItemDto {
            id: p.id,
            slug: p.slug.clone(),
            name: p.name.clone(),
            brand_id: p.brand_id,
            brand_name,
            category_id: p.category_id,
            category_name,
            segment: p.segment.clone(),
            is_new: p.is_new,
            is_visible: p.is_visible,
            stock_status: p.stock_status.clone(),
            tracked_quantity: p.tracked_quantity,
            min_stock_alert: p.min_stock_alert,
            is_whatsapp_only: p.is_whatsapp_only,
            min_price_idr: min_price,
            max_price_idr: max_price,
            variants_count: variants.len(),
            primary_sku,
            deleted_at: p.deleted_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
        };

        if min_price == 0 {
            zero_price_products.push(item_dto.clone());
        }

        if let Some(spec) = store.product_specs.get(&p.id) {
            if spec.cpu.is_none() || spec.ram_gb.is_none() || spec.storage.is_none() {
                missing_specs_products.push(item_dto.clone());
            }
        } else {
            missing_specs_products.push(item_dto.clone());
        }

        if let Some(qty) = p.tracked_quantity {
            if qty <= p.min_stock_alert {
                low_stock_products.push(item_dto);
            }
        }
    }

    Ok(Json(DataQualityQueueResponse {
        zero_price_products,
        missing_specs_products,
        low_stock_products,
    }))
}

// -------------------------------------------------------------------------------------------------
// CATEGORIES & BRANDS HANDLERS
// -------------------------------------------------------------------------------------------------

/// GET /api/v1/admin/categories
pub async fn list_categories(
    State(state): State<AppState>,
    _staff: RequireStaff,
) -> Result<Json<Vec<Category>>, AppError> {
    let store = state.store.read().await;
    let mut cats = store.categories.clone();
    cats.sort_by(|a, b| a.sort_order.cmp(&b.sort_order));
    Ok(Json(cats))
}

/// POST /api/v1/admin/categories
pub async fn create_category(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<CategoryRequest>,
) -> Result<(StatusCode, Json<Category>), AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();
    let id = Uuid::new_v4();

    let cat = Category {
        id,
        name: payload.name.trim().to_string(),
        slug: payload.slug.trim().to_lowercase(),
        description: payload.description,
        sort_order: payload.sort_order.unwrap_or(0),
        is_active: true,
        deleted_at: None,
        created_at: now,
    };

    store.categories.push(cat.clone());
    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "create_category",
            "category",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "name": payload.name })),
        )
        .await;

    Ok((StatusCode::CREATED, Json(cat)))
}

/// POST /api/v1/admin/categories/merge
pub async fn merge_categories(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<MergeRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let mut moved_count = 0;

    for p in store.products.iter_mut() {
        if p.category_id == payload.source_id {
            p.category_id = payload.target_id;
            p.updated_at = Utc::now();
            moved_count += 1;
        }
    }

    if let Some(cat) = store.categories.iter_mut().find(|c| c.id == payload.source_id) {
        cat.is_active = false;
        cat.deleted_at = Some(Utc::now());
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "merge_categories",
            "category",
            Some(&payload.target_id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({
                "source_id": payload.source_id,
                "moved_products": moved_count,
            })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "moved_products_count": moved_count
    })))
}

/// GET /api/v1/admin/brands
pub async fn list_brands(
    State(state): State<AppState>,
    _staff: RequireStaff,
) -> Result<Json<Vec<Brand>>, AppError> {
    let store = state.store.read().await;
    let mut brands = store.brands.clone();
    brands.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(Json(brands))
}

/// POST /api/v1/admin/brands
pub async fn create_brand(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<BrandRequest>,
) -> Result<(StatusCode, Json<Brand>), AppError> {
    let mut store = state.store.write().await;
    let now = Utc::now();
    let id = Uuid::new_v4();

    let brand = Brand {
        id,
        name: payload.name.trim().to_string(),
        slug: payload.slug.trim().to_lowercase(),
        description: payload.description,
        sort_order: payload.sort_order.unwrap_or(0),
        is_active: true,
        deleted_at: None,
        created_at: now,
    };

    store.brands.push(brand.clone());
    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "create_brand",
            "brand",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "name": payload.name })),
        )
        .await;

    Ok((StatusCode::CREATED, Json(brand)))
}

/// POST /api/v1/admin/brands/merge
pub async fn merge_brands(
    State(state): State<AppState>,
    staff: RequireStaff,
    Json(payload): Json<MergeRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    let mut moved_count = 0;

    for p in store.products.iter_mut() {
        if p.brand_id == payload.source_id {
            p.brand_id = payload.target_id;
            p.updated_at = Utc::now();
            moved_count += 1;
        }
    }

    if let Some(brand) = store.brands.iter_mut().find(|b| b.id == payload.source_id) {
        brand.is_active = false;
        brand.deleted_at = Some(Utc::now());
    }

    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "merge_brands",
            "brand",
            Some(&payload.target_id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({
                "source_id": payload.source_id,
                "moved_products": moved_count,
            })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "moved_products_count": moved_count
    })))
}
