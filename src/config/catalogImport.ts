export const catalogImportConfig = {
    maxFileSize: 15 * 1024 * 1024,
    maxRows: 10_000,
    batchSize: 75,
    allowedMimeTypes: new Set([
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
    ]),
    writableRoles: new Set(['SUPERADMIN', 'ADMIN', 'PROCUREMENT']),
    stockWritableRoles: new Set(['SUPERADMIN', 'ADMIN', 'PROCUREMENT', 'WAREHOUSE']),
    csvMaxFileSize: 5 * 1024 * 1024,
    csvMaxRows: 50_000,
    csvBatchSize: 250,
    csvMimeTypes: new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']),
} as const;

export const catalogCsvHeaders = {
    PRICE: ['sku', 'price', 'currency'],
    STOCK: ['sku', 'stock_qty'],
} as const;

export const catalogImportSheets = {
    Products: [
        'sku', 'article', 'barcode', 'name', 'slug', 'description', 'category_slug',
        'brand_slug', 'series_slug', 'product_type_code', 'unit_code', 'model',
        'seo_title', 'meta_description', 'status', 'availability', 'vat_rate', 'price',
        'purchase_price', 'price_old', 'currency', 'stock_qty', 'min_order_qty',
        'step_qty', 'popularity_weight', 'lead_time_days', 'warranty_months',
        'datasheet_url', 'image_url', 'weight_kg', 'width_mm', 'height_mm', 'depth_mm',
        'voltage_v', 'current_a', 'power_w', 'frequency_hz', 'protection_class_ip',
        'operating_temp_from_c', 'operating_temp_to_c', 'is_sellable',
    ],
    ProductSpecs: ['sku', 'name', 'value', 'unit'],
    Images: ['sku', 'url', 'alt_text', 'is_primary', 'sort_order'],
    Documents: ['sku', 'title', 'url', 'file_name', 'mime_type', 'size', 'storage_key', 'sort_order'],
} as const;
