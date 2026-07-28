import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, Loader2, Mail, Lock, AlertCircle, Sparkles } from "lucide-react";
import { apiPost, setToken, setAdminUser } from "../../lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) {
      setErr("Email and password are both required.");
      return;
    }
    setBusy(true);
    try {
      const r = await apiPost<{ token: string; admin: { id: string; name: string; email: string; role: string } }>(
        "/api/admin/auth/login",
        { email, password }
      );
      setToken(r.token);
      setAdminUser(r.admin);
      toast.success(`Welcome, ${r.admin.name}`);
      navigate(next, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full grid grid-cols-1 lg:grid-cols-[1fr_460px]">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-admin-700 via-admin-800 to-ink-900 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-admin-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-admin-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <img
              src="/cups-logo.jpg"
              alt="Cups Innovation"
              className="h-14 w-auto rounded-lg bg-white p-1.5 shadow-md"
            />
            <div>
              <div className="text-[15px] font-bold leading-tight">Learne2i</div>
              <div className="text-[12px] text-white/70 leading-tight">by Cups Innovation · Admin Portal</div>
            </div>
          </div>
        </div>
        <div className="relative space-y-4 max-w-md">
          <h1 className="text-3xl font-display font-bold leading-tight">
            The full platform, in one place.
          </h1>
          <p className="text-white/70 text-[14px] leading-relaxed">
            Users, questions, products, payments, support. Every change you make is
            audited, every action is permissioned, every number is live.
          </p>
        </div>
        <div className="relative text-[11px] text-white/50">
          Learne2i Admin · v0.1.0 · All activity is logged
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm space-y-5"
        >
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <img
              src="/cups-logo.jpg"
              alt="Cups Innovation"
              className="h-10 w-auto rounded-md bg-white p-1 shadow-sm"
            />
            <div>
              <div className="text-[14px] font-bold leading-tight">Learne2i Admin</div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400 leading-tight">by Cups Innovation · sign in to continue</div>
            </div>
          </div>

          <div>
            <h2 className="text-[20px] font-display font-bold">Sign in</h2>
            <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
              Use your admin credentials.
            </p>
          </div>

          {/* Default credentials hint — visible only on first run. */}
          <div className="rounded-lg border border-admin-500/30 bg-admin-500/5 px-3 py-2 text-[11.5px] text-admin-700 dark:text-admin-300 space-y-0.5">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              First-time login?
            </div>
            <div className="font-mono text-[11px]">
              admin@learne2i.co.in &nbsp;/&nbsp; change-me-immediately
            </div>
            <button
              type="button"
              onClick={() => { setEmail("admin@learne2i.co.in"); setPassword("change-me-immediately"); }}
              className="text-[10.5px] underline underline-offset-2 hover:no-underline mt-0.5"
            >
              Use default credentials
            </button>
          </div>

          {expired && (
            <div className="rounded-lg border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-[12px] text-warn-700 dark:text-warn-500 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              Your session expired. Please sign in again.
            </div>
          )}

          {err && (
            <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12px] text-bad-600 dark:text-bad-500">
              {err}
            </div>
          )}

          <div className="space-y-3">
            <label className="block">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400 mb-1">Email</div>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@learne2i.co.in"
                  required
                  disabled={busy}
                />
              </div>
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400 mb-1">Password</div>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9"
                  required
                  disabled={busy}
                />
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full justify-center py-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center text-[11px] text-ink-500 dark:text-ink-400">
            Forgot password?{" "}
            <Link to="#" className="text-admin-600 hover:underline">Contact the platform owner</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
