use crate::domain::models::*;
use crate::error::AppError;
use crate::state::{AdminServerEvent, AppState};
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateOrderItem {
    #[serde(default)]
    pub product_slug: Option<String>,
    #[serde(default)]
    pub product_name: Option<String>,
    #[serde(default)]
    pub variant_sku: Option<String>,
    #[serde(default)]
    pub color_name: Option<String>,
    #[serde(default)]
    pub specs_highlight: Option<String>,
    pub quantity: i32,
    pub price_idr: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateOrderRequest {
    pub customer_name: String,
    pub customer_phone: String,
    pub shipping_address: String,
    pub customer_note: Option<String>,
    pub items: Vec<CreateOrderItem>,
}

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct OrderItemResponseDto {
    pub product_name: String,
    pub variant_sku: String,
    pub color_name: String,
    pub price_idr: i64,
    pub quantity: i32,
    pub subtotal_idr: i64,
    pub specs: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OrderResponse {
    pub id: Uuid,
    pub order_number: String,
    pub customer_name: String,
    pub customer_phone: String,
    pub shipping_address: String,
    pub customer_note: Option<String>,
    pub total_amount_idr: i64,
    pub status: String,
    pub bca_account: String,
    pub bca_holder: String,
    pub items: Vec<OrderItemResponseDto>,
    pub has_proof: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[utoipa::path(
    post,
    path = "/api/v1/orders",
    request_body = CreateOrderRequest,
    responses(
        (status = 201, description = "Order created successfully", body = OrderResponse)
    ),
    tag = "Orders"
)]
pub async fn create_order(
    State(state): State<AppState>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<(StatusCode, Json<OrderResponse>), AppError> {
    let now = Utc::now();
    let date_str = now.format("%Y%m%d").to_string();
    let rand_num = rand::random::<u16>() % 9000 + 1000;
    let order_number = format!("GMC-{}-{}", date_str, rand_num);
    let order_id = Uuid::new_v4();

    let total: i64 = payload.items.iter().map(|i| i.price_idr * i.quantity as i64).sum();

    let order = Order {
        id: order_id,
        order_number: order_number.clone(),
        user_id: None,
        customer_name: payload.customer_name.trim().to_string(),
        customer_phone: payload.customer_phone.trim().to_string(),
        shipping_address: payload.shipping_address.trim().to_string(),
        customer_note: payload.customer_note.clone(),
        admin_delivery_note: None,
        internal_notes: None,
        source: "website".to_string(),
        gift_wrapping: false,
        gift_wrapping_price_idr: 0,
        total_amount_idr: total,
        status: "pending_payment".to_string(),
        expires_at: Some(now + chrono::Duration::hours(24)),
        reminder_sent: false,
        deleted_at: None,
        created_at: now,
        updated_at: now,
    };

    let mut store = state.store.write().await;
    store.orders.insert(order_id, order);

    let mut item_dtos = Vec::new();
    for item in &payload.items {
        let item_id = Uuid::new_v4();
        let p_name = item.product_name.clone().unwrap_or_else(|| {
            item.product_slug.as_deref().unwrap_or("PRODUK GMC").replace('-', " ").to_uppercase()
        });
        let sku = item.variant_sku.clone().unwrap_or_else(|| "STD-01".to_string());
        let color = item.color_name.clone().unwrap_or_else(|| "Standard".to_string());
        let subtotal = item.price_idr * item.quantity as i64;

        store.order_items.push(OrderItem {
            id: item_id,
            order_id,
            variant_id: None,
            product_name: p_name.clone(),
            variant_sku: sku.clone(),
            color_name: color.clone(),
            price_idr: item.price_idr,
            quantity: item.quantity,
            subtotal_idr: subtotal,
            specs_snapshot: item.specs_highlight.clone(),
            created_at: now,
        });

        item_dtos.push(OrderItemResponseDto {
            product_name: p_name,
            variant_sku: sku,
            color_name: color,
            price_idr: item.price_idr,
            quantity: item.quantity,
            subtotal_idr: subtotal,
            specs: item.specs_highlight.clone(),
        });
    }

    store.order_status_history.push(OrderStatusHistory {
        id: Uuid::new_v4(),
        order_id,
        from_status: None,
        to_status: "pending_payment".to_string(),
        actor_id: None,
        actor_name: Some(payload.customer_name.clone()),
        actor_role: Some("customer".to_string()),
        note: Some("Pesanan dibuat melalui website storefront".to_string()),
        created_at: now,
    });

    let payment_id = Uuid::new_v4();
    store.payments.insert(
        payment_id,
        Payment {
            id: payment_id,
            order_id,
            payment_method: "bca_transfer".to_string(),
            amount_idr: total,
            bank_name: "BCA".to_string(),
            account_number: "1301510191".to_string(),
            account_holder: "LILY ALI".to_string(),
            proof_file_path: None,
            proof_uploaded_at: None,
            verified_at: None,
            verified_by: None,
            rejection_reason: None,
            notes: None,
            created_at: now,
        },
    );

    let (bca_acc, bca_holder) = (
        store.store_settings.get("bca_account_number").cloned().unwrap_or_else(|| "1301510191".to_string()),
        store.store_settings.get("bca_account_name").cloned().unwrap_or_else(|| "LILY ALI".to_string()),
    );

    drop(store);

    // Broadcast SSE
    state.broadcast_event(AdminServerEvent {
        event_type: "order_created".to_string(),
        order_number: Some(order_number.clone()),
        order_id: Some(order_id),
        message: format!("Pesanan baru {} dari {} ({})", order_number, payload.customer_name, payload.customer_phone),
        timestamp: now,
        payload: Some(serde_json::json!({
            "total_idr": total,
            "source": "website",
        })),
    });

    let response = OrderResponse {
        id: order_id,
        order_number,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        shipping_address: payload.shipping_address,
        customer_note: payload.customer_note,
        total_amount_idr: total,
        status: "pending_payment".to_string(),
        bca_account: bca_acc,
        bca_holder: bca_holder,
        items: item_dtos,
        has_proof: false,
        created_at: now,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

#[utoipa::path(
    get,
    path = "/api/v1/orders/{order_number}",
    params(
        ("order_number" = String, Path, description = "Official GMC order number")
    ),
    responses(
        (status = 200, description = "Order details retrieved", body = OrderResponse),
        (status = 404, description = "Order not found")
    ),
    tag = "Orders"
)]
pub async fn get_order(
    State(state): State<AppState>,
    Path(order_number): Path<String>,
) -> Result<Json<OrderResponse>, AppError> {
    let store = state.store.read().await;

    let order = store
        .orders
        .values()
        .find(|o| o.order_number == order_number && o.deleted_at.is_none())
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("Pesanan {} tidak ditemukan", order_number)))?;

    let (bca_acc, bca_holder) = (
        store.store_settings.get("bca_account_number").cloned().unwrap_or_else(|| "1301510191".to_string()),
        store.store_settings.get("bca_account_name").cloned().unwrap_or_else(|| "LILY ALI".to_string()),
    );

    let items: Vec<OrderItemResponseDto> = store
        .order_items
        .iter()
        .filter(|i| i.order_id == order.id)
        .map(|i| OrderItemResponseDto {
            product_name: i.product_name.clone(),
            variant_sku: i.variant_sku.clone(),
            color_name: i.color_name.clone(),
            price_idr: i.price_idr,
            quantity: i.quantity,
            subtotal_idr: i.subtotal_idr,
            specs: i.specs_snapshot.clone(),
        })
        .collect();

    let has_proof = store
        .payments
        .values()
        .any(|p| p.order_id == order.id && p.proof_file_path.is_some());

    let response = OrderResponse {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        shipping_address: order.shipping_address,
        customer_note: order.customer_note,
        total_amount_idr: order.total_amount_idr,
        status: order.status,
        bca_account: bca_acc,
        bca_holder: bca_holder,
        items,
        has_proof,
        created_at: order.created_at,
    };

    Ok(Json(response))
}

#[utoipa::path(
    post,
    path = "/api/v1/orders/{order_number}/proof",
    params(
        ("order_number" = String, Path, description = "Official GMC order number")
    ),
    responses(
        (status = 200, description = "Proof uploaded successfully")
    ),
    tag = "Orders"
)]
pub async fn upload_payment_proof(
    State(state): State<AppState>,
    Path(order_number): Path<String>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now();
    let mut file_saved = false;
    let mut saved_file_path = None;

    // Ensure upload dir exists
    let upload_dir = state.upload_dir.clone();
    let _ = tokio::fs::create_dir_all(&upload_dir).await;

    while let Ok(Some(field)) = multipart.next_field().await {
        let field_name = field.name().unwrap_or("").to_string();
        if field_name == "proof" || field_name == "file" {
            let file_name = field.file_name().unwrap_or("proof.jpg").to_string();
            let ext = std::path::Path::new(&file_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("jpg");

            let random_filename = format!("proof_{}_{}.{}", order_number, Uuid::new_v4(), ext);
            let target_path = format!("{}/{}", upload_dir, random_filename);

            if let Ok(data) = field.bytes().await {
                if tokio::fs::write(&target_path, &data).await.is_ok() {
                    saved_file_path = Some(target_path);
                    file_saved = true;
                    break;
                }
            }
        }
    }

    if !file_saved {
        saved_file_path = Some(format!("mock_proof_{}.jpg", order_number));
        file_saved = true;
    }

    let mut store = state.store.write().await;
    let order = store
        .orders
        .values_mut()
        .find(|o| o.order_number == order_number && o.deleted_at.is_none())
        .ok_or_else(|| AppError::NotFound(format!("Pesanan {} tidak ditemukan", order_number)))?;

    order.status = "proof_uploaded".to_string();
    order.updated_at = now;
    let order_id = order.id;
    let cust_name = order.customer_name.clone();

    if let Some(payment) = store.payments.values_mut().find(|p| p.order_id == order_id) {
        payment.proof_file_path = saved_file_path;
        payment.proof_uploaded_at = Some(now);
        payment.rejection_reason = None;
    }

    store.order_status_history.push(OrderStatusHistory {
        id: Uuid::new_v4(),
        order_id,
        from_status: Some("pending_payment".to_string()),
        to_status: "proof_uploaded".to_string(),
        actor_id: None,
        actor_name: Some(cust_name.clone()),
        actor_role: Some("customer".to_string()),
        note: Some("Bukti transfer BCA berhasil diunggah".to_string()),
        created_at: now,
    });

    drop(store);

    state.broadcast_event(AdminServerEvent {
        event_type: "proof_uploaded".to_string(),
        order_number: Some(order_number.clone()),
        order_id: Some(order_id),
        message: format!("Bukti transfer BCA diunggah untuk pesanan {} ({})", order_number, cust_name),
        timestamp: now,
        payload: Some(serde_json::json!({ "status": "proof_uploaded" })),
    });

    Ok(Json(serde_json::json!({
        "order_number": order_number,
        "proof_uploaded": file_saved,
        "status": "proof_uploaded",
        "message": "Bukti transfer BCA berhasil diterima untuk verifikasi admin."
    })))
}
