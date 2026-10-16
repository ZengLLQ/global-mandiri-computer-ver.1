use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Owner,
    Admin,
    Staff,
    Customer,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Owner => "owner",
            Role::Admin => "admin",
            Role::Staff => "staff",
            Role::Customer => "customer",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "owner" => Role::Owner,
            "admin" => Role::Admin,
            "staff" => Role::Staff,
            _ => Role::Customer,
        }
    }

    pub fn can_access_settings(&self) -> bool {
        matches!(self, Role::Owner | Role::Admin)
    }

    pub fn can_access_users_and_bank(&self) -> bool {
        matches!(self, Role::Owner)
    }

    pub fn can_edit_catalog(&self) -> bool {
        matches!(self, Role::Owner | Role::Admin)
    }

    pub fn can_manage_orders(&self) -> bool {
        matches!(self, Role::Owner | Role::Admin | Role::Staff)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: String,
    pub phone: Option<String>,
    pub role: String,
    #[serde(skip_serializing)]
    pub totp_secret: Option<String>,
    pub is_totp_enabled: bool,
    #[serde(skip_serializing)]
    pub recovery_codes: Option<Vec<String>>,
    pub failed_login_attempts: i32,
    pub lockout_until: Option<DateTime<Utc>>,
    pub password_changed_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct UserSession {
    pub id: Uuid,
    pub user_id: Uuid,
    #[serde(skip_serializing)]
    pub token_hash: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub expires_at: DateTime<Utc>,
    pub last_active_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub user_email: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub before_json: Option<serde_json::Value>,
    pub after_json: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct OrderStatusHistory {
    pub id: Uuid,
    pub order_id: Uuid,
    pub from_status: Option<String>,
    pub to_status: String,
    pub actor_id: Option<Uuid>,
    pub actor_name: Option<String>,
    pub actor_role: Option<String>,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PriceHistory {
    pub id: Uuid,
    pub variant_id: Uuid,
    pub old_price_idr: i64,
    pub new_price_idr: i64,
    pub changed_by: Option<Uuid>,
    pub source: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Address {
    pub id: Uuid,
    pub user_id: Uuid,
    pub recipient_name: String,
    pub phone: String,
    pub address_line: String,
    pub city: String,
    pub postal_code: Option<String>,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Brand {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Product {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub brand_id: Uuid,
    pub category_id: Uuid,
    pub segment: String,
    pub is_new: bool,
    pub stock_status: String,
    pub is_visible: bool,
    pub is_featured: bool,
    pub tracked_quantity: Option<i32>,
    pub min_stock_alert: i32,
    pub is_whatsapp_only: bool,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub view_count: i32,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProductVariant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub sku: String,
    pub barcode: Option<String>,
    pub color_name: String,
    pub price_idr: i64,
    pub stock_status: String,
    pub unit: String,
    pub tracked_quantity: Option<i32>,
    pub is_active: bool,
    pub sort_order: i32,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProductSpec {
    pub product_id: Uuid,
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
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProductDetail {
    #[serde(flatten)]
    pub product: Product,
    pub brand_name: String,
    pub brand_slug: String,
    pub category_name: String,
    pub category_slug: String,
    pub variants: Vec<ProductVariant>,
    pub specs: Option<ProductSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Order {
    pub id: Uuid,
    pub order_number: String,
    pub user_id: Option<Uuid>,
    pub customer_name: String,
    pub customer_phone: String,
    pub shipping_address: String,
    pub customer_note: Option<String>,
    pub admin_delivery_note: Option<String>,
    pub internal_notes: Option<String>,
    pub source: String,
    pub gift_wrapping: bool,
    pub gift_wrapping_price_idr: i64,
    pub total_amount_idr: i64,
    pub status: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub reminder_sent: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub variant_id: Option<Uuid>,
    pub product_name: String,
    pub variant_sku: String,
    pub color_name: String,
    pub price_idr: i64,
    pub quantity: i32,
    pub subtotal_idr: i64,
    pub specs_snapshot: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Payment {
    pub id: Uuid,
    pub order_id: Uuid,
    pub payment_method: String,
    pub amount_idr: i64,
    pub bank_name: String,
    pub account_number: String,
    pub account_holder: String,
    pub proof_file_path: Option<String>,
    pub proof_uploaded_at: Option<DateTime<Utc>>,
    pub verified_at: Option<DateTime<Utc>>,
    pub verified_by: Option<Uuid>,
    pub rejection_reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Review {
    pub id: Uuid,
    pub product_id: Uuid,
    pub user_id: Uuid,
    pub order_id: Option<Uuid>,
    pub rating: i32,
    pub headline: String,
    pub content: String,
    pub original_content: Option<String>,
    pub is_verified_purchase: bool,
    pub status: String,
    pub is_flagged: bool,
    pub admin_reply: Option<String>,
    pub admin_reply_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub helpful_count: i32,
    pub unhelpful_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct CustomerNote {
    pub id: Uuid,
    pub user_id: Uuid,
    pub author_id: Option<Uuid>,
    pub note: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct CustomerTag {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tag: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct StaticPage {
    pub slug: String,
    pub title: String,
    pub content_markdown: String,
    pub updated_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FaqItem {
    pub id: Uuid,
    pub category: String,
    pub question: String,
    pub answer: String,
    pub sort_order: i32,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Notification {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub link: Option<String>,
    pub is_read: bool,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AnalyticsEvent {
    pub id: Uuid,
    pub event_name: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub session_id: Option<String>,
    pub ip_hash: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct BlogPost {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub content: String,
    pub author_name: String,
    pub is_published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct StoreSetting {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ImportRun {
    pub id: Uuid,
    pub filename: String,
    pub total_rows: i32,
    pub imported_count: i32,
    pub updated_count: i32,
    pub skipped_count: i32,
    pub report_json: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}
