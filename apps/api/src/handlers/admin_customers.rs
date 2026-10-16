use crate::domain::models::*;
use crate::error::AppError;
use crate::middleware::RequireStaff;
use crate::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListCustomersQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
    pub search: Option<String>,
    pub tag: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CustomerListItemDto {
    pub id: Uuid,
    pub name: String,
    pub phone: String,
    pub email: Option<String>,
    pub total_orders: usize,
    pub total_spent_idr: i64,
    pub last_order_at: Option<DateTime<Utc>>,
    pub tags: Vec<String>,
    pub notes_count: usize,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListCustomersResponse {
    pub customers: Vec<CustomerListItemDto>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CustomerNoteDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub author_name: String,
    pub note: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CustomerDetailResponse {
    pub customer: CustomerListItemDto,
    pub orders: Vec<Order>,
    pub notes: Vec<CustomerNoteDto>,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddCustomerNoteRequest {
    pub note: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddCustomerTagRequest {
    pub tag: String,
}

/// Helper function to build aggregated customer records from registered users and orders
pub fn aggregate_customers(store: &crate::state::MemoryStore) -> Vec<CustomerListItemDto> {
    let mut customers_map: HashMap<String, CustomerListItemDto> = HashMap::new();

    // 1. Registered users with role "customer"
    for user in store.users.values().filter(|u| u.role == "customer") {
        let key = user.phone.clone().unwrap_or_else(|| user.id.to_string());
        let tags: Vec<String> = store
            .customer_tags
            .iter()
            .filter(|t| t.user_id == user.id)
            .map(|t| t.tag.clone())
            .collect();
        let notes_count = store
            .customer_notes
            .iter()
            .filter(|n| n.user_id == user.id)
            .count();

        customers_map.insert(
            key,
            CustomerListItemDto {
                id: user.id,
                name: user.full_name.clone(),
                phone: user.phone.clone().unwrap_or_default(),
                email: Some(user.email.clone()),
                total_orders: 0,
                total_spent_idr: 0,
                last_order_at: None,
                tags,
                notes_count,
                created_at: user.created_at,
            },
        );
    }

    // 2. Aggregate from orders
    for order in store.orders.values() {
        if order.status == "cancelled" {
            continue;
        }

        let phone = order.customer_phone.clone();
        let entry = customers_map.entry(phone.clone()).or_insert_with(|| {
            let id = order.user_id.unwrap_or_else(|| {
                let mut bytes = [0u8; 16];
                for (i, b) in phone.as_bytes().iter().enumerate().take(16) {
                    bytes[i] = *b;
                }
                Uuid::from_bytes(bytes)
            });
            let tags: Vec<String> = store
                .customer_tags
                .iter()
                .filter(|t| t.user_id == id)
                .map(|t| t.tag.clone())
                .collect();
            let notes_count = store
                .customer_notes
                .iter()
                .filter(|n| n.user_id == id)
                .count();

            CustomerListItemDto {
                id,
                name: order.customer_name.clone(),
                phone: phone.clone(),
                email: None,
                total_orders: 0,
                total_spent_idr: 0,
                last_order_at: None,
                tags,
                notes_count,
                created_at: order.created_at,
            }
        });

        entry.total_orders += 1;
        if order.status == "paid" || order.status == "packed" || order.status == "done" {
            entry.total_spent_idr += order.total_amount_idr;
        }

        if entry.last_order_at.map_or(true, |d| order.created_at > d) {
            entry.last_order_at = Some(order.created_at);
        }
    }

    customers_map.into_values().collect()
}

/// GET /api/v1/admin/customers
pub async fn list_customers(
    State(state): State<AppState>,
    _staff: RequireStaff,
    Query(query): Query<ListCustomersQuery>,
) -> Result<Json<ListCustomersResponse>, AppError> {
    let store = state.store.read().await;
    let mut customers = aggregate_customers(&store);

    let search = query.search.as_deref().unwrap_or("").trim().to_lowercase();
    let tag_filter = query.tag.as_deref().unwrap_or("").trim().to_lowercase();

    customers.retain(|c| {
        if !search.is_empty() {
            let matches_name = c.name.to_lowercase().contains(&search);
            let matches_phone = c.phone.to_lowercase().contains(&search);
            let matches_email = c.email.as_deref().map_or(false, |e| e.to_lowercase().contains(&search));
            if !matches_name && !matches_phone && !matches_email {
                return false;
            }
        }

        if !tag_filter.is_empty() && tag_filter != "all" {
            if !c.tags.iter().any(|t| t.to_lowercase() == tag_filter) {
                return false;
            }
        }

        true
    });

    let sort_by = query.sort_by.as_deref().unwrap_or("total_spent");
    let sort_order = query.sort_order.as_deref().unwrap_or("desc");

    customers.sort_by(|a, b| {
        let cmp = match sort_by {
            "name" => a.name.cmp(&b.name),
            "total_orders" => a.total_orders.cmp(&b.total_orders),
            "created_at" => a.created_at.cmp(&b.created_at),
            "last_order_at" => a.last_order_at.cmp(&b.last_order_at),
            _ => a.total_spent_idr.cmp(&b.total_spent_idr),
        };
        if sort_order == "desc" {
            cmp.reverse()
        } else {
            cmp
        }
    });

    let total = customers.len();
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).max(1).min(100);
    let total_pages = (total + per_page - 1) / per_page;

    let start = (page - 1) * per_page;
    let paginated_customers = if start >= total {
        Vec::new()
    } else {
        customers.into_iter().skip(start).take(per_page).collect()
    };

    Ok(Json(ListCustomersResponse {
        customers: paginated_customers,
        total,
        page,
        per_page,
        total_pages: total_pages.max(1),
    }))
}

/// GET /api/v1/admin/customers/:id
pub async fn get_customer_detail(
    State(state): State<AppState>,
    _staff: RequireStaff,
    Path(id): Path<Uuid>,
) -> Result<Json<CustomerDetailResponse>, AppError> {
    let store = state.store.read().await;
    let customers = aggregate_customers(&store);

    let customer = customers
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::NotFound(format!("Pelanggan dengan ID {} tidak ditemukan", id)))?;

    // Find orders belonging to customer (by phone or user_id)
    let mut orders: Vec<Order> = store
        .orders
        .values()
        .filter(|o| o.user_id == Some(id) || o.customer_phone == customer.phone)
        .cloned()
        .collect();
    orders.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Find notes
    let notes: Vec<CustomerNoteDto> = store
        .customer_notes
        .iter()
        .filter(|n| n.user_id == id)
        .map(|n| {
            let author_name = n
                .author_id
                .and_then(|aid| store.users.get(&aid).map(|u| u.full_name.clone()))
                .unwrap_or_else(|| "Staff Toko".to_string());
            CustomerNoteDto {
                id: n.id,
                user_id: n.user_id,
                author_name,
                note: n.note.clone(),
                created_at: n.created_at,
            }
        })
        .collect();

    // Find tags
    let tags: Vec<String> = store
        .customer_tags
        .iter()
        .filter(|t| t.user_id == id)
        .map(|t| t.tag.clone())
        .collect();

    Ok(Json(CustomerDetailResponse {
        customer,
        orders,
        notes,
        tags,
    }))
}

/// POST /api/v1/admin/customers/:id/notes
pub async fn add_customer_note(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddCustomerNoteRequest>,
) -> Result<(StatusCode, Json<CustomerNoteDto>), AppError> {
    if payload.note.trim().is_empty() {
        return Err(AppError::BadRequest("Catatan tidak boleh kosong".to_string()));
    }

    let mut store = state.store.write().await;
    let note_id = Uuid::new_v4();
    let now = Utc::now();

    let note = CustomerNote {
        id: note_id,
        user_id: id,
        author_id: Some(staff.0.user.id),
        note: payload.note.trim().to_string(),
        created_at: now,
    };

    store.customer_notes.push(note.clone());
    let author_name = staff.0.user.full_name.clone();
    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "add_customer_note",
            "customer",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "note": payload.note })),
        )
        .await;

    Ok((
        StatusCode::CREATED,
        Json(CustomerNoteDto {
            id: note_id,
            user_id: id,
            author_name,
            note: payload.note.trim().to_string(),
            created_at: now,
        }),
    ))
}

/// POST /api/v1/admin/customers/:id/tags
pub async fn add_customer_tag(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddCustomerTagRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let clean_tag = payload.tag.trim().to_string();
    if clean_tag.is_empty() {
        return Err(AppError::BadRequest("Tag tidak boleh kosong".to_string()));
    }

    let mut store = state.store.write().await;
    let exists = store
        .customer_tags
        .iter()
        .any(|t| t.user_id == id && t.tag.eq_ignore_ascii_case(&clean_tag));

    if !exists {
        store.customer_tags.push(CustomerTag {
            id: Uuid::new_v4(),
            user_id: id,
            tag: clean_tag.clone(),
            created_at: Utc::now(),
        });
    }
    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "add_customer_tag",
            "customer",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "tag": clean_tag })),
        )
        .await;

    Ok(Json(serde_json::json!({ "success": true, "tag": clean_tag })))
}

/// DELETE /api/v1/admin/customers/:id/tags/:tag
pub async fn remove_customer_tag(
    State(state): State<AppState>,
    staff: RequireStaff,
    Path((id, tag)): Path<(Uuid, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut store = state.store.write().await;
    store
        .customer_tags
        .retain(|t| !(t.user_id == id && t.tag.eq_ignore_ascii_case(&tag)));
    drop(store);

    state
        .record_audit_log(
            Some(staff.0.user.id),
            Some(staff.0.user.email.clone()),
            "remove_customer_tag",
            "customer",
            Some(&id.to_string()),
            None,
            None,
            None,
            Some(serde_json::json!({ "tag": tag })),
        )
        .await;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// GET /api/v1/admin/customers/export-csv
pub async fn export_customers_csv(
    State(state): State<AppState>,
    _staff: RequireStaff,
) -> Result<(HeaderMap, Vec<u8>), AppError> {
    let store = state.store.read().await;
    let customers = aggregate_customers(&store);

    let mut csv_data = String::new();
    // UTF-8 BOM for Microsoft Excel
    csv_data.push('\u{FEFF}');
    csv_data.push_str("Nama Pelanggan,No. Telepon,Email,Total Pesanan,Total Belanja (IDR),Tag Pelanggan,Terdaftar Sejak\r\n");

    for c in customers {
        let email_str = c.email.as_deref().unwrap_or("-");
        let tags_str = c.tags.join("; ");
        let created_str = c.created_at.format("%Y-%m-%d %H:%M:%S").to_string();

        csv_data.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",{},{},\"{}\",\"{}\"\r\n",
            c.name.replace('"', "\"\""),
            c.phone.replace('"', "\"\""),
            email_str.replace('"', "\"\""),
            c.total_orders,
            c.total_spent_idr,
            tags_str.replace('"', "\"\""),
            created_str
        ));
    }

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"customers_gmc.csv\""),
    );

    Ok((headers, csv_data.into_bytes()))
}
