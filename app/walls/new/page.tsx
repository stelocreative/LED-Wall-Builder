"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { feetToMeters, metersToFeet, roundTo } from "@/lib/domain/conversions";
import { CabinetVariant, PanelFamily, ShowEvent } from "@/lib/domain/types";

interface BootstrapPayload {
  families: PanelFamily[];
  variants: CabinetVariant[];
  shows: ShowEvent[];
}

export default function NewWallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [families, setFamilies] = useState<PanelFamily[]>([]);
  const [variants, setVariants] = useState<CabinetVariant[]>([]);
  const [shows, setShows] = useState<ShowEvent[]>([]);

  const [showId, setShowId] = useState<string>(searchParams.get("showId") ?? "");
  const [name, setName] = useState("Upstage Main Wall");
  const [deploymentType, setDeploymentType] = useState<"GROUND_STACK" | "FLOWN">("FLOWN");
  const [voltageMode, setVoltageMode] = useState<120 | 208>(208);
  const [powerStrategy, setPowerStrategy] = useState<"EDISON_20A" | "L21_30" | "SOCAPEX" | "CAMLOCK_DISTRO">("L21_30");
  const [rackLocation, setRackLocation] = useState<"SL" | "SR" | "USC" | "FOH">("SL");

  const [buildMode, setBuildMode] = useState<"BY_SIZE" | "BY_UNITS">("BY_SIZE");
  const [widthMeters, setWidthMeters] = useState(12);
  const [heightMeters, setHeightMeters] = useState(6);
  const [widthFeet, setWidthFeet] = useState(roundTo(metersToFeet(12), 2));
  const [heightFeet, setHeightFeet] = useState(roundTo(metersToFeet(6), 2));
  const [widthUnits, setWidthUnits] = useState(24);
  const [heightUnits, setHeightUnits] = useState(12);

  const [baseUnitWidthMm, setBaseUnitWidthMm] = useState(500);
  const [baseUnitHeightMm, setBaseUnitHeightMm] = useState(500);

  const [primaryVariantId, setPrimaryVariantId] = useState("");
  const [secondaryVariantId, setSecondaryVariantId] = useState("");
  const [includeMixed, setIncludeMixed] = useState(true);

  const [planningThresholdPercent, setPlanningThresholdPercent] = useState(80);
  const [hardLimitPercent, setHardLimitPercent] = useState(100);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) {
        setStatus("Unable to load setup data");
        return;
      }

      const payload = (await response.json()) as BootstrapPayload;
      if (!mounted) {
        return;
      }

      setFamilies(payload.families);
      setVariants(payload.variants);
      setShows(payload.shows);

      if (payload.shows[0]) {
        setShowId((current) => current || payload.shows[0].id);
      }

      if (payload.variants[0]) {
        setPrimaryVariantId(payload.variants[0].id);
        if (payload.variants[1]) {
          setSecondaryVariantId(payload.variants[1].id);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
    // Load once; selected show can be changed locally without refetching catalog.
  }, []);

  const variantOptions = useMemo(() => {
    return variants.map((variant) => {
      const family = families.find((item) => item.id === variant.familyId);
      return {
        id: variant.id,
        label: `${family ? `${family.manufacturer} ${family.familyName}` : variant.familyId} - ${variant.variantName}`
      };
    });
  }, [families, variants]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const response = await fetch("/api/walls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showId,
        name,
        deploymentType,
        voltageMode,
        powerStrategy,
        rackLocation,
        baseUnitWidthMm,
        baseUnitHeightMm,
        buildMode,
        widthMeters,
        heightMeters,
        widthFeet,
        heightFeet,
        widthUnits,
        heightUnits,
        primaryVariantId,
        secondaryVariantId: includeMixed ? secondaryVariantId : null,
        includeMixed,
        planningThresholdPercent,
        hardLimitPercent,
        notes
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Unable to create wall");
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
          <h1>Create Wall Design</h1>
          <p>Build by physical size or unit count with mixed cabinet variants on a common base grid.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/">
            Dashboard
          </Link>
          <Link className="btn btn-secondary" href="/library">
            Library
          </Link>
        </div>
      </header>

      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            Show/Event
            <select value={showId} onChange={(event) => setShowId(event.target.value)} required>
              <option value="">Select show</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.showName} ({show.showDate})
                </option>
              ))}
            </select>
          </label>

          <label>
            Wall Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        </div>

        <div className="form-row">
          <label>
            Deployment Type
            <select value={deploymentType} onChange={(event) => setDeploymentType(event.target.value as "GROUND_STACK" | "FLOWN") }>
              <option value="GROUND_STACK">Ground Stack</option>
              <option value="FLOWN">Flown</option>
            </select>
          </label>

          <label>
            Voltage Mode
            <select value={voltageMode} onChange={(event) => setVoltageMode(Number(event.target.value) as 120 | 208)}>
              <option value={120}>120V</option>
              <option value={208}>208V</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Power Strategy
            <select
              value={powerStrategy}
              onChange={(event) =>
                setPowerStrategy(event.target.value as "EDISON_20A" | "L21_30" | "SOCAPEX" | "CAMLOCK_DISTRO")
              }
            >
              <option value="EDISON_20A">20A Edison</option>
              <option value="L21_30">L21-30 / Distro</option>
              <option value="SOCAPEX">Socapex</option>
              <option value="CAMLOCK_DISTRO">Camlock-fed Distro</option>
            </select>
          </label>

          <label>
            Rack Location
            <select
              value={rackLocation}
              onChange={(event) => setRackLocation(event.target.value as "SL" | "SR" | "USC" | "FOH")}
            >
              <option value="SL">SL</option>
              <option value="SR">SR</option>
              <option value="USC">USC</option>
              <option value="FOH">FOH</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Base Unit Width (mm)
            <input type="number" value={baseUnitWidthMm} onChange={(event) => setBaseUnitWidthMm(Number(event.target.value))} />
          </label>
          <label>
            Base Unit Height (mm)
            <input type="number" value={baseUnitHeightMm} onChange={(event) => setBaseUnitHeightMm(Number(event.target.value))} />
          </label>
        </div>

        <label>
          Build Mode
          <select value={buildMode} onChange={(event) => setBuildMode(event.target.value as "BY_SIZE" | "BY_UNITS") }>
            <option value="BY_SIZE">By Size (m/ft)</option>
            <option value="BY_UNITS">By Cabinet Units</option>
          </select>
        </label>

        {buildMode === "BY_SIZE" ? (
          <div className="form-row">
            <label>
              Width meters
              <input
                type="number"
                step="0.1"
                value={widthMeters}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setWidthMeters(value);
                  setWidthFeet(roundTo(metersToFeet(value), 2));
                }}
              />
            </label>
            <label>
              Width feet
              <input
                type="number"
                step="0.01"
                value={widthFeet}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setWidthFeet(value);
                  setWidthMeters(roundTo(feetToMeters(value), 2));
                }}
              />
            </label>
            <label>
              Height meters
              <input
                type="number"
                step="0.1"
                value={heightMeters}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setHeightMeters(value);
                  setHeightFeet(roundTo(metersToFeet(value), 2));
                }}
              />
            </label>
            <label>
              Height feet
              <input
                type="number"
                step="0.01"
                value={heightFeet}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setHeightFeet(value);
                  setHeightMeters(roundTo(feetToMeters(value), 2));
                }}
              />
            </label>
          </div>
        ) : (
          <div className="form-row">
            <label>
              Width Units
              <input type="number" value={widthUnits} onChange={(event) => setWidthUnits(Number(event.target.value))} />
            </label>
            <label>
              Height Units
              <input type="number" value={heightUnits} onChange={(event) => setHeightUnits(Number(event.target.value))} />
            </label>
          </div>
        )}

        <div className="form-row">
          <label>
            Primary Cabinet Variant
            <select value={primaryVariantId} onChange={(event) => setPrimaryVariantId(event.target.value)}>
              {variantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Secondary Variant (mixed)
            <select value={secondaryVariantId} onChange={(event) => setSecondaryVariantId(event.target.value)}>
              <option value="">None</option>
              {variantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="checkbox-label">
          <input type="checkbox" checked={includeMixed} onChange={(event) => setIncludeMixed(event.target.checked)} />
          Auto-mix secondary variant in fill pattern
        </label>

        <div className="form-row">
          <label>
            Planning Threshold %
            <input
              type="number"
              min={40}
              max={95}
              value={planningThresholdPercent}
              onChange={(event) => setPlanningThresholdPercent(Number(event.target.value))}
            />
          </label>
          <label>
            Hard Limit %
            <input
              type="number"
              min={80}
              max={120}
              value={hardLimitPercent}
              onChange={(event) => setHardLimitPercent(Number(event.target.value))}
            />
          </label>
        </div>

        <label>
          Notes
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        {status ? <p className="error-line">{status}</p> : null}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create and Open Designer"}
        </button>
      </form>
    </main>
  );
}
