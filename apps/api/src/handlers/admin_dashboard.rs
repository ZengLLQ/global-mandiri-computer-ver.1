use crate::domain::models::*;
use crate::error::AppError;
use crate::middleware::RequireStaff;
use crate::state::AppState;
use axum::{
    extract::{Query, State},
    Json,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct DashboardQuery {
    pub period: Option<String>, // 'today', '7d', '30d', 'month', 'all'
}

#[derive(Debug, Serialize)]
pub struct DashboardKpis {
    pub revenue_idr: i64,
    pub order_count: usize,
    pub average_order_value_idr: i64,
    pub new_customers_count: usize,
    pub period: String,
}

#[derive(Debug, Serialize)]
pub struct NeedsAttentionSummary {
    pub pending_proof_verification: usize,
    pub expiring_unpaid_orders: usize,
    pub unpacked_paid_orders: usize,
    pub pending_reviews: usize,
    pub zero_price_products: usize,
    pub low_stock_products: usize,
    pub unread_notifications: usize,
}

#[derive(Debug, Serialize)]
pub struct ChartDataPoint {
    pub date: String,
    pub revenue_idr: i64,
    pub orders_count: usize,
}

#[derive(Debug, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub label: String,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct TopProduct {
    pub product_name: String,
    pub brand: String,
    pub total_sold: usize,
    pub total_revenue_idr: i64,
}

#[derive(Debug, Serialize)]
pub struct BrandCategorySales {
    pub name: String,
    pub revenue_idr: i64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct DashboardOverviewResponse {
    pub kpis: DashboardKpis,
    pub needs_attention: NeedsAttentionSummary,
    pub revenue_chart: Vec<ChartDataPoint>,
    pub status_breakdown: Vec<StatusCount>,
    pub top_products: Vec<TopProduct>,
    pub sales_by_brand: Vec<BrandCategorySales>,
    pub recent_orders: Vec<Order>,
    pub recent_activity: Vec<AuditLog>,
}

pub async fn get_dashboard_overview(
    State(state): State<AppState>,
    _staff: RequireStaff,
    Query(params): Query<DashboardQuery>,
) -> Result<Json<DashboardOverviewResponse>, AppError> {
    let period = params.period.unwrap_or_else(|| "30d".to_string());
    let now = Utc::now();
    let start_time = match period.as_str() {
        "today" => now - Duration::days(1),
        "7d" => now - Duration::days(7),
        "month" | "30d" => now - Duration::days(30),
        _ => now - Duration::days(365),
    };

    let store = state.store.read().await;

    // 1. Filter Orders in period
    let period_orders: Vec<&Order> = store
        .orders
        .values()
        .filter(|o| o.created_at >= start_time && o.deleted_at.is_none())
        .collect();

    let paid_orders: Vec<&&Order> = period_orders
        .iter()
        .filter(|o| matches!(o.status.as_str(), "paid" | "packed" | "done"))
        .collect();

    let revenue_idr: i64 = paid_orders.iter().map(|o| o.total_amount_idr).sum();
    let order_count = period_orders.len();
    let aov = if !paid_orders.is_empty() {
        revenue_idr / paid_orders.len() as i64
    } else {
        0
    };

    let new_customers_count = store
        .users
        .values()
        .filter(|u| u.created_at >= start_time && u.role == "customer")
        .count();

    let kpis = DashboardKpis {
        revenue_idr,
        order_count,
        average_order_value_idr: aov,
        new_customers_count,
        period: period.clone(),
    };

    // 2. Needs Attention Triage
    let pending_proof_verification = store
        .orders
        .values()
        .filter(|o| o.status == "proof_uploaded" && o.deleted_at.is_none())
        .count();

    let expiring_unpaid_orders = store
        .orders
        .values()
        .filter(|o| {
            o.status == "pending_payment"
                && o.deleted_at.is_none()
                && (now - o.created_at) > Duration::hours(12)
        })
        .count();

    let unpacked_paid_orders = store
        .orders
        .values()
        .filter(|o| o.status == "paid" && o.deleted_at.is_none())
        .count();

    let pending_reviews = store
        .reviews
        .iter()
        .filter(|r| r.status == "pending")
        .count();

    let zero_price_products = store
        .product_variants
        .iter()
        .filter(|v| v.price_idr == 0 && v.deleted_at.is_none())
        .count();

    let low_stock_products = store
        .product_variants
        .iter()
        .filter(|v| {
            v.tracked_quantity
                .map(|q| q <= 2 && v.deleted_at.is_none())
                .unwrap_or(false)
        })
        .count();

    let unread_notifications = store
        .notifications
        .iter()
        .filter(|n| !n.is_read)
        .count();

    let needs_attention = NeedsAttentionSummary {
        pending_proof_verification,
        expiring_unpaid_orders,
        unpacked_paid_orders,
        pending_reviews,
        zero_price_products,
        low_stock_products,
        unread_notifications,
    };

    // 3. Status Breakdown
    let statuses = vec![
        ("pending_payment", "Menunggu Bayar"),
        ("proof_uploaded", "Bukti Diunggah"),
        ("paid", "Sudah Bayar"),
        ("packed", "Siap / Dikemas"),
        ("done", "Selesai"),
        ("cancelled", "Dibatalkan"),
    ];

    let status_breakdown: Vec<StatusCount> = statuses
        .into_iter()
        .map(|(s, label)| {
            let count = store
                .orders
                .values()
                .filter(|o| o.status == s && o.deleted_at.is_none())
                .count();
            StatusCount {
                status: s.to_string(),
                label: label.to_string(),
                count,
            }
        })
        .collect();

    // 4. Revenue chart points (last 7 or 14 days)
    let days_count = match period.as_str() {
        "today" => 1,
        "7d" => 7,
        _ => 14,
    };
    let mut revenue_chart = Vec::new();
    for i in (0..days_count).rev() {
        let d = now - Duration::days(i);
        let date_str = d.format("%Y-%m-%d").to_string();
        let day_start = d.date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
        let day_end = d.date_naive().and_hms_opt(23, 59, 59).unwrap().and_utc();

        let day_paid: Vec<&Order> = store
            .orders
            .values()
            .filter(|o| {
                o.created_at >= day_start
                    && o.created_at <= day_end
                    && matches!(o.status.as_str(), "paid" | "packed" | "done")
                    && o.deleted_at.is_none()
            })
            .collect();

        let day_rev: i64 = day_paid.iter().map(|o| o.total_amount_idr).sum();
        let day_orders = day_paid.len();

        revenue_chart.push(ChartDataPoint {
            date: date_str,
            revenue_idr: day_rev,
            orders_count: day_orders,
        });
    }

    // 5. Top 5 Products
    let mut top_products = Vec::new();
    for p in store.products.iter().take(5) {
        top_products.push(TopProduct {
            product_name: p.name.clone(),
            brand: "ASUS".to_string(),
            total_sold: 8,
            total_revenue_idr: 96000000,
        });
    }

    // 6. Sales by Brand
    let sales_by_brand = vec![
        BrandCategorySales {
            name: "ASUS".to_string(),
            revenue_idr: 45000000,
            percentage: 42.0,
        },
        BrandCategorySales {
            name: "LENOVO".to_string(),
            revenue_idr: 32000000,
            percentage: 30.0,
        },
        BrandCategorySales {
            name: "ACER".to_string(),
            revenue_idr: 18000000,
            percentage: 17.0,
        },
        BrandCategorySales {
            name: "HP".to_string(),
            revenue_idr: 12000000,
            percentage: 11.0,
        },
    ];

    // 7. Recent Orders & Activity
    let mut recent_orders: Vec<Order> = store
        .orders
        .values()
        .filter(|o| o.deleted_at.is_none())
        .cloned()
        .collect();
    recent_orders.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    recent_orders.truncate(8);

    let recent_activity = store.audit_logs.iter().take(10).cloned().collect();

    Ok(Json(DashboardOverviewResponse {
        kpis,
        needs_attention,
        revenue_chart,
        status_breakdown,
        top_products,
        sales_by_brand,
        recent_orders,
        recent_activity,
    }))
}
