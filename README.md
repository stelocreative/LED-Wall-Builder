# LED Wall Deployment Designer

Production-oriented SaaS web app scaffold for concert/event LED wall engineering.

## Stack
- Next.js App Router + TypeScript
- `react-konva` canvas for cabinet layout and arrows
- Supabase Postgres for persistence (walls, cabinets, plans, theme)
- `@react-pdf/renderer` for crew packet PDF export route

## Features Implemented
- Panel library with variants `500x500` and `500x1000`, power profiles, weight, pixel map, connectors.
- Wall creation from meters with 500mm unit snapping and meter/feet conversion fields.
- Mixed cabinet support in one wall with proper 1x2 rendering for 500x1000 (no forced square rendering).
- Processor library: Novastar `MX20`, `MX30`, `MX40`.
- Receiving card switch `A8s` / `A10s` adjusts per-port pixel thresholds in data planning.
- Auto data plan:
  - Consistent row blocks (no uneven partial-row assignments)
  - Rack location support (`SL`, `SR`, `USC`, `FOH`)
  - Rigging mode cable origin (`ground` or `air`)
  - Loom bundling + port grouping
  - IMAG mirror behavior with optional mirrored port and circuit mapping
- Auto power plan:
  - 120V / 208V current math
  - Source types: `20A`, `SOCAPEX`, `L21-30`
  - Per-circuit + total min/typ/max/peak watts and amps
- Print/PDF output:
  - Crew-ready title block with theme/logo
  - Summary totals
  - Data/power arrow tables
  - Revision notes section
- Global admin Theme & Branding page:
  - Brand colors/fonts/logo upload
  - Theme applied to app UI and print/PDF payload
  - Global dark-form readability enforcement in CSS

## 1) Local Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Configure env
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Start Supabase locally (if using local dev DB)
supabase start
supabase db reset

# 4. Run app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 2) Deployment-Ready Setup

### Supabase (hosted)
1. Create Supabase project.
2. Run migration and seed:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```
3. Set project env vars in your host platform.

### Vercel
1. Import repo in Vercel.
2. Set env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy with build command `npm run build`.

## 3) Database Files
- `supabase/migrations/202602110001_initial_schema.sql`
- `supabase/seed.sql`

## 4) Acceptance Checklist
See: `docs/acceptance-tests.md`
