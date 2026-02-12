# Acceptance Tests (Touring Workflow)

## 1) 500x1000-only Wall Build
- [ ] Open `/walls/new`.
- [ ] Build wall using only a 500x1000 variant.
- [ ] Confirm grid occupancy is 1x2 units per cabinet.
- [ ] Confirm wall size shown in meters and feet.
- [ ] Open print page and PDF; confirm dimensions and voltage mode are shown.

## 2) Mixed Cabinet Composite Wall
- [ ] Base grid = 500x500.
- [ ] Place a mix of 500x500 and 500x1000.
- [ ] Confirm no overlap and snap alignment.
- [ ] Confirm totals update correctly:
  - [ ] Physical dimensions (m/ft)
  - [ ] Resolution + total pixels
  - [ ] Weight by variant + total
  - [ ] Power min/typ/max/peak by variant + total

## 3) Voltage Mode Flip
- [ ] Toggle wall voltage mode 120V -> 208V.
- [ ] Confirm power amps decrease at 208V for same watts.
- [ ] Confirm estimated circuit counts update.
- [ ] Switch strategy to Socapex and confirm soca run/circuit counts update.

## 4) Circuit Threshold Behavior
- [ ] Set planning threshold to 80% and hard limit 100%.
- [ ] Confirm circuits show planning/hard warnings when exceeded.
- [ ] Change grouping mode (balanced / min home runs / by section).
- [ ] Confirm circuit assignments re-balance.

## 5) Data Path Output
- [ ] Generate runs with snake rows.
- [ ] Switch to snake columns.
- [ ] Confirm run table updates port assignments, jumper count, and home run estimates.
- [ ] Confirm run warnings appear when processor/receiving-card limits are exceeded.

## 6) Library Expansion
- [ ] Add a new panel family.
- [ ] Add a new cabinet variant with full specs.
- [ ] Add a new processor model.
- [ ] Confirm new models are selectable in wall creation and designer.
- [ ] Upload a variant JSON file and confirm new variants appear.

## 7) Print/PDF Deliverable Quality
- [ ] Title block includes show/date/venue/wall/deployment/voltage/revision.
- [ ] Summary includes m/ft dimensions, cabinet totals, mixed breakdown.
- [ ] Power totals show min/typ/max/peak W and A at selected voltage.
- [ ] Data run table and power circuit table render correctly.
- [ ] Warnings/notes section includes overload alerts.
