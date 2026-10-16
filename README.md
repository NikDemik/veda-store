This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Notes

- Removed obsolete Clerk experiment files; authentication remains based on NextAuth for customers and staff-session cookies for the admin panel.
- `/account` now uses an interactive profile dashboard with left-side tab navigation: personal account overview, detailed orders, addresses, and settings.
- The profile overview tab shows order summary metrics and a six-month order chart, while the orders tab includes expandable product lists for each order.
- The orders and addresses tabs now support selecting records and deleting the selected items directly from the dashboard.
- The settings tab now shows only registration fields, renders them as editable form inputs, and saves changes through an authenticated account settings API.
- Registration and account settings now include organization type; DaData party suggestions prefill it and the value is saved to `Organization.type`.
- Cart add buttons on product and catalog cards now switch to `In cart` for items already added and prevent duplicate clicks from the UI.
- Catalog add-to-cart buttons now open a confirmation modal with a compact product preview, quantity selector, and actions to open the cart or continue shopping.
- Product detail add-to-cart buttons now use the same confirmation modal and switch to `In cart` after the product is added.
- Product detail pages show product availability and the current stock quantity before the quantity selector; unavailable items display `Нет в наличии`.
- `/contacts` includes a reusable callback form component built with `react-hook-form`, with name, phone, consent checkbox, and client-side validation.
- Product categories now store an optional `imageUrl` in Prisma, and `/catalog` category cards render images from category data instead of a hardcoded slug map.
- `/catalog` category cards are sorted by category popularity, calculated as the total sold quantity of products in non-cancelled orders.
- `src/components/base/site-breadcrumbs.tsx` renders shared breadcrumbs for non-catalog pages; catalog category and product pages use `src/components/catalog/catalog-breadcrumbs.tsx` for `Главная / Каталог / категория` and `Главная / Каталог / категория / товар`.
- Catalog category pages support URL-backed product sorting through `sort=price-asc`, `sort=price-desc`, and `sort=name-asc`; the selector preserves active filters while changing Prisma ordering.
- Catalog popularity sorting is the default category order; `sort=popular` uses `Product.popularityWeight + sold quantity from non-cancelled order items`.
- The product detail page uses `src/components/product/product-gallery.tsx` to render a compact main image with left-side thumbnails from `ProductImage` records.
- Product documentation can be stored as multiple related `ProductDocument` records with file metadata and display ordering.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This project is ready to deploy as a Next.js application on [Vercel](https://vercel.com/new).

For Beget VPS deployment, use [`docs/deploy-beget-vps.md`](docs/deploy-beget-vps.md). The VPS setup runs the app with PM2 behind Nginx and applies Prisma migrations before `next build`.

Recommended Vercel settings:

- Framework Preset: `Next.js`
- Install Command: controlled by `vercel.json`
- Build Command: controlled by `vercel.json`; Vercel runs `npm run vercel-build`, which applies pending Prisma migrations with `prisma migrate deploy` before `next build`.
- Output Directory: leave empty, Vercel detects `.next`
- Node.js Version: `20.x` or newer

The repository uses npm and commits `package-lock.json`, so Vercel installs dependencies with `npm ci`.

Prisma migrations must be committed before deployment. The production database is updated during the Vercel build, so new tables such as `ProductDocument` exist before runtime catalog/product queries execute.

Required environment variables:

- `DATABASE_URL`: MySQL connection string used by Prisma.
- `AUTH_SECRET`: long random secret for NextAuth and admin staff sessions.

Optional environment variables:

- `DADATA_API_KEY`: enables DaData organization and address suggestions.
- `YANDEX_STORAGE_BUCKET`: Object Storage bucket for admin uploads.
- `YANDEX_STORAGE_ACCESS_KEY_ID`: static access key for the bucket.
- `YANDEX_STORAGE_SECRET_ACCESS_KEY`: static secret key for the bucket.
- `YANDEX_STORAGE_ENDPOINT`: S3-compatible endpoint, defaults to `https://storage.yandexcloud.net`.
- `YANDEX_STORAGE_REGION`: region passed to the S3 client, defaults to `ru-central1`.
- `YANDEX_STORAGE_PUBLIC_BASE_URL`: public CDN/bucket base URL used for saved file links. Defaults to `{YANDEX_STORAGE_ENDPOINT}/{YANDEX_STORAGE_BUCKET}`.
- `YANDEX_STORAGE_FORCE_PATH_STYLE`: set to `true` only when using a path-style S3-compatible endpoint.

## Yandex Object Storage

The admin product form uploads product images and PDF catalogs through direct browser uploads to Yandex Cloud Object Storage. `POST /api/admin/storage/presign` is staff-only, validates file type and size, returns a short-lived presigned PUT URL, and the browser sends the file directly to Object Storage without passing the file body through Vercel Functions.

Supported uploads:

- Product images: JPEG, PNG, WebP, GIF up to 8 MB. Stored as `images/{brandSlug}/{seriesSlug}/{productSlug}-{sequence}.{ext}`. The admin form requires brand, series, and product slug before image upload.
- PDF catalogs/datasheets: PDF up to 30 MB. Stored as `catalogs/{brandSlug}/{seriesSlug}/{fileName}`.

Uploaded files return a public URL that is written into `Product.imageUrl`, `ProductImage.url`, or `ProductDocument.url`. Make the bucket or CDN path publicly readable for storefront rendering and PDF downloads. Remote images from `storage.yandexcloud.net` and `YANDEX_STORAGE_PUBLIC_BASE_URL` are allowed in `next.config.ts`.

For production direct uploads, configure bucket CORS to allow `PUT` from the site origin and request headers `Content-Type` and `Cache-Control`. Without this rule, browsers block the presigned upload during the `OPTIONS` preflight request before the file reaches Object Storage.

Recommended CORS rule for the production bucket:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://drives-vfd.ru</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>Content-Type</AllowedHeader>
    <AllowedHeader>Cache-Control</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

Before deploying, make sure the production MySQL database is reachable from Vercel during both build and runtime. The project runs `prisma generate` after dependency installation, but migrations and data imports should be run manually against the production database before the first public deploy.

Typical deployment flow:

```bash
npm ci
npm run prisma:generate
npm run build
```

Then import the repository in Vercel, set the environment variables for Production and Preview, and deploy.

Runtime diagnostics:

- `/api/health/db` checks whether the deployed runtime can read `DATABASE_URL` and execute a minimal MySQL query through Prisma. It returns `{ "ok": true }` on success and writes connection details to Vercel Function Logs on failure.

## Recent Updates

- Checkout supports pickup, transport company delivery, and CDEK.
- Order creation now assigns the next sequential order number from the latest saved database order instead of using a random value.
- The selected delivery method is saved in the order and displayed in `/account`.
- Checkout delivery method UI is extracted into a separate component, and the order submit button is now shown below the order summary.
- For transport company delivery, checkout loads the organization's saved shipping addresses and lets the user select one instead of entering it manually.
- New shipping addresses entered in checkout are now saved from a single `fullAddress` line, with fallback city/street values derived in the order API.
- Checkout now suggests transport-company delivery addresses from DaData, keeps a one-line `fullAddress`, and stores hidden structured address fields alongside it.
- `/account` converts Prisma `Decimal` order totals, prices, and VAT values to plain numbers on the server before passing them into the client dashboard.
- Product prices now keep kopeck precision in Prisma (`Product.price`/`priceOld` as `Decimal(12, 2)`); catalog cards hide kopecks visually, while the product page, cart, checkout, account pages, and client-side totals display and use two decimal places.
- Registration saves the organization type (`OOO`, `AO`, `IP`, `OTHER`) selected manually or filled from DaData, and `/account` can edit the same field.
- Prisma now has a separate `StaffUser` model with `StaffRole` values for internal admin-panel employees. The seed creates the first `SUPERADMIN` staff account.
- Orders now have `OrderStatusHistory`, which records status transitions with the previous status, new status, responsible staff user, comment, and timestamp for admin operations.
- `OrderDocument` now supports document statuses, uploader tracking, file metadata, storage keys, signing/expiration dates, organization-level linking, and additional B2B document types.
- Order processing now uses separate Prisma status fields for lifecycle, payment, fulfillment, and documents instead of a single combined order status.
- Orders now store shipping company, tracking, shipment/delivery dates, shipping cost, and delivery contact details; `AuditLog` provides a universal change history for admin operations.
- `PricingRule.validFrom` is now required to make the unique key deterministic in MySQL and prevent duplicate active price breaks with `NULL` dates.
- `/admin/login` provides staff-only admin authentication, and `/admin` shows an operational order dashboard with all recent orders, client data, statuses, delivery, documents, and totals.
- `/admin` now follows the `/account` dashboard structure with side tabs for orders and organizations.
- `/admin` now includes a collapsible products section with screens for all products, product add/edit form, and category management backed by Prisma catalog data.
- `/admin` now includes a products subtab for product series management with a series list, product counters, and a new-series form based on the Prisma `Series` model.
- Admin dashboard content is split into section components under `src/components/admin/tabs`, with shared admin types, UI primitives, formatting helpers, and navigation kept in separate modules.
- The admin product form is now a step-by-step catalog card flow covering main data, pricing and stock, product parameters with dynamic specs, media gallery, and datasheet documentation.
- `/admin` now has its own App Router layout with a dedicated admin header/footer, separated from the public storefront shell.
- Admin authentication still uses `StaffUser` and a signed httpOnly `admin_session` cookie; production requires `AUTH_SECRET` or `NEXTAUTH_SECRET`.
- `/contacts` now renders the callback form component inside the contact section and uses `react-hook-form` for local validation.
- Category images are now stored on `Category.imageUrl`; the `/catalog` page reads them from Prisma and falls back to the shared product placeholder when empty.
- The admin products section now has a "Серии товаров" tab that loads `Series` records with product counts and mirrors the category-management layout for adding a new series.
- The "Серии товаров" admin form now saves new series through `POST /api/admin/series`, validates staff access and slug format, then refreshes the dashboard data.
- The admin category form now saves new categories through `POST /api/admin/categories`, including optional parent category, image URL, and description.
- The admin category list now supports hover edit/delete actions, in-place form editing, and modal-confirmed deletion through `PATCH/DELETE /api/admin/categories/[categoryId]`.
- The admin series list now supports hover edit/delete actions, in-place form editing, and modal-confirmed deletion through `PATCH/DELETE /api/admin/series/[seriesId]`.
- The admin product form now supports adding products only and saves new catalog records, specs, and gallery images through `POST /api/admin/products`.
- The admin products list now supports hover edit/delete actions, opens the product form in edit mode, and deletes products with modal confirmation through `PATCH/DELETE /api/admin/products/[productId]`.
- The admin product media step now uses only the `ProductImage` gallery. The checked primary gallery row also fills the product `imageUrl`, and only one image can be primary.
- Prisma now has a separate `ProductDocument` model so each product can have several documentation files with URL, title, file metadata, storage key, and sort order.
- The admin product documentation step now supports multiple document rows and saves them into `ProductDocument` records.
- The product detail page now renders documentation links from related `ProductDocument` records instead of `Product.datasheetUrl`.
- The home hero background image now uses the Next.js `<Image>` component with a full-cover blurred layer instead of a CSS background URL.
- The product detail gallery now shows left-side thumbnails when a product has multiple images, and thumbnail clicks replace the compact main image without changing the page grid.
- The admin product add/edit form now opens a confirmation modal before saving new or existing products, shows a success/error modal after the save attempt, and returns to the "Все товары" tab after successful saves.
- The admin "Все товары" product list now has filters after metrics for article/SKU, category, and availability, plus a visible filtered count.
- The admin "Все товары" product list now opens the add-product form from a local "Добавить товар" button, while the separate add-product item is removed from the products menu.
