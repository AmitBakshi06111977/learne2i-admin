// Admin Executive Dashboard.
//
// One-stop live view: top stat cards, hourly activity chart (last 24h),
// per-product activity (last 7d), engagement funnel, and actionable
// alerts. Auto-refreshes every 30s so the numbers stay current.

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Users as UsersIcon, Activity, BookOpen,
  AlertTriangle, CheckCircle2, RefreshCw, Eye, Brain, FileText,
  Target, BarChart3, Sparkles
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { apiGet } from "../../lib/api";

type Stat = { value: string | number; label: string; trend?: { dir: "up" | "down"; pct: number }; tone: "ok" | "warn" | "bad" | "info"; icon?: string };
type Alert = { title: string; detail: string; severity: "warn" | "info" | "bad" };
type ActivityPoint = { t: string; total: number; correct: number; wrong: number; users: number };
type ActivityResp = { window_hours: number; total_in_window: number; points: ActivityPoint[] };
type ProductRow = { product: string; attempts: number; tests: number; purchases: number };
type ProductResp = { window_days: number; products: ProductRow[] };
type FunnelStep = { label: string; count: number };
type FunnelResp = { visitors: number; steps: FunnelStep[] };
type OnlineResp = { online_now: number; window_minutes: number };

const TONE: Record<string, string> = {
  ok:   "bg-ok-500/10 text-ok-600",
  warn: "bg-warn-500/10 text-warn-600",
  bad:  "bg-bad-500/10 text-bad-600",
  info: "bg-admin-500/10 text-admin-600",
};

const PRODUCT_ICON: Record<string, any> = {
  smartsolve: BookOpen,
  topper: Brain,
  mocktest: FileText,
  stepup: Target,
  ask_ai: Sparkles,
};

const PRODUCT_LABEL: Record<string, string> = {
  smartsolve: "SmartSolve",
  topper: "Topper Mode",
  mocktest: "Mock Tests",
  stepup: "StepUp",
  ask_ai: "Ask AI",
};

const PRODUCT_TONE: Record<string, string> = {
  smartsolve: "bg-emerald-500/10 text-emerald-600",
  topper:     "bg-violet-500/10 text-violet-600",
  mocktest:   "bg-amber-500/10 text-amber-600",
  stepup:     "bg-sky-500/10 text-sky-600",
  ask_ai:     "bg-rose-500/10 text-rose-600",
};

function StatIcon({ name }: { name?: string }) {
  const map: Record<string, any> = {
    users: UsersIcon, activity: Activity, questions: BookOpen,
    revenue: BarChart3, eye: Eye
  };
  const Icon = map[name ?? "activity"] ?? Activity;
  return <Icon className="h-3.5 w-3.5" />;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [activity, setActivity] = useState<ActivityResp | null>(null);
  const [products, setProducts] = useState<ProductResp | null>(null);
  const [funnel, setFunnel] = useState<FunnelResp | null>(null);
  const [online, setOnline] = useState<OnlineResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async () => {
    setErr(null);
    setRefreshing(true);
    try {
      const [s, a, act, prod, fn, on] = await Promise.all([
        apiGet<Stat[]>("/api/admin/dashboard/stats"),
        apiGet<Alert[]>("/api/admin/dashboard/alerts"),
        apiGet<ActivityResp>("/api/admin/dashboard/activity"),
        apiGet<ProductResp>("/api/admin/dashboard/products"),
        apiGet<FunnelResp>("/api/admin/dashboard/funnel"),
        apiGet<OnlineResp>("/api/admin/dashboard/online"),
      ]);
      setStats(s); setAlerts(a); setActivity(act);
      setProducts(prod); setFunnel(fn); setOnline(on);
      setLastRefresh(new Date());
    } catch (e: any) {
      setErr(e?.message || "Failed to load dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);  // 30s auto-refresh
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6 space-y-5 max-w-[1500px]">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold">Executive Dashboard</h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            Live snapshot of the platform. Auto-refreshes every 30 seconds.
            {lastRefresh && <span className="ml-2">· last updated {lastRefresh.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button type="button" onClick={load} className="btn-outline" disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">
          {err}
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {stats
          ? stats.map((s, i) => (
              <div key={i} className="stat-card">
                <div className={`w-7 h-7 rounded-lg grid place-items-center ${TONE[s.tone] ?? TONE.info}`}>
                  <StatIcon name={s.icon} />
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
                {s.trend && (
                  <div className={`flex items-center gap-0.5 text-[10.5px] font-semibold ${s.trend.dir === "up" ? "text-ok-600" : "text-bad-600"}`}>
                    {s.trend.dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {s.trend.pct}%
                  </div>
                )}
              </div>
            ))
          : Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-7 w-7 rounded-lg bg-ink-100 dark:bg-ink-800" />
                <div className="h-6 w-20 rounded bg-ink-100 dark:bg-ink-800" />
                <div className="h-3 w-28 rounded bg-ink-100 dark:bg-ink-800" />
              </div>
            ))}
      </div>

      {/* Online now + 7d summary band */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-ok-500/10 text-ok-600 grid place-items-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold">Online now</div>
            <div className="text-[20px] font-display font-bold leading-tight">
              {online?.online_now ?? "—"}
            </div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">active in the last {online?.window_minutes ?? 15} min</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-admin-500/10 text-admin-600 grid place-items-center">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold">Attempts (7d)</div>
            <div className="text-[20px] font-display font-bold leading-tight">
              {(products?.products.reduce((a, p) => a + p.attempts, 0) ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">across all products</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warn-500/10 text-warn-600 grid place-items-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-semibold">Active alerts</div>
            <div className="text-[20px] font-display font-bold leading-tight">{alerts?.length ?? 0}</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">need attention</div>
          </div>
        </div>
      </div>

      {/* Activity chart (24h) + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-semibold">Question attempts (last 24 hours)</div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400">
                {activity?.total_in_window.toLocaleString() ?? 0} total attempts in window
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] text-ok-600 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-ok-500 animate-pulse" />
              LIVE
            </div>
          </div>
          <div className="h-56">
            {activity ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCorrect" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="rgba(127,127,127,0.6)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(127,127,127,0.6)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: "#1e1b4b", border: "none", borderRadius: 6, color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Area type="monotone" dataKey="total"   stroke="#6366F1" fill="url(#gradTotal)"   strokeWidth={2} />
                  <Area type="monotone" dataKey="correct" stroke="#10B981" fill="url(#gradCorrect)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-[12px] text-ink-400 animate-pulse">Loading…</div>
            )}
          </div>
          <div className="flex items-center gap-4 text-[10.5px] text-ink-500 dark:text-ink-400 mt-1">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-admin-500" />Total attempts</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ok-500" />Correct</span>
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold">Alerts</div>
            <div className={`badge-${(alerts?.length ?? 0) > 0 ? "warn" : "ok"}`}>{alerts?.length ?? 0}</div>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {alerts && alerts.length > 0 ? alerts.map((a, i) => (
              <div key={i} className={`p-2.5 rounded-md border ${
                a.severity === "bad"  ? "bg-bad-500/5  border-bad-500/30"  :
                a.severity === "warn" ? "bg-warn-500/5 border-warn-500/30" :
                                       "bg-admin-500/5 border-admin-500/30"
              }`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                    a.severity === "bad"  ? "text-bad-600"  :
                    a.severity === "warn" ? "text-warn-600" : "text-admin-600"
                  }`} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold leading-snug">{a.title}</div>
                    <div className="text-[11.5px] text-ink-600 dark:text-ink-300 leading-snug mt-0.5">{a.detail}</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-[12px] text-ink-400">
                <CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-ok-500" />
                All clear — no active alerts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product activity (7d) + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold">Product activity (last 7 days)</div>
            <div className="text-[10.5px] text-ink-500">attempts · tests · purchases</div>
          </div>
          {products ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.products} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                    <XAxis dataKey="product" tick={{ fontSize: 10 }} stroke="rgba(127,127,127,0.6)" tickFormatter={v => PRODUCT_LABEL[v] ?? v} />
                    <YAxis tick={{ fontSize: 10 }} stroke="rgba(127,127,127,0.6)" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: "#1e1b4b", border: "none", borderRadius: 6, color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                      labelFormatter={v => PRODUCT_LABEL[v] ?? v}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="attempts"  name="Question attempts" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tests"     name="Tests"            fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases"        fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {products.products.map(p => {
                  const Icon = PRODUCT_ICON[p.product] ?? BookOpen;
                  const tone = PRODUCT_TONE[p.product] ?? "bg-admin-500/10 text-admin-600";
                  return (
                    <div key={p.product} className="rounded-lg border border-ink-200 dark:border-ink-700 p-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-5 w-5 rounded grid place-items-center ${tone}`}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="text-[11px] font-semibold truncate">{PRODUCT_LABEL[p.product] ?? p.product}</div>
                      </div>
                      <div className="text-[15px] font-display font-bold mt-1">{p.attempts.toLocaleString()}</div>
                      <div className="text-[10px] text-ink-500 dark:text-ink-400">attempts</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-52 grid place-items-center text-[12px] text-ink-400 animate-pulse">Loading…</div>
          )}
        </div>

        {/* Funnel */}
        <div className="card p-4">
          <div className="text-[13px] font-semibold mb-3">User funnel</div>
          {funnel ? (
            <div className="space-y-2">
              {funnel.steps.map((step, i) => {
                const maxCount = Math.max(...funnel.steps.map(s => s.count), 1);
                const pct = Math.round((step.count / maxCount) * 100);
                const prev = i > 0 ? funnel.steps[i - 1].count : null;
                const dropPct = prev && prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : null;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-[11.5px] mb-0.5">
                      <span className="text-ink-700 dark:text-ink-200">{step.label}</span>
                      <span className="font-mono font-semibold">
                        {step.count.toLocaleString()}
                        {dropPct !== null && dropPct > 0 && (
                          <span className="text-bad-600 ml-1.5 text-[10px]">-{dropPct}%</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-admin-500 to-admin-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="text-[10.5px] text-ink-500 dark:text-ink-400 pt-2 border-t border-ink-200 dark:border-ink-700 mt-3">
                {funnel.visitors.toLocaleString()} unique visitor{funnel.visitors === 1 ? "" : "s"} seen
              </div>
            </div>
          ) : (
            <div className="h-40 grid place-items-center text-[12px] text-ink-400 animate-pulse">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
