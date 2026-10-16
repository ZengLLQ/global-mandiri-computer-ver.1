use axum::{response::IntoResponse, Json};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub struct StoreSettingsResponse {
    pub store_name: String,
    pub brand_wordmark: String,
    pub tagline: String,
    pub address: String,
    pub whatsapp: String,
    pub whatsapp_url: String,
    pub email: String,
    pub hours: String,
    pub bank_name: String,
    pub bank_account: String,
    pub bank_holder: String,
    pub accent_color: String,
}

#[utoipa::path(
    get,
    path = "/api/v1/settings",
    responses(
        (status = 200, description = "Public store settings retrieved successfully", body = StoreSettingsResponse)
    ),
    tag = "Settings"
)]
pub async fn get_public_settings() -> impl IntoResponse {
    let settings = StoreSettingsResponse {
        store_name: "Global Mandiri Computer".to_string(),
        brand_wordmark: "GMC".to_string(),
        tagline: "Pusat Komputasi Andal & Terpercaya Surabaya".to_string(),
        address: "ITC Mega Grosir B5 No. 7, Jl. Gembong No. 20-30, Kapasan, Kec. Simokerto, Surabaya, Jawa Timur 60141".to_string(),
        whatsapp: "+62 811-3225-678".to_string(),
        whatsapp_url: "https://wa.me/628113225678".to_string(),
        email: "blessingteknologi@gmail.com".to_string(),
        hours: "Senin - Sabtu, 10.00 - 17.00 WIB".to_string(),
        bank_name: "Bank Central Asia (BCA)".to_string(),
        bank_account: "1301510191".to_string(),
        bank_holder: "LILY ALI".to_string(),
        accent_color: "#1447E6".to_string(),
    };

    Json(settings)
}
