"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { metersToFeet, roundTo } from "@/lib/domain/conversions";
import { Wall } from "@/lib/domain/types";

export default function HomePage() {
  const [walls, setWalls] = useState<Wall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadWalls() {
      const response = await fetch("/api/walls", { cache: "no-store" });
      if (!response.ok) {
        if (mounted) {
          setWalls([]);
          setLoading(false);
        }
        return;
      }

      const payload = (await response.json()) as { walls: Wall[] };
      if (mounted) {
        setWalls(payload.walls ?? []);
        setLoading(false);
      }
    }

    void loadWalls();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>LED Wall Deployment Designer</h1>
          <p>Concert/event LED wall engineering with automatic data and power planning.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/admin/theme">
            Theme & Branding
          </Link>
          <Link className="btn" href="/walls/new">
            New Wall
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="status-line">Loading walls...</p>
      ) : walls.length === 0 ? (
        <section className="empty-state">
          <h2>No walls yet</h2>
          <p>Create your first deployment wall to generate data and power plans.</p>
          <Link className="btn" href="/walls/new">
            Create Wall
          </Link>
        </section>
      ) : (
        <section className="card-grid">
          {walls.map((wall) => (
            <article key={wall.id} className="card">
              <h3>{wall.name}</h3>
              <p>
                Size: {wall.widthMeters.toFixed(2)}m x {wall.heightMeters.toFixed(2)}m ({roundTo(metersToFeet(wall.widthMeters), 1)}ft x{" "}
                {roundTo(metersToFeet(wall.heightMeters), 1)}ft)
              </p>
              <p>
                Grid: {wall.widthUnits} x {wall.heightUnits} units | Cabinets: {wall.cabinets.length}
              </p>
              <p>
                Voltage: {wall.voltage}V | Rack: {wall.rackLocation} | Rigging: {wall.riggingMode}
              </p>
              <div className="card-actions">
                <Link href={`/walls/${wall.id}`} className="btn btn-small">
                  Open Designer
                </Link>
                <Link href={`/walls/${wall.id}/print`} className="btn btn-secondary btn-small">
                  Print/PDF
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
