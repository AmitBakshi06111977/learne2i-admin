import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Shield, Eye, Loader2, AlertCircle, CheckCircle2, XCircle, MessageCircle, CreditCard, Clock, BookOpen, FileText, Activity } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";
import toast from "react-hot-toast";

type Profile = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  targetExam?: string;
  targetYear?: number;
  currentClass?: string;
  school?: string;
  city?: string;
  preferredLanguage?: string;
  registeredAt?: string;
  lastActive?: string;
  status: string;
  products: { id: string; name: string; grantedAt: string; expiresAt?: string; source: string }[];
  activity: { id: string; type: string; product: string; at: string; label?: string }[];
  academic: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    wrong: number;
    unattempted?: number;
    accuracyPct: number;
    byProduct: Record<string, { total: number; correct: number; wrong: number; accuracy: number }>;
    bySubject: Record<string, number>;
    irtTheta?: Record<string, { ability: number; attempts: number; lastUpdatedAt: string }>;
    mockTestHistory: { id: string; type: string; score: number; total: number; at: string }[];
  };
  testsCompleted?: number;
};

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [impBusy, setImpBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setBusy(true);
    setErr(null);
    apiGet<Profile>(`/api/admin/users/${userId}`)
      .then(setP)
      .catch(e => setErr(e?.message || "Failed to load user"))
      .finally(() => setBusy(false));
  }, [userId]);

  const impersonate = async () => {
    if (!p) return;
    if (!confirm(`Open a view-only impersonation session as ${p.name}? This is fully logged.`)) return;
    setImpBusy(true);
    try {
      const r = await apiPost<{ open_url: string; phone: string; name: string }>(`/api/admin/users/${userId}/impersonate`, { mode: "view_only", reason: "admin_support" });
      // Open the main site in a new tab with the impersonation URL.
      // The main site can read the phone from the URL and adopt the
      // session. v17 will wire full support; for now, this opens the
      // dashboard with the phone pre-filled.
      window.open(r.open_url, "_blank", "noopener,noreferrer");
      toast.success(`Impersonation URL opened. Phone: ${r.phone}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setImpBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="p-12 text-center text-ink-400">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading user…
      </div>
    );
  }
  if (err) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {err}
        </div>
      </div>
    );
  }
  if (!p) return null;

  return (
    <div className="p-6 space-y-4 max-w-[1300px]">
      <Link to="/users" className="text-[12px] text-ink-500 hover:text-ink-900 dark:hover:text-white flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to users
      </Link>

      {/* Header card */}
      <div className="card p-5 flex flex-wrap items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-admin-100 dark:bg-admin-900/30 grid place-items-center text-admin-700 dark:text-admin-300 text-2xl font-bold flex-shrink-0">
          {p.name?.slice(0, 1).toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-display font-bold">{p.name}</h1>
            <span className={
              p.status === "active" ? "badge-ok" :
              p.status === "suspended" ? "badge-bad" : "badge-muted"
            }>{p.status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-[12px] text-ink-500 dark:text-ink-400">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>
            {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
            {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
            {p.registeredAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />joined {new Date(p.registeredAt).toLocaleDateString()}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {p.targetExam && <span className="badge-info">Target: {p.targetExam}</span>}
            {p.targetYear ? <span className="badge-muted">Year {p.targetYear}</span> : null}
            {p.currentClass && <span className="badge-muted">Class {p.currentClass}</span>}
            {p.school && <span className="badge-muted">{p.school}</span>}
            {p.preferredLanguage && <span className="badge-muted">{p.preferredLanguage}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={impersonate} disabled={impBusy} className="btn-outline">
            {impBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            View as user
          </button>
          <button type="button" className="btn-ghost">
            <MessageCircle className="h-3.5 w-3.5" /> Message
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="stat-label">Attempted</div>
          <div className="stat-value">{p.academic.attempted.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Correct</div>
          <div className="stat-value">{p.academic.correct.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accuracy</div>
          <div className="stat-value">{p.academic.accuracyPct.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tests completed</div>
          <div className="stat-value">{p.testsCompleted ?? 0}</div>
        </div>
      </div>

      {/* Products + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-admin-500" />
              Product access
            </div>
            <span className="badge-muted">{p.products.length}</span>
          </div>
          {p.products.length === 0 ? (
            <div className="text-[12px] text-ink-400 text-center py-4">No products owned.</div>
          ) : (
            <div className="space-y-1.5">
              {p.products.map(prod => (
                <div key={prod.id} className="flex items-center justify-between p-2 rounded-md bg-ink-50/70 dark:bg-ink-800/40">
                  <div>
                    <div className="text-[12.5px] font-semibold">{prod.name}</div>
                    <div className="text-[10.5px] text-ink-500 dark:text-ink-400">
                      granted {new Date(prod.grantedAt).toLocaleDateString()} · {prod.source}
                      {prod.expiresAt && ` · expires ${new Date(prod.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <CheckCircle2 className="h-3.5 w-3.5 text-ok-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-admin-500" />
              Recent activity
            </div>
            <span className="badge-muted">{p.activity.length}</span>
          </div>
          {p.activity.length === 0 ? (
            <div className="text-[12px] text-ink-400 text-center py-4">No activity yet.</div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-auto">
              {p.activity.slice(0, 30).map(a => (
                <div key={a.id} className="flex items-start gap-2 p-1.5 rounded text-[12px] hover:bg-ink-50 dark:hover:bg-ink-800/40">
                  <Clock className="h-3 w-3 mt-0.5 text-ink-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[10.5px] text-ink-500 dark:text-ink-400 mr-1.5">{a.type}</span>
                    <span>{a.label ?? a.product}</span>
                  </div>
                  <span className="text-[10.5px] text-ink-500 dark:text-ink-400">{new Date(a.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Academic deep-dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-[13px] font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-admin-500" /> By subject (accuracy %)
          </div>
          <div className="space-y-1.5">
            {Object.entries(p.academic.bySubject).map(([sub, acc]) => (
              <div key={sub} className="flex items-center gap-2">
                <div className="text-[12px] w-32 text-ink-600 dark:text-ink-300 truncate">{sub}</div>
                <div className="flex-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div className="h-full bg-admin-500" style={{ width: `${Math.min(100, acc)}%` }} />
                </div>
                <div className="text-[11.5px] font-mono w-10 text-right">{acc.toFixed(0)}%</div>
              </div>
            ))}
            {Object.keys(p.academic.bySubject).length === 0 && (
              <div className="text-[12px] text-ink-400 text-center py-3">No subject data yet.</div>
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-[13px] font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-admin-500" /> Mock test history
          </div>
          {p.academic.mockTestHistory.length === 0 ? (
            <div className="text-[12px] text-ink-400 text-center py-3">No mock tests taken.</div>
          ) : (
            <div className="space-y-1.5">
              {p.academic.mockTestHistory.map(t => {
                const pct = t.total > 0 ? (t.score / t.total) * 100 : 0;
                return (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-ink-50/70 dark:bg-ink-800/40">
                    <div>
                      <div className="text-[12.5px] font-semibold">{t.type}</div>
                      <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{new Date(t.at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[13px] font-bold">{t.score}<span className="text-ink-400 text-[11px]"> / {t.total}</span></div>
                      <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{pct.toFixed(0)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
