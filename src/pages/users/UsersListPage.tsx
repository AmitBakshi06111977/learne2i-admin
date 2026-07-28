import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Loader2, ChevronRight, Phone, Mail } from "lucide-react";
import { apiGet } from "../../lib/api";

type UserRow = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  targetExam?: string;
  currentClass?: string;
  city?: string;
  products: string[];
  testsCompleted: number;
  questionsAttempted: number;
  lastActive?: string;
  registeredAt?: string;
  status: "active" | "inactive" | "suspended";
};

export default function UsersListPage() {
  const [q, setQ] = useState("");
  const [exam, setExam] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiGet<{ items: UserRow[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(q)}&exam=${exam}&status=${status}&page=${page}&size=25`);
      setRows(r.items);
      setTotal(r.total);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, exam, status]);

  return (
    <div className="p-6 space-y-4 max-w-[1500px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold">Users</h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            {total.toLocaleString()} total · {rows?.filter(r => r.status === "active").length ?? 0} active
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(); } }}
            className="input pl-9"
            placeholder="Search by name, phone, email…"
          />
        </div>
        <select value={exam} onChange={e => { setExam(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All exams</option>
          <option value="JEE_MAIN">JEE Main</option>
          <option value="JEE_ADV">JEE Advanced</option>
          <option value="NEET_UG">NEET</option>
          <option value="NDA">NDA</option>
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="button" onClick={() => { setPage(1); load(); }} className="btn-primary" disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
          Search
        </button>
      </div>

      {err && <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">{err}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Target</th>
                <th className="table-th">Class</th>
                <th className="table-th">Products</th>
                <th className="table-th">Tests</th>
                <th className="table-th">Q attempted</th>
                <th className="table-th">Last active</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody>
              {rows === null && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="table-td"><div className="h-3 w-20 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-td text-center text-ink-400 py-12">
                    No users match the current filters.
                  </td>
                </tr>
              )}
              {rows && rows.map(r => (
                <tr key={r.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                  <td className="table-td">
                    <Link to={`/users/${r.id}`} className="flex items-center gap-2.5 hover:text-admin-600">
                      <div className="h-7 w-7 rounded-full bg-admin-100 dark:bg-admin-900/30 grid place-items-center text-admin-700 dark:text-admin-300 text-[11px] font-bold">
                        {r.name?.slice(0, 1).toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="font-semibold">{r.name ?? "—"}</div>
                        <div className="text-[10.5px] text-ink-500 dark:text-ink-400 flex items-center gap-1.5">
                          <Phone className="h-2.5 w-2.5" />{r.phone}
                          {r.email && <><Mail className="h-2.5 w-2.5 ml-1" />{r.email}</>}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="table-td">{r.targetExam ?? "—"}</td>
                  <td className="table-td">{r.currentClass ?? "—"}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      {r.products.length === 0 && <span className="text-ink-400">—</span>}
                      {r.products.slice(0, 3).map(p => <span key={p} className="badge-muted">{p}</span>)}
                      {r.products.length > 3 && <span className="badge-muted">+{r.products.length - 3}</span>}
                    </div>
                  </td>
                  <td className="table-td font-mono">{r.testsCompleted}</td>
                  <td className="table-td font-mono">{r.questionsAttempted.toLocaleString()}</td>
                  <td className="table-td text-[11.5px]">{r.lastActive ? new Date(r.lastActive).toLocaleDateString() : "—"}</td>
                  <td className="table-td">
                    <span className={
                      r.status === "active" ? "badge-ok" :
                      r.status === "suspended" ? "badge-bad" : "badge-muted"
                    }>{r.status}</span>
                  </td>
                  <td className="table-td text-right">
                    <Link to={`/users/${r.id}`} className="text-ink-400 hover:text-admin-600">
                      <ChevronRight className="h-4 w-4 inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-ink-200 dark:border-ink-700 text-[11.5px] text-ink-500">
          <div>Showing page {page}</div>
          <div className="flex gap-1">
            <button type="button" className="btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button type="button" className="btn-outline" disabled={!rows || rows.length < 25} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
