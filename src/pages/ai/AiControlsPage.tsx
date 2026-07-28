// AiControlsPage — behavioural toggles for the Ask AI engine.
//
// Each control has a key, a JSON value (bool / int / string), and a
// description. The admin flips a switch or edits a value, hits Save,
// and the change is hot-loaded into the running server (PromptService
// invalidates its cache and the next request reads the new value).

import { useEffect, useState } from "react";
import { ToggleLeft, ToggleRight, Save, Loader2, Settings2, AlertCircle } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";
import toast from "react-hot-toast";

type Control = {
  key: string;
  valueJson: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
};

// Parse a control's JSON value into a JS primitive.
function parseValue(json: string): any {
  try { return JSON.parse(json); } catch { return json; }
}

// Render a control as a switch (bool), number input, or text input.
function inferType(json: string): "bool" | "number" | "text" {
  const v = parseValue(json);
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return "number";
  return "text";
}

export default function AiControlsPage() {
  const [controls, setControls] = useState<Control[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const list = await apiGet<Control[]>("/api/admin/ai/controls");
      setControls(list);
      // Seed drafts from current values
      const d: Record<string, any> = {};
      for (const c of list) d[c.key] = parseValue(c.valueJson);
      setDrafts(d);
      setDirty({});
    } catch (e: any) { toast.error(e?.message || "Failed to load controls"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setDraft = (key: string, v: any) => {
    setDrafts(d => ({ ...d, [key]: v }));
    setDirty(d => ({ ...d, [key]: true }));
  };

  const save = async (key: string) => {
    setBusy(b => ({ ...b, [key]: true }));
    try {
      const newValue = drafts[key];
      // Re-serialize to the same JSON shape the server expects.
      const json = typeof newValue === "string" ? JSON.stringify(newValue) : JSON.stringify(newValue);
      const r = await apiPost<{ ok: boolean; valueJson: string }>(`/api/admin/ai/controls/${key}/save`, { valueJson: json });
      setControls(cs => cs?.map(c => c.key === key ? { ...c, valueJson: r.valueJson, updatedAt: new Date().toISOString(), updatedBy: "you" } : c) || cs);
      setDirty(d => ({ ...d, [key]: false }));
      toast.success("Saved");
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setBusy(b => ({ ...b, [key]: false })); }
  };

  if (!controls) return <div className="p-12 text-center text-ink-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…</div>;

  return (
    <div className="p-6 space-y-4 max-w-[1100px]">
      <div>
        <h1 className="text-[22px] font-display font-bold">Ask AI · Behavioural Controls</h1>
        <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
          {controls.length} toggles. Each change is hot-loaded — no restart needed.
        </p>
      </div>

      <div className="card p-3 bg-admin-500/5 border-admin-500/20 flex items-start gap-2.5">
        <Settings2 className="h-4 w-4 text-admin-600 flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-ink-700 dark:text-ink-200">
          <strong>What these do:</strong> these are runtime flags the Ask AI engine reads on every request.
          Flip a switch to relax a guardrail, turn off a feature, or cap a limit. The very next student
          message picks up the new value.
        </div>
      </div>

      <div className="space-y-2.5">
        {controls.map(c => {
          const t = inferType(c.valueJson);
          const draftVal = drafts[c.key];
          const isDirty = dirty[c.key];
          const isBusy = busy[c.key];
          return (
            <div key={c.key} className={`card p-4 ${isDirty ? "border-admin-500/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[12.5px] font-bold">{c.key}</span>
                    {c.updatedAt && (
                      <span className="text-[10.5px] text-ink-500 dark:text-ink-400">
                        updated {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-ink-600 dark:text-ink-300 mt-0.5">{c.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {t === "bool" ? (
                    <button
                      type="button"
                      onClick={() => setDraft(c.key, !draftVal)}
                      className={`flex items-center gap-1.5 text-[12px] font-semibold ${
                        draftVal ? "text-admin-600" : "text-ink-500"
                      }`}
                    >
                      {draftVal ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                      <span className="w-12">{draftVal ? "ON" : "OFF"}</span>
                    </button>
                  ) : t === "number" ? (
                    <input
                      type="number"
                      className="input w-28 text-right font-mono"
                      value={draftVal ?? 0}
                      onChange={e => setDraft(c.key, +e.target.value)}
                    />
                  ) : (
                    <input
                      className="input w-40"
                      value={draftVal ?? ""}
                      onChange={e => setDraft(c.key, e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => save(c.key)}
                    disabled={!isDirty || isBusy}
                    className="btn-primary"
                    title={isDirty ? "Save this control" : "No changes"}
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isDirty ? "Save" : "Saved"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
