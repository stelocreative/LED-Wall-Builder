import Link from "next/link";
import { listShows, listWalls } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShowDetailPage({ params }: Props) {
  const { id } = await params;
  const [shows, walls] = await Promise.all([listShows(), listWalls(id)]);
  const show = shows.find((item) => item.id === id);

  if (!show) {
    return (
      <main className="page-shell">
        <h1>Show not found</h1>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>{show.showName}</h1>
          <p>
            {show.showDate} | {show.venue} | {show.revision}
          </p>
        </div>
        <div className="header-actions">
          <Link href="/" className="btn btn-secondary">
            Dashboard
          </Link>
          <Link href={`/walls/new?showId=${show.id}`} className="btn">
            New Wall
          </Link>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Show Notes</h2>
        <p>{show.notes || "No notes entered."}</p>
      </section>

      <section className="panel">
        <h2>Walls</h2>
        {walls.length === 0 ? (
          <p>No walls yet for this show.</p>
        ) : (
          <div className="card-grid">
            {walls.map((wall) => (
              <article key={wall.id} className="card">
                <h3>{wall.name}</h3>
                <p>
                  {wall.deploymentType === "FLOWN" ? "Flown" : "Ground Stack"} | {wall.voltageMode}V | {wall.powerStrategy}
                </p>
                <p>
                  Grid: {wall.widthUnits} x {wall.heightUnits}
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
