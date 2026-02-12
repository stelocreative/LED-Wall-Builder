import Link from "next/link";
import { metersToFeet, roundTo } from "@/lib/domain/conversions";
import { listShows, listWalls } from "@/lib/supabase/queries";

export default async function HomePage() {
  const [shows, walls] = await Promise.all([listShows(), listWalls()]);
  const showMap = Object.fromEntries(shows.map((show) => [show.id, show]));

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>LED Wall Deployment Designer</h1>
          <p>Touring-grade wall design for ground stack and flown deployments with crew-proof outputs.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" href="/library">
            Library
          </Link>
          <Link className="btn btn-secondary" href="/shows/new">
            New Show
          </Link>
          <Link className="btn" href="/walls/new">
            New Wall
          </Link>
          <Link className="btn btn-secondary" href="/admin/theme">
            Theme & Branding
          </Link>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Shows / Events</h2>
        {shows.length === 0 ? (
          <p>No shows yet. Create one before building walls.</p>
        ) : (
          <div className="card-grid">
            {shows.map((show) => (
              <article key={show.id} className="card">
                <h3>{show.showName}</h3>
                <p>
                  Date: {show.showDate} | Venue: {show.venue}
                </p>
                <p>Revision: {show.revision}</p>
                <div className="card-actions">
                  <Link className="btn btn-small" href={`/shows/${show.id}`}>
                    Open Show
                  </Link>
                  <Link className="btn btn-secondary btn-small" href={`/walls/new?showId=${show.id}`}>
                    New Wall
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Wall Designs</h2>
        {walls.length === 0 ? (
          <p>No walls yet. Create a wall from size or unit count.</p>
        ) : (
          <div className="card-grid">
            {walls.map((wall) => (
              <article key={wall.id} className="card">
                <h3>{wall.name}</h3>
                <p>
                  Show: {showMap[wall.showId]?.showName ?? "Unknown"} | {wall.deploymentType === "FLOWN" ? "Flown" : "Ground Stack"}
                </p>
                <p>
                  Grid: {wall.widthUnits} x {wall.heightUnits} | Voltage: {wall.voltageMode}V | Strategy: {wall.powerStrategy}
                </p>
                <p>
                  Size: {roundTo((wall.widthUnits * wall.baseUnitWidthMm) / 1000, 2)}m x {roundTo(
                    (wall.heightUnits * wall.baseUnitHeightMm) / 1000,
                    2
                  )}m ({roundTo(metersToFeet((wall.widthUnits * wall.baseUnitWidthMm) / 1000), 1)}ft x {" "}
                  {roundTo(metersToFeet((wall.heightUnits * wall.baseUnitHeightMm) / 1000), 1)}ft)
                </p>
                <div className="card-actions">
                  <Link href={`/walls/${wall.id}`} className="btn btn-small">
                    Open Designer
                  </Link>
                  <Link href={`/walls/${wall.id}/print`} className="btn btn-secondary btn-small">
                    Print / PDF
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
