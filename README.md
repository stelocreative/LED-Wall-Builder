# LED Wall Designer

Standalone web app for LED wall deployment design, power/data planning, and crew printouts.

## Runtime mode

- This build runs independently and does **not** require Base44 runtime services.
- Data is persisted in browser `localStorage` for now.

## Local development

1. Install dependencies:
```bash
npm install
```
2. Run dev server:
```bash
npm run dev
```
3. Build for production:
```bash
npm run build
```

## Environment variables

Current app runtime does not require backend env vars.

Optional future backend wiring:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Included starter catalog

Built-in popular touring catalog merge logic includes:
- Chauvet Professional F4X IP (`500x500`, `500x1000`)
- Absen PL3.9 Pro V2 (`500x500`, `500x1000`)
- ROE Visual Black Pearl / Ruby / Diamond common touring variants
