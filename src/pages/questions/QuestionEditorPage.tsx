import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, AlertCircle, CheckCircle2, Image as ImageIcon, History, Eye, Pause, Play, Trash2 } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";
import toast from "react-hot-toast";

type Question = {
  id: string;
  exam: string;
  subject: string;
  chapter: string;
  year: number;
  month?: number | string;
  date?: number | string;
  session?: string;
  instruction?: string;
  text: string;
  image?: string;
  options: { id: string; text: string; image?: string; isCorrect: boolean }[];
  correctOption: number;
  solutionText?: string;
  solutionImage?: string;
  difficulty: number;
  clusterId?: number;
  isRepresentative: boolean;
  tag: string;
  status: "active" | "on_hold" | "draft" | "under_review" | "rejected" | "archived" | "deleted";
  issues: string[];
  updatedAt: string;
  updatedBy?: string;
  versions: { version: number; at: string; by: string; note?: string }[];
};

const STATUSES: Question["status"][] = ["active", "on_hold", "draft", "under_review", "rejected", "archived"];

export default function QuestionEditorPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const isNew = questionId === "new";
  const [q, setQ] = useState<Question | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isNew) {
      setQ({
        id: "NEW",
        exam: "exam_jee-mains-and-jee-advanced", subject: "subj_physics_jee-mains-and-jee-advanced", chapter: "", year: 2025,
        text: "", options: [
          { id: "a", text: "", isCorrect: false },
          { id: "b", text: "", isCorrect: false },
          { id: "c", text: "", isCorrect: false },
          { id: "d", text: "", isCorrect: false },
        ],
        correctOption: 0, difficulty: 2, isRepresentative: false, tag: "pyq",
        status: "draft", issues: [], updatedAt: new Date().toISOString(),
        versions: [],
      });
      setBusy(false);
      return;
    }
    if (!questionId) return;
    setBusy(true);
    setErr(null);
    apiGet<Question>(`/api/admin/questions/${encodeURIComponent(questionId)}`)
      .then(setQ)
      .catch(e => setErr(e?.message || "Failed to load question"))
      .finally(() => setBusy(false));
  }, [questionId, isNew]);

  // Load exam + subject lists from the public catalog so the dropdowns
  // are populated with the actual IDs the backend uses.
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; examId: string }[]>([]);
  useEffect(() => {
    Promise.all([
      apiGet<{ id: string; name: string }[]>("/api/exams"),
      apiGet<{ id: string; name: string; examId: string }[]>("/api/subjects"),
    ]).then(([es, ss]) => { setExams(es); setSubjects(ss); })
      .catch(() => { /* keep dropdowns empty */ });
  }, []);

  const save = async (newStatus?: Question["status"]) => {
    if (!q) return;
    setSaving(true);
    try {
      const body = { ...q, status: newStatus ?? q.status, changeReason: reason || "edit" };
      const saved = await apiPost<Question>(isNew ? "/api/admin/questions" : `/api/admin/questions/${q.id}/save`, body);
      setQ(saved);
      setReason("");
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setOption = (idx: number, patch: Partial<Question["options"][number]>) => {
    if (!q) return;
    const opts = q.options.slice();
    opts[idx] = { ...opts[idx], ...patch };
    setQ({ ...q, options: opts });
  };

  if (busy) {
    return (
      <div className="p-12 text-center text-ink-400">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading question…
      </div>
    );
  }
  if (err) {
    return (
      <div className="p-6">
        <Link to="/questions" className="text-[12px] text-ink-500 hover:text-ink-900 flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to questions
        </Link>
        <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {err}
        </div>
      </div>
    );
  }
  if (!q) return null;

  return (
    <div className="p-6 space-y-4 max-w-[1200px]">
      <Link to="/questions" className="text-[12px] text-ink-500 hover:text-ink-900 dark:hover:text-white flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to questions
      </Link>

      {/* Header */}
      <div className="card p-4 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-mono text-[15px] font-bold">{q.id}</h1>
            <span className="badge-info">{q.exam}</span>
            <span className="badge-muted">{q.subject}</span>
            {q.isRepresentative && <span className="badge-warn">cluster rep</span>}
            {q.tag && <span className="badge-muted">tag: {q.tag}</span>}
          </div>
          <div className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-1">
            Last updated {new Date(q.updatedAt).toLocaleString()}
            {q.updatedBy && ` by ${q.updatedBy}`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={q.status}
            onChange={e => setQ({ ...q, status: e.target.value as Question["status"] })}
            className="input w-auto"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <button type="button" onClick={() => setPreviewOpen(o => !o)} className="btn-outline">
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button type="button" onClick={() => save()} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Quality issues */}
      {q.issues.length > 0 && (
        <div className="rounded-lg border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-[12.5px] text-warn-700 dark:text-warn-500 flex flex-wrap items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="font-semibold">Quality issues:</span>
          {q.issues.map((i, j) => <span key={j} className="badge-warn">{i}</span>)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main editor column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Question text</label>
              <textarea
                value={q.text}
                onChange={e => setQ({ ...q, text: e.target.value })}
                rows={4}
                className="input mt-1 font-mono text-[12.5px]"
                placeholder="Type the question here. LaTeX: \\( ... \\) inline, \\[ ... \\] display."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, i) => (
                <div key={opt.id} className={`rounded-lg border p-2 ${opt.isCorrect ? "border-ok-500/60 bg-ok-500/5" : "border-ink-200 dark:border-ink-700"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                      <input
                        type="radio"
                        checked={opt.isCorrect}
                        onChange={() => {
                          if (!q) return;
                          const newOpts = q.options.map((o, j) => ({ ...o, isCorrect: j === i }));
                          setQ({ ...q, options: newOpts, correctOption: i });
                        }}
                      />
                      <span className="font-mono font-bold">({String.fromCharCode(65 + i)})</span>
                    </label>
                    {opt.isCorrect && <span className="badge-ok">correct</span>}
                  </div>
                  <textarea
                    value={opt.text}
                    onChange={e => setOption(i, { text: e.target.value })}
                    rows={2}
                    className="input text-[12px]"
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Solution</label>
              <textarea
                value={q.solutionText ?? ""}
                onChange={e => setQ({ ...q, solutionText: e.target.value })}
                rows={4}
                className="input mt-1 font-mono text-[12.5px]"
                placeholder="Step-by-step solution. LaTeX supported."
              />
            </div>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Classification</label>
              <div className="space-y-1.5 mt-1">
                <select className="input" value={q.exam} onChange={e => setQ({ ...q, exam: e.target.value })}>
                  <option value="">Select exam…</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select className="input" value={q.subject} onChange={e => setQ({ ...q, subject: e.target.value })}>
                  <option value="">Select subject…</option>
                  {subjects.filter(s => !q.exam || s.examId === q.exam).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input className="input" placeholder="Chapter" value={q.chapter} onChange={e => setQ({ ...q, chapter: e.target.value })} />
                <div className="grid grid-cols-2 gap-1.5">
                  <input className="input" type="number" min={2015} max={2030} value={q.year} onChange={e => setQ({ ...q, year: +e.target.value })} />
                  <input className="input" placeholder="Month" value={q.month ?? ""} onChange={e => setQ({ ...q, month: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10.5px] text-ink-500 dark:text-ink-400">Difficulty (1 = easiest, 7 = hardest)</label>
                  <input className="input" type="range" min={1} max={7} step={0.1} value={q.difficulty} onChange={e => setQ({ ...q, difficulty: +e.target.value })} />
                  <div className="text-center font-mono text-[12.5px]">{q.difficulty.toFixed(1)}</div>
                </div>
                <input className="input" type="number" placeholder="Cluster ID" value={q.clusterId ?? ""} onChange={e => setQ({ ...q, clusterId: e.target.value ? +e.target.value : undefined })} />
                <label className="flex items-center gap-1.5 text-[12px]">
                  <input type="checkbox" checked={q.isRepresentative} onChange={e => setQ({ ...q, isRepresentative: e.target.checked })} />
                  Representative for cluster
                </label>
                <select className="input" value={q.tag} onChange={e => setQ({ ...q, tag: e.target.value })}>
                  <option value="pyq">pyq (real past-year)</option>
                  <option value="authored">authored</option>
                  <option value="generated">generated</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400 mb-2">Save with reason (audit log)</div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="input text-[12px]"
              placeholder="Why are you making this change?"
            />
          </div>

          {q.versions.length > 0 && (
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400 mb-2 flex items-center gap-1.5">
                <History className="h-3 w-3" /> Version history
              </div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {q.versions.map(v => (
                  <div key={v.version} className="text-[11.5px] py-1 border-b border-ink-100 dark:border-ink-800 last:border-b-0">
                    <span className="font-mono text-ink-500 dark:text-ink-400">v{v.version}</span>
                    {" · "}
                    <span>{new Date(v.at).toLocaleString()}</span>
                    {" by "}
                    <span className="font-semibold">{v.by}</span>
                    {v.note && <div className="text-ink-500 dark:text-ink-400 text-[10.5px] ml-1">{v.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student preview drawer */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => setPreviewOpen(false)}>
          <div className="card max-w-2xl w-full p-5 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-admin-500" /> Student preview
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="btn-ghost text-[12px]">Close</button>
            </div>
            <div className="rounded-xl border border-ink-200 dark:border-ink-700 p-4 bg-white dark:bg-ink-900/40">
              {q.instruction && <div className="text-[12px] text-ink-600 dark:text-ink-300 italic mb-2">{q.instruction}</div>}
              <div className="text-[14px] text-ink-900 dark:text-white whitespace-pre-wrap">{q.text}</div>
              <div className="mt-3 space-y-1.5">
                {q.options.map((opt, i) => (
                  <label key={opt.id} className="flex items-start gap-2 p-2 rounded-md border border-ink-200 dark:border-ink-700 cursor-pointer">
                    <input type="radio" name="preview" />
                    <span className="text-[13px]">
                      <span className="font-mono text-ink-500 dark:text-ink-400 mr-1.5">({String.fromCharCode(65 + i)})</span>
                      {opt.text}
                    </span>
                  </label>
                ))}
              </div>
              {q.solutionText && (
                <div className="mt-4 pt-3 border-t border-ink-200 dark:border-ink-700">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400 mb-1">Solution</div>
                  <div className="text-[12.5px] text-ink-700 dark:text-ink-200 whitespace-pre-wrap">{q.solutionText}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
