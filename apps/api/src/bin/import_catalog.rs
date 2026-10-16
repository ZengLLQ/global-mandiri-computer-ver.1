use std::fs::File;
use std::io::Write;
use std::path::Path;
use anyhow::{Context, Result};
use gmc_api::services::catalog_importer::CatalogParser;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    println!("============================================================");
    println!("       GLOBAL MANDIRI COMPUTER - CATALOG IMPORTER CLI        ");
    println!("============================================================");

    let args: Vec<String> = std::env::args().collect();
    let file_path = if args.len() > 1 && !args[1].starts_with("--") {
        args[1].clone()
    } else {
        "catalog.xls".to_string()
    };

    let is_dry_run = args.iter().any(|a| a == "--dry-run");

    println!("Target catalog: {}", file_path);
    println!("Mode: {}", if is_dry_run { "DRY RUN (No database writes)" } else { "STANDARD" });

    if !Path::new(&file_path).exists() {
        eprintln!("Error: File not found at '{}'", file_path);
        std::process::exit(1);
    }

    let parser = CatalogParser::new();
    let parsed_items = parser.parse_file(&file_path)
        .context("Failed to parse catalog Excel file")?;

    println!("\n>>> IMPORT AUDIT REPORT <<<");
    println!("Total unique SKUs parsed: {}", parsed_items.len());

    let price_zero_count = parsed_items.iter().filter(|i| i.price_idr == 0).count();
    let new_items_count = parsed_items.iter().filter(|i| i.is_new).count();
    println!("Items with Price = 0 ('Tanya Harga'): {}", price_zero_count);
    println!("Items marked as 'Barang Baru': {}", new_items_count);

    // Grouping
    let grouped_products = parser.group_products(&parsed_items);
    println!("Total parent products after color variant grouping: {}", grouped_products.len());

    // Category breakdown
    let mut category_counts = std::collections::HashMap::new();
    for p in &grouped_products {
        *category_counts.entry(&p.category).or_insert(0) += 1;
    }
    println!("\n--- Products per Category ---");
    for (cat, count) in &category_counts {
        println!("  • {:<16}: {} products", cat, count);
    }

    // Brand breakdown
    let mut brand_counts = std::collections::HashMap::new();
    for p in &grouped_products {
        *brand_counts.entry(&p.brand).or_insert(0) += 1;
    }
    println!("\n--- Products per Brand ---");
    for (brand, count) in &brand_counts {
        println!("  • {:<16}: {} products", brand, count);
    }

    // Export CSV report
    let csv_path = "import_report.csv";
    println!("\nGenerating CSV audit report: {}", csv_path);
    let mut wtr = csv::Writer::from_path(csv_path)?;
    wtr.write_record(&[
        "SKU",
        "Brand",
        "Category",
        "Segment",
        "Model Name",
        "Color",
        "Price IDR",
        "Is New",
        "CPU",
        "RAM GB",
        "Storage",
        "GPU",
        "Screen",
        "OS",
        "Warranty",
        "Sheet",
    ])?;

    for item in &parsed_items {
        wtr.write_record(&[
            &item.sku,
            &item.brand,
            &item.category,
            &item.segment,
            &item.base_product_name,
            &item.color_name,
            &item.price_idr.to_string(),
            &item.is_new.to_string(),
            item.cpu.as_deref().unwrap_or("-"),
            &item.ram_gb.map(|r| r.to_string()).unwrap_or_else(|| "-".to_string()),
            item.storage.as_deref().unwrap_or("-"),
            item.gpu.as_deref().unwrap_or("-"),
            item.screen_size.as_deref().unwrap_or("-"),
            item.os.as_deref().unwrap_or("-"),
            item.warranty.as_deref().unwrap_or("-"),
            &item.sheet_name,
        ])?;
    }
    wtr.flush()?;
    println!("CSV report written successfully.");

    // Export JSON seed for web & API
    let json_web_path = "apps/web/src/lib/catalog_seed.json";
    let json_api_path = "apps/api/catalog_seed.json";
    let json_content = serde_json::to_string_pretty(&grouped_products)?;

    if let Ok(mut f) = File::create(json_api_path) {
        f.write_all(json_content.as_bytes())?;
        println!("JSON seed exported to {}", json_api_path);
    }
    if let Ok(mut f) = File::create(json_web_path) {
        f.write_all(json_content.as_bytes())?;
        println!("JSON seed exported to {}", json_web_path);
    }

    // DB Upsert if DATABASE_URL is set and not dry run
    if !is_dry_run {
        if let Ok(db_url) = std::env::var("DATABASE_URL") {
            println!("\nConnecting to PostgreSQL for upsert...");
            match sqlx::postgres::PgPoolOptions::new()
                .max_connections(5)
                .connect(&db_url)
                .await
            {
                Ok(pool) => {
                    println!("Connected to database! Upserting products & variants...");
                    // Upsert logic
                    let mut imported_count = 0;
                    for p in &grouped_products {
                        // find or insert brand & category IDs
                        let brand_id: (uuid::Uuid,) = sqlx::query_as(
                            "INSERT INTO brands (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id"
                        )
                        .bind(&p.brand)
                        .bind(p.brand.to_lowercase())
                        .fetch_one(&pool)
                        .await?;

                        let category_id: (uuid::Uuid,) = sqlx::query_as(
                            "INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id"
                        )
                        .bind(&p.category)
                        .bind(p.category.to_lowercase().replace(' ', "-"))
                        .fetch_one(&pool)
                        .await?;

                        let product_id: (uuid::Uuid,) = sqlx::query_as(
                            r#"
                            INSERT INTO products (slug, name, brand_id, category_id, segment, is_new, stock_status)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (slug) DO UPDATE SET
                                name = EXCLUDED.name,
                                segment = EXCLUDED.segment,
                                is_new = EXCLUDED.is_new,
                                stock_status = EXCLUDED.stock_status,
                                updated_at = NOW()
                            RETURNING id
                            "#
                        )
                        .bind(&p.slug)
                        .bind(&p.name)
                        .bind(brand_id.0)
                        .bind(category_id.0)
                        .bind(&p.segment)
                        .bind(p.is_new)
                        .bind(&p.stock_status)
                        .fetch_one(&pool)
                        .await?;

                        // Specs
                        sqlx::query(
                            r#"
                            INSERT INTO product_specs (product_id, cpu, ram_gb, storage, gpu, screen_size, os, warranty, bundled_items, raw_spec_text, cleaned_description)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                            ON CONFLICT (product_id) DO UPDATE SET
                                cpu = EXCLUDED.cpu,
                                ram_gb = EXCLUDED.ram_gb,
                                storage = EXCLUDED.storage,
                                gpu = EXCLUDED.gpu,
                                screen_size = EXCLUDED.screen_size,
                                os = EXCLUDED.os,
                                warranty = EXCLUDED.warranty,
                                bundled_items = EXCLUDED.bundled_items,
                                raw_spec_text = EXCLUDED.raw_spec_text,
                                cleaned_description = EXCLUDED.cleaned_description,
                                updated_at = NOW()
                            "#
                        )
                        .bind(product_id.0)
                        .bind(&p.cpu)
                        .bind(p.ram_gb)
                        .bind(&p.storage)
                        .bind(&p.gpu)
                        .bind(&p.screen_size)
                        .bind(&p.os)
                        .bind(&p.warranty)
                        .bind(&p.bundled_items)
                        .bind(&p.raw_spec_text)
                        .bind(&p.cleaned_description)
                        .execute(&pool)
                        .await?;

                        // Variants
                        for v in &p.variants {
                            sqlx::query(
                                r#"
                                INSERT INTO product_variants (product_id, sku, color_name, price_idr, stock_status)
                                VALUES ($1, $2, $3, $4, $5)
                                ON CONFLICT (sku) DO UPDATE SET
                                    color_name = EXCLUDED.color_name,
                                    price_idr = EXCLUDED.price_idr,
                                    stock_status = EXCLUDED.stock_status,
                                    updated_at = NOW()
                                "#
                            )
                            .bind(product_id.0)
                            .bind(&v.sku)
                            .bind(&v.color_name)
                            .bind(v.price_idr)
                            .bind(&v.stock_status)
                            .execute(&pool)
                            .await?;
                        }

                        imported_count += 1;
                    }
                    println!("Successfully imported {} products to PostgreSQL!", imported_count);
                }
                Err(e) => {
                    println!("Note: Database connection failed ({}). Skipping direct DB write.", e);
                }
            }
        }
    }

    println!("\nCatalog import process completed successfully!");
    Ok(())
}
