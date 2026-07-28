// CommercePage — combined admin view for Products, Coupons, Orders.
// Each is its own tab. This keeps the sidebar tidy while still giving
// the platform owner one place to manage the catalog + discounts + revenue.

import { useEffect, useState } from "react";
import {
  Package2, Tag, Receipt, Plus, Save, Power, PowerOff, X, IndianRupee,
  TrendingUp, Users, ShoppingCart, Wallet, Eye, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────
type Product = {
  id: string; key: string; displayName: string; shortDescription: string;
  longDescription: string; targetUser: string; problemSolved: string;
  features: string[]; limitations: string[]; targetExams: string[];
  priceInr: number; isFree: boolean; accessDuration: string;
  status: string; displayOrder: number;
  updatedAt: string; updatedBy: string;
};

type Coupon = {
  id: string; code: string; description: string;
  discountType: string; discountValue: number; minCartInr: number;
  maxUses: number; usedCount: number; maxUsesPerUser: number;
  applicableProducts: string[];
  validFrom: string | null; validUntil: string | null;
  status: string; createdAt: string; createdBy: string;
};

type Order = {
  id: number; userId: string; productId: string; productName: string; productType: string;
  mode: string; amountPaise: number; amountInr: number; status: string;
  transactionId: string; expiryDate: string | null; createdAt: string;
};

type OrderStats = {
  totalPurchases: number; completedPurchases: number; refundedPurchases: number;
  totalRevenuePaise: number; totalRevenueInr: number; uniqueBuyers: number; freeGrants: number;
  byProductType: Record<string, number>;
  revenueByProductType: Record<string, number>;
};

// ─── Main page ──────────────────────────────────────────────────
export default function CommercePage() {
  const [tab, setTab] = useState<"products" | "coupons" | "orders">("products");
  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold">Commerce</h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            Products · Coupons · Orders · Discounts
          </p>
        </div>
      </div>

      <div className="card p-1 inline-flex gap-1">
        <TabBtn active={tab === "products"} onClick={() => setTab("products")} icon={<Package2 className="h-3.5 w-3.5" />}>Products</TabBtn>
        <TabBtn active={tab === "coupons"}  onClick={() => setTab("coupons")}  icon={<Tag className="h-3.5 w-3.5" />}>Coupons</TabBtn>
        <TabBtn active={tab === "orders"}   onClick={() => setTab("orders")}   icon={<Receipt className="h-3.5 w-3.5" />}>Orders</TabBtn>
      </div>

      {tab === "products" && <ProductsTab />}
      {tab === "coupons"  && <CouponsTab />}
      {tab === "orders"   && <OrdersTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium flex items-center gap-1.5 transition ${active ? "bg-admin-600 text-white" : "text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"}`}>
      {icon}{children}
    </button>
  );
}

// ─── Products tab ──────────────────────────────────────────────
function ProductsTab() {
  const [rows, setRows] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try { setRows(await apiGet<Product[]>("/api/admin/products")); }
    catch (e: any) { setErr(e?.message || "Failed to load products"); }
  };
  useEffect(() => { load(); }, []);

  if (editing) return <ProductEdit p={editing} onBack={() => { setEditing(null); load(); }} />;

  return (
    <div className="space-y-3">
      {err && <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">{err}</div>}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="table-th">Key</th>
            <th className="table-th">Display name</th>
            <th className="table-th text-right">Price</th>
            <th className="table-th">Exams</th>
            <th className="table-th">Status</th>
            <th className="table-th">Updated</th>
            <th className="table-th" />
          </tr></thead>
          <tbody>
            {rows === null && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="table-td"><div className="h-3 w-20 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" /></td>
              ))}</tr>
            ))}
            {rows && rows.map(p => (
              <tr key={p.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                <td className="table-td font-mono text-[11px]">{p.key}</td>
                <td className="table-td">
                  <div className="text-[12.5px] font-medium">{p.displayName}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400 line-clamp-1">{p.shortDescription}</div>
                </td>
                <td className="table-td text-right font-mono text-[12px]">
                  {p.isFree ? <span className="badge-ok">Free</span> : <><IndianRupee className="inline h-3 w-3" />{p.priceInr}</>}
                </td>
                <td className="table-td">
                  <div className="flex flex-wrap gap-1">
                    {p.targetExams.slice(0, 3).map(e => <span key={e} className="badge-muted text-[9.5px]">{e}</span>)}
                  </div>
                </td>
                <td className="table-td">
                  <span className={p.status === "active" ? "badge-ok" : p.status === "draft" ? "badge-muted" : "badge-warn"}>{p.status}</span>
                </td>
                <td className="table-td text-[10.5px] text-ink-500 dark:text-ink-400">{p.updatedBy ? `by ${p.updatedBy}` : "—"}</td>
                <td className="table-td text-right">
                  <button type="button" onClick={() => setEditing(p)} className="btn-outline text-[11px]"><Eye className="h-3 w-3" /> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductEdit({ p, onBack }: { p: Product; onBack: () => void }) {
  const [form, setForm] = useState({ ...p, longDescription: p.longDescription || "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: any) => setForm(s => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await apiPost(`/api/admin/products/${p.id}/save`, {
        key: form.key, displayName: form.displayName,
        shortDescription: form.shortDescription, longDescription: form.longDescription,
        targetUser: form.targetUser, problemSolved: form.problemSolved,
        features: form.features, limitations: form.limitations, targetExams: form.targetExams,
        priceInr: form.priceInr, isFree: form.isFree, accessDuration: form.accessDuration,
        status: form.status, displayOrder: form.displayOrder,
      });
      toast.success("Product saved");
      onBack();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="btn-outline text-[11.5px]"><X className="h-3 w-3" /> Cancel</button>
        <h2 className="text-[16px] font-display font-bold">Edit: {p.displayName}</h2>
      </div>
      <div className="card p-4 grid grid-cols-2 gap-3">
        <Field label="Key" hint="stable id (STEP_UP, SMARTSOLVE, …)">
          <input className="input" value={form.key} onChange={e => set("key", e.target.value)} />
        </Field>
        <Field label="Display name">
          <input className="input" value={form.displayName} onChange={e => set("displayName", e.target.value)} />
        </Field>
        <Field label="Short description" className="col-span-2">
          <input className="input" value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} />
        </Field>
        <Field label="Long description" className="col-span-2">
          <textarea className="input min-h-[80px]" value={form.longDescription} onChange={e => set("longDescription", e.target.value)} />
        </Field>
        <Field label="Target user">
          <input className="input" value={form.targetUser} onChange={e => set("targetUser", e.target.value)} />
        </Field>
        <Field label="Problem solved">
          <input className="input" value={form.problemSolved} onChange={e => set("problemSolved", e.target.value)} />
        </Field>
        <Field label="Price (INR, 0 = free)">
          <input className="input" type="number" min={0} value={form.priceInr} onChange={e => set("priceInr", parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Access duration">
          <input className="input" value={form.accessDuration} onChange={e => set("accessDuration", e.target.value)} />
        </Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="retired">retired</option>
          </select>
        </Field>
        <Field label="Display order">
          <input className="input" type="number" value={form.displayOrder} onChange={e => set("displayOrder", parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Target exams" className="col-span-2" hint="comma-separated, e.g. JEE_MAIN, JEE_ADV, NEET_UG">
          <input className="input" value={form.targetExams.join(", ")}
            onChange={e => set("targetExams", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
        </Field>
        <Field label="Features (one per line)" className="col-span-2">
          <textarea className="input min-h-[80px]" value={form.features.join("\n")}
            onChange={e => set("features", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
        </Field>
        <Field label="Limitations (one per line)" className="col-span-2">
          <textarea className="input min-h-[60px]" value={form.limitations.join("\n")}
            onChange={e => set("limitations", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
        </Field>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={busy} className="btn-primary"><Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

// ─── Coupons tab ────────────────────────────────────────────────
function CouponsTab() {
  const [rows, setRows] = useState<Coupon[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    setErr(null);
    try { setRows(await apiGet<Coupon[]>("/api/admin/coupons")); }
    catch (e: any) { setErr(e?.message || "Failed to load coupons"); }
  };
  useEffect(() => { load(); }, []);
  if (creating) return <CouponEdit onBack={() => { setCreating(false); load(); }} />;
  const toggle = async (c: Coupon) => {
    try { await apiPost(`/api/admin/coupons/${c.id}/toggle`, {}); load(); }
    catch (e: any) { toast.error(e?.message || "Toggle failed"); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {err && <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">{err}</div>}
        <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus className="h-3.5 w-3.5" /> New coupon</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="table-th">Code</th><th className="table-th">Discount</th>
            <th className="table-th text-right">Max uses</th><th className="table-th text-right">Used</th>
            <th className="table-th">Valid</th><th className="table-th">Status</th><th className="table-th" />
          </tr></thead>
          <tbody>
            {rows === null && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="table-td"><div className="h-3 w-20 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" /></td>
              ))}</tr>
            ))}
            {rows && rows.length === 0 && (
              <tr><td colSpan={7} className="table-td text-center text-ink-400 py-8">No coupons yet. Click "New coupon" to create one.</td></tr>
            )}
            {rows && rows.map(c => (
              <tr key={c.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                <td className="table-td font-mono text-[12px] font-bold">{c.code}</td>
                <td className="table-td">
                  {c.discountType === "percent" ? `${c.discountValue}% off` : <><IndianRupee className="inline h-3 w-3" />{c.discountValue} off</>}
                  <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{c.description}</div>
                </td>
                <td className="table-td text-right font-mono text-[12px]">{c.maxUses || "∞"}</td>
                <td className="table-td text-right font-mono text-[12px]">{c.usedCount}</td>
                <td className="table-td text-[10.5px] text-ink-500 dark:text-ink-400">
                  {c.validFrom ? `from ${new Date(c.validFrom).toLocaleDateString()}` : "any"}
                  {c.validUntil ? ` until ${new Date(c.validUntil).toLocaleDateString()}` : ""}
                </td>
                <td className="table-td">
                  <span className={c.status === "active" ? "badge-ok" : c.status === "paused" ? "badge-warn" : "badge-muted"}>{c.status}</span>
                </td>
                <td className="table-td text-right">
                  <button type="button" onClick={() => toggle(c)} className="btn-outline text-[11px]">
                    {c.status === "active" ? <><PowerOff className="h-3 w-3" /> Pause</> : <><Power className="h-3 w-3" /> Activate</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CouponEdit({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({
    code: "", description: "",
    discountType: "percent", discountValue: 20, minCartInr: 0,
    maxUses: 0, maxUsesPerUser: 1,
    applicableProducts: [] as string[], status: "active",
  });
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => { apiGet<Product[]>("/api/admin/products").then(setProducts).catch(() => {}); }, []);
  const set = (k: keyof typeof form, v: any) => setForm(s => ({ ...s, [k]: v }));

  const save = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    setBusy(true);
    try {
      await apiPost("/api/admin/coupons", form);
      toast.success("Coupon created");
      onBack();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="btn-outline text-[11.5px]"><X className="h-3 w-3" /> Cancel</button>
        <h2 className="text-[16px] font-display font-bold">New coupon</h2>
      </div>
      <div className="card p-4 grid grid-cols-2 gap-3">
        <Field label="Code (e.g. WELCOME50)">
          <input className="input uppercase" value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Description">
          <input className="input" value={form.description} onChange={e => set("description", e.target.value)} />
        </Field>
        <Field label="Discount type">
          <select className="input" value={form.discountType} onChange={e => set("discountType", e.target.value)}>
            <option value="percent">percent</option>
            <option value="flat">flat (INR)</option>
          </select>
        </Field>
        <Field label={form.discountType === "percent" ? "Percent off (0-100)" : "Flat off (INR)"}>
          <input className="input" type="number" min={0} value={form.discountValue} onChange={e => set("discountValue", parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Max total uses (0 = unlimited)">
          <input className="input" type="number" min={0} value={form.maxUses} onChange={e => set("maxUses", parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Max uses per user">
          <input className="input" type="number" min={1} value={form.maxUsesPerUser} onChange={e => set("maxUsesPerUser", parseInt(e.target.value) || 1)} />
        </Field>
        <Field label="Min cart (INR)">
          <input className="input" type="number" min={0} value={form.minCartInr} onChange={e => set("minCartInr", parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
        </Field>
        <Field label="Applicable products" className="col-span-2" hint="empty = all products">
          <select multiple className="input min-h-[80px]" value={form.applicableProducts}
            onChange={e => set("applicableProducts", Array.from(e.target.selectedOptions).map(o => o.value))}>
            {products.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={busy} className="btn-primary"><Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Create"}</button>
      </div>
    </div>
  );
}

// ─── Orders tab ─────────────────────────────────────────────────
function OrdersTab() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(page)); params.set("size", "50");
      const [list, s] = await Promise.all([
        apiGet<{ items: Order[]; total: number }>(`/api/admin/orders?${params.toString()}`),
        apiGet<OrderStats>("/api/admin/orders/stats"),
      ]);
      setRows(list.items); setTotal(list.total); setStats(s);
    } catch (e: any) { setErr(e?.message || "Failed to load orders"); }
  };
  useEffect(() => { load(); }, [page, status]);

  return (
    <div className="space-y-3">
      {err && <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">{err}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Wallet className="h-3.5 w-3.5" />} label="Revenue" value={`₹${stats.totalRevenueInr.toLocaleString("en-IN")}`} sub={`${stats.completedPurchases} completed orders`} />
          <StatCard icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Purchases" value={stats.totalPurchases} sub={`${stats.refundedPurchases} refunded · ${stats.freeGrants} free`} />
          <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Unique buyers" value={stats.uniqueBuyers} sub="paid + free" />
          <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="By type" value={Object.keys(stats.byProductType).length || "—"} sub="product types" />
        </div>
      )}

      <div className="card p-3 flex flex-wrap items-center gap-2">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All statuses</option>
          <option value="completed">completed</option>
          <option value="refunded">refunded</option>
          <option value="failed">failed</option>
        </select>
        <button type="button" onClick={() => { setStatus(""); setPage(1); }} className="btn-outline text-[11.5px]"><RotateCcw className="h-3 w-3" /> Reset</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="table-th">ID</th><th className="table-th">Product</th>
            <th className="table-th">Type</th><th className="table-th">Mode</th>
            <th className="table-th text-right">Amount</th>
            <th className="table-th">Status</th><th className="table-th">When</th>
          </tr></thead>
          <tbody>
            {rows === null && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="table-td"><div className="h-3 w-20 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" /></td>
              ))}</tr>
            ))}
            {rows && rows.length === 0 && (
              <tr><td colSpan={7} className="table-td text-center text-ink-400 py-8">No orders yet. Once users buy a paid product, the orders appear here.</td></tr>
            )}
            {rows && rows.map(o => (
              <tr key={o.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                <td className="table-td font-mono text-[11px] text-ink-500 dark:text-ink-400">#{o.id}</td>
                <td className="table-td text-[12px]">{o.productName}</td>
                <td className="table-td"><span className="badge-muted text-[10px]">{o.productType}</span></td>
                <td className="table-td text-[11px]">{o.mode}</td>
                <td className="table-td text-right font-mono text-[12px]">
                  {o.amountInr > 0 ? <><IndianRupee className="inline h-3 w-3" />{o.amountInr}</> : <span className="badge-ok text-[9.5px]">Free</span>}
                </td>
                <td className="table-td">
                  <span className={o.status === "completed" ? "badge-ok" : o.status === "refunded" ? "badge-warn" : "badge-bad"}>{o.status}</span>
                </td>
                <td className="table-td text-[10.5px] text-ink-500 dark:text-ink-400">{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-3 py-2 border-t border-ink-200 dark:border-ink-700 text-[11.5px] text-ink-500">
          <div>Page {page} · {total.toLocaleString()} total</div>
          <div className="flex gap-1">
            <button type="button" className="btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button type="button" className="btn-outline" disabled={!rows || rows.length < 50} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-ink-500 dark:text-ink-400">
        {icon}{label}
      </div>
      <div className="text-[20px] font-display font-bold mt-0.5">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{sub}</div>}
    </div>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className || ""}`}>
      <div className="text-[11.5px] font-medium text-ink-700 dark:text-ink-200 mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-0.5">{hint}</div>}
    </label>
  );
}
