"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { feetToMeters, metersToFeet, roundTo } from "@/lib/domain/conversions";
import { PanelVariant } from "@/lib/domain/types";

interface ReferencePayload {
  panels: PanelVariant[];
}

export default function NewWallPage() {
  const router = useRouter();
  const [reference, setReference] = useState<ReferencePayload | null>(null);
  const [name, setName] = useState("Main Stage Wall");
  const [widthMeters, setWidthMeters] = useState(12);
  const [heightMeters, setHeightMeters] = useState(6.5);
  const [widthFeet, setWidthFeet] = useState(roundTo(metersToFeet(12), 2));
  const [heightFeet, setHeightFeet] = useState(roundTo(metersToFeet(6.5), 2));
  const [includeTallMix, setIncludeTallMix] = useState(true);
  const [primaryVariantId, setPrimaryVariantId] = useState("P500x500");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadReference() {
      const response = await fetch("/api/reference", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ReferencePayload;
      if (mounted) {
        setReference(payload);
      }
    }

    void loadReference();

    return () => {
      mounted = false;
    };
  }, []);

  const meterDisplay = useMemo(
    () => `${roundTo(widthMeters, 2)}m x ${roundTo(heightMeters, 2)}m`,
    [widthMeters, heightMeters]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/walls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        widthMeters,
        heightMeters,
        includeTallMix,
        primaryVariantId
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setError(payload.message ?? "Unable to create wall");
      setSubmitting(false);
      return;
    }

    const payload = (await response.json()) as { wall: { id: string } };
    router.push(`/walls/${payload.wall.id}`);
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>Create Wall</h1>
          <p>Enter dimensions in meters or feet. The wall auto-snaps to 500mm engineering units.</p>
        </div>
        <Link className="btn btn-secondary" href="/">
          Back
        </Link>
      </header>

      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Wall Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>

        <div className="form-row">
          <label>
            Width (meters)
            <input
              type="number"
              min="0.5"
              step="0.1"
              value={widthMeters}
              onChange={(event) => {
                const value = Number(event.target.value);
                setWidthMeters(value);
                setWidthFeet(roundTo(metersToFeet(value), 2));
              }}
              required
            />
          </label>

          <label>
            Width (feet)
            <input
              type="number"
              min="1"
              step="0.1"
              value={widthFeet}
              onChange={(event) => {
                const value = Number(event.target.value);
                setWidthFeet(value);
                setWidthMeters(roundTo(feetToMeters(value), 2));
              }}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Height (meters)
            <input
              type="number"
              min="0.5"
              step="0.1"
              value={heightMeters}
              onChange={(event) => {
                const value = Number(event.target.value);
                setHeightMeters(value);
                setHeightFeet(roundTo(metersToFeet(value), 2));
              }}
              required
            />
          </label>

          <label>
            Height (feet)
            <input
              type="number"
              min="1"
              step="0.1"
              value={heightFeet}
              onChange={(event) => {
                const value = Number(event.target.value);
                setHeightFeet(value);
                setHeightMeters(roundTo(feetToMeters(value), 2));
              }}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Primary Panel Variant
            <select value={primaryVariantId} onChange={(event) => setPrimaryVariantId(event.target.value)}>
              {reference?.panels?.map((panel) => (
                <option key={panel.id} value={panel.id}>
                  {panel.name}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeTallMix}
              onChange={(event) => setIncludeTallMix(event.target.checked)}
            />
            Auto mix 500x1000 cabinets
          </label>
        </div>

        <p className="status-line">Requested size: {meterDisplay}</p>
        {error ? <p className="error-line">{error}</p> : null}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create and Open Designer"}
        </button>
      </form>
    </main>
  );
}
