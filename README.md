# LED Wall Deployment Designer (Ground Stack + Flown)

Touring-grade SaaS planner for concert/event LED wall deployment engineering.

## What This Build Now Supports
- Show/Event model: show name, date, venue, revision notes.
- Panel Family + Cabinet Variant library:
  - Manufacturer, family, pitch, notes.
  - Variants with mixed form factors (500x500, 500x1000, etc.).
  - Full specs: physical dimensions (mm/in), pixels, weight (kg/lbs), connectors.
  - Power profiles: Min / Typical / Max / Peak watts.
  - Planning presets per variant:
    - 20A @120V / @208V
    - Socapex circuit @120V / @208V
    - L21-30 recommendation
- Processor library with editable models and receiving-card-aware pixel limits.
- Wall creation in two modes:
  - By physical size (m + ft)
  - By unit counts
- Base grid design (default 500x500; customizable base unit).
- Mixed cabinet layouts in one wall with correct multi-cell occupancy.
- Canvas workflow with layers:
  - Cabinets
  - Data arrows
  - Power arrows
  - Measurements + labels toggles
- Voltage-aware power planning:
  - 120V / 208V selectable
  - Strategies: 20A Edison, L21-30, Socapex, Camlock-fed distro notes
  - Circuit grouping modes: balanced, minimize home runs, by section
  - Threshold warnings at planning% and hard-limit%
  - Min/Typ/Max/Peak W and A totals
  - Socapex run/circuit counts
- Data planning:
  - Snake rows / snake columns / custom(label-order)
  - Processor port mapping
  - Loom bundles, port groups
  - Run table with cabinet count, jumpers, home run estimates
- Crew print/PDF outputs with title block, voltage mode, dimensions in m/ft, mixed variant breakdown, power totals, data/power tables.

## Stack
- Next.js App Router + TypeScript
- `react-konva` for layout canvas
- Supabase Postgres for persistence
- `@react-pdf/renderer` for PDF

## Environment Variables
Create `.env.local` from `.env.example`.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup (Important)
Run migrations in this order:
1. `supabase/migrations/202602110001_initial_schema.sql`
2. `supabase/migrations/202602120002_touring_model.sql`

Then seed:
- `supabase/seed.sql`

## Local Run
```bash
npm install
npm run dev
```

## Deploy (Vercel)
1. Import GitHub repo in Vercel.
2. Set environment variables listed above.
3. Deploy.
4. On schema updates, run migrations in Supabase SQL Editor, then seed.

## Routes
- `/` dashboard
- `/library` cabinet + processor library manager
- `/shows/new` create show
- `/shows/[id]` show detail + walls
- `/walls/new` wall creation flow
- `/walls/[id]` designer canvas + planning tables
- `/walls/[id]/print` print-friendly crew sheet
- `/api/walls/[id]/pdf` generated PDF

## Recommended Next Enhancements
- Multi-user auth + project-level RLS
- Rigging load checks (point loads / trim heights)
- Cable pull list generator by connector type
- Spare-cab strategy planner by region
- Processor redundancy / backup path planner
- Fixture/hoist collision and sightline overlay import

## Acceptance Tests
See:
- `docs/acceptance-tests.md`
