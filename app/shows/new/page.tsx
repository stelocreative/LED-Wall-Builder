"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewShowPage() {
  const router = useRouter();
  const [showName, setShowName] = useState("Spring Arena Tour");
  const [showDate, setShowDate] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("Main Arena");
  const [revision, setRevision] = useState("R1");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    const response = await fetch("/api/shows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        showName,
        showDate,
        venue,
        revision,
        notes
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Unable to create show");
      setSaving(false);
      return;
    }

    const payload = (await response.json()) as { show: { id: string } };
    router.push(`/shows/${payload.show.id}`);
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>Create Show / Event</h1>
          <p>Define show metadata and revision context before wall builds.</p>
        </div>
        <Link href="/" className="btn btn-secondary">
          Back
        </Link>
      </header>

      <form className="form-card" onSubmit={onSubmit}>
        <label>
          Show Name
          <input value={showName} onChange={(event) => setShowName(event.target.value)} required />
        </label>

        <div className="form-row">
          <label>
            Show Date
            <input type="date" value={showDate} onChange={(event) => setShowDate(event.target.value)} required />
          </label>
          <label>
            Revision
            <input value={revision} onChange={(event) => setRevision(event.target.value)} required />
          </label>
        </div>

        <label>
          Venue
          <input value={venue} onChange={(event) => setVenue(event.target.value)} required />
        </label>

        <label>
          Notes
          <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        {status ? <p className="error-line">{status}</p> : null}

        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Show"}
        </button>
      </form>
    </main>
  );
}
