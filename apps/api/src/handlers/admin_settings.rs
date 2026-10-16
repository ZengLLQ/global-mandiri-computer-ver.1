use crate::error::AppError;
use crate::middleware::{RequireAdmin, RequireOwner};
use crate::state::{verify_password, AppState};
use axum::{
    extract::State,
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminSettingsResponse {
    pub store_name: String,
    pub store_address: String,
    pub store_phone: String,
    pub whatsapp_number: String,
    pub opening_hours: String,
    pub auto_cancel_hours: i32,
    pub bca_bank_name: String,
    pub bca_account_number_masked: String,
    pub bca_account_holder_masked: String,
    pub bca_branch: String,
    pub is_bca_revealed: bool,
    pub wa_template_reminder: String,
    pub wa_template_paid: String,
    pub wa_template_packed: String,
    pub wa_template_pickup: String,
    pub wa_template_shipped: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyPasswordRequest {
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateSettingsRequest {
    pub store_name: Option<String>,
    pub store_address: Option<String>,
    pub store_phone: Option<String>,
    pub whatsapp_number: Option<String>,
    pub opening_hours: Option<String>,
    pub auto_cancel_hours: Option<i32>,
    pub bca_bank_name: Option<String>,
    pub bca_account_number: Option<String>,
    pub bca_account_holder: Option<String>,
    pub bca_branch: Option<String>,
    pub wa_template_reminder: Option<String>,
    pub wa_template_paid: Option<String>,
    pub wa_template_packed: Option<String>,
    pub wa_template_pickup: Option<String>,
    pub wa_template_shipped: Option<String>,
    pub confirm_password: Option<String>,
}

fn mask_string(s: &str, keep_last: usize) -> String {
    if s.len() <= keep_last {
        return "*".repeat(s.len());
    }
    let masked_len = s.len() - keep_last;
    format!("{}{}", "*".repeat(masked_len), &s[masked_len..])
}

/// GET /api/v1/admin/settings
pub async fn get_admin_settings(
    State(state): State<AppState>,
    admin: RequireAdmin,
    headers: HeaderMap,
) -> Result<Json<AdminSettingsResponse>, AppError> {
    let store = state.store.read().await;

    // Check if X-Reveal-Sensitive header is set and caller is OWNER
    let is_owner = admin.0.user.role == "owner";
    let reveal_requested = headers
        .get("x-reveal-sensitive")
        .and_then(|h| h.to_str().ok())
        == Some("true");

    let is_revealed = is_owner && reveal_requested;

    let get_val = |k: &str, def: &str| -> String {
        store.store_settings.get(k).cloned().unwrap_or_else(|| def.to_string())
    };

    let raw_acc_num = get_val("bca_account_number", "1301510191");
    let raw_acc_holder = get_val("bca_account_holder", "LILY ALI");

    let bca_account_number_masked = if is_revealed {
        raw_acc_num
    } else {
        mask_string(&raw_acc_num, 4)
    };

    let bca_account_holder_masked = if is_revealed {
        raw_acc_holder
    } else {
        mask_string(&raw_acc_holder, 3)
    };

    Ok(Json(AdminSettingsResponse {
        store_name: get_val("store_name", "Global Mandiri Computer"),
        store_address: get_val("store_address", "ITC Mega Grosir Lantai 2 Blok E2 No. 7-8, Surabaya, Jawa Timur"),
        store_phone: get_val("store_phone", "031-3721234"),
        whatsapp_number: get_val("whatsapp_number", "6281234567890"),
        opening_hours: get_val("opening_hours", "Senin - Sabtu: 10.00 - 18.00 WIB"),
        auto_cancel_hours: get_val("auto_cancel_hours", "24").parse().unwrap_or(24),
        bca_bank_name: get_val("bca_bank_name", "Bank Central Asia (BCA)"),
        bca_account_number_masked,
        bca_account_holder_masked,
        bca_branch: get_val("bca_branch", "KCP ITC Mega Grosir Surabaya"),
        is_bca_revealed: is_revealed,
        wa_template_reminder: get_val("wa_template_reminder", "Halo {nama}, pesanan {no_order} di GMC Surabaya menunggu pembayaran Rp {total} via BCA {rekening}. Terima kasih!"),
        wa_template_paid: get_val("wa_template_paid", "Halo {nama}, pembayaran pesanan {no_order} sebesar Rp {total} telah diverifikasi oleh GMC Surabaya. Pesanan segera disiapkan!"),
        wa_template_packed: get_val("wa_template_packed", "Halo {nama}, pesanan {no_order} telah selesai diperiksa dan dipacking rapi oleh tim gudang GMC Surabaya."),
        wa_template_pickup: get_val("wa_template_pickup", "Halo {nama}, pesanan {no_order} sudah siap diambil di toko GMC ITC Mega Grosir Surabaya."),
        wa_template_shipped: get_val("wa_template_shipped", "Halo {nama}, pesanan {no_order} telah dikirimkan via kurir. Catatan pengiriman: {catatan}."),
    }))
}

/// POST /api/v1/admin/settings/verify-password
pub async fn verify_admin_password(
    State(state): State<AppState>,
    owner: RequireOwner,
    Json(payload): Json<VerifyPasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let store = state.store.read().await;
    let user = store
        .users
        .get(&owner.0.user.id)
        .ok_or_else(|| AppError::Unauthorized("Pengguna tidak ditemukan".to_string()))?;

    if !verify_password(&user.password_hash, &payload.password) {
        return Err(AppError::Unauthorized("Kata sandi yang Anda masukkan salah".to_string()));
    }

    Ok(Json(serde_json::json!({
        "verified": true,
        "message": "Autentikasi sensitif disetujui"
    })))
}

/// PUT /api/v1/admin/settings
pub async fn update_admin_settings(
    State(state): State<AppState>,
    owner: RequireOwner,
    Json(payload): Json<UpdateSettingsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // If modifying sensitive bank account, require confirm_password verification
    if payload.bca_account_number.is_some() || payload.bca_account_holder.is_some() {
        let store = state.store.read().await;
        let user = store
            .users
            .get(&owner.0.user.id)
            .ok_or_else(|| AppError::Unauthorized("Pengguna tidak ditemukan".to_string()))?;

        let password_ok = payload
            .confirm_password
            .as_deref()
            .map_or(false, |pwd| verify_password(&user.password_hash, pwd));

        if !password_ok {
            return Err(AppError::Forbidden(
                "Konfirmasi kata sandi diperlukan untuk mengubah informasi rekening bank BCA".to_string(),
            ));
        }
    }

    let mut store = state.store.write().await;
    let mut updated_keys = Vec::new();
    macro_rules! set_if {
        ($key:expr, $val:expr) => {
            if let Some(v) = $val {
                store.store_settings.insert($key.to_string(), v);
                updated_keys.push($key.to_string());
            }
        };
    }

    set_if!("store_name", payload.store_name);
    set_if!("store_address", payload.store_address);
    set_if!("store_phone", payload.store_phone);
    set_if!("whatsapp_number", payload.whatsapp_number);
    set_if!("opening_hours", payload.opening_hours);
    if let Some(hrs) = payload.auto_cancel_hours {
        store.store_settings.insert("auto_cancel_hours".to_string(), hrs.to_string());
        updated_keys.push("auto_cancel_hours".to_string());
    }
    set_if!("bca_bank_name", payload.bca_bank_name);
    set_if!("bca_account_number", payload.bca_account_number);
    set_if!("bca_account_holder", payload.bca_account_holder);
    set_if!("bca_branch", payload.bca_branch);
    set_if!("wa_template_reminder", payload.wa_template_reminder);
    set_if!("wa_template_paid", payload.wa_template_paid);
    set_if!("wa_template_packed", payload.wa_template_packed);
    set_if!("wa_template_pickup", payload.wa_template_pickup);
    set_if!("wa_template_shipped", payload.wa_template_shipped);

    drop(store);

    state
        .record_audit_log(
            Some(owner.0.user.id),
            Some(owner.0.user.email.clone()),
            "update_store_settings",
            "settings",
            None,
            None,
            None,
            None,
            Some(serde_json::json!({ "updated_keys": updated_keys })),
        )
        .await;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Pengaturan toko berhasil diperbarui"
    })))
}
