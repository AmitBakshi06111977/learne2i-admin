// AuditLogPage — read-only viewer for the admin_audit_logs table.
//
// All admin actions (auth.login, user.impersonate, product.save,
// coupon.create, etc.) are written to admin_audit_logs by the backend.
// This page lets the platform owner search, filter, and export that
// trail for compliance and incident response.
//
// Filters:
//   - action          (dropdown of distinct action names)
//   - entity_type     (dropdown of distinct entity_type values)
//   - admin_email     (exact match)
//   - date range      (from, to)
//   - free text       (search across email, entity_id, reason, new/old values)
//
// The same filters apply to the "Export CSV" button at the top — that
// just hits the /export.csv endpoint and triggers a download.

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Search, Download, RefreshCw, ChevronLeft, ChevronRight,
  Filter, X, Eye, User2, Package2, Tag, FileText, Brain, Megaphone
} from "lucide-react";
import toast from "react-hot-toast";
import { apiGet } from "../../lib/api";

type Row = {
  id: number;
  adminUserId: number | null;
  adminEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  ipAddress: string | null;
  correlationId: string | null;
  at: string;
};

type ListResp = { items: Row[]; total: number; page: number; size: number };

// Visual category for an action — used to pick a colour/icon in the
// timeline so the admin can spot login/impersonation/product changes
// at a glance.
function actionCategory(a: string): { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> } {
  if (a.startsWith("auth."))        return { label: "Auth",        cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300",  Icon: User2 };
  if (a.startsWith("user."))        return { label: "User",        cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300",      Icon: User2 };
  if (a.startsWith("user_discount."))return{label: "Discount",    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",Icon: Tag };
  if (a.startsWith("question."))    return { label: "Question",    cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300",  Icon: FileText };
  if (a.startsWith("product."))     return { label: "Product",     cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",     Icon: Package2 };
  if (a.startsWith("coupon."))      return { label: "Coupon",      cls: "bg-pink-500/15 text-pink-700 dark:text-pink-300",         Icon: Tag };
  if (a.startsWith("ai."))          return { label: "Ask AI",      cls: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",Icon: Brain };
  if (a.startsWith("llm_config."))  return { label: "LLM config",  cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",         Icon: Brain };
  if (a.startsWith("notification."))return { label: "Notification",cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300",         Icon: Megaphone };
  return                                  { label: "Other",       cls: "bg-ink-500/15 text-ink-700 dark:text-ink-300",            Icon: ShieldCheck };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Truncate a JSON-ish string for the table cell. Long values are shown
// in a tooltip via the title attribute.
function shortJson(s: string | null, max = 80): string {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export default function AuditLogPage() {
  // Filters
  const [action, setAction] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [from, setFrom] = useState<string>(""); // yyyy-MM-dd
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState(1);
  const size = 50;

  // Filter dropdown options
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  // Data
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<Row | null>(null);

  // Load filter options on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, et] = await Promise.all([
          apiGet<string[]>("/api/admin/audit-logs/actions"),
          apiGet<string[]>("/api/admin/audit-logs/entity-types"),
        ]);
        if (!cancelled) { setActions(a ?? []); setEntityTypes(et ?? []); }
      } catch { /* leave empty */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (action)     sp.set("action", action);
    if (entityType) sp.set("entityType", entityType);
    if (adminEmail) sp.set("adminEmail", adminEmail);
    if (from)       sp.set("from", new Date(from + "T00:00:00").toISOString());
    if (to)         sp.set("to",   new Date(to   + "T23:59:59").toISOString());
    if (q.trim())   sp.set("q", q.trim());
    sp.set("page", String(page));
    sp.set("size", String(size));
    return sp.toString();
  }, [action, entityType, adminEmail, from, to, q, page]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiGet<ListResp>(`/api/admin/audit-logs?${queryString}`);
      setData(r);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load audit log");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); /* initial + when filters change */ }, [queryString]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / size)) : 1;
  const clearFilters = () => {
    setAction(""); setEntityType(""); setAdminEmail("");
    setFrom(""); setTo(""); setQ(""); setPage(1);
  };

  const exportCsv = () => {
    const sp = new URLSearchParams();
    if (action)     sp.set("action", action);
    if (entityType) sp.set("entityType", entityType);
    if (adminEmail) sp.set("adminEmail", adminEmail);
    if (from)       sp.set("from", new Date(from + "T00:00:00").toISOString());
    if (to)         sp.set("to",   new Date(to   + "T23:59:59").toISOString());
    if (q.trim())   sp.set("q", q.trim());
    const token = (window as any).__learne2i_admin__?.getToken?.();
    const url = `/api/admin/audit-logs/export.csv?${sp.toString()}`;
    // Use a hidden <a download> with a fetch-then-blob to attach the
    // Authorization header. A direct <a href> would 401.
    (async () => {
      try {
        const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!r.ok) { toast.error(`Export failed (${r.status})`); return; }
        const blob = await r.blob();
        const dl = document.createElement("a");
        dl.href = URL.createObjectURL(blob);
        const fname = `learne2i-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
        dl.download = fname;
        document.body.appendChild(dl);
        dl.click();
        dl.remove();
        URL.revokeObjectURL(dl.href);
        toast.success("CSV downloaded");
      } catch (e: any) {
        toast.error(e?.message || "Export failed");
      }
    })();
  };

  return (
    <div className="p-6 space-y-4 max-w-[1500px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-display font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-admin-600" />
            Audit log
          </h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            Every important admin action — logins, impersonation, product edits, coupon changes, Ask AI updates, notifications, grants.
            Use filters to narrow down, or export a CSV for compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="btn-outline h-9 px-3 inline-flex items-center gap-1.5 text-[12.5px]" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={exportCsv} className="btn-primary h-9 px-3 inline-flex items-center gap-1.5 text-[12.5px]">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div className="card p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <FilterField label="Action">
            <select className="input" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
              <option value="">All actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </FilterField>
          <FilterField label="Entity type">
            <select className="input" value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}>
              <option value="">All types</option>
              {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
          <FilterField label="Admin email">
            <input
              className="input"
              type="email"
              placeholder="admin@…"
              value={adminEmail}
              onChange={e => { setAdminEmail(e.target.value); setPage(1); }}
            />
          </FilterField>
          <FilterField label="From">
            <input className="input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
          </FilterField>
          <FilterField label="To">
            <input className="input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
          </FilterField>
          <FilterField label="Search">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
              <input
                className="input pl-7"
                placeholder="reason, id, value…"
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1); }}
              />
            </div>
          </FilterField>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500 dark:text-ink-400">
          <Filter className="h-3 w-3" />
          <span>{data?.total ?? 0} matching event{(data?.total ?? 0) === 1 ? "" : "s"}</span>
          <button type="button" onClick={clearFilters} className="ml-2 underline hover:text-ink-700 dark:hover:text-ink-200">Clear filters</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-ink-50 dark:bg-ink-800/50 text-ink-500 dark:text-ink-400 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold w-[150px]">When</th>
                <th className="px-3 py-2 font-semibold w-[170px]">Admin</th>
                <th className="px-3 py-2 font-semibold w-[150px]">Action</th>
                <th className="px-3 py-2 font-semibold w-[140px]">Entity</th>
                <th className="px-3 py-2 font-semibold">Detail</th>
                <th className="px-3 py-2 font-semibold w-[110px]">IP</th>
                <th className="px-3 py-2 font-semibold w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-ink-500">Loading…</td></tr>
              )}
              {data && data.items.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-ink-500">No matching events.</td></tr>
              )}
              {data && data.items.map(r => {
                const cat = actionCategory(r.action);
                const Icon = cat.Icon;
                return (
                  <tr key={r.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50/60 dark:hover:bg-ink-800/30">
                    <td className="px-3 py-2 whitespace-nowrap text-ink-700 dark:text-ink-200">{fmtDate(r.at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-ink-800 dark:text-ink-100 font-medium">{r.adminEmail || "—"}</div>
                      <div className="text-[10.5px] text-ink-500 dark:text-ink-400">id #{r.adminUserId ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium ${cat.cls}`}>
                        <Icon className="h-3 w-3" />
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-700 dark:text-ink-200">
                      {r.entityType ? (
                        <>
                          <div className="font-medium">{r.entityType}</div>
                          {r.entityId && <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{r.entityId}</div>}
                        </>
                      ) : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-ink-700 dark:text-ink-200 max-w-[420px]">
                      {(r.newValue || r.oldValue || r.reason) ? (
                        <div className="space-y-0.5">
                          {r.reason && <div className="text-ink-500 dark:text-ink-400 italic text-[11px]">"{r.reason}"</div>}
                          {r.newValue && <div className="truncate" title={r.newValue}>+ {shortJson(r.newValue, 100)}</div>}
                          {r.oldValue && <div className="truncate text-ink-500 dark:text-ink-400" title={r.oldValue}>- {shortJson(r.oldValue, 100)}</div>}
                        </div>
                      ) : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-ink-500 dark:text-ink-400">{r.ipAddress || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button type="button" onClick={() => setDetailRow(r)} className="btn-ghost h-7 px-2 inline-flex items-center gap-1 text-[11.5px]" title="View full record">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > size && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-ink-100 dark:border-ink-800 text-[12px]">
            <div className="text-ink-500 dark:text-ink-400">
              Showing <strong>{(data.page - 1) * size + 1}</strong>–<strong>{Math.min(data.page * size, data.total)}</strong> of <strong>{data.total}</strong>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost h-7 w-7 grid place-items-center disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-ink-600 dark:text-ink-300">Page {page} / {totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost h-7 w-7 grid place-items-center disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailRow && <DetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10.5px] font-medium text-ink-500 dark:text-ink-400 mb-0.5 uppercase tracking-wide">{label}</div>
      {children}
    </label>
  );
}

function DetailDrawer({ row, onClose }: { row: Row; onClose: () => void }) {
  const cat = actionCategory(row.action);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-[560px] bg-white dark:bg-ink-900 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-ink-900 border-b border-ink-200 dark:border-ink-800 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase tracking-wide text-ink-500 dark:text-ink-400">Audit event #{row.id}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11.5px] font-medium ${cat.cls}`}>
                <cat.Icon className="h-3 w-3" />
                {row.action}
              </span>
              <span className="text-[12px] text-ink-600 dark:text-ink-300">{fmtDate(row.at)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost h-8 w-8 grid place-items-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3 text-[12.5px]">
          <KV label="Admin" value={row.adminEmail || "—"} sub={row.adminUserId != null ? `user #${row.adminUserId}` : undefined} />
          <KV label="Entity" value={row.entityType || "—"} sub={row.entityId ?? undefined} />
          <KV label="IP" value={row.ipAddress || "—"} />
          {row.correlationId && <KV label="Correlation id" value={row.correlationId} />}
          {row.reason && (
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-0.5">Reason</div>
              <div className="rounded-md border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/40 px-2.5 py-1.5 italic text-ink-700 dark:text-ink-200">"{row.reason}"</div>
            </div>
          )}
          {row.oldValue && (
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-0.5">Old value</div>
              <pre className="rounded-md border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/40 px-2.5 py-1.5 text-[11.5px] overflow-x-auto whitespace-pre-wrap break-words">{row.oldValue}</pre>
            </div>
          )}
          {row.newValue && (
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-0.5">New value</div>
              <pre className="rounded-md border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/40 px-2.5 py-1.5 text-[11.5px] overflow-x-auto whitespace-pre-wrap break-words">{row.newValue}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KV({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-0.5">{label}</div>
      <div className="text-ink-800 dark:text-ink-100">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{sub}</div>}
    </div>
  );
}
