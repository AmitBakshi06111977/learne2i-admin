// AiPromptsPage — list of all Ask AI prompt slots, with a side editor
// and a version history panel with one-click rollback.
//
// The admin selects a slot on the left, edits the content on the right,
// and the change takes effect on the very next student message (no restart).

import { useEffect, useState } from "react";
import { FileText, Save, Loader2, History, RotateCcw, Plus, X, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";
import toast from "react-hot-toast";

type Prompt = {
  key: string;
  name: string;
  description: string;
  content: string;
  version: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
};

type Version = {
  version: number;
  content: string;
  note: string | null;
  createdAt: string;
  createdBy: string;
};

export default function AiPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadList = async () => {
    try {
      const list = await apiGet<Prompt[]>("/api/admin/ai/prompts");
      setPrompts(list);
      // Auto-select first prompt if none selected yet
      if (!activeKey && list.length > 0) selectPrompt(list[0]);
    } catch (e: any) { toast.error(e?.message || "Failed to load prompts"); }
  };
  useEffect(() => { loadList(); /* eslint-disable-next-line */ }, []);

  const selectPrompt = async (p: Prompt) => {
    setActiveKey(p.key);
    setDraft({ ...p });
    setNote("");
    setShowHistory(false);
    try {
      const v = await apiGet<Version[]>(`/api/admin/ai/prompts/${p.key}/versions`);
      setVersions(v);
    } catch (e: any) { toast.error("Failed to load versions"); setVersions([]); }
  };

  const save = async () => {
    if (!draft || !note.trim()) {
      toast.error("Please add a short note explaining the change (e.g. 'tightened empathy opener').");
      return;
    }
    setBusy(true);
    try {
      const r = await apiPost<{ ok: boolean; version: number }>(`/api/admin/ai/prompts/${draft.key}/save`,
        { content: draft.content, note: note.trim() });
      toast.success(`Saved · now v${r.version}`);
      setNote("");
      await loadList();
      // Reload the active prompt
      const refreshed = prompts?.find(p => p.key === draft.key);
      if (refreshed) await selectPrompt(refreshed);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const rollback = async (v: number) => {
    if (!draft) return;
    if (!confirm(`Rollback "${draft.name}" to v${v}? The current content will be snapshotted as a new version before rollback.`)) return;
    setBusy(true);
    try {
      const r = await apiPost<{ ok: boolean; version: number }>(`/api/admin/ai/prompts/${draft.key}/rollback`, { version: v });
      toast.success(`Rolled back to v${v} · new head is v${r.version}`);
      await loadList();
      const refreshed = prompts?.find(p => p.key === draft.key);
      if (refreshed) await selectPrompt(refreshed);
    } catch (e: any) {
      toast.error(e?.message || "Rollback failed");
    } finally { setBusy(false); }
  };

  const filteredPrompts = prompts?.filter(p =>
    !filter || p.key.toLowerCase().includes(filter.toLowerCase()) ||
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.description.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  if (!prompts) return <div className="p-12 text-center text-ink-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…</div>;

  return (
    <div className="p-6 space-y-4 max-w-[1500px]">
      <div>
        <h1 className="text-[22px] font-display font-bold">Ask AI · Prompt Templates</h1>
        <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
          {prompts.length} prompt slots power the Ask AI engine. Edits take effect on the very next student message.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: prompt list */}
        <div className="card p-2 max-h-[80vh] overflow-y-auto">
          <div className="relative px-2 pt-2 pb-1">
            <Search className="h-3.5 w-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              className="input pl-8 text-[12px]"
              placeholder="Filter…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="space-y-0.5">
            {filteredPrompts.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPrompt(p)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  activeKey === p.key
                    ? "bg-admin-500/10 text-admin-700 dark:text-admin-300"
                    : "hover:bg-ink-50 dark:hover:bg-ink-800/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${activeKey === p.key ? "text-admin-500" : "text-ink-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold truncate">{p.name}</div>
                    <div className="text-[10.5px] text-ink-500 dark:text-ink-400 font-mono truncate">{p.key} · v{p.version}</div>
                  </div>
                </div>
              </button>
            ))}
            {filteredPrompts.length === 0 && (
              <div className="text-center py-6 text-[12px] text-ink-400">
                No prompts match "{filter}".
              </div>
            )}
          </div>
        </div>

        {/* Right: editor + history */}
        {draft ? (
          <div className="space-y-3 min-w-0">
            <div className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-display font-bold">{draft.name}</h2>
                    <span className="badge-muted font-mono text-[10.5px]">{draft.key}</span>
                    <span className="badge-ok text-[10.5px]">v{draft.version}</span>
                  </div>
                  <p className="text-[12px] text-ink-600 dark:text-ink-300 mt-1">{draft.description}</p>
                  {draft.updatedAt && (
                    <div className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-1.5">
                      Last updated {new Date(draft.updatedAt).toLocaleString()}{draft.updatedBy && ` by ${draft.updatedBy}`}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowHistory(s => !s)} className={`btn-outline ${showHistory ? "border-admin-500 text-admin-600" : ""}`}>
                  <History className="h-3.5 w-3.5" /> History ({versions?.length ?? 0})
                </button>
              </div>

              <textarea
                className="input font-mono text-[12.5px] min-h-[420px] leading-relaxed"
                value={draft.content}
                onChange={e => setDraft({ ...draft, content: e.target.value })}
                spellCheck={false}
                placeholder="Prompt content. Supports {{placeholders}} for runtime substitution."
              />

              <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-ink-200 dark:border-ink-700">
                <input
                  className="input flex-1 min-w-[200px] text-[12px]"
                  placeholder="Change note (required, e.g. 'tightened empathy opener')"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <button type="button" onClick={save} disabled={busy || !note.trim()} className="btn-primary">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save as v{draft.version + 1}
                </button>
              </div>
            </div>

            {/* Version history side panel */}
            {showHistory && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[13px] font-semibold flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-admin-500" /> Version history
                  </div>
                  <button type="button" onClick={() => setShowHistory(false)} className="btn-ghost text-[11px]">
                    <X className="h-3.5 w-3.5" /> Close
                  </button>
                </div>
                {versions && versions.length > 0 ? (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {versions.map(v => (
                      <div key={v.version} className={`p-2.5 rounded-md border ${
                        v.version === draft.version
                          ? "border-admin-500/40 bg-admin-500/5"
                          : "border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800/30"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[12px] font-bold">v{v.version}</span>
                              {v.version === draft.version && <span className="badge-ok text-[9.5px]">current</span>}
                              <span className="text-[10.5px] text-ink-500 dark:text-ink-400">
                                {new Date(v.createdAt).toLocaleString()} {v.createdBy && `· ${v.createdBy}`}
                              </span>
                            </div>
                            {v.note && <div className="text-[11.5px] text-ink-600 dark:text-ink-300 mt-0.5 italic">"{v.note}"</div>}
                            <pre className="text-[10.5px] text-ink-500 dark:text-ink-400 font-mono mt-1 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{v.content}</pre>
                          </div>
                          {v.version !== draft.version && (
                            <button type="button" onClick={() => rollback(v.version)} disabled={busy} className="btn-outline text-[11px] flex-shrink-0">
                              <RotateCcw className="h-3 w-3" /> Rollback
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[12px] text-ink-400">No history yet — this is the original version.</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="card p-12 text-center text-ink-400">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <div className="text-[12.5px]">Select a prompt on the left to edit.</div>
          </div>
        )}
      </div>
    </div>
  );
}
