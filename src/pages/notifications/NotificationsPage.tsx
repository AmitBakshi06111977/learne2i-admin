// NotificationsPage — compose + outbox + delivery details for
// admin-driven notifications. Single page with two views (compose form
// + sent-history table).

import { useEffect, useState } from "react";
import { Send, Bell, Eye, X, Megaphone, AlertCircle, Inbox, ListChecks, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "../../lib/api";

type HistoryRow = {
  id: string; kind: string; title: string; body: string;
  targetKind: string; targetFilter: string; linkUrl: string;
  createdBy: string; createdAt: string;
  deliveryCount: number; readCount: number;
};

type Stats = { totalSent: number; totalDeliveries: number; totalRead: number; readRate: number };

export default function NotificationsPage() {
  const [view, setView] = useState<"compose" | "outbox">("compose");
  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-[22px] font-display font-bold">Notifications</h1>
        <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
          Send announcements, test reminders, marketing & system messages to users.
        </p>
      </div>
      <div className="card p-1 inline-flex gap-1">
        <ViewBtn active={view === "compose"} onClick={() => setView("compose")} icon={<Send className="h-3.5 w-3.5" />}>Compose</ViewBtn>
        <ViewBtn active={view === "outbox"}  onClick={() => setView("outbox")}  icon={<Inbox className="h-3.5 w-3.5" />}>Outbox</ViewBtn>
      </div>
      {view === "compose" ? <ComposeView /> : <OutboxView />}
    </div>
  );
}

function ViewBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium flex items-center gap-1.5 transition ${active ? "bg-admin-600 text-white" : "text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"}`}>
      {icon}{children}
    </button>
  );
}

const KINDS = [
  { key: "announcement",   label: "Announcement",  desc: "Platform-wide news. Bypasses opt-out." },
  { key: "test_reminder",  label: "Test reminder", desc: "Reminds users of upcoming tests." },
  { key: "product_update", label: "Product update",desc: "New features in a product." },
  { key: "marketing",      label: "Marketing",     desc: "Respects user marketing opt-out." },
  { key: "daily_study",    label: "Daily study",   desc: "Daily study nudge." },
  { key: "system",         label: "System",        desc: "Operational messages. Bypasses opt-out." },
] as const;

function ComposeView() {
  const [kind, setKind] = useState<typeof KINDS[number]["key"]>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [targetKind, setTargetKind] = useState<"all" | "by_exam" | "single_user">("all");
  const [targetExam, setTargetExam] = useState("JEE_MAIN");
  const [targetPhone, setTargetPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; audienceSize: number; deliveredCount: number; note: string | null } | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Title and body are required"); return; }
    setBusy(true); setResult(null);
    try {
      let targetFilter = "{}";
      if (targetKind === "by_exam")   targetFilter = JSON.stringify({ exam: targetExam });
      if (targetKind === "single_user") targetFilter = JSON.stringify({ phone: targetPhone });
      const r = await apiPost<{ id: string; audienceSize: number; deliveredCount: number; note: string | null }>("/api/admin/notifications", {
        kind, title, body, targetKind, targetFilter, linkUrl,
      });
      setResult(r);
      toast.success(`Sent to ${r.deliveredCount} user(s)`);
      setTitle(""); setBody(""); setLinkUrl("");
    } catch (e: any) { toast.error(e?.message || "Send failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="card p-4 space-y-3">
          <div>
            <div className="text-[11.5px] font-medium text-ink-700 dark:text-ink-200 mb-1">Kind</div>
            <div className="grid grid-cols-3 gap-1.5">
              {KINDS.map(k => (
                <button key={k.key} type="button" onClick={() => setKind(k.key)}
                  className={`text-left rounded-md border px-2.5 py-1.5 text-[11.5px] ${kind === k.key ? "border-admin-500 bg-admin-500/10" : "border-ink-200 dark:border-ink-700"}`}>
                  <div className="font-medium">{k.label}</div>
                  <div className="text-ink-500 dark:text-ink-400 text-[10.5px]">{k.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <Field label="Title">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Free mock test this Sunday" />
          </Field>
          <Field label="Body" hint="Plain text or LaTeX. Keep under 500 words.">
            <textarea className="input min-h-[140px]" value={body} onChange={e => setBody(e.target.value)} placeholder="What's the message…" />
          </Field>
          <Field label="Link URL (optional)" hint="If set, the notification is clickable and opens this URL in the app.">
            <input className="input" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="/app/smartsolve" />
          </Field>
        </div>

        <div className="card p-4 space-y-3">
          <div className="text-[11.5px] font-medium text-ink-700 dark:text-ink-200">Audience</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["all", "by_exam", "single_user"] as const).map(t => (
              <button key={t} type="button" onClick={() => setTargetKind(t)}
                className={`rounded-md border px-2.5 py-1.5 text-[11.5px] ${targetKind === t ? "border-admin-500 bg-admin-500/10" : "border-ink-200 dark:border-ink-700"}`}>
                {t === "all" ? "All users" : t === "by_exam" ? "By exam" : "Single user (phone)"}
              </button>
            ))}
          </div>
          {targetKind === "by_exam" && (
            <Field label="Exam">
              <select className="input w-auto" value={targetExam} onChange={e => setTargetExam(e.target.value)}>
                <option value="JEE_MAIN">JEE Main</option>
                <option value="JEE_ADV">JEE Advanced</option>
                <option value="NEET_UG">NEET UG</option>
                <option value="NDA">NDA</option>
              </select>
            </Field>
          )}
          {targetKind === "single_user" && (
            <Field label="Phone number (with country code, e.g. +91xxxxxxxxxx)">
              <input className="input" value={targetPhone} onChange={e => setTargetPhone(e.target.value)} placeholder="+91xxxxxxxxxx" />
            </Field>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="card p-4 sticky top-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-admin-500" />
            <div className="text-[12.5px] font-semibold">Preview</div>
          </div>
          <div className="rounded-md border border-ink-200 dark:border-ink-700 p-3 bg-ink-50/30 dark:bg-ink-800/30">
            <div className="text-[12.5px] font-bold mb-1">{title || <span className="text-ink-400">Title…</span>}</div>
            <div className="text-[11.5px] text-ink-600 dark:text-ink-300 whitespace-pre-wrap">{body || <span className="text-ink-400">Body…</span>}</div>
            {linkUrl && <div className="text-[10.5px] text-admin-500 mt-1.5">→ {linkUrl}</div>}
          </div>
          {result && (
            <div className="mt-3 rounded-md border border-ok-500/40 bg-ok-500/10 p-2.5 text-[11.5px] text-ok-600">
              <CheckCircle2 className="inline h-3 w-3 mr-1" /> Sent
              <div className="text-[10.5px] mt-0.5 text-ink-600 dark:text-ink-300">
                Audience: {result.audienceSize} · Delivered: {result.deliveredCount}
                {result.note && <div className="text-warn-600 dark:text-warn-400 mt-0.5">{result.note}</div>}
              </div>
            </div>
          )}
          <button type="button" onClick={send} disabled={busy} className="btn-primary w-full mt-3">
            <Send className="h-3.5 w-3.5" /> {busy ? "Sending…" : "Send notification"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutboxView() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [viewing, setViewing] = useState<HistoryRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const [r, s] = await Promise.all([
        apiGet<HistoryRow[]>("/api/admin/notifications?take=100"),
        apiGet<Stats>("/api/admin/notifications/stats"),
      ]);
      setRows(r); setStats(s);
    } catch (e: any) { setErr(e?.message || "Failed to load outbox"); }
  };
  useEffect(() => { load(); }, []);
  if (viewing) return <DeliveryDetail n={viewing} onBack={() => { setViewing(null); load(); }} />;

  return (
    <div className="space-y-3">
      {err && <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">{err}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<Bell className="h-3.5 w-3.5" />} label="Total sent" value={stats.totalSent} />
          <Stat icon={<ListChecks className="h-3.5 w-3.5" />} label="Deliveries" value={stats.totalDeliveries} />
          <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Read" value={stats.totalRead} />
          <Stat icon={<Eye className="h-3.5 w-3.5" />} label="Read rate" value={`${(stats.readRate * 100).toFixed(1)}%`} />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="table-th">Sent</th><th className="table-th">Kind</th>
            <th className="table-th">Title</th><th className="table-th">Audience</th>
            <th className="table-th text-right">Delivered</th>
            <th className="table-th text-right">Read</th>
            <th className="table-th" />
          </tr></thead>
          <tbody>
            {rows === null && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="table-td"><div className="h-3 w-20 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" /></td>
              ))}</tr>
            ))}
            {rows && rows.length === 0 && (
              <tr><td colSpan={7} className="table-td text-center text-ink-400 py-8">No notifications sent yet. Switch to "Compose" to send one.</td></tr>
            )}
            {rows && rows.map(n => {
              const readPct = n.deliveryCount > 0 ? Math.round(100 * n.readCount / n.deliveryCount) : 0;
              return (
                <tr key={n.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                  <td className="table-td text-[10.5px] text-ink-500 dark:text-ink-400">{new Date(n.createdAt).toLocaleString()}</td>
                  <td className="table-td"><KindBadge kind={n.kind} /></td>
                  <td className="table-td">
                    <div className="text-[12.5px] font-medium line-clamp-1">{n.title}</div>
                    <div className="text-[10.5px] text-ink-500 dark:text-ink-400 line-clamp-1">{n.body}</div>
                  </td>
                  <td className="table-td text-[11px]">
                    {n.targetKind === "all" ? "All users"
                      : n.targetKind === "by_exam" ? (() => { try { return `Exam: ${JSON.parse(n.targetFilter).exam}`; } catch { return n.targetKind; } })()
                      : n.targetKind === "single_user" ? "Single user" : n.targetKind}
                  </td>
                  <td className="table-td text-right font-mono text-[12px]">{n.deliveryCount}</td>
                  <td className="table-td text-right font-mono text-[12px]">
                    {n.readCount} <span className="text-[10px] text-ink-500 dark:text-ink-400">({readPct}%)</span>
                  </td>
                  <td className="table-td text-right">
                    <button type="button" onClick={() => setViewing(n)} className="btn-outline text-[11px]"><Eye className="h-3 w-3" /> View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeliveryDetail({ n, onBack }: { n: HistoryRow; onBack: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { apiGet<any[]>(`/api/admin/notifications/${n.id}/deliveries?take=200`).then(setRows).catch(() => setRows([])); }, [n.id]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="btn-outline text-[11.5px]"><X className="h-3 w-3" /> Back to outbox</button>
        <h2 className="text-[16px] font-display font-bold">{n.title}</h2>
        <KindBadge kind={n.kind} />
      </div>
      <div className="card p-4">
        <div className="text-[12.5px] whitespace-pre-wrap">{n.body}</div>
        {n.linkUrl && <div className="mt-2 text-[10.5px] text-admin-500">→ {n.linkUrl}</div>}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="table-th">User</th><th className="table-th">Exam</th>
            <th className="table-th">Class</th><th className="table-th">Status</th>
            <th className="table-th">Sent</th><th className="table-th">Read</th>
          </tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan={6} className="table-td text-center text-ink-400 py-6">Loading deliveries…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={6} className="table-td text-center text-ink-400 py-6">No deliveries found.</td></tr>}
            {rows && rows.map(d => (
              <tr key={d.deliveryId} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                <td className="table-td font-mono text-[11px]">{d.phone || d.userId.substring(0, 8)}</td>
                <td className="table-td text-[11px]">{d.exam || "—"}</td>
                <td className="table-td text-[11px]">{d.currentClass || "—"}</td>
                <td className="table-td">
                  <span className={d.status === "read" ? "badge-ok" : d.status === "failed" ? "badge-bad" : "badge-muted"}>{d.status}</span>
                </td>
                <td className="table-td text-[10.5px] text-ink-500 dark:text-ink-400">{new Date(d.sentAt).toLocaleString()}</td>
                <td className="table-td text-[10.5px] text-ink-500 dark:text-ink-400">{d.readAt ? new Date(d.readAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    announcement: "badge-info", test_reminder: "badge-warn", product_update: "badge-ok",
    marketing: "badge-muted", daily_study: "badge-info", system: "badge-muted",
  };
  return <span className={`${map[kind] || "badge-muted"} text-[9.5px]`}>{kind.replace("_", " ")}</span>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11.5px] font-medium text-ink-700 dark:text-ink-200 mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-0.5">{hint}</div>}
    </label>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-ink-500 dark:text-ink-400">{icon}{label}</div>
      <div className="text-[20px] font-display font-bold mt-0.5">{value}</div>
    </div>
  );
}
