use std::collections::{HashMap, HashSet};
use std::path::Path;
use anyhow::{Context, Result};
use calamine::{open_workbook_auto, Data, Reader, Sheets};
use regex::Regex;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedCatalogItem {
    pub sheet_name: String,
    pub row_index: usize,
    pub sku: String,
    pub part_number: Option<String>,
    pub raw_name: String,
    pub price_idr: i64,
    pub brand: String,
    pub category: String,
    pub segment: String,
    pub is_new: bool,
    pub base_product_name: String,
    pub color_name: String,
    pub cpu: Option<String>,
    pub ram_gb: Option<i32>,
    pub ram_type: Option<String>,
    pub storage: Option<String>,
    pub storage_type: Option<String>,
    pub gpu: Option<String>,
    pub screen_size: Option<String>,
    pub screen_panel: Option<String>,
    pub os: Option<String>,
    pub warranty: Option<String>,
    pub bundled_items: Option<String>,
    pub raw_spec_text: String,
    pub detailed_spec_text: Option<String>,
    pub cleaned_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogGroupedProduct {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub brand: String,
    pub category: String,
    pub segment: String,
    pub is_new: bool,
    pub stock_status: String,
    pub min_price_idr: i64,
    pub max_price_idr: i64,
    pub cpu: Option<String>,
    pub ram_gb: Option<i32>,
    pub ram_type: Option<String>,
    pub storage: Option<String>,
    pub storage_type: Option<String>,
    pub gpu: Option<String>,
    pub screen_size: Option<String>,
    pub screen_panel: Option<String>,
    pub os: Option<String>,
    pub warranty: Option<String>,
    pub bundled_items: Option<String>,
    pub cleaned_description: String,
    pub raw_spec_text: String,
    pub detailed_spec_text: Option<String>,
    pub variants: Vec<CatalogGroupedVariant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogGroupedVariant {
    pub id: Uuid,
    pub sku: String,
    pub part_number: Option<String>,
    pub color_name: String,
    pub price_idr: i64,
    pub stock_status: String,
}

pub struct CatalogParser {
    re_cpu_apple: Regex,
    re_cpu_intel_ultra: Regex,
    re_cpu_intel_core: Regex,
    re_cpu_intel_n: Regex,
    re_cpu_amd_ryzen: Regex,
    re_ram: Regex,
    re_ram_type: Regex,
    re_storage: Regex,
    re_gpu: Regex,
    re_screen: Regex,
    re_panel: Regex,
    re_os: Regex,
    re_warranty: Regex,
    re_color: Regex,
}

impl CatalogParser {
    pub fn new() -> Self {
        Self {
            re_cpu_apple: Regex::new(r"(?i)\b(Apple\s+M[1-4](?:\s+(?:Pro|Max|Ultra))?|M[1-4](?:\s+(?:Pro|Max|Ultra))?)\b").unwrap(),
            re_cpu_intel_ultra: Regex::new(r"(?i)\b(Core\s+Ultra\s+[579](?:\s+\d+[A-Z]*)?|Ultra\s+[579](?:\s+\d+[A-Z]*)?)\b").unwrap(),
            re_cpu_intel_core: Regex::new(r"(?i)\b(Core\s+i[3579](?:[- ]\d+[A-Z]*)?|i[3579][- ]\d+[A-Z]*)\b").unwrap(),
            re_cpu_intel_n: Regex::new(r"(?i)\b(N100|N200|N95|Celeron\s+[A-Z0-9]+|Pentium\s+[A-Z0-9]+)\b").unwrap(),
            re_cpu_amd_ryzen: Regex::new(r"(?i)\b(Ryzen(?:\s+AI)?\s+[3579](?:\s+\d+[A-Z]*)?|R[3579][- ]\d+[A-Z]*)\b").unwrap(),
            re_ram: Regex::new(r"(?i)\b(4|8|12|16|18|24|32|36|48|64|96|128)\s*GB\b").unwrap(),
            re_ram_type: Regex::new(r"(?i)\b(DDR4|DDR5|LPDDR5X?|LPDDR4X?)\b").unwrap(),
            re_storage: Regex::new(r"(?i)\b(128|256|512)\s*GB\b|\b(1|2|4)\s*TB\b").unwrap(),
            re_gpu: Regex::new(r"(?i)\b(RTX\s*\d{4}(?:\s*Ti|\s*Super)?|GTX\s*\d{4}(?:\s*Ti)?|Radeon\s+[A-Z0-9]+|Intel\s+Arc\s+[A-Z0-9]+|Iris\s*Xe|UHD\s*Graphics|Apple\s+M\d+\s+\d+[- ]core\s+GPU)\b").unwrap(),
            re_screen: Regex::new(r#"(?i)\b(10\.\d|11\.\d|12\.\d|13\.\d|14(?:\.\d)?|15\.\d|16(?:\.\d)?|17\.\d|21\.\d|23\.\d|24|27)\s*["”']"#).unwrap(),
            re_panel: Regex::new(r"(?i)\b(OLED|IPS|WQXGA|WUXGA|2\.5K|2K|3K|4K|FHD)\b").unwrap(),
            re_os: Regex::new(r"(?i)\b(Win(?:dows)?\s*11\s*(?:Home|Pro)?|Win(?:dows)?\s*10|MacOS|Chrome\s*OS|DOS|No\s*OS)\b").unwrap(),
            re_warranty: Regex::new(r"(?i)\b(\d+\s*Tahun|\d+\s*Thn|Garansi\s*Resmi(?:\s*\d+\s*Tahun)?|ADP(?:\s*\d+\s*Tahun)?|Warranty\s*\d+\s*Year)\b").unwrap(),
            re_color: Regex::new(r"(?i)\b(Space\s+Grey|Space\s+Gray|Peacock\s+Blue|Quiet\s+Blue|Mecha\s+Gray|Eclipse\s+Gray|Jaeger\s+Gray|Graphite|Abyss\s+Blue|Arctic\s+Grey|Cloud\s+Grey|Shadow\s+Black|Natural\s+Silver|Warm\s+Gold|Star\s+Black|Transparent\s+Silver|Slate\s+Grey|Platinum\s+Grey|Mica\s+Silver|Chalkboard\s+Grey|Charcoal\s+Black|Midnight|Starlight|Silver|Black|Blue|Grey|Gray|Gold|White|Green)\b").unwrap(),
        }
    }

    pub fn parse_file<P: AsRef<Path>>(&self, path: P) -> Result<Vec<ParsedCatalogItem>> {
        let mut workbook: Sheets<_> = open_workbook_auto(path.as_ref())
            .context("Failed to open Excel workbook via calamine")?;

        let sheet_names: Vec<String> = workbook.sheet_names().to_vec();
        let mut items = Vec::new();
        let mut seen_skus = HashSet::new();
        let mut new_item_skus = HashSet::new();

        // Pass 1: find SKUs in "BARANG BARU" to flag is_new = true
        if let Ok(range) = workbook.worksheet_range("BARANG BARU") {
            for row in range.rows() {
                for cell in row {
                    if let Some(s) = cell_to_string(cell) {
                        let s_trimmed = s.trim();
                        if s_trimmed.len() >= 4 && s_trimmed.chars().all(|c| c.is_ascii_digit()) {
                            new_item_skus.insert(s_trimmed.to_string());
                        }
                    }
                }
            }
        }
        println!("Identified {} new item SKUs from BARANG BARU", new_item_skus.len());

        // Pass 2: Iterate brand/category sheets
        for sheet_name in &sheet_names {
            let sheet_upper = sheet_name.to_uppercase();
            if sheet_upper == "BARANG PROMO" || sheet_upper == "26177" || sheet_upper == "BARANG BARU" {
                continue;
            }

            let range = match workbook.worksheet_range(sheet_name) {
                Ok(r) => r,
                Err(_) => continue,
            };

            let mut current_segment = "Mainstream".to_string();
            let mut col_code: Option<usize> = None;
            let mut col_barcode: Option<usize> = None;
            let mut col_name: Option<usize> = None;
            let mut col_price: Option<usize> = None;

            let row_count = range.height();
            let mut r = 0;

            while r < row_count {
                let row = match range.rows().nth(r) {
                    Some(row) => row,
                    None => { r += 1; continue; }
                };

                let row_strs: Vec<String> = row.iter().map(|c| cell_to_string(c).unwrap_or_default()).collect();
                let joined_row = row_strs.join(" ");
                let upper_joined = joined_row.to_uppercase();

                // Check for section/segment headers
                if upper_joined.contains("CORE I3") || upper_joined.contains("RYZEN 3") || upper_joined.contains("CELERON") || upper_joined.contains("N100") || upper_joined.contains("ENTRY LEVEL") {
                    current_segment = "Entry Level".to_string();
                } else if upper_joined.contains("CORE I5") || upper_joined.contains("RYZEN 5") || upper_joined.contains("ULTRA 5") || upper_joined.contains("MAINSTREAM") {
                    current_segment = "Mainstream".to_string();
                } else if upper_joined.contains("CORE I7") || upper_joined.contains("CORE I9") || upper_joined.contains("RYZEN 7") || upper_joined.contains("RYZEN 9") || upper_joined.contains("ULTRA 7") || upper_joined.contains("ULTRA 9") || upper_joined.contains("PERFORMANCE") {
                    current_segment = "Performance".to_string();
                } else if upper_joined.contains("GAMING") || upper_joined.contains("VGA RTX") || upper_joined.contains("RTX") {
                    current_segment = "Gaming".to_string();
                }

                // Check for column header row
                let mut is_header_row = false;
                for (c_idx, cell_str) in row_strs.iter().enumerate() {
                    let upper = cell_str.trim().to_uppercase();
                    if upper == "CODE" || upper == "KODE" || upper == "ITEM CODE" || upper == "SKU" {
                        col_code = Some(c_idx);
                        is_header_row = true;
                    } else if upper == "BARCODE" || upper == "PART NUMBER" {
                        col_barcode = Some(c_idx);
                        is_header_row = true;
                    } else if upper == "NAMA BARANG" || upper == "NAMA" || upper == "TYPE" || upper == "DESCRIPTION" {
                        col_name = Some(c_idx);
                        is_header_row = true;
                    } else if upper == "PRICE" || upper == "HARGA" || upper == "DEALER" || upper == "USER" {
                        if col_price.is_none() {
                            col_price = Some(c_idx);
                        }
                        is_header_row = true;
                    }
                }

                if is_header_row {
                    r += 1;
                    continue;
                }

                // If columns not explicitly found yet, use standard defaults for GMC layout:
                // Col 0 = Code, Col 3 = Barcode, Col 4 = Nama Barang, Col 5 = Price
                let c_code_idx = col_code.unwrap_or(0);
                let c_barcode_idx = col_barcode.unwrap_or(3);
                let c_name_idx = col_name.unwrap_or(4);
                let c_price_idx = col_price.unwrap_or(5);

                if row.len() <= c_code_idx {
                    r += 1;
                    continue;
                }

                let raw_code = row_strs.get(c_code_idx).map(|s| s.trim()).unwrap_or("");
                // Check if raw_code is a valid SKU (typically 4-6 digits)
                let sku: String = raw_code.chars().filter(|c| c.is_alphanumeric() || *c == '-').collect();
                if sku.len() < 3 || !sku.chars().any(|c| c.is_ascii_digit()) || seen_skus.contains(&sku) {
                    r += 1;
                    continue;
                }

                // Extract Part Number / Barcode
                let part_number = row_strs.get(c_barcode_idx).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

                // Extract Model Name
                // Sometimes name is in Col 4, or if Col 4 is empty check Col 2 or 1
                let mut raw_name = row_strs.get(c_name_idx).map(|s| s.trim()).unwrap_or("");
                if raw_name.is_empty() {
                    for test_col in [2, 1, 3] {
                        if let Some(candidate) = row_strs.get(test_col) {
                            if candidate.trim().len() > 10 {
                                raw_name = candidate.trim();
                                break;
                            }
                        }
                    }
                }

                if raw_name.is_empty() || raw_name.to_uppercase().contains("HARGA") {
                    r += 1;
                    continue;
                }

                // Extract Price
                let raw_price = row.get(c_price_idx);
                let price_idr = match raw_price {
                    Some(Data::Float(f)) => *f as i64,
                    Some(Data::Int(i)) => *i as i64,
                    Some(Data::String(s)) => {
                        let cleaned = s.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
                        cleaned.parse::<i64>().unwrap_or(0)
                    }
                    _ => 0,
                };

                // Peek at next row (r + 1) to see if it has the detailed spec block (usually in Col 2)
                let mut detailed_spec_text = None;
                if r + 1 < row_count {
                    if let Some(next_row) = range.rows().nth(r + 1) {
                        let next_code = next_row.get(c_code_idx).and_then(cell_to_string).unwrap_or_default();
                        // If next row does NOT have a code, it is a spec row!
                        if next_code.trim().is_empty() {
                            for test_col in [2, 1, 4] {
                                if let Some(cell) = next_row.get(test_col) {
                                    if let Some(spec_str) = cell_to_string(cell) {
                                        if spec_str.len() > 30 && (spec_str.contains("Processor") || spec_str.contains("Memory") || spec_str.contains("Display") || spec_str.contains("Storage")) {
                                            detailed_spec_text = Some(spec_str.trim().to_string());
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                let brand = determine_brand(sheet_name, raw_name);
                let category = determine_category(sheet_name, raw_name);
                let is_new = new_item_skus.contains(&sku);

                let parsed_item = self.extract_item_fields(
                    sheet_name,
                    r,
                    &sku,
                    part_number,
                    raw_name,
                    price_idr,
                    &brand,
                    &category,
                    &current_segment,
                    is_new,
                    detailed_spec_text,
                );

                seen_skus.insert(sku);
                items.push(parsed_item);

                r += 1;
            }
        }

        println!("Successfully parsed {} unique items from catalog", items.len());
        Ok(items)
    }

    fn extract_item_fields(
        &self,
        sheet_name: &str,
        row_idx: usize,
        sku: &str,
        part_number: Option<String>,
        raw_name: &str,
        price_idr: i64,
        brand: &str,
        category: &str,
        default_segment: &str,
        is_new: bool,
        detailed_spec_text: Option<String>,
    ) -> ParsedCatalogItem {
        let combined_text = format!("{} {}", raw_name, detailed_spec_text.as_deref().unwrap_or(""));

        // Extract CPU
        let cpu = self.re_cpu_apple.find(&combined_text)
            .or_else(|| self.re_cpu_intel_ultra.find(&combined_text))
            .or_else(|| self.re_cpu_intel_core.find(&combined_text))
            .or_else(|| self.re_cpu_amd_ryzen.find(&combined_text))
            .or_else(|| self.re_cpu_intel_n.find(&combined_text))
            .map(|m| m.as_str().trim().to_string());

        // Extract RAM
        let ram_gb = self.re_ram.captures(&combined_text).and_then(|cap| {
            cap.get(1).and_then(|m| m.as_str().parse::<i32>().ok())
        });
        let ram_type = self.re_ram_type.find(&combined_text).map(|m| m.as_str().trim().to_uppercase());

        // Extract Storage
        let storage = self.re_storage.find(&combined_text).map(|m| m.as_str().trim().to_string());
        let storage_type = if combined_text.to_uppercase().contains("NVME") {
            Some("NVMe SSD".to_string())
        } else if combined_text.to_uppercase().contains("SSD") {
            Some("SSD".to_string())
        } else if combined_text.to_uppercase().contains("HDD") {
            Some("HDD".to_string())
        } else {
            None
        };

        // Extract GPU
        let gpu = self.re_gpu.find(&combined_text).map(|m| m.as_str().trim().to_string());

        // Extract Screen Size & Panel
        let screen_size = self.re_screen.find(&combined_text).map(|m| m.as_str().trim().to_string());
        let screen_panel = self.re_panel.find(&combined_text).map(|m| m.as_str().trim().to_string());

        // Extract OS
        let os = self.re_os.find(&combined_text).map(|m| m.as_str().trim().to_string());

        // Extract Warranty
        let warranty = self.re_warranty.find(&combined_text).map(|m| m.as_str().trim().to_string());

        // Extract Color
        let color_name = self.re_color.find(raw_name)
            .map(|m| m.as_str().trim().to_uppercase())
            .unwrap_or_else(|| "STANDARD".to_string());

        // Determine Segment
        let segment = if gpu.as_deref().map_or(false, |g| g.contains("RTX") || g.contains("GTX"))
            || raw_name.to_uppercase().contains("GAMING")
            || raw_name.to_uppercase().contains("TUF")
            || raw_name.to_uppercase().contains("ROG")
            || raw_name.to_uppercase().contains("LOQ")
            || raw_name.to_uppercase().contains("LEGION")
            || raw_name.to_uppercase().contains("NITRO")
            || raw_name.to_uppercase().contains("PREDATOR")
        {
            "Gaming".to_string()
        } else if let Some(ref c) = cpu {
            if c.contains("i7") || c.contains("i9") || c.contains("Ryzen 7") || c.contains("Ryzen 9") || c.contains("Ultra 7") || c.contains("Ultra 9") || c.contains("M2 Pro") || c.contains("M3 Pro") || c.contains("M4") {
                "Performance".to_string()
            } else if c.contains("i5") || c.contains("Ryzen 5") || c.contains("Ultra 5") || c.contains("M1") || c.contains("M2") || c.contains("M3") {
                "Mainstream".to_string()
            } else {
                "Entry Level".to_string()
            }
        } else {
            default_segment.to_string()
        };

        // Determine bundled items
        let mut bundles = Vec::new();
        let upper_text = combined_text.to_uppercase();
        if upper_text.contains("OHS") || upper_text.contains("OFFICE HOME") || upper_text.contains("MICROSOFT 365") {
            bundles.push("Office Home & Student / M365");
        }
        if upper_text.contains("TAS") || upper_text.contains("BACKPACK") || upper_text.contains("SLEEVE") {
            bundles.push("Tas / Backpack Resmi");
        }
        if upper_text.contains("MOUSE") {
            bundles.push("Mouse");
        }
        let bundled_items = if !bundles.is_empty() {
            Some(bundles.join(", "))
        } else {
            None
        };

        let cleaned_description = clean_catalog_description(raw_name);
        let base_product_name = derive_base_model_name(raw_name, brand, &color_name);

        ParsedCatalogItem {
            sheet_name: sheet_name.to_string(),
            row_index: row_idx,
            sku: sku.to_string(),
            part_number,
            raw_name: raw_name.to_string(),
            price_idr,
            brand: brand.to_string(),
            category: category.to_string(),
            segment,
            is_new,
            base_product_name,
            color_name,
            cpu,
            ram_gb,
            ram_type,
            storage,
            storage_type,
            gpu,
            screen_size,
            screen_panel,
            os,
            warranty,
            bundled_items,
            raw_spec_text: raw_name.to_string(),
            detailed_spec_text,
            cleaned_description,
        }
    }

    pub fn group_products(&self, items: &[ParsedCatalogItem]) -> Vec<CatalogGroupedProduct> {
        let mut groups: HashMap<String, Vec<&ParsedCatalogItem>> = HashMap::new();

        for item in items {
            let key = format!("{}::{}::{}", item.brand, item.category, item.base_product_name);
            groups.entry(key).or_default().push(item);
        }

        let mut result = Vec::new();

        for (_key, group_items) in groups {
            let first = group_items[0];
            let mut prices: Vec<i64> = group_items.iter().map(|i| i.price_idr).filter(|&p| p > 0).collect();
            prices.sort_unstable();

            let min_price_idr = prices.first().copied().unwrap_or(0);
            let max_price_idr = prices.last().copied().unwrap_or(0);
            let is_any_new = group_items.iter().any(|i| i.is_new);

            let stock_status = if min_price_idr == 0 {
                "ask_store".to_string()
            } else {
                "in_stock".to_string()
            };

            let slug = slugify(&format!("{} {}", first.brand, first.base_product_name));

            let variants: Vec<CatalogGroupedVariant> = group_items.iter().map(|item| {
                CatalogGroupedVariant {
                    id: Uuid::new_v4(),
                    sku: item.sku.clone(),
                    part_number: item.part_number.clone(),
                    color_name: item.color_name.clone(),
                    price_idr: item.price_idr,
                    stock_status: if item.price_idr == 0 { "ask_store".to_string() } else { "in_stock".to_string() },
                }
            }).collect();

            let product = CatalogGroupedProduct {
                id: Uuid::new_v4(),
                slug,
                name: format!("{} {}", first.brand, first.base_product_name),
                brand: first.brand.clone(),
                category: first.category.clone(),
                segment: first.segment.clone(),
                is_new: is_any_new,
                stock_status,
                min_price_idr,
                max_price_idr,
                cpu: first.cpu.clone(),
                ram_gb: first.ram_gb,
                ram_type: first.ram_type.clone(),
                storage: first.storage.clone(),
                storage_type: first.storage_type.clone(),
                gpu: first.gpu.clone(),
                screen_size: first.screen_size.clone(),
                screen_panel: first.screen_panel.clone(),
                os: first.os.clone(),
                warranty: first.warranty.clone(),
                bundled_items: first.bundled_items.clone(),
                cleaned_description: first.cleaned_description.clone(),
                raw_spec_text: first.raw_spec_text.clone(),
                detailed_spec_text: first.detailed_spec_text.clone(),
                variants,
            };

            result.push(product);
        }

        result.sort_by(|a, b| a.name.cmp(&b.name));
        result
    }
}

fn determine_brand(sheet_name: &str, raw_name: &str) -> String {
    let sheet_upper = sheet_name.to_uppercase();
    let name_upper = raw_name.to_uppercase();

    if sheet_upper.contains("APPLE") || name_upper.contains("MACBOOK") || name_upper.contains("IPAD") || name_upper.contains("IMAC") {
        "APPLE".to_string()
    } else if sheet_upper.contains("ASUS") || name_upper.starts_with("ASUS") || name_upper.contains(" ROG ") || name_upper.contains(" TUF ") {
        "ASUS".to_string()
    } else if sheet_upper.contains("LENOVO") || name_upper.starts_with("LENOVO") || name_upper.contains("THINKPAD") || name_upper.contains("IDEAPAD") || name_upper.contains("YOGA") {
        "LENOVO".to_string()
    } else if sheet_upper.contains("ACER") || name_upper.starts_with("ACER") || name_upper.contains("ASPIRE") || name_upper.contains("PREDATOR") || name_upper.contains("NITRO") {
        "ACER".to_string()
    } else if sheet_upper.contains("HP") || name_upper.starts_with("HP ") || name_upper.contains("PAVILION") || name_upper.contains("VICTUS") || name_upper.contains("OMEN") {
        "HP".to_string()
    } else if sheet_upper.contains("MSI") || name_upper.starts_with("MSI ") {
        "MSI".to_string()
    } else if sheet_upper.contains("AXIOO") || name_upper.starts_with("AXIOO") || name_upper.contains("HYPE") || name_upper.contains("PONGO") {
        "AXIOO".to_string()
    } else if sheet_upper.contains("ADVAN") || name_upper.starts_with("ADVAN") || name_upper.contains("WORKPLUS") || name_upper.contains("SOULMATE") {
        "ADVAN".to_string()
    } else if sheet_upper.contains("COLORFUL") || name_upper.starts_with("COLORFUL") {
        "COLORFUL".to_string()
    } else if sheet_upper.contains("INFINIX") || name_upper.starts_with("INFINIX") {
        "INFINIX".to_string()
    } else {
        "GMC".to_string()
    }
}

fn determine_category(sheet_name: &str, raw_name: &str) -> String {
    let sheet_upper = sheet_name.to_uppercase();
    let name_upper = raw_name.to_uppercase();

    if sheet_upper.contains("PAKET") || name_upper.contains("PAKET") {
        "PAKET BUNDLING".to_string()
    } else if name_upper.contains("MACBOOK") {
        "MACBOOK".to_string()
    } else if name_upper.contains("IPAD") || name_upper.contains("TABLET") {
        "TABLET".to_string()
    } else if sheet_upper.contains("PC BUILD UP") || name_upper.contains("PC TOWER") || name_upper.contains("DESKTOP") {
        "PC DESKTOP".to_string()
    } else if sheet_upper.starts_with("01") && sheet_upper.contains("PC") || name_upper.contains("AIO") || name_upper.contains("ALL-IN-ONE") || name_upper.contains("ALL IN ONE") {
        "ALL-IN-ONE".to_string()
    } else {
        "LAPTOP".to_string()
    }
}

fn clean_catalog_description(raw: &str) -> String {
    let mut cleaned = raw.to_string();
    let patterns = [
        "WAJIB VIDEO UNBOXING",
        "Wajib Video Unboxing",
        "wajib video unboxing",
        "SAAT BUKA PAKET",
        "HARAP REGISTRASI ADP",
        "Harap registrasi ADP",
    ];

    for p in patterns {
        if let Some(pos) = cleaned.find(p) {
            cleaned = cleaned[..pos].trim_end().to_string();
        }
    }

    cleaned.trim().to_string()
}

fn derive_base_model_name(raw: &str, brand: &str, color: &str) -> String {
    let mut name = raw.to_string();

    if name.to_uppercase().starts_with(&brand.to_uppercase()) {
        name = name[brand.len()..].trim().to_string();
    }

    name = clean_catalog_description(&name);

    if color != "STANDARD" {
        let re_color_strip = Regex::new(&format!(r"(?i)\s+{}\b", regex::escape(color))).unwrap();
        name = re_color_strip.replace_all(&name, "").to_string();
    }

    let parts: Vec<&str> = name.split_whitespace().collect();
    let joined = parts.join(" ");
    let trimmed = joined.trim_end_matches(['-', '/', ',', ' ']);

    if trimmed.is_empty() {
        raw.to_string()
    } else {
        trimmed.to_string()
    }
}

fn slugify(text: &str) -> String {
    let cleaned = text.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>();
    
    let parts: Vec<&str> = cleaned.split('-').filter(|s| !s.is_empty()).collect();
    parts.join("-")
}

fn cell_to_string(cell: &Data) -> Option<String> {
    match cell {
        Data::String(s) => Some(s.clone()),
        Data::Float(f) => {
            if f.fract() == 0.0 {
                Some(format!("{:.0}", f))
            } else {
                Some(f.to_string())
            }
        }
        Data::Int(i) => Some(i.to_string()),
        Data::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}
