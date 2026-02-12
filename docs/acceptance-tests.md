# Acceptance Test Checklist

## Mixed Cabinet Rendering
- [ ] Create wall with mixed mode enabled.
- [ ] Confirm 500x1000 cabinets render as 1x2 rectangles in canvas (not square).
- [ ] Convert selected cabinet from 500x500 to 500x1000 and verify overlap guard.
- [ ] Confirm mixed and uniform rebuild actions both work.

## Block Consistency / Data Plan
- [ ] Select processor and receiving card (`A8s` then `A10s`) and verify block allocations update.
- [ ] Confirm data plan allocates full row blocks only (no partial-row splits).
- [ ] Confirm rigging mode switches cable origin labels between ground and air.
- [ ] Confirm loom bundle and port group indices update when sizes change.

## Voltage + Power Math
- [ ] Toggle voltage 120V/208V and verify amps recalc (`A = W / V`).
- [ ] Switch source type between 20A / SOCAPEX / L21-30 and verify circuit counts.
- [ ] Confirm each circuit shows min/typ/max/peak and over-limit status.
- [ ] Confirm total min/typ/max/peak W and A shown.

## IMAG Mirroring
- [ ] Set wall role to mirror and link a master wall.
- [ ] Enable mirrored port order and verify reversed port mapping in data plan.
- [ ] Enable mirrored circuit mapping and verify reversed circuit numbering in power plan.
- [ ] Disable both toggles and verify master order is preserved.

## Theming / Branding
- [ ] Open Theme & Branding admin page.
- [ ] Change primary/accent/background/text colors and save.
- [ ] Confirm UI updates globally (forms remain readable on dark theme).
- [ ] Upload logo and verify it appears in print view and PDF output.

## Print / PDF
- [ ] Open print page and verify title block, totals, data/power tables, revision notes.
- [ ] Trigger browser print and verify printable layout.
- [ ] Open `/api/walls/:id/pdf` and verify generated PDF contains branded title and planning tables.
