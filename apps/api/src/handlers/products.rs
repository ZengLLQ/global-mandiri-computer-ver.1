use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Deserialize, IntoParams)]
pub struct ProductQuery {
    pub brand: Option<String>,
    pub category: Option<String>,
    pub segment: Option<String>,
    pub search: Option<String>,
    pub page: Option<usize>,
    pub limit: Option<usize>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ProductListResponse {
    pub total: usize,
    pub page: usize,
    pub limit: usize,
    pub items: Vec<serde_json::Value>,
}

#[utoipa::path(
    get,
    path = "/api/v1/products",
    params(ProductQuery),
    responses(
        (status = 200, description = "List products successfully", body = ProductListResponse)
    ),
    tag = "Products"
)]
pub async fn list_products(Query(params): Query<ProductQuery>) -> impl IntoResponse {
    // If catalog_seed.json exists, read and filter
    let file_path = "catalog_seed.json";
    let alt_path = "apps/web/src/lib/catalog_seed.json";

    let content = std::fs::read_to_string(file_path)
        .or_else(|_| std::fs::read_to_string(alt_path))
        .unwrap_or_else(|_| "[]".to_string());

    let all_products: Vec<serde_json::Value> = serde_json::from_str(&content).unwrap_or_default();

    let filtered: Vec<serde_json::Value> = all_products
        .into_iter()
        .filter(|p| {
            if let Some(ref brand) = params.brand {
                if let Some(p_brand) = p.get("brand").and_then(|b| b.as_str()) {
                    if !p_brand.eq_ignore_ascii_case(brand) {
                        return false;
                    }
                }
            }
            if let Some(ref cat) = params.category {
                if let Some(p_cat) = p.get("category").and_then(|c| c.as_str()) {
                    if !p_cat.to_lowercase().contains(&cat.to_lowercase()) {
                        return false;
                    }
                }
            }
            if let Some(ref search) = params.search {
                let s = search.to_lowercase();
                let name = p.get("name").and_then(|n| n.as_str()).unwrap_or("").to_lowercase();
                if !name.contains(&s) {
                    return false;
                }
            }
            true
        })
        .collect();

    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(12);
    let total = filtered.len();

    let start = (page.saturating_sub(1)) * limit;
    let paginated_items = filtered.into_iter().skip(start).take(limit).collect();

    Json(ProductListResponse {
        total,
        page,
        limit,
        items: paginated_items,
    })
}

#[utoipa::path(
    get,
    path = "/api/v1/products/{slug}",
    params(
        ("slug" = String, Path, description = "Product slug identifier")
    ),
    responses(
        (status = 200, description = "Product details retrieved"),
        (status = 404, description = "Product not found")
    ),
    tag = "Products"
)]
pub async fn get_product_by_slug(Path(slug): Path<String>) -> impl IntoResponse {
    let file_path = "catalog_seed.json";
    let alt_path = "apps/web/src/lib/catalog_seed.json";

    let content = std::fs::read_to_string(file_path)
        .or_else(|_| std::fs::read_to_string(alt_path))
        .unwrap_or_else(|_| "[]".to_string());

    let all_products: Vec<serde_json::Value> = serde_json::from_str(&content).unwrap_or_default();

    if let Some(product) = all_products.into_iter().find(|p| {
        p.get("slug").and_then(|s| s.as_str()) == Some(&slug)
    }) {
        (StatusCode::OK, Json(product)).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Product not found" }))).into_response()
    }
}
