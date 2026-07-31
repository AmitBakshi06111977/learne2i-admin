import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart3,
  LogOut, Bell, ChevronDown, Sparkles, Brain, Settings2, Key, KeyRound,
  Package2, Receipt, Megaphone, ShieldCheck, CreditCard, FileSpreadsheet
} from "lucide-react";
import { getAdminUser, clearAdminSession, apiPost } from "../lib/api";
import toast from "react-hot-toast";

const NAV = [
  { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { to: "/users",       icon: Users,            label: "Users" },
  { to: "/questions",   icon: BookOpen,         label: "Questions" },
];

const AI_NAV = [
  { to: "/llm-config",  icon: Key,      label: "LLM config" },
  { to: "/ai/prompts",  icon: Brain,    label: "Prompts" },
  { to: "/ai/controls", icon: Settings2, label: "Controls" },
];

const NOTIF_NAV = [
  { to: "/notifications", icon: Megaphone, label: "Notifications" },
];

const COMMERCE_NAV = [
  { to: "/commerce", icon: Package2, label: "Commerce" },
  { to: "/commerce/payment-gateways", icon: CreditCard, label: "Payment gateways" },
  { to: "/commerce/guess-paper-marketing", icon: FileSpreadsheet, label: "Guess Paper page" },
];

const SYSTEM_NAV = [
  { to: "/audit-log", icon: ShieldCheck, label: "Audit log" },
  { to: "/change-password", icon: KeyRound, label: "Change password" },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = getAdminUser<{ name: string; email: string; role: string }>();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = async () => {
    try { await apiPost("/api/admin/auth/logout", {}, { anonymous: false, swallowError: true }); }
    catch { /* best effort */ }
    clearAdminSession();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-full grid grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="border-r border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-ink-200 dark:border-ink-800">
          <img
            src="/cups-logo.jpg"
            alt="Cups Innovation"
            className="h-10 w-auto rounded-md bg-white p-1 shadow-sm flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-bold leading-tight truncate">Learne2i</div>
            <div className="text-[10.5px] text-ink-500 dark:text-ink-400 leading-tight truncate">Cups Innovation · Admin</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-admin-50 dark:bg-admin-900/20 text-admin-700 dark:text-admin-300"
                    : "text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/50"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <div className="pt-3 pb-1 px-3 text-[9.5px] uppercase tracking-wider font-bold text-ink-400 dark:text-ink-500">
            Ask AI
          </div>
          {AI_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-admin-50 dark:bg-admin-900/20 text-admin-700 dark:text-admin-300"
                    : "text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/50"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          <div className="pt-3 pb-1 px-3 text-[9.5px] uppercase tracking-wider font-bold text-ink-400 dark:text-ink-500">
            Comms
          </div>
          {NOTIF_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-admin-50 dark:bg-admin-900/20 text-admin-700 dark:text-admin-300" : "text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/50"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}

          <div className="pt-3 pb-1 px-3 text-[9.5px] uppercase tracking-wider font-bold text-ink-400 dark:text-ink-500">
            Sales
          </div>
          {COMMERCE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-admin-50 dark:bg-admin-900/20 text-admin-700 dark:text-admin-300" : "text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/50"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}

          <div className="pt-3 pb-1 px-3 text-[9.5px] uppercase tracking-wider font-bold text-ink-400 dark:text-ink-500">
            System
          </div>
          {SYSTEM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-admin-50 dark:bg-admin-900/20 text-admin-700 dark:text-admin-300" : "text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/50"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-ink-200 dark:border-ink-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col h-full overflow-hidden">
        <header className="h-14 px-6 flex items-center justify-between border-b border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 flex-shrink-0">
          <div className="flex items-center gap-3 text-[12px] text-ink-500 dark:text-ink-400">
            <Sparkles className="h-3.5 w-3.5 text-admin-500" />
            <span>admin.learne2i.com</span>
            <span>·</span>
            <span>v0.1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate("/notifications")} className="btn-ghost relative" title="Notifications">
              <Bell className="h-4 w-4" />
              {/* Unread badge — counts outbox items newer than 24h, just a visual hint */}
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-admin-500 text-white text-[9px] font-bold grid place-items-center">
                ✦
              </span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                <div className="h-7 w-7 rounded-full bg-admin-600 grid place-items-center text-white text-[12px] font-bold">
                  {(user?.name ?? "A").slice(0, 1).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-[12.5px] font-semibold leading-tight">{user?.name ?? "Admin"}</div>
                  <div className="text-[10.5px] text-ink-500 dark:text-ink-400 leading-tight">{user?.role ?? "—"}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-lg p-1 z-50">
                  <div className="px-3 py-1.5 text-[11px] text-ink-500 dark:text-ink-400">{user?.email}</div>
                  <div className="border-t border-ink-100 dark:border-ink-700 my-1" />
                  <button type="button" onClick={onLogout} className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[12.5px] hover:bg-ink-100 dark:hover:bg-ink-700">
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-ink-50 dark:bg-ink-900/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
