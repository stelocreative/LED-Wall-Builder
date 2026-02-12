"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { kgToLbs, mmToInches, roundTo } from "@/lib/domain/conversions";
import { CabinetVariant, PanelFamily, ProcessorModel } from "@/lib/domain/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface BootstrapPayload {
  families: PanelFamily[];
  variants: CabinetVariant[];
  processors: ProcessorModel[];
}

export default function LibraryPage() {
  const [families, setFamilies] = useState<PanelFamily[]>([]);
  const [variants, setVariants] = useState<CabinetVariant[]>([]);
  const [processors, setProcessors] = useState<ProcessorModel[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [familyForm, setFamilyForm] = useState({
    manufacturer: "Absen",
    familyName: "PL3.9 Pro V2",
    pixelPitchMm: 3.9,
    notes: "",
    outdoorRating: "IP65 front / IP54 rear",
    serviceAccess: "Front + Rear"
  });

  const [variantForm, setVariantForm] = useState({
    familyId: "",
    variantName: "500x500",
    widthMm: 500,
    heightMm: 500,
    depthMm: 85,
    pixelWidth: 128,
    pixelHeight: 128,
    weightKg: 8.8,
    dataConnector: "EtherCON In/Out",
    powerConnector: "PowerCON True1 In/Out",
    minW: 55,
    typW: 110,
    maxW: 180,
    peakW: 210,
    rec20a120: 8,
    rec20a208: 13,
    recSoca120: 8,
    recSoca208: 13,
    recL2130: 16,
    notes: ""
  });

  const [processorForm, setProcessorForm] = useState({
    manufacturer: "Novastar",
    modelName: "MX20",
    ethernetPorts: 10,
    maxPixelsPerPortA8s: 650000,
    maxPixelsPerPortA10s: 850000,
    notes: ""
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) {
        setStatus("Unable to load library data");
        return;
      }

      const payload = (await response.json()) as BootstrapPayload;
      if (!mounted) {
        return;
      }

      setFamilies(payload.families);
      setVariants(payload.variants);
      setProcessors(payload.processors);
      if (payload.families[0]) {
        setVariantForm((current) => ({ ...current, familyId: payload.families[0].id }));
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const familyOptions = useMemo(() => families.map((family) => ({ id: family.id, label: `${family.manufacturer} ${family.familyName}` })), [families]);

  async function submitFamily(event: FormEvent) {
    event.preventDefault();
    const id = `${slugify(familyForm.manufacturer)}-${slugify(familyForm.familyName)}`;

    const response = await fetch("/api/library/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        manufacturer: familyForm.manufacturer,
        familyName: familyForm.familyName,
        pixelPitchMm: familyForm.pixelPitchMm,
        notes: familyForm.notes,
        outdoorRating: familyForm.outdoorRating,
        serviceAccess: familyForm.serviceAccess
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Unable to save family");
      return;
    }

    const payload = (await response.json()) as { family: PanelFamily };
    setFamilies((current) => {
      const others = current.filter((family) => family.id !== payload.family.id);
      return [...others, payload.family].sort((a, b) => a.familyName.localeCompare(b.familyName));
    });
    setVariantForm((current) => ({ ...current, familyId: payload.family.id }));
    setStatus(`Saved family ${payload.family.manufacturer} ${payload.family.familyName}`);
  }

  async function submitVariant(event: FormEvent) {
    event.preventDefault();

    if (!variantForm.familyId) {
      setStatus("Select a panel family first.");
      return;
    }

    const family = families.find((item) => item.id === variantForm.familyId);
    const familySlug = family ? `${slugify(family.manufacturer)}-${slugify(family.familyName)}` : slugify(variantForm.familyId);
    const variantSlug = slugify(variantForm.variantName);
    const variantId = `${familySlug}-${variantSlug}`;

    const response = await fetch("/api/library/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: variantId,
        familyId: variantForm.familyId,
        variantName: variantForm.variantName,
        dimensionsMm: {
          widthMm: variantForm.widthMm,
          heightMm: variantForm.heightMm,
          depthMm: variantForm.depthMm
        },
        dimensionsIn: {
          widthIn: roundTo(mmToInches(variantForm.widthMm), 3),
          heightIn: roundTo(mmToInches(variantForm.heightMm), 3),
          depthIn: roundTo(mmToInches(variantForm.depthMm), 3)
        },
        pixels: {
          width: variantForm.pixelWidth,
          height: variantForm.pixelHeight
        },
        weightKg: variantForm.weightKg,
        weightLbs: roundTo(kgToLbs(variantForm.weightKg), 3),
        connectors: {
          data: variantForm.dataConnector,
          power: variantForm.powerConnector
        },
        power: {
          min: variantForm.minW,
          typ: variantForm.typW,
          max: variantForm.maxW,
          peak: variantForm.peakW
        },
        peakFactor: null,
        recommendedPer20A120: variantForm.rec20a120,
        recommendedPer20A208: variantForm.rec20a208,
        recommendedPerSoca120: variantForm.recSoca120,
        recommendedPerSoca208: variantForm.recSoca208,
        recommendedPerL2130: variantForm.recL2130,
        notes: variantForm.notes,
        unitWidth: Math.max(1, Math.round(variantForm.widthMm / 500)),
        unitHeight: Math.max(1, Math.round(variantForm.heightMm / 500))
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Unable to save variant");
      return;
    }

    const payload = (await response.json()) as { variant: CabinetVariant };
    setVariants((current) => {
      const others = current.filter((item) => item.id !== payload.variant.id);
      return [...others, payload.variant].sort((a, b) => a.variantName.localeCompare(b.variantName));
    });
    setStatus(`Saved variant ${payload.variant.variantName}`);
  }

  async function submitProcessor(event: FormEvent) {
    event.preventDefault();

    const id = `${slugify(processorForm.manufacturer)}-${slugify(processorForm.modelName)}`;
    const response = await fetch("/api/library/processors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        manufacturer: processorForm.manufacturer,
        modelName: processorForm.modelName,
        ethernetPorts: processorForm.ethernetPorts,
        maxPixelsPerPortA8s: processorForm.maxPixelsPerPortA8s,
        maxPixelsPerPortA10s: processorForm.maxPixelsPerPortA10s,
        notes: processorForm.notes
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Unable to save processor");
      return;
    }

    const payload = (await response.json()) as { processor: ProcessorModel };
    setProcessors((current) => {
      const others = current.filter((item) => item.id !== payload.processor.id);
      return [...others, payload.processor].sort((a, b) => a.modelName.localeCompare(b.modelName));
    });
    setStatus(`Saved processor ${payload.processor.modelName}`);
  }

  async function onVariantUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        await fetch("/api/library/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
      }

      setStatus("Variant JSON upload processed. Refreshing list...");
      const response = await fetch("/api/library/variants", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { variants: CabinetVariant[] };
        setVariants(payload.variants);
      }
    } catch {
      setStatus("Unable to parse uploaded JSON file.");
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>Library Management</h1>
          <p>Add new panel families, cabinet variants, and processors as inventory evolves.</p>
        </div>
        <div className="header-actions">
          <Link href="/" className="btn btn-secondary">
            Dashboard
          </Link>
          <Link href="/walls/new" className="btn">
            Build Wall
          </Link>
        </div>
      </header>

      {status ? <p className="status-line">{status}</p> : null}

      <section className="designer-grid" style={{ alignItems: "start" }}>
        <aside className="panel-stack">
          <form className="panel" onSubmit={submitFamily}>
            <h2>Panel Family</h2>
            <label>
              Manufacturer
              <input value={familyForm.manufacturer} onChange={(event) => setFamilyForm((s) => ({ ...s, manufacturer: event.target.value }))} required />
            </label>
            <label>
              Family Name
              <input value={familyForm.familyName} onChange={(event) => setFamilyForm((s) => ({ ...s, familyName: event.target.value }))} required />
            </label>
            <label>
              Pixel Pitch (mm)
              <input
                type="number"
                step="0.01"
                value={familyForm.pixelPitchMm}
                onChange={(event) => setFamilyForm((s) => ({ ...s, pixelPitchMm: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              Outdoor Rating
              <input value={familyForm.outdoorRating} onChange={(event) => setFamilyForm((s) => ({ ...s, outdoorRating: event.target.value }))} />
            </label>
            <label>
              Service Access
              <input value={familyForm.serviceAccess} onChange={(event) => setFamilyForm((s) => ({ ...s, serviceAccess: event.target.value }))} />
            </label>
            <label>
              Notes
              <textarea rows={3} value={familyForm.notes} onChange={(event) => setFamilyForm((s) => ({ ...s, notes: event.target.value }))} />
            </label>
            <button className="btn" type="submit">
              Save Family
            </button>
          </form>

          <form className="panel" onSubmit={submitProcessor}>
            <h2>Processor</h2>
            <label>
              Manufacturer
              <input value={processorForm.manufacturer} onChange={(event) => setProcessorForm((s) => ({ ...s, manufacturer: event.target.value }))} required />
            </label>
            <label>
              Model
              <input value={processorForm.modelName} onChange={(event) => setProcessorForm((s) => ({ ...s, modelName: event.target.value }))} required />
            </label>
            <div className="form-row">
              <label>
                Ethernet Ports
                <input
                  type="number"
                  value={processorForm.ethernetPorts}
                  onChange={(event) => setProcessorForm((s) => ({ ...s, ethernetPorts: Number(event.target.value) }))}
                />
              </label>
              <label>
                A8s px/port
                <input
                  type="number"
                  value={processorForm.maxPixelsPerPortA8s}
                  onChange={(event) => setProcessorForm((s) => ({ ...s, maxPixelsPerPortA8s: Number(event.target.value) }))}
                />
              </label>
            </div>
            <label>
              A10s px/port
              <input
                type="number"
                value={processorForm.maxPixelsPerPortA10s}
                onChange={(event) => setProcessorForm((s) => ({ ...s, maxPixelsPerPortA10s: Number(event.target.value) }))}
              />
            </label>
            <label>
              Notes
              <textarea rows={2} value={processorForm.notes} onChange={(event) => setProcessorForm((s) => ({ ...s, notes: event.target.value }))} />
            </label>
            <button className="btn" type="submit">
              Save Processor
            </button>
          </form>
        </aside>

        <section className="panel-stack">
          <form className="panel" onSubmit={submitVariant}>
            <h2>Cabinet Variant</h2>
            <label>
              Family
              <select value={variantForm.familyId} onChange={(event) => setVariantForm((s) => ({ ...s, familyId: event.target.value }))}>
                {familyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Variant Name
              <input value={variantForm.variantName} onChange={(event) => setVariantForm((s) => ({ ...s, variantName: event.target.value }))} required />
            </label>
            <div className="form-row">
              <label>
                Width mm
                <input type="number" value={variantForm.widthMm} onChange={(event) => setVariantForm((s) => ({ ...s, widthMm: Number(event.target.value) }))} />
              </label>
              <label>
                Height mm
                <input type="number" value={variantForm.heightMm} onChange={(event) => setVariantForm((s) => ({ ...s, heightMm: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Depth mm
                <input type="number" value={variantForm.depthMm} onChange={(event) => setVariantForm((s) => ({ ...s, depthMm: Number(event.target.value) }))} />
              </label>
              <label>
                Weight kg
                <input type="number" step="0.1" value={variantForm.weightKg} onChange={(event) => setVariantForm((s) => ({ ...s, weightKg: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Pixels W
                <input type="number" value={variantForm.pixelWidth} onChange={(event) => setVariantForm((s) => ({ ...s, pixelWidth: Number(event.target.value) }))} />
              </label>
              <label>
                Pixels H
                <input type="number" value={variantForm.pixelHeight} onChange={(event) => setVariantForm((s) => ({ ...s, pixelHeight: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Min W
                <input type="number" value={variantForm.minW} onChange={(event) => setVariantForm((s) => ({ ...s, minW: Number(event.target.value) }))} />
              </label>
              <label>
                Typ W
                <input type="number" value={variantForm.typW} onChange={(event) => setVariantForm((s) => ({ ...s, typW: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Max W
                <input type="number" value={variantForm.maxW} onChange={(event) => setVariantForm((s) => ({ ...s, maxW: Number(event.target.value) }))} />
              </label>
              <label>
                Peak W
                <input type="number" value={variantForm.peakW} onChange={(event) => setVariantForm((s) => ({ ...s, peakW: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Rec 20A @120V
                <input type="number" value={variantForm.rec20a120} onChange={(event) => setVariantForm((s) => ({ ...s, rec20a120: Number(event.target.value) }))} />
              </label>
              <label>
                Rec 20A @208V
                <input type="number" value={variantForm.rec20a208} onChange={(event) => setVariantForm((s) => ({ ...s, rec20a208: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Rec Soca @120V
                <input type="number" value={variantForm.recSoca120} onChange={(event) => setVariantForm((s) => ({ ...s, recSoca120: Number(event.target.value) }))} />
              </label>
              <label>
                Rec Soca @208V
                <input type="number" value={variantForm.recSoca208} onChange={(event) => setVariantForm((s) => ({ ...s, recSoca208: Number(event.target.value) }))} />
              </label>
            </div>
            <label>
              Rec L21-30 per circuit
              <input type="number" value={variantForm.recL2130} onChange={(event) => setVariantForm((s) => ({ ...s, recL2130: Number(event.target.value) }))} />
            </label>
            <button className="btn" type="submit">
              Save Variant
            </button>
          </form>

          <section className="panel">
            <h2>Variant Upload (JSON)</h2>
            <p>Upload one or multiple cabinet variant records in JSON format matching the API schema.</p>
            <label>
              JSON File
              <input type="file" accept="application/json" onChange={onVariantUpload} />
            </label>
          </section>

          <section className="panel">
            <h2>Current Library Snapshot</h2>
            <p>Families: {families.length} | Variants: {variants.length} | Processors: {processors.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Variant</th>
                  <th>Size</th>
                  <th>Pixels</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => {
                  const family = families.find((item) => item.id === variant.familyId);
                  return (
                    <tr key={variant.id}>
                      <td>{family ? `${family.manufacturer} ${family.familyName}` : variant.familyId}</td>
                      <td>{variant.variantName}</td>
                      <td>
                        {variant.dimensionsMm.widthMm}x{variant.dimensionsMm.heightMm}mm ({roundTo(variant.dimensionsIn.widthIn, 2)}x
                        {roundTo(variant.dimensionsIn.heightIn, 2)}in)
                      </td>
                      <td>
                        {variant.pixels.width}x{variant.pixels.height}
                      </td>
                      <td>
                        {roundTo(variant.weightKg, 1)}kg / {roundTo(variant.weightLbs, 1)}lbs
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </section>
      </section>
    </main>
  );
}
