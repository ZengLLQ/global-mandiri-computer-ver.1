-- Migration: Additive Schema for GMC Admin Features & RBAC
-- Date: 2026-10-10

-- 1. USERS: Additive security, TOTP, and lockout columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. USER SESSIONS: Session management & concurrent logins
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 3. AUDIT LOGS: Immutable append-only audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    ip_address VARCHAR(100),
    user_agent TEXT,
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. ORDER STATUS HISTORY: Timeline of transitions
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- 5. PRICE HISTORY: Variant price modifications & restores
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    old_price_idr BIGINT NOT NULL,
    new_price_idr BIGINT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual' | 'import'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_history_variant ON price_history(variant_id);

-- 6. ORDERS: Additive columns for workflow, staff notes, and auto-expiry
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'website'; -- 'website' | 'whatsapp' | 'in_store'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 7. ORDER ITEMS: Snapshot specs at time of purchase
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS specs_snapshot TEXT;

-- 8. PAYMENTS: Additive rejection reason
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 9. PRODUCTS & VARIANTS: Additive visibility, inventory tracking & soft delete
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tracked_quantity INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert INT NOT NULL DEFAULT 2;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_whatsapp_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS tracked_quantity INT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 10. REVIEWS: Additive admin moderation & public replies
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS original_content TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 11. CUSTOMER NOTES & TAGS
CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_notes_user ON customer_notes(user_id);

CREATE TABLE IF NOT EXISTS customer_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_customer_tags_user ON customer_tags(user_id);

-- 12. STATIC PAGES & FAQS
CREATE TABLE IF NOT EXISTS static_pages (
    slug VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL DEFAULT 'Umum',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 14. FIRST-PARTY ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    session_id VARCHAR(255),
    ip_hash VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

-- 15. SEED DEFAULT STORE RULES & WHATSAPP TEMPLATES
INSERT INTO store_settings (key, value, description) VALUES
('order_expiry_hours', '24', 'Batas waktu pembayaran pesanan sebelum otomatis dibatalkan (jam)'),
('low_stock_threshold', '2', 'Ambang batas kuantitas stok menipis untuk peringatan admin'),
('auto_decrement_stock', 'true', 'Kurangi kuantitas stok otomatis saat pesanan terverifikasi PAID'),
('maintenance_mode', 'false', 'Mode pemeliharaan toko publik (true/false)'),
('wa_template_reminder', 'Halo {nama}, pesanan {no_order} di GMC menunggu konfirmasi transfer BCA {rekening_bca} sebesar {total}. Hubungi kami jika ada pertanyaan.', 'Template WA pengingat pembayaran'),
('wa_template_paid', 'Halo {nama}, pembayaran pesanan {no_order} sebesar {total} telah kami terima & diverifikasi. Tim GMC sedang menyiapkan unit Anda.', 'Template WA pembayaran diterima'),
('wa_template_ready_pickup', 'Halo {nama}, pesanan {no_order} Anda telah selesai dipacking dan siap diambil di toko GMC ITC Mega Grosir B5 No. 7 Surabaya.', 'Template WA siap ambil di toko'),
('wa_template_shipped', 'Halo {nama}, pesanan {no_order} Anda telah dikirimkan. Catatan: {catatan_pengiriman}. Terima kasih telah berbelanja di GMC!', 'Template WA pesanan dikirim'),
('wa_template_ask_confirm', 'Halo {nama}, kami mengonfirmasi pesanan {no_order} di GMC. Mohon infokan kesiapan penerimaan barang. Terima kasih.', 'Template WA konfirmasi pesanan')
ON CONFLICT (key) DO NOTHING;
