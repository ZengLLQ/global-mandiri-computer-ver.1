use crate::domain::models::*;
use anyhow::Result;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user_id
    pub email: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("Argon2 hash failed: {}", e))?
        .to_string();
    Ok(hash)
}

pub fn verify_password(hash: &str, password: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

pub fn create_jwt_token(user: &User, secret: &str, expires_hours: i64) -> Result<String> {
    let now = Utc::now();
    let exp = (now + Duration::hours(expires_hours)).timestamp() as usize;
    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: user.role.clone(),
        exp,
        iat: now.timestamp() as usize,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;
    Ok(token)
}

pub fn verify_jwt_token(token: &str, secret: &str) -> Result<Claims> {
    let mut validation = Validation::default();
    validation.validate_exp = true;
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;
    Ok(data.claims)
}

#[derive(Debug, Default, Clone)]
pub struct MemoryStore {
    pub users: HashMap<Uuid, User>,
    pub sessions: HashMap<String, UserSession>,
    pub orders: HashMap<Uuid, Order>,
    pub order_items: Vec<OrderItem>,
    pub order_status_history: Vec<OrderStatusHistory>,
    pub payments: HashMap<Uuid, Payment>,
    pub audit_logs: Vec<AuditLog>,
    pub price_history: Vec<PriceHistory>,
    pub products: Vec<Product>,
    pub product_variants: Vec<ProductVariant>,
    pub product_specs: HashMap<Uuid, ProductSpec>,
    pub brands: Vec<Brand>,
    pub categories: Vec<Category>,
    pub reviews: Vec<Review>,
    pub store_settings: HashMap<String, String>,
    pub customer_notes: Vec<CustomerNote>,
    pub customer_tags: Vec<CustomerTag>,
    pub static_pages: HashMap<String, StaticPage>,
    pub faq_items: Vec<FaqItem>,
    pub notifications: Vec<Notification>,
    pub import_runs: Vec<ImportRun>,
    pub analytics_events: Vec<AnalyticsEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminServerEvent {
    pub event_type: String,
    pub order_number: Option<String>,
    pub order_id: Option<Uuid>,
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Clone)]
pub struct AppState {
    pub pool: Option<sqlx::PgPool>,
    pub jwt_secret: String,
    pub upload_dir: String,
    pub store: Arc<RwLock<MemoryStore>>,
    pub event_tx: tokio::sync::broadcast::Sender<AdminServerEvent>,
}

impl AppState {
    pub async fn new(pool: Option<sqlx::PgPool>, jwt_secret: String, upload_dir: String) -> Self {
        let store = Arc::new(RwLock::new(MemoryStore::default()));
        let (event_tx, _) = tokio::sync::broadcast::channel(100);
        let state = Self {
            pool,
            jwt_secret,
            upload_dir,
            store,
            event_tx,
        };

        // Initialize default seed data
        state.seed_initial_data().await;

        state
    }

    pub fn broadcast_event(&self, event: AdminServerEvent) {
        let _ = self.event_tx.send(event);
    }

    pub async fn record_audit_log(
        &self,
        actor_id: Option<Uuid>,
        actor_email: Option<String>,
        action: &str,
        entity_type: &str,
        entity_id: Option<&str>,
        ip: Option<String>,
        user_agent: Option<String>,
        before: Option<serde_json::Value>,
        after: Option<serde_json::Value>,
    ) {
        let now = Utc::now();
        let log_id = Uuid::new_v4();

        // 1. Record in DB if pool is available
        if let Some(pool) = &self.pool {
            let _ = sqlx::query(
                r#"
                INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, ip_address, user_agent, before_json, after_json, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                "#,
            )
            .bind(log_id)
            .bind(actor_id)
            .bind(actor_email.as_deref())
            .bind(action)
            .bind(entity_type)
            .bind(entity_id)
            .bind(ip.as_deref())
            .bind(user_agent.as_deref())
            .bind(before.as_ref())
            .bind(after.as_ref())
            .bind(now)
            .execute(pool)
            .await;
        }

        // 2. Record in memory store
        let log = AuditLog {
            id: log_id,
            user_id: actor_id,
            user_email: actor_email,
            action: action.to_string(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.map(|s| s.to_string()),
            ip_address: ip,
            user_agent,
            before_json: before,
            after_json: after,
            created_at: now,
        };

        let mut store = self.store.write().await;
        store.audit_logs.insert(0, log);
    }

    pub async fn record_notification(
        &self,
        notif_type: &str,
        title: &str,
        message: &str,
        link: Option<&str>,
        metadata: Option<serde_json::Value>,
    ) {
        let now = Utc::now();
        let notif_id = Uuid::new_v4();

        if let Some(pool) = &self.pool {
            let _ = sqlx::query(
                r#"
                INSERT INTO notifications (id, type, title, message, link, is_read, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
                "#,
            )
            .bind(notif_id)
            .bind(notif_type)
            .bind(title)
            .bind(message)
            .bind(link)
            .bind(metadata.as_ref())
            .bind(now)
            .execute(pool)
            .await;
        }

        let notif = Notification {
            id: notif_id,
            r#type: notif_type.to_string(),
            title: title.to_string(),
            message: message.to_string(),
            link: link.map(|s| s.to_string()),
            is_read: false,
            metadata,
            created_at: now,
        };

        let mut store = self.store.write().await;
        store.notifications.insert(0, notif);
    }

    async fn seed_initial_data(&self) {
        let mut store = self.store.write().await;

        // 1. Seed Owner Admin from env or default
        let admin_email = std::env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@gmc.co.id".to_string());
        let admin_pass = std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".to_string());
        let admin_name = std::env::var("ADMIN_NAME").unwrap_or_else(|_| "Owner GMC Surabaya".to_string());
        let admin_hash = hash_password(&admin_pass).unwrap_or_else(|_| "$argon2id$v=19$m=65536,t=3,p=4$dummyhash".to_string());

        let admin_id = Uuid::parse_str("a0000000-0000-0000-0000-000000000001").unwrap_or_else(|_| Uuid::new_v4());
        let admin_user = User {
            id: admin_id,
            email: admin_email.clone(),
            password_hash: admin_hash,
            full_name: admin_name,
            phone: Some("+628113225678".to_string()),
            role: "owner".to_string(),
            totp_secret: None,
            is_totp_enabled: false,
            recovery_codes: None,
            failed_login_attempts: 0,
            lockout_until: None,
            password_changed_at: None,
            deleted_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        store.users.insert(admin_id, admin_user);

        // 2. Seed Default Store Settings
        let default_settings = vec![
            ("store_name", "Global Mandiri Computer"),
            ("store_short_name", "GMC"),
            ("tagline", "Pusat Komputasi Andal & Terpercaya Surabaya"),
            ("address", "ITC Mega Grosir B5 No. 7, Jl. Gembong No. 20-30, Kapasan, Kec. Simokerto, Surabaya, Jawa Timur 60141"),
            ("whatsapp_number", "+628113225678"),
            ("whatsapp_url", "https://wa.me/628113225678"),
            ("email", "blessingteknologi@gmail.com"),
            ("opening_hours", "Senin - Sabtu, 10.00 - 17.00 WIB"),
            ("bca_account_number", "1301510191"),
            ("bca_account_name", "LILY ALI"),
            ("bca_bank_name", "Bank Central Asia (BCA)"),
            ("gift_wrapping_price_idr", "25000"),
            ("order_expiry_hours", "24"),
            ("low_stock_threshold", "2"),
            ("auto_decrement_stock", "true"),
            ("maintenance_mode", "false"),
            ("wa_template_reminder", "Halo {nama}, pesanan {no_order} di GMC menunggu konfirmasi transfer BCA {rekening_bca} sebesar {total}. Hubungi kami jika ada pertanyaan."),
            ("wa_template_paid", "Halo {nama}, pembayaran pesanan {no_order} sebesar {total} telah kami terima & diverifikasi. Tim GMC sedang menyiapkan unit Anda."),
            ("wa_template_ready_pickup", "Halo {nama}, pesanan {no_order} Anda telah selesai dipacking dan siap diambil di gerai GMC ITC Mega Grosir B5 No. 7 Surabaya."),
            ("wa_template_shipped", "Halo {nama}, pesanan {no_order} Anda telah dikirimkan. Catatan: {catatan_pengiriman}. Terima kasih telah berbelanja di GMC!"),
            ("wa_template_ask_confirm", "Halo {nama}, kami mengonfirmasi pesanan {no_order} di GMC. Mohon infokan kesiapan penerimaan unit. Terima kasih."),
        ];

        for (k, v) in default_settings {
            store.store_settings.insert(k.to_string(), v.to_string());
        }

        // 3. Load catalog_seed.json into products, variants, brands, categories
        let file_path = "catalog_seed.json";
        let alt_path = "apps/web/src/lib/catalog_seed.json";
        let content = std::fs::read_to_string(file_path)
            .or_else(|_| std::fs::read_to_string(alt_path))
            .unwrap_or_default();

        if let Ok(raw_products) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
            let mut brand_map = HashMap::new();
            let mut cat_map = HashMap::new();

            for item in raw_products {
                let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let slug = item.get("slug").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let brand_name = item.get("brand").and_then(|v| v.as_str()).unwrap_or("GMC").to_string();
                let cat_name = item.get("category").and_then(|v| v.as_str()).unwrap_or("Laptop").to_string();
                let segment = item.get("segment").and_then(|v| v.as_str()).unwrap_or("Mainstream").to_string();
                let is_new = item.get("is_new").and_then(|v| v.as_bool()).unwrap_or(false);
                let price_idr = item.get("min_price_idr").and_then(|v| v.as_i64()).unwrap_or(0);

                let brand_id = *brand_map.entry(brand_name.clone()).or_insert_with(|| {
                    let id = Uuid::new_v4();
                    store.brands.push(Brand {
                        id,
                        name: brand_name.clone(),
                        slug: brand_name.to_lowercase(),
                        description: None,
                        sort_order: 0,
                        is_active: true,
                        deleted_at: None,
                        created_at: Utc::now(),
                    });
                    id
                });

                let cat_id = *cat_map.entry(cat_name.clone()).or_insert_with(|| {
                    let id = Uuid::new_v4();
                    store.categories.push(Category {
                        id,
                        name: cat_name.clone(),
                        slug: cat_name.to_lowercase().replace(' ', "-"),
                        description: None,
                        sort_order: 0,
                        is_active: true,
                        deleted_at: None,
                        created_at: Utc::now(),
                    });
                    id
                });

                let prod_id = Uuid::new_v4();
                store.products.push(Product {
                    id: prod_id,
                    slug: slug.clone(),
                    name: name.clone(),
                    brand_id,
                    category_id: cat_id,
                    segment,
                    is_new,
                    stock_status: if price_idr > 0 { "in_stock".to_string() } else { "ask_store".to_string() },
                    is_visible: true,
                    is_featured: false,
                    tracked_quantity: Some(5),
                    min_stock_alert: 2,
                    is_whatsapp_only: price_idr == 0,
                    seo_title: Some(name.clone()),
                    seo_description: None,
                    view_count: 0,
                    deleted_at: None,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                });

                // Variant
                let sku = format!("SKU-{}", &slug.chars().take(12).collect::<String>());
                store.product_variants.push(ProductVariant {
                    id: Uuid::new_v4(),
                    product_id: prod_id,
                    sku,
                    barcode: None,
                    color_name: "Standard".to_string(),
                    price_idr,
                    stock_status: if price_idr > 0 { "in_stock".to_string() } else { "ask_store".to_string() },
                    unit: "UNIT".to_string(),
                    tracked_quantity: Some(5),
                    is_active: true,
                    sort_order: 0,
                    deleted_at: None,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                });
            }
        }

        // 4. Seed Realistic Initial Orders for Local & Admin Testing
        let sample_orders_data = vec![
            (
                "GMC-20261010-8812",
                "Budi Santoso",
                "081234567890",
                "Jl. Manyar Kertoarjo No. 12, Surabaya, Jawa Timur",
                "Mohon dicek sebelum dikirim ya min",
                "proof_uploaded",
                "website",
                false,
                12800000,
                "ASUS Vivobook 14 (A1404ZA)",
                "SKU-ASUS-VIVO-14",
                "Quiet Blue",
                "Intel Core i5-1235U / 8GB DDR4 / 512GB NVMe / 14\" FHD IPS",
                Some("mock_proof_budi.jpg"),
                1,
            ),
            (
                "GMC-20261010-7741",
                "Siti Rahmawati",
                "081398765432",
                "Rungkut Industri III No. 8, Surabaya",
                "Kirim sesegera mungkin jika pembayaran valid",
                "pending_payment",
                "website",
                true,
                18525000,
                "Lenovo Legion 5 15IAH7",
                "SKU-LEN-LEGION-5",
                "Storm Grey",
                "Intel Core i7-12700H / 16GB DDR5 / 512GB SSD / RTX 3060",
                None,
                2,
            ),
            (
                "GMC-20261010-6623",
                "Hendra Wijaya",
                "081876543210",
                "Jl. Darmo Permai II No. 45, Surabaya",
                "Ambil langsung di toko ITC Mega Grosir",
                "paid",
                "whatsapp",
                false,
                24200000,
                "Apple MacBook Air M2 13.6-inch",
                "SKU-APL-MBA-M2",
                "Midnight",
                "Apple M2 8-core CPU / 8GB Unified / 256GB SSD / Liquid Retina",
                Some("mock_proof_hendra.jpg"),
                4,
            ),
            (
                "GMC-20261009-5519",
                "Dewi Lestari",
                "081298761234",
                "Jl. Kertajaya Indah No. 19, Surabaya",
                "Packing kayu aman ya kak",
                "packed",
                "website",
                false,
                9400000,
                "Acer Aspire 5 Slim A514-55",
                "SKU-ACER-ASP-5",
                "Steel Gray",
                "Intel Core i3-1215U / 8GB RAM / 512GB SSD / 14\" FHD",
                Some("mock_proof_dewi.jpg"),
                24,
            ),
            (
                "GMC-20261008-4402",
                "Kevin Pratama",
                "081512349876",
                "Jl. Mayjen Sungkono No. 88, Surabaya",
                "Selesai diterima dengan baik di ITC Surabaya",
                "done",
                "in_store",
                false,
                15600000,
                "HP Pavilion Aero 13-be2000AU",
                "SKU-HP-PAV-AERO",
                "Warm Gold",
                "AMD Ryzen 5 7535U / 16GB LPDDR5 / 512GB SSD / 13.3\" WQXGA",
                Some("mock_proof_kevin.jpg"),
                48,
            ),
        ];

        let now = Utc::now();
        for (
            order_num,
            cust_name,
            phone,
            address,
            note,
            status,
            source,
            gift,
            total,
            prod_name,
            sku,
            color,
            specs,
            proof_file,
            hours_ago,
        ) in sample_orders_data {
            let order_id = Uuid::new_v4();
            let created_at = now - chrono::Duration::hours(hours_ago);
            let order = Order {
                id: order_id,
                order_number: order_num.to_string(),
                user_id: None,
                customer_name: cust_name.to_string(),
                customer_phone: phone.to_string(),
                shipping_address: address.to_string(),
                customer_note: Some(note.to_string()),
                admin_delivery_note: if status == "packed" || status == "done" {
                    Some("Diantar kurir internal GMC Surabaya".to_string())
                } else {
                    None
                },
                internal_notes: Some("Pelanggan prioritas GMC Surabaya".to_string()),
                source: source.to_string(),
                gift_wrapping: gift,
                gift_wrapping_price_idr: if gift { 25000 } else { 0 },
                total_amount_idr: total,
                status: status.to_string(),
                expires_at: Some(created_at + chrono::Duration::hours(24)),
                reminder_sent: false,
                deleted_at: None,
                created_at,
                updated_at: created_at,
            };

            // Order Item
            let item_id = Uuid::new_v4();
            let item = OrderItem {
                id: item_id,
                order_id,
                variant_id: None,
                product_name: prod_name.to_string(),
                variant_sku: sku.to_string(),
                color_name: color.to_string(),
                price_idr: if gift { total - 25000 } else { total },
                quantity: 1,
                subtotal_idr: if gift { total - 25000 } else { total },
                specs_snapshot: Some(specs.to_string()),
                created_at,
            };

            // Status History
            store.order_status_history.push(OrderStatusHistory {
                id: Uuid::new_v4(),
                order_id,
                from_status: None,
                to_status: "pending_payment".to_string(),
                actor_id: None,
                actor_name: Some("Sistem GMC".to_string()),
                actor_role: Some("system".to_string()),
                note: Some("Pesanan dibuat oleh pelanggan".to_string()),
                created_at,
            });

            if status != "pending_payment" {
                store.order_status_history.push(OrderStatusHistory {
                    id: Uuid::new_v4(),
                    order_id,
                    from_status: Some("pending_payment".to_string()),
                    to_status: "proof_uploaded".to_string(),
                    actor_id: None,
                    actor_name: Some(cust_name.to_string()),
                    actor_role: Some("customer".to_string()),
                    note: Some("Bukti transfer BCA diunggah".to_string()),
                    created_at: created_at + chrono::Duration::minutes(15),
                });
            }

            if status == "paid" || status == "packed" || status == "done" {
                store.order_status_history.push(OrderStatusHistory {
                    id: Uuid::new_v4(),
                    order_id,
                    from_status: Some("proof_uploaded".to_string()),
                    to_status: "paid".to_string(),
                    actor_id: Some(admin_id),
                    actor_name: Some("Owner GMC Surabaya".to_string()),
                    actor_role: Some("owner".to_string()),
                    note: Some("Pembayaran BCA Rp 1301510191 a.n LILY ALI diverifikasi valid".to_string()),
                    created_at: created_at + chrono::Duration::minutes(30),
                });
            }

            if status == "packed" || status == "done" {
                store.order_status_history.push(OrderStatusHistory {
                    id: Uuid::new_v4(),
                    order_id,
                    from_status: Some("paid".to_string()),
                    to_status: "packed".to_string(),
                    actor_id: Some(admin_id),
                    actor_name: Some("Staff Gudang".to_string()),
                    actor_role: Some("staff".to_string()),
                    note: Some("Unit dicek fisik, segel utuh, dan dipacking kardus tebal".to_string()),
                    created_at: created_at + chrono::Duration::hours(2),
                });
            }

            if status == "done" {
                store.order_status_history.push(OrderStatusHistory {
                    id: Uuid::new_v4(),
                    order_id,
                    from_status: Some("packed".to_string()),
                    to_status: "done".to_string(),
                    actor_id: Some(admin_id),
                    actor_name: Some("Owner GMC Surabaya".to_string()),
                    actor_role: Some("owner".to_string()),
                    note: Some("Unit diserahterimakan kepada pembeli di toko".to_string()),
                    created_at: created_at + chrono::Duration::hours(4),
                });
            }

            // Payment Record
            let payment_id = Uuid::new_v4();
            let payment = Payment {
                id: payment_id,
                order_id,
                payment_method: "bca_transfer".to_string(),
                amount_idr: total,
                bank_name: "BCA".to_string(),
                account_number: "1301510191".to_string(),
                account_holder: "LILY ALI".to_string(),
                proof_file_path: proof_file.map(|s| s.to_string()),
                proof_uploaded_at: if proof_file.is_some() {
                    Some(created_at + chrono::Duration::minutes(15))
                } else {
                    None
                },
                verified_at: if status == "paid" || status == "packed" || status == "done" {
                    Some(created_at + chrono::Duration::minutes(30))
                } else {
                    None
                },
                verified_by: if status == "paid" || status == "packed" || status == "done" {
                    Some(admin_id)
                } else {
                    None
                },
                rejection_reason: None,
                notes: Some("Transfer BCA Rekening Resmi".to_string()),
                created_at,
            };

            store.orders.insert(order_id, order);
            store.order_items.push(item);
            store.payments.insert(payment_id, payment);
        }

        // 5. Seed Customer Profiles, Tags & Internal Notes
        let sample_customers = vec![
            ("Budi Santoso", "081234567890", "budi.santoso@example.com", vec!["VIP", "Surabaya Timur"], "Langganan pengadaan kantor IT"),
            ("Siti Rahmawati", "081398765432", "siti.rahmawati@gmail.com", vec!["Prioritas", "Desain Grafis"], "Minta selalu konfirmasi via WA sebelum pengiriman"),
            ("Hendra Wijaya", "081876543210", "hendra.wijaya@outlook.com", vec!["Wholesale", "Reseller"], "Sering ambil MacBook & ThinkPad partai kecil"),
            ("Dewi Lestari", "081298761234", "dewi.lestari@gmail.com", vec!["Retail", "Pelajar"], "Pembeli Asus & Acer untuk kebutuhan kuliah"),
            ("Kevin Pratama", "081512349876", "kevin.pratama@gmail.com", vec!["Gaming Enthusiast"], "Kolektor laptop RTX series dan aksesoris"),
        ];

        let mut cust_user_ids = Vec::new();
        for (c_name, c_phone, c_email, c_tags, c_note) in sample_customers {
            let mut bytes = [0u8; 16];
            for (i, b) in c_phone.as_bytes().iter().enumerate().take(16) {
                bytes[i] = *b;
            }
            let u_id = Uuid::from_bytes(bytes);
            cust_user_ids.push(u_id);

            store.users.insert(
                u_id,
                User {
                    id: u_id,
                    email: c_email.to_string(),
                    password_hash: "".to_string(),
                    full_name: c_name.to_string(),
                    phone: Some(c_phone.to_string()),
                    role: "customer".to_string(),
                    totp_secret: None,
                    is_totp_enabled: false,
                    recovery_codes: None,
                    failed_login_attempts: 0,
                    lockout_until: None,
                    password_changed_at: None,
                    deleted_at: None,
                    created_at: now - chrono::Duration::days(30),
                    updated_at: now,
                },
            );

            // Add Tags
            for tag in c_tags {
                store.customer_tags.push(CustomerTag {
                    id: Uuid::new_v4(),
                    user_id: u_id,
                    tag: tag.to_string(),
                    created_at: now - chrono::Duration::days(10),
                });
            }

            // Add Staff Note
            store.customer_notes.push(CustomerNote {
                id: Uuid::new_v4(),
                user_id: u_id,
                author_id: Some(admin_id),
                note: c_note.to_string(),
                created_at: now - chrono::Duration::days(5),
            });
        }

        // 6. Seed Realistic Product Reviews
        if let Some(first_prod) = store.products.first() {
            let p1_id = first_prod.id;
            let u1_id = cust_user_ids[0];

            store.reviews.push(Review {
                id: Uuid::new_v4(),
                product_id: p1_id,
                user_id: u1_id,
                order_id: None,
                rating: 5,
                headline: "Pengiriman cepat dan packing sangat aman!".to_string(),
                content: "Unit original segel resmi, packing kayu tebal dan kurir toko sangat ramah. Recommended seller Surabaya!".to_string(),
                original_content: None,
                is_verified_purchase: true,
                status: "approved".to_string(),
                is_flagged: false,
                admin_reply: Some("Terima kasih banyak Pak Budi atas kepercayaannya pada GMC!".to_string()),
                admin_reply_at: Some(now - chrono::Duration::hours(12)),
                rejection_reason: None,
                helpful_count: 8,
                unhelpful_count: 0,
                created_at: now - chrono::Duration::days(3),
            });
        }

        if store.products.len() > 1 {
            let p2_id = store.products[1].id;
            let u2_id = cust_user_ids[1];

            store.reviews.push(Review {
                id: Uuid::new_v4(),
                product_id: p2_id,
                user_id: u2_id,
                order_id: None,
                rating: 5,
                headline: "Pelayanan mantap garansi distributor jelas".to_string(),
                content: "Barang dicek bersama di ITC Mega Grosir sebelum dibawa pulang, diberi bonus mousepad juga.".to_string(),
                original_content: None,
                is_verified_purchase: true,
                status: "pending".to_string(),
                is_flagged: false,
                admin_reply: None,
                admin_reply_at: None,
                rejection_reason: None,
                helpful_count: 0,
                unhelpful_count: 0,
                created_at: now - chrono::Duration::hours(6),
            });
        }

        if store.products.len() > 2 {
            let p3_id = store.products[2].id;
            let u3_id = cust_user_ids[2];

            store.reviews.push(Review {
                id: Uuid::new_v4(),
                product_id: p3_id,
                user_id: u3_id,
                order_id: None,
                rating: 1,
                headline: "Spam link pinjol luar".to_string(),
                content: "Kunjungi website xyz pinjaman cepat tanpa agunan wa 0899999".to_string(),
                original_content: None,
                is_verified_purchase: false,
                status: "rejected".to_string(),
                is_flagged: true,
                admin_reply: None,
                admin_reply_at: None,
                rejection_reason: Some("Spam promosi dan link tidak relevan".to_string()),
                helpful_count: 0,
                unhelpful_count: 14,
                created_at: now - chrono::Duration::days(1),
            });
        }
    }
}
