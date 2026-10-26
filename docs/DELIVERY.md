# Delivery notes — demo version

## Live demo

Base: https://liyalili10805-png.github.io/marks-client-showroom/

- Collection home: `/collection.html`
- Series / selection: `/collection-series.html`
- Style detail: `/collection-detail.html?code=AE-014`
- My Selection: `/my-selection.html`
- Marks workspace: `/workspace.html`
- Content admin: `/admin.html`

## Demo mode

- Data is seeded from `data/seed.demo.json` into browser IndexedDB on first load (`js/demo-store.js`).
- Admin uploads are stored as Blobs in IndexedDB; published changes are applied to the Collection pages.
- Demo identities are listed in the workspace header selector (Toronto / Vancouver / Calgary / Mark's team / Design).
- Local to the current browser and origin. Not shared across devices.

## Admin steps

1. Open `/admin.html`.
2. Edit hero title (two lines), intro, button label.
3. Upload a hero image and/or replace a product image (JPG/PNG/WebP ≤ 8 MB).
4. Save draft → Preview (`collection.html?preview=1`) → Publish.
5. Withdraw returns the storefront to the previously published version; Restore previous reverts the last published override.

## Workspace

- By style / By store / Development notes tabs.
- Latest submitted version per store; drafts excluded.
- Create a development note from the selected style.
- Export feedback CSV and revision brief CSV (UTF-8 BOM).

## Content replacement later

- Page copy and product list: `data/collections.json` (images, colours, materials, prices).
- Admin overrides live in IndexedDB for the demo.
- Real Supabase mode is not wired yet; schema/migration/adapter are still pending.

## Implemented vs pending

Implemented (demo):
- Collection home, series grid, style detail, materials block, My Selection page.
- Marks workspace summary + CSV + development notes.
- Admin hero/product image replacement with publish/withdraw/restore.
- IndexedDB persistence for demo assets and content.

Pending (not yet):
- Supabase adapter, incremental migrations, RLS policies, Storage.
- Store login / roles / membership; submission versions and receipts.
- Full admin for collections, materials, asset library and versions.
- Exact spec page naming (`style-detail.html`, `materials.html` as standalone).
- Automated acceptance tests and screenshot set.
