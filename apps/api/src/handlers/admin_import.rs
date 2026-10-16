use crate::domain::models::*;
use crate::error::AppError;
use crate::middleware::RequireAdmin;
use crate::services::catalog_importer::CatalogParser;
use crate::state::AppState;
use axum::{
    extract::{Multipart, State},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportPriceChangeItemDto {
    pub sku: String,
    pub product_name: String,
    pub old_price_idr: i64,
    pub new_price_idr: i64,
    pub diff_idr: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportNewProductItemDto {
    pub sku: String,
    pub name: String,
    pub brand: String,
    pub category: String,
    pub price_idr: i64,
    pub is_new: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportVanishedProductItemDto {
    pub sku: String,
    pub name: String,
    pub current_price_idr: i64,
    pub stock_status: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ImportPreviewResponse {
    pub import_run_id: Uuid,
    pub filename: String,
    pub total_rows: usize,
    pub new_products_count: usize,
    pub price_changes_count: usize,
    pub vanished_products_count: usize,
    pub new_products: Vec<ImportNewProductItemDto>,
    pub price_changes: Vec<ImportPriceChangeItemDto>,
    pub vanished_products: Vec<ImportVanishedProductItemDto>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ApplyImportRequest {
    pub filename: String,
    pub apply_new: bool,
    pub apply_price_changes: bool,
    pub hide_vanished: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ApplyImportResponse {
    pub success: bool,
    pub imported_new_count: usize,
    pub updated_prices_count: usize,
    pub hidden_vanished_count: usize,
    pub message: String,
}

/// POST /api/v1/admin/import/preview
pub async fn preview_import(
    State(state): State<AppState>,
    _admin: RequireAdmin,
    mut multipart: Multipart,
) -> Result<Json<ImportPreviewResponse>, AppError> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut filename = "catalog.xls".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Gagal membaca multipart form: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            if let Some(orig_name) = field.file_name() {
                filename = orig_name.to_string();
            }
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Gagal membaca data file: {}", e)))?;
            file_bytes = Some(data.to_vec());
            break;
        }
    }

    let bytes = match file_bytes {
        Some(b) => b,
        None => {
            // Fallback to local catalog.xls if present
            std::fs::read("catalog.xls").map_err(|_| {
                AppError::BadRequest("File Excel katalog wajib diunggah (.xls atau .xlsx)".to_string())
            })?
        }
    };

    let temp_id = Uuid::new_v4();
    let temp_path = format!("./uploads/temp_import_{}.xls", temp_id);
    let _ = std::fs::create_dir_all("./uploads");
    std::fs::write(&temp_path, &bytes)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menyimpan file sementara: {}", e)))?;

    let parser = CatalogParser::new();
    let parsed_items = parser
        .parse_file(&temp_path)
        .map_err(|e| AppError::BadRequest(format!("Gagal mem-parsing Excel katalog: {}", e)))?;

    let _ = std::fs::remove_file(&temp_path);

    let store = state.store.read().await;

    let mut existing_skus: HashSet<String> = HashSet::new();
    let mut sku_to_price: std::collections::HashMap<String, (String, i64)> =
        std::collections::HashMap::new();

    for v in &store.product_variants {
        existing_skus.insert(v.sku.clone());
        let prod_name = store
            .products
            .iter()
            .find(|p| p.id == v.product_id)
            .map(|p| p.name.clone())
            .unwrap_or_else(|| "Produk".to_string());
        sku_to_price.insert(v.sku.clone(), (prod_name, v.price_idr));
    }

    let mut new_products = Vec::new();
    let mut price_changes = Vec::new();
    let mut imported_skus: HashSet<String> = HashSet::new();

    for item in &parsed_items {
        imported_skus.insert(item.sku.clone());

        if let Some((pname, old_price)) = sku_to_price.get(&item.sku) {
            if *old_price != item.price_idr && item.price_idr > 0 {
                price_changes.push(ImportPriceChangeItemDto {
                    sku: item.sku.clone(),
                    product_name: pname.clone(),
                    old_price_idr: *old_price,
                    new_price_idr: item.price_idr,
                    diff_idr: item.price_idr - *old_price,
                });
            }
        } else {
            new_products.push(ImportNewProductItemDto {
                sku: item.sku.clone(),
                name: item.raw_name.clone(),
                brand: item.brand.clone(),
                category: item.category.clone(),
                price_idr: item.price_idr,
                is_new: item.is_new,
            });
        }
    }

    let mut vanished_products = Vec::new();
    for v in &store.product_variants {
        if !imported_skus.contains(&v.sku) && v.deleted_at.is_none() {
            let prod_name = store
                .products
                .iter()
                .find(|p| p.id == v.product_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| "Produk".to_string());

            vanished_products.push(ImportVanishedProductItemDto {
                sku: v.sku.clone(),
                name: prod_name,
                current_price_idr: v.price_idr,
                stock_status: v.stock_status.clone(),
            });
        }
    }

    Ok(Json(ImportPreviewResponse {
        import_run_id: temp_id,
        filename,
        total_rows: parsed_items.len(),
        new_products_count: new_products.len(),
        price_changes_count: price_changes.len(),
        vanished_products_count: vanished_products.len(),
        new_products,
        price_changes,
        vanished_products,
    }))
}

/// POST /api/v1/admin/import/apply
pub async fn apply_import(
    State(state): State<AppState>,
    admin: RequireAdmin,
    Json(payload): Json<ApplyImportRequest>,
) -> Result<Json<ApplyImportResponse>, AppError> {
    let parser = CatalogParser::new();
    let file_path = if std::path::Path::new(&payload.filename).exists() {
        payload.filename.clone()
    } else {
        "catalog.xls".to_string()
    };

    let parsed_items = parser.parse_file(&file_path).map_err(|e| {
        AppError::BadRequest(format!("Gagal membaca catalog file '{}': {}", file_path, e))
    })?;

    let grouped_products = parser.group_products(&parsed_items);

    let mut store = state.store.write().await;
    let now = Utc::now();
    let mut imported_new_count = 0;
    let mut updated_prices_count = 0;
    let mut hidden_vanished_count = 0;

    // 1. Brand & Category Maps
    let mut brand_map: std::collections::HashMap<String, Uuid> = store
        .brands
        .iter()
        .map(|b| (b.name.to_lowercase(), b.id))
        .collect();
    let mut cat_map: std::collections::HashMap<String, Uuid> = store
        .categories
        .iter()
        .map(|c| (c.name.to_lowercase(), c.id))
        .collect();

    // 2. Existing variants map
    let mut existing_variants: std::collections::HashMap<String, (Uuid, i64)> = store
        .product_variants
        .iter()
        .map(|v| (v.sku.clone(), (v.id, v.price_idr)))
        .collect();

    let mut imported_skus: HashSet<String> = HashSet::new();

    for g_prod in grouped_products {
        let b_id = *brand_map
            .entry(g_prod.brand.to_lowercase())
            .or_insert_with(|| {
                let id = Uuid::new_v4();
                store.brands.push(Brand {
                    id,
                    name: g_prod.brand.clone(),
                    slug: g_prod.brand.to_lowercase().replace(' ', "-"),
                    description: None,
                    sort_order: 0,
                    is_active: true,
                    deleted_at: None,
                    created_at: now,
                });
                id
            });

        let c_id = *cat_map
            .entry(g_prod.category.to_lowercase())
            .or_insert_with(|| {
                let id = Uuid::new_v4();
                store.categories.push(Category {
                    id,
                    name: g_prod.category.clone(),
                    slug: g_prod.category.to_lowercase().replace(' ', "-"),
                    description: None,
                    sort_order: 0,
                    is_active: true,
                    deleted_at: None,
                    created_at: now,
                });
                id
            });

        for var in &g_prod.variants {
            imported_skus.insert(var.sku.clone());

            if let Some((v_id, old_price)) = existing_variants.get(&var.sku) {
                // Price Update
                if payload.apply_price_changes && *old_price != var.price_idr && var.price_idr > 0 {
                    if let Some(v) = store.product_variants.iter_mut().find(|v| v.id == *v_id) {
                        v.price_idr = var.price_idr;
                        v.updated_at = now;
                    }
                    store.price_history.push(PriceHistory {
                        id: Uuid::new_v4(),
                        variant_id: *v_id,
                        old_price_idr: *old_price,
                        new_price_idr: var.price_idr,
                        changed_by: Some(admin.0.user.id),
                        source: "excel_import".to_string(),
                        created_at: now,
                    });
                    updated_prices_count += 1;
                }
            } else if payload.apply_new {
                // New Product & Variant Creation
                let prod_id = Uuid::new_v4();
                store.products.push(Product {
                    id: prod_id,
                    slug: format!("{}-{}", g_prod.slug, &prod_id.to_string()[..6]),
                    name: g_prod.name.clone(),
                    brand_id: b_id,
                    category_id: c_id,
                    segment: g_prod.segment.clone(),
                    is_new: g_prod.is_new,
                    stock_status: var.stock_status.clone(),
                    is_visible: true,
                    is_featured: false,
                    tracked_quantity: Some(5),
                    min_stock_alert: 2,
                    is_whatsapp_only: var.price_idr == 0,
                    seo_title: Some(g_prod.name.clone()),
                    seo_description: None,
                    view_count: 0,
                    deleted_at: None,
                    created_at: now,
                    updated_at: now,
                });

                let new_v_id = Uuid::new_v4();
                store.product_variants.push(ProductVariant {
                    id: new_v_id,
                    product_id: prod_id,
                    sku: var.sku.clone(),
                    barcode: None,
                    color_name: var.color_name.clone(),
                    price_idr: var.price_idr,
                    stock_status: var.stock_status.clone(),
                    unit: "UNIT".to_string(),
                    tracked_quantity: Some(5),
                    is_active: true,
                    sort_order: 0,
                    deleted_at: None,
                    created_at: now,
                    updated_at: now,
                });

                existing_variants.insert(var.sku.clone(), (new_v_id, var.price_idr));
                imported_new_count += 1;
            }
        }
    }

    // 3. Vanished Products Handling
    if payload.hide_vanished {
        for v in store.product_variants.iter_mut() {
            if !imported_skus.contains(&v.sku) && v.deleted_at.is_none() {
                v.stock_status = "out_of_stock".to_string();
                hidden_vanished_count += 1;
            }
        }
    }

    // 4. Save ImportRun Record
    let run_id = Uuid::new_v4();
    store.import_runs.push(ImportRun {
        id: run_id,
        filename: payload.filename.clone(),
        total_rows: parsed_items.len() as i32,
        imported_count: imported_new_count as i32,
        updated_count: updated_prices_count as i32,
        skipped_count: 0,
        report_json: Some(serde_json::json!({
            "imported_new": imported_new_count,
            "updated_prices": updated_prices_count,
            "hidden_vanished": hidden_vanished_count,
        })),
        created_at: now,
    });

    drop(store);

    state
        .record_audit_log(
            Some(admin.0.user.id),
            Some(admin.0.user.email.clone()),
            "apply_catalog_import",
            "catalog",
            Some(&run_id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({
                "imported_new": imported_new_count,
                "updated_prices": updated_prices_count,
                "hidden_vanished": hidden_vanished_count,
            })),
        )
        .await;

    Ok(Json(ApplyImportResponse {
        success: true,
        imported_new_count,
        updated_prices_count,
        hidden_vanished_count,
        message: format!(
            "Impor berhasil diterapkan: {} produk baru, {} harga diperbarui, {} produk diset stok habis.",
            imported_new_count, updated_prices_count, hidden_vanished_count
        ),
    }))
}

/// GET /api/v1/admin/import/history
pub async fn list_import_history(
    State(state): State<AppState>,
    _admin: RequireAdmin,
) -> Result<Json<Vec<ImportRun>>, AppError> {
    let store = state.store.read().await;
    let mut history = store.import_runs.clone();
    history.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(Json(history))
}
