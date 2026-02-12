"use client";

export function PrintActions() {
  return (
    <button className="btn" onClick={() => window.print()}>
      Print
    </button>
  );
}
