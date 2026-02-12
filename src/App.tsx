import { useEffect, useState } from 'react';

const FEET_PER_METER = 3.280839895013123;
const PIXELS_PER_METER = 256;

type ThemeMode = 'dark' | 'light';
type MainField = 'meters' | 'feet';
type RatioSide = 'A' | 'B';

type Preset = {
  label: string;
  a: number;
  b: number;
};

const PRESETS: Preset[] = [
  { label: '16:9', a: 16, b: 9 },
  { label: '9:16', a: 9, b: 16 },
  { label: '4:3', a: 4, b: 3 },
  { label: '3:4', a: 3, b: 4 }
];

const sanitizeNumericInput = (value: string): string => {
  let cleaned = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const isNegative = cleaned.startsWith('-');

  cleaned = cleaned.replace(/-/g, '');
  if (isNegative) {
    cleaned = `-${cleaned}`;
  }

  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    const beforeDot = cleaned.slice(0, dotIndex + 1);
    const afterDot = cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
    cleaned = beforeDot + afterDot;
  }

  return cleaned;
};

const sanitizeMeterInput = (value: string): string => {
  const cleaned = sanitizeNumericInput(value);
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) {
    return cleaned;
  }

  const beforeDot = cleaned.slice(0, dotIndex + 1);
  const afterDot = cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 1);
  return beforeDot + afterDot;
};

const parseNumeric = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRawString = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '';
  }

  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  return String(Number(normalized.toPrecision(15)));
};

const formatNumberForInput = (value: number): string => {
  const safe = Math.abs(value) < 1e-12 ? 0 : value;
  return safe.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
};

const snapMeterToHalf = (value: number): number => {
  return Math.round(value * 2) / 2;
};

const formatMeterForInput = (value: number): string => {
  const snapped = snapMeterToHalf(value);
  const safe = Math.abs(snapped) < 1e-12 ? 0 : snapped;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
};

const formatInputOnBlur = (value: string): string => {
  const parsed = parseNumeric(value);
  return parsed === null ? '' : formatNumberForInput(parsed);
};

const formatOutput = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const [mainMeters, setMainMeters] = useState<string>('');
  const [mainFeet, setMainFeet] = useState<string>('');
  const [mainLastEdited, setMainLastEdited] = useState<MainField>('meters');

  const [aMeters, setAMeters] = useState<string>('');
  const [aFeet, setAFeet] = useState<string>('');
  const [bMeters, setBMeters] = useState<string>('');
  const [bFeet, setBFeet] = useState<string>('');
  const [ratioLastEdited, setRatioLastEdited] = useState<RatioSide>('A');

  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isPresetLocked, setIsPresetLocked] = useState<boolean>(false);
  const [autoFillAFromMainFeet, setAutoFillAFromMainFeet] = useState<boolean>(false);

  const [cValue, setCValue] = useState<string>('');

  const selectedPresetDef = PRESETS.find((preset) => preset.label === selectedPreset) ?? null;

  const applyLockFromA = (aMetersValue: number): void => {
    if (!isPresetLocked || !selectedPresetDef) {
      return;
    }

    const linkedBMeters = snapMeterToHalf(
      aMetersValue * (selectedPresetDef.b / selectedPresetDef.a)
    );
    setBMeters(toRawString(linkedBMeters));
    setBFeet(toRawString(linkedBMeters * FEET_PER_METER));
    setRatioLastEdited('A');
  };

  const applyLockFromB = (bMetersValue: number): void => {
    if (!isPresetLocked || !selectedPresetDef) {
      return;
    }

    const linkedAMeters = snapMeterToHalf(
      bMetersValue * (selectedPresetDef.a / selectedPresetDef.b)
    );
    setAMeters(toRawString(linkedAMeters));
    setAFeet(toRawString(linkedAMeters * FEET_PER_METER));
    setRatioLastEdited('B');
  };

  const handleMainMetersChange = (rawValue: string): void => {
    const cleaned = sanitizeMeterInput(rawValue);
    setMainLastEdited('meters');
    setMainMeters(cleaned);

    const meters = parseNumeric(cleaned);
    if (meters === null) {
      setMainFeet('');
      return;
    }

    setMainFeet(toRawString(meters * FEET_PER_METER));
  };

  const handleMainFeetChange = (rawValue: string): void => {
    const cleaned = sanitizeNumericInput(rawValue);
    setMainLastEdited('feet');
    setMainFeet(cleaned);

    const feet = parseNumeric(cleaned);
    if (feet === null) {
      setMainMeters('');
      return;
    }

    const meters = snapMeterToHalf(feet / FEET_PER_METER);
    setMainMeters(toRawString(meters));
  };

  const handleMainBlur = (): void => {
    if (mainLastEdited === 'feet') {
      const feet = parseNumeric(mainFeet);
      if (feet === null) {
        setMainFeet('');
        setMainMeters('');
        return;
      }

      const nextMetersValue = snapMeterToHalf(feet / FEET_PER_METER);
      const nextFeet = formatNumberForInput(nextMetersValue * FEET_PER_METER);
      const nextMeters = formatMeterForInput(nextMetersValue);
      setMainFeet(nextFeet);
      setMainMeters(nextMeters);
      return;
    }

    const meters = parseNumeric(mainMeters);
    if (meters === null) {
      setMainMeters('');
      setMainFeet('');
      return;
    }

    const nextMetersValue = snapMeterToHalf(meters);
    const nextMeters = formatMeterForInput(nextMetersValue);
    const nextFeet = formatNumberForInput(nextMetersValue * FEET_PER_METER);
    setMainMeters(nextMeters);
    setMainFeet(nextFeet);
  };

  const handleAMetersChange = (rawValue: string, manual: boolean): void => {
    const cleaned = sanitizeMeterInput(rawValue);

    if (manual && autoFillAFromMainFeet) {
      setAutoFillAFromMainFeet(false);
    }

    setRatioLastEdited('A');
    setAMeters(cleaned);

    const meters = parseNumeric(cleaned);
    if (meters === null) {
      setAFeet('');
      if (isPresetLocked && selectedPresetDef) {
        setBMeters('');
        setBFeet('');
      }
      return;
    }

    setAFeet(toRawString(meters * FEET_PER_METER));
    applyLockFromA(meters);
  };

  const handleAFeetChange = (rawValue: string, manual: boolean): void => {
    const cleaned = sanitizeNumericInput(rawValue);

    if (manual && autoFillAFromMainFeet) {
      setAutoFillAFromMainFeet(false);
    }

    setRatioLastEdited('A');
    setAFeet(cleaned);

    const feet = parseNumeric(cleaned);
    if (feet === null) {
      setAMeters('');
      if (isPresetLocked && selectedPresetDef) {
        setBMeters('');
        setBFeet('');
      }
      return;
    }

    const meters = snapMeterToHalf(feet / FEET_PER_METER);
    setAMeters(toRawString(meters));
    applyLockFromA(meters);
  };

  const handleBMetersChange = (rawValue: string): void => {
    const cleaned = sanitizeMeterInput(rawValue);
    setRatioLastEdited('B');
    setBMeters(cleaned);

    const meters = parseNumeric(cleaned);
    if (meters === null) {
      setBFeet('');
      if (isPresetLocked && selectedPresetDef) {
        setAMeters('');
        setAFeet('');
      }
      return;
    }

    setBFeet(toRawString(meters * FEET_PER_METER));
    applyLockFromB(meters);
  };

  const handleBFeetChange = (rawValue: string): void => {
    const cleaned = sanitizeNumericInput(rawValue);
    setRatioLastEdited('B');
    setBFeet(cleaned);

    const feet = parseNumeric(cleaned);
    if (feet === null) {
      setBMeters('');
      if (isPresetLocked && selectedPresetDef) {
        setAMeters('');
        setAFeet('');
      }
      return;
    }

    const meters = snapMeterToHalf(feet / FEET_PER_METER);
    setBMeters(toRawString(meters));
    applyLockFromB(meters);
  };

  const handleAMetersBlur = (): void => {
    const meters = parseNumeric(aMeters);
    if (meters === null) {
      setAMeters('');
      setAFeet('');
      if (isPresetLocked && selectedPresetDef) {
        setBMeters('');
        setBFeet('');
      }
      return;
    }

    const roundedMeters = snapMeterToHalf(meters);
    setAMeters(formatMeterForInput(roundedMeters));
    setAFeet(formatNumberForInput(roundedMeters * FEET_PER_METER));

    if (isPresetLocked && selectedPresetDef) {
      const linkedBMeters = snapMeterToHalf(
        roundedMeters * (selectedPresetDef.b / selectedPresetDef.a)
      );
      setBMeters(formatMeterForInput(linkedBMeters));
      setBFeet(formatNumberForInput(linkedBMeters * FEET_PER_METER));
      setRatioLastEdited('A');
    }
  };

  const handleAFeetBlur = (): void => {
    const feet = parseNumeric(aFeet);
    if (feet === null) {
      setAFeet('');
      setAMeters('');
      if (isPresetLocked && selectedPresetDef) {
        setBMeters('');
        setBFeet('');
      }
      return;
    }

    const roundedFeet = parseNumeric(formatNumberForInput(feet)) ?? feet;
    const meters = snapMeterToHalf(roundedFeet / FEET_PER_METER);

    setAFeet(formatNumberForInput(meters * FEET_PER_METER));
    setAMeters(formatMeterForInput(meters));

    if (isPresetLocked && selectedPresetDef) {
      const linkedBMeters = snapMeterToHalf(
        meters * (selectedPresetDef.b / selectedPresetDef.a)
      );
      setBMeters(formatMeterForInput(linkedBMeters));
      setBFeet(formatNumberForInput(linkedBMeters * FEET_PER_METER));
      setRatioLastEdited('A');
    }
  };

  const handleBMetersBlur = (): void => {
    const meters = parseNumeric(bMeters);
    if (meters === null) {
      setBMeters('');
      setBFeet('');
      if (isPresetLocked && selectedPresetDef) {
        setAMeters('');
        setAFeet('');
      }
      return;
    }

    const roundedMeters = snapMeterToHalf(meters);
    setBMeters(formatMeterForInput(roundedMeters));
    setBFeet(formatNumberForInput(roundedMeters * FEET_PER_METER));

    if (isPresetLocked && selectedPresetDef) {
      const linkedAMeters = snapMeterToHalf(
        roundedMeters * (selectedPresetDef.a / selectedPresetDef.b)
      );
      setAMeters(formatMeterForInput(linkedAMeters));
      setAFeet(formatNumberForInput(linkedAMeters * FEET_PER_METER));
      setRatioLastEdited('B');
    }
  };

  const handleBFeetBlur = (): void => {
    const feet = parseNumeric(bFeet);
    if (feet === null) {
      setBFeet('');
      setBMeters('');
      if (isPresetLocked && selectedPresetDef) {
        setAMeters('');
        setAFeet('');
      }
      return;
    }

    const roundedFeet = parseNumeric(formatNumberForInput(feet)) ?? feet;
    const meters = snapMeterToHalf(roundedFeet / FEET_PER_METER);

    setBFeet(formatNumberForInput(meters * FEET_PER_METER));
    setBMeters(formatMeterForInput(meters));

    if (isPresetLocked && selectedPresetDef) {
      const linkedAMeters = snapMeterToHalf(
        meters * (selectedPresetDef.a / selectedPresetDef.b)
      );
      setAMeters(formatMeterForInput(linkedAMeters));
      setAFeet(formatNumberForInput(linkedAMeters * FEET_PER_METER));
      setRatioLastEdited('B');
    }
  };

  const handlePresetApply = (preset: Preset): void => {
    setSelectedPreset(preset.label);
    setIsPresetLocked(true);

    const currentAMeters = parseNumeric(aMeters);

    if (currentAMeters === null) {
      const initialAMeters = preset.a;
      const initialBMeters = preset.b;

      setAMeters(toRawString(initialAMeters));
      setAFeet(toRawString(initialAMeters * FEET_PER_METER));
      setBMeters(toRawString(initialBMeters));
      setBFeet(toRawString(initialBMeters * FEET_PER_METER));
      setRatioLastEdited('A');
      return;
    }

    const linkedBMeters = snapMeterToHalf(currentAMeters * (preset.b / preset.a));
    setBMeters(toRawString(linkedBMeters));
    setBFeet(toRawString(linkedBMeters * FEET_PER_METER));
    setRatioLastEdited('A');
  };

  const handleLockChange = (checked: boolean): void => {
    setIsPresetLocked(checked);

    if (!checked || !selectedPresetDef) {
      return;
    }

    const parsedAMeters = parseNumeric(aMeters);
    const parsedBMeters = parseNumeric(bMeters);

    if (ratioLastEdited === 'B' && parsedBMeters !== null) {
      const linkedAMeters = snapMeterToHalf(
        parsedBMeters * (selectedPresetDef.a / selectedPresetDef.b)
      );
      setAMeters(toRawString(linkedAMeters));
      setAFeet(toRawString(linkedAMeters * FEET_PER_METER));
      return;
    }

    if (parsedAMeters !== null) {
      const linkedBMeters = snapMeterToHalf(
        parsedAMeters * (selectedPresetDef.b / selectedPresetDef.a)
      );
      setBMeters(toRawString(linkedBMeters));
      setBFeet(toRawString(linkedBMeters * FEET_PER_METER));
      return;
    }

    if (parsedBMeters !== null) {
      const linkedAMeters = snapMeterToHalf(
        parsedBMeters * (selectedPresetDef.a / selectedPresetDef.b)
      );
      setAMeters(toRawString(linkedAMeters));
      setAFeet(toRawString(linkedAMeters * FEET_PER_METER));
    }
  };

  useEffect(() => {
    if (!autoFillAFromMainFeet) {
      return;
    }

    handleAFeetChange(mainFeet, false);
  }, [autoFillAFromMainFeet, mainFeet]);

  const parsedAMeters = parseNumeric(aMeters);
  const parsedBMeters = parseNumeric(bMeters);
  const parsedC = parseNumeric(cValue);

  const showAZeroError = parsedAMeters === 0;

  let proportionOutput = '—';
  if (
    parsedAMeters !== null &&
    parsedBMeters !== null &&
    parsedC !== null &&
    !showAZeroError
  ) {
    const aMetersValue = parsedAMeters;
    const bMetersValue = parsedBMeters;
    const cInputValue = parsedC;
    proportionOutput = formatOutput((bMetersValue * cInputValue) / aMetersValue);
  }

  const aPixels =
    parsedAMeters === null ? null : Math.round(parsedAMeters * PIXELS_PER_METER);
  const bPixels =
    parsedBMeters === null ? null : Math.round(parsedBMeters * PIXELS_PER_METER);
  const totalPixels = aPixels !== null && bPixels !== null ? aPixels * bPixels : null;

  return (
    <div className={`app theme-${theme}`}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        :root {
          color-scheme: dark;
        }

        .app {
          min-height: 100vh;
          padding: 28px 16px 56px;
          font-family: "IBM Plex Sans", "Segoe UI", "Helvetica Neue", sans-serif;
          background: radial-gradient(circle at top right, var(--bg-accent), var(--bg) 40%);
          color: var(--text);
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .theme-dark {
          --bg: #0b0f16;
          --bg-accent: #1a2235;
          --panel: rgba(17, 24, 39, 0.9);
          --panel-border: rgba(148, 163, 184, 0.2);
          --muted: #9ca3af;
          --text: #f8fafc;
          --input: rgba(15, 23, 42, 0.88);
          --input-border: rgba(148, 163, 184, 0.28);
          --readonly: rgba(30, 41, 59, 0.85);
          --accent: #38bdf8;
          --accent-soft: rgba(56, 189, 248, 0.16);
          --error: #f87171;
          color-scheme: dark;
        }

        .theme-light {
          --bg: #f3f6fb;
          --bg-accent: #dde7f8;
          --panel: rgba(255, 255, 255, 0.95);
          --panel-border: rgba(15, 23, 42, 0.12);
          --muted: #475569;
          --text: #0f172a;
          --input: rgba(255, 255, 255, 0.98);
          --input-border: rgba(148, 163, 184, 0.45);
          --readonly: rgba(226, 232, 240, 0.8);
          --accent: #0284c7;
          --accent-soft: rgba(2, 132, 199, 0.14);
          --error: #dc2626;
          color-scheme: light;
        }

        .container {
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .title-wrap h1 {
          margin: 0;
          font-size: 1.45rem;
          letter-spacing: 0.01em;
        }

        .title-wrap p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.95rem;
        }

        .card {
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 14px 30px rgba(2, 6, 23, 0.22);
          backdrop-filter: blur(4px);
        }

        .card h2 {
          margin: 0 0 14px;
          font-size: 1.02rem;
          font-weight: 600;
        }

        .field-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        }

        .field {
          display: grid;
          gap: 7px;
        }

        label {
          font-size: 0.9rem;
          color: var(--muted);
        }

        input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--input-border);
          background: var(--input);
          color: var(--text);
          padding: 10px 12px;
          font-size: 0.98rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }

        input.readonly {
          background: var(--readonly);
          font-weight: 600;
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .btn,
        .preset-btn {
          border: 1px solid var(--input-border);
          background: var(--input);
          color: var(--text);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.12s ease;
        }

        .btn:hover,
        .preset-btn:hover {
          border-color: var(--accent);
          transform: translateY(-1px);
        }

        .preset-btn.active {
          border-color: var(--accent);
          background: var(--accent-soft);
          font-weight: 600;
        }

        .toggles {
          display: grid;
          gap: 8px;
          margin-bottom: 14px;
        }

        .toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
          color: var(--text);
          width: fit-content;
        }

        .toggle input {
          width: auto;
          margin: 0;
          accent-color: var(--accent);
          box-shadow: none;
        }

        .subtle {
          color: var(--muted);
          font-size: 0.88rem;
          margin-top: 10px;
        }

        .error {
          margin: 10px 0 0;
          color: var(--error);
          font-size: 0.9rem;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .app {
            padding-top: 20px;
          }

          .card {
            padding: 14px;
          }
        }
      `}</style>

      <div className="container">
        <header className="header">
          <div className="title-wrap">
            <h1>Meters / Feet Ratio Toolkit</h1>
            <p>Single-page converter, ratio lock, and pixel calculator</p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </header>

        <section className="card">
          <h2>1) Main Converter (Meters ⇄ Feet)</h2>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="main-meters">Meters</label>
              <input
                id="main-meters"
                type="text"
                inputMode="decimal"
                value={mainMeters}
                onChange={(event) => handleMainMetersChange(event.target.value)}
                onBlur={handleMainBlur}
                placeholder="Enter meters"
              />
            </div>

            <div className="field">
              <label htmlFor="main-feet">Feet</label>
              <input
                id="main-feet"
                type="text"
                inputMode="decimal"
                value={mainFeet}
                onChange={(event) => handleMainFeetChange(event.target.value)}
                onBlur={handleMainBlur}
                placeholder="Enter feet"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <h2>2) Ratio + Proportion</h2>

          <div className="controls">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`preset-btn ${selectedPreset === preset.label ? 'active' : ''}`}
                onClick={() => handlePresetApply(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="toggles">
            <label className="toggle" htmlFor="lock-ratio">
              <input
                id="lock-ratio"
                type="checkbox"
                checked={isPresetLocked}
                onChange={(event) => handleLockChange(event.target.checked)}
                disabled={!selectedPresetDef}
              />
              Lock preset ratio (A ↔ B)
            </label>

            <label className="toggle" htmlFor="auto-fill-a">
              <input
                id="auto-fill-a"
                type="checkbox"
                checked={autoFillAFromMainFeet}
                onChange={(event) => setAutoFillAFromMainFeet(event.target.checked)}
              />
              Auto-fill Ratio A from Main Feet
            </label>
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="a-meters">A (meters)</label>
              <input
                id="a-meters"
                type="text"
                inputMode="decimal"
                value={aMeters}
                onChange={(event) => handleAMetersChange(event.target.value, true)}
                onBlur={handleAMetersBlur}
                placeholder="A in meters"
              />
            </div>

            <div className="field">
              <label htmlFor="a-feet">A (feet)</label>
              <input
                id="a-feet"
                type="text"
                inputMode="decimal"
                value={aFeet}
                onChange={(event) => handleAFeetChange(event.target.value, true)}
                onBlur={handleAFeetBlur}
                placeholder="A in feet"
              />
            </div>

            <div className="field">
              <label htmlFor="b-meters">B (meters)</label>
              <input
                id="b-meters"
                type="text"
                inputMode="decimal"
                value={bMeters}
                onChange={(event) => handleBMetersChange(event.target.value)}
                onBlur={handleBMetersBlur}
                placeholder="B in meters"
              />
            </div>

            <div className="field">
              <label htmlFor="b-feet">B (feet)</label>
              <input
                id="b-feet"
                type="text"
                inputMode="decimal"
                value={bFeet}
                onChange={(event) => handleBFeetChange(event.target.value)}
                onBlur={handleBFeetBlur}
                placeholder="B in feet"
              />
            </div>
          </div>

          <div className="field-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="c-value">C</label>
              <input
                id="c-value"
                type="text"
                inputMode="decimal"
                value={cValue}
                onChange={(event) => setCValue(sanitizeNumericInput(event.target.value))}
                onBlur={() => setCValue((prev) => formatInputOnBlur(prev))}
                placeholder="Enter C"
              />
            </div>

            <div className="field">
              <label htmlFor="proportion-result">? = (B × C) / A (meters)</label>
              <input
                id="proportion-result"
                type="text"
                className="readonly"
                readOnly
                value={proportionOutput}
              />
            </div>
          </div>

          {showAZeroError && <p className="error">A cannot be 0.</p>}
          <p className="subtle">Selected preset: {selectedPreset || 'None'}</p>
        </section>

        <section className="card">
          <h2>3) Pixel Calculator</h2>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="a-pixels">A Pixels (A m × 256)</label>
              <input
                id="a-pixels"
                type="text"
                className="readonly"
                readOnly
                value={aPixels === null ? '—' : aPixels.toLocaleString()}
              />
            </div>

            <div className="field">
              <label htmlFor="b-pixels">B Pixels (B m × 256)</label>
              <input
                id="b-pixels"
                type="text"
                className="readonly"
                readOnly
                value={bPixels === null ? '—' : bPixels.toLocaleString()}
              />
            </div>

            <div className="field">
              <label htmlFor="total-pixels">Total Pixel Count (Apx × Bpx)</label>
              <input
                id="total-pixels"
                type="text"
                className="readonly"
                readOnly
                value={totalPixels === null ? '—' : totalPixels.toLocaleString()}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
