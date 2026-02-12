"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { ThemeSettings } from "@/lib/domain/types";

export default function ThemeBrandingPage() {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<ThemeSettings>(theme);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setDraft(theme);
  }, [theme]);

  function onField<K extends keyof ThemeSettings>(field: K, value: ThemeSettings[K]) {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function onLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onField("logoDataUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/theme", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(draft)
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setStatus(payload.message ?? "Save failed");
      setSaving(false);
      return;
    }

    const savedTheme = (await response.json()) as ThemeSettings;
    setTheme(savedTheme);
    setDraft(savedTheme);
    setSaving(false);
    setStatus("Theme saved and applied globally");
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>Theme & Branding</h1>
          <p>Changes apply to app UI and all print/PDF outputs.</p>
        </div>
        <Link className="btn btn-secondary" href="/">
          Back
        </Link>
      </header>

      <form className="form-card" onSubmit={onSubmit}>
        <label>
          Brand Name
          <input value={draft.brandName} onChange={(event) => onField("brandName", event.target.value)} />
        </label>

        <div className="form-row">
          <label>
            Primary Color
            <input type="color" value={draft.primaryColor} onChange={(event) => onField("primaryColor", event.target.value)} />
          </label>
          <label>
            Accent Color
            <input type="color" value={draft.accentColor} onChange={(event) => onField("accentColor", event.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Background
            <input
              type="color"
              value={draft.backgroundColor}
              onChange={(event) => onField("backgroundColor", event.target.value)}
            />
          </label>
          <label>
            Surface
            <input type="color" value={draft.surfaceColor} onChange={(event) => onField("surfaceColor", event.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Text Color
            <input type="color" value={draft.textColor} onChange={(event) => onField("textColor", event.target.value)} />
          </label>
          <label>
            Muted Text
            <input
              type="color"
              value={draft.mutedTextColor}
              onChange={(event) => onField("mutedTextColor", event.target.value)}
            />
          </label>
        </div>

        <label>
          Font Family
          <input value={draft.fontFamily} onChange={(event) => onField("fontFamily", event.target.value)} />
        </label>

        <label>
          Logo Upload
          <input type="file" accept="image/*" onChange={onLogoFile} />
        </label>

        {draft.logoDataUrl ? (
          <Image src={draft.logoDataUrl} alt="Logo preview" className="logo-preview" width={280} height={100} />
        ) : null}
        {status ? <p className="status-line">{status}</p> : null}

        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Branding"}
        </button>
      </form>
    </main>
  );
}
