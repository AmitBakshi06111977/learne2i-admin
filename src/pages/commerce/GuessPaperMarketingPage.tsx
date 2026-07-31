// GuessPaperMarketingPage — admin form for the /guess-paper marketing page
// on learne2i.com. Edits the singleton GuessPaperMarketingConfig via
// PUT /api/admin/guess-paper-marketing-config.
//
// Two-way reminder: the actual Razorpay price comes from the products
// table (PriceInr, edited in the Commerce → Products tab). This form
// only edits the display values shown on the marketing page. If you
// change prices here, ALSO update them on the product rows so the
// Razorpay order matches what users see. A banner makes that explicit.

import { useEffect, useState } from "react";
import { Save, IndianRupee, AlertTriangle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { apiGet, apiPut } from "../../lib/api";

type Cfg = {
  displayLabel: string;
  bundleLabel: string; bundlePricePaise: number; bundleMrpPaise: number;
  physicsLabel: string; physicsPricePaise: number; physicsMrpPaise: number;
  chemistryLabel: string; chemistryPricePaise: number; chemistryMrpPaise: number;
  mathematicsLabel: string; mathematicsPricePaise: number; mathematicsMrpPaise: number;
  yearsCovered: number; directMatchPercent: number; patternMatchPercent: number;
  sessionsReleasedCsv: string; signinRedirectPath: string;
  updatedAt?: string; updatedBy?: string;
};

const empty: Cfg = {
  displayLabel: "Guess Paper · JEE Mains 2026 · April",
  bundleLabel: "All 3 subjects (Bundle)",
  bundlePricePaise: 39900, bundleMrpPaise: 99900,
  physicsLabel: "Physics", physicsPricePaise: 19900, physicsMrpPaise: 49900,
  chemistryLabel: "Chemistry", chemistryPricePaise: 19900, chemistryMrpPaise: 49900,
  mathematicsLabel: "Mathematics", mathematicsPricePaise: 19900, mathematicsMrpPaise: 49900,
  yearsCovered: 8, directMatchPercent: 40, patternMatchPercent: 68,
  sessionsReleasedCsv: "Apr 2025,Jan 2026,Apr 2026",
  signinRedirectPath: "/app/guess-paper",
};

const inr = (paise: number) => Math.round(paise / 100);

export default function GuessPaperMarketingPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try { setCfg(await apiGet<Cfg>("/api/admin/guess-paper-marketing-config")); }
    catch (e: any) { setErr(e?.message || "Failed to load"); }
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) =>
    setCfg(c => (c ? { ...c, [k]: v } : c));

  const save = async () => {
    if (!cfg) return;
    setBusy(true);
    try {
      await apiPut("/api/admin/guess-paper-marketing-config", cfg);
      toast.success("Saved — changes are live on learne2i.com/guess-paper");
      load();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setBusy(false); }
  };

  if (err)
    return <div className="p-6 text-[12.5px] text-bad-600">{err}</div>;
  if (!cfg)
    return (
      <div className="p-6 text-[12.5px] text-ink-500">Loading…</div>
    );

  return (
    <div className="p-6 space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold">Guess Paper — Marketing page</h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            Controls the copy + display prices on <a className="underline" href="https://learne2i.com/guess-paper" target="_blank" rel="noreferrer">learne2i.com/guess-paper</a>.
          </p>
        </div>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          <Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Razorpay sync warning */}
      <div className="rounded-lg border border-warn-500/40 bg-warn-500/10 px-3 py-2.5 text-[12px] text-warn-700 dark:text-warn-300 flex gap-2.5">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Important:</strong> the values below only update what users <em>see</em>.
          The amount Razorpay actually charges is read from the <code className="font-mono text-[11px]">products</code> table
          (key <code className="font-mono text-[11px]">GUESS_PAPER</code>, <code className="font-mono text-[11px]">GUESS_PAPER_PHYSICS</code>,
          <code className="font-mono text-[11px]">GUESS_PAPER_CHEMISTRY</code>, <code className="font-mono text-[11px]">GUESS_PAPER_MATHEMATICS</code>).
          After saving price changes here, also update those rows on the{" "}
          <a className="underline inline-flex items-center gap-1" href="/commerce"><ExternalLink className="h-3 w-3" />Commerce → Products tab</a>{" "}
          so what users pay matches what they see.
        </div>
      </div>

      {/* Hero copy */}
      <section className="card p-4 space-y-3">
        <h2 className="text-[14px] font-semibold">Hero pill label</h2>
        <Field label="Display label" hint="e.g. Guess Paper · JEE Mains 2026 · April — swap this every exam session">
          <input
            className="input"
            value={cfg.displayLabel}
            onChange={e => set("displayLabel", e.target.value)}
          />
        </Field>
      </section>

      {/* Bundle */}
      <section className="card p-4 space-y-3">
        <h2 className="text-[14px] font-semibold">Bundle — all 3 subjects</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bundle label">
            <input className="input" value={cfg.bundleLabel} onChange={e => set("bundleLabel", e.target.value)} />
          </Field>
          <Field label="Selling price (₹)">
            <PriceInput value={cfg.bundlePricePaise} onChange={v => set("bundlePricePaise", v)} />
          </Field>
          <Field label="MRP / strikethrough (₹)">
            <PriceInput value={cfg.bundleMrpPaise} onChange={v => set("bundleMrpPaise", v)} />
          </Field>
        </div>
        <p className="text-[11px] text-ink-500">
          Sync with product key <code className="font-mono">GUESS_PAPER</code>.
        </p>
      </section>

      {/* Single subjects */}
      <section className="card p-4 space-y-3">
        <h2 className="text-[14px] font-semibold">Single subject SKUs</h2>
        <div className="space-y-3">
          <SubjectRow
            label="Physics"
            name={cfg.physicsLabel} onName={v => set("physicsLabel", v)}
            pricePaise={cfg.physicsPricePaise} onPrice={v => set("physicsPricePaise", v)}
            mrpPaise={cfg.physicsMrpPaise} onMrp={v => set("physicsMrpPaise", v)}
            productKey="GUESS_PAPER_PHYSICS"
          />
          <SubjectRow
            label="Chemistry"
            name={cfg.chemistryLabel} onName={v => set("chemistryLabel", v)}
            pricePaise={cfg.chemistryPricePaise} onPrice={v => set("chemistryPricePaise", v)}
            mrpPaise={cfg.chemistryMrpPaise} onMrp={v => set("chemistryMrpPaise", v)}
            productKey="GUESS_PAPER_CHEMISTRY"
          />
          <SubjectRow
            label="Mathematics"
            name={cfg.mathematicsLabel} onName={v => set("mathematicsLabel", v)}
            pricePaise={cfg.mathematicsPricePaise} onPrice={v => set("mathematicsPricePaise", v)}
            mrpPaise={cfg.mathematicsMrpPaise} onMrp={v => set("mathematicsMrpPaise", v)}
            productKey="GUESS_PAPER_MATHEMATICS"
          />
        </div>
      </section>

      {/* Stats strip */}
      <section className="card p-4 space-y-3">
        <h2 className="text-[14px] font-semibold">Stats strip (8 years · 40% · 68%)</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Years of pattern coverage">
            <input className="input" type="number" min={0} max={100}
              value={cfg.yearsCovered} onChange={e => set("yearsCovered", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Direct match %">
            <input className="input" type="number" min={0} max={100}
              value={cfg.directMatchPercent} onChange={e => set("directMatchPercent", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Pattern match %">
            <input className="input" type="number" min={0} max={100}
              value={cfg.patternMatchPercent} onChange={e => set("patternMatchPercent", parseInt(e.target.value) || 0)} />
          </Field>
        </div>
        <Field label="Sessions released (comma-separated)"
               hint="e.g. Apr 2025, Jan 2026, Apr 2026 — shown as small chips">
          <input className="input" value={cfg.sessionsReleasedCsv}
            onChange={e => set("sessionsReleasedCsv", e.target.value)} />
        </Field>
      </section>

      {/* Signin redirect */}
      <section className="card p-4 space-y-3">
        <h2 className="text-[14px] font-semibold">Sign-in deep link</h2>
        <Field label="After sign-in, send user to:"
               hint="Path within the app where the user lands after clicking 'Sign in to see past match reports'">
          <input className="input" value={cfg.signinRedirectPath}
            onChange={e => set("signinRedirectPath", e.target.value)} />
        </Field>
      </section>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-ink-500 dark:text-ink-400">
        <span>Last updated: {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString() : "—"} {cfg.updatedBy ? `by ${cfg.updatedBy}` : ""}</span>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          <Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className || ""}`}>
      <div className="text-[11.5px] font-medium text-ink-700 dark:text-ink-200 mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-0.5">{hint}</div>}
    </label>
  );
}

function PriceInput({ value, onChange }: { value: number; onChange: (paise: number) => void }) {
  return (
    <div className="relative">
      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
      <input
        className="input pl-7"
        type="number"
        min={0}
        value={inr(value)}
        onChange={e => {
          const inrVal = parseInt(e.target.value) || 0;
          onChange(Math.max(0, inrVal) * 100);
        }}
      />
    </div>
  );
}

function SubjectRow({
  label, name, onName, pricePaise, onPrice, mrpPaise, onMrp, productKey,
}: {
  label: string;
  name: string; onName: (v: string) => void;
  pricePaise: number; onPrice: (v: number) => void;
  mrpPaise: number; onMrp: (v: number) => void;
  productKey: string;
}) {
  return (
    <div className="rounded-lg border border-ink-200 dark:border-ink-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold">{label}</span>
        <span className="text-[10.5px] font-mono text-ink-400">→ {productKey}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Display name">
          <input className="input" value={name} onChange={e => onName(e.target.value)} />
        </Field>
        <Field label="Selling price (₹)">
          <PriceInput value={pricePaise} onChange={onPrice} />
        </Field>
        <Field label="MRP (₹)">
          <PriceInput value={mrpPaise} onChange={onMrp} />
        </Field>
      </div>
    </div>
  );
}
