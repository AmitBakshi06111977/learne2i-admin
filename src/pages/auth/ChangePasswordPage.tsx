// ChangePasswordPage - lets the signed-in admin set a new password.
//
// Flow:
//   1. User fills in current password + new password (twice).
//   2. We POST /api/admin/auth/change-password (Authorization header required).
//   3. On success the server invalidates ALL sessions for this admin, so we
//      clear the local token and bounce to /login with a friendly message.
//
// After every Forgot password? reset, the emailed 20-char random password
// is hard to remember. This page lets the owner set a memorable one.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, clearAdminSession } from '../../lib/api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const rules = computeRules(newPassword);
  const allOk =
    currentPassword.length > 0 &&
    rules.lengthOk && rules.hasUpper && rules.hasLower && rules.hasDigit &&
    newPassword === confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Enter your current password'); return; }
    if (!rules.lengthOk)   { toast.error('New password must be at least 8 characters'); return; }
    if (!rules.hasUpper || !rules.hasLower || !rules.hasDigit) {
      toast.error('New password must include upper, lower, and a digit');
      return;
    }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from the current one');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/api/admin/auth/change-password', { currentPassword, newPassword });
      setDone(true);
      toast.success('Password changed - please sign in again');
      setTimeout(() => {
        clearAdminSession();
        navigate('/login?expired=1', { replace: true });
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || 'Could not change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-[22px] font-display font-bold">Change password</h1>
        <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
          Set a memorable password for admin@learne2i.com. You will be signed out and asked to log in again with the new one.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <form onSubmit={submit} className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-admin-500" />
              <div className="text-[13px] font-semibold">Set a new password</div>
            </div>
            <Field label="Current password" hint="The password you used to sign in just now.">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10 font-mono"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="current password"
                  disabled={busy || done}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
                  tabIndex={-1}
                  title={showPw ? 'Hide' : 'Show'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <div className="border-t border-ink-100 dark:border-ink-800" />
            <Field label="New password" hint="Minimum 8 characters. Mix upper, lower, and a digit.">
              <input
                type={showPw ? 'text' : 'password'}
                className="input font-mono"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 chars, e.g. Learne2i2026"
                disabled={busy || done}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type={showPw ? 'text' : 'password'}
                className="input font-mono"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Type the new password again"
                disabled={busy || done}
              />
            </Field>
            <div className="rounded-md border border-ink-200 dark:border-ink-700 bg-ink-50/40 dark:bg-ink-800/30 p-3">
              <div className="text-[11px] font-medium text-ink-600 dark:text-ink-300 mb-1.5">Password requirements</div>
              <ul className="space-y-0.5 text-[11.5px]">
                <Rule ok={rules.lengthOk} label="At least 8 characters" />
                <Rule ok={rules.hasUpper}  label="One uppercase letter (A-Z)" />
                <Rule ok={rules.hasLower}  label="One lowercase letter (a-z)" />
                <Rule ok={rules.hasDigit}  label="One digit (0-9)" />
                <Rule ok={newPassword.length > 0 && newPassword === confirmPassword} label="Both new password fields match" />
              </ul>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={!allOk || busy || done} className="btn-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                {busy ? 'Changing...' : done ? 'Done' : 'Change password'}
              </button>
              <button
                type="button"
                onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setDone(false); }}
                disabled={busy || done}
                className="btn-outline"
              >
                Reset form
              </button>
              {done && (
                <span className="text-[12px] text-ok-600 dark:text-ok-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved - redirecting to login...
                </span>
              )}
            </div>
          </form>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warn-500" />
              <div className="text-[12.5px] font-semibold">Heads up</div>
            </div>
            <ul className="space-y-1.5 text-[11.5px] text-ink-600 dark:text-ink-300">
              <li>After changing your password, <b>all other sessions are signed out</b>.</li>
              <li>You will need to log in again with the new password.</li>
              <li>If you forgot your current password, use <b>Forgot password?</b> on the login page instead - it emails a new one to the platform owner.</li>
            </ul>
          </div>
          <div className="card p-4">
            <div className="text-[11.5px] font-medium text-ink-700 dark:text-ink-200 mb-1">Tip</div>
            <div className="text-[11.5px] text-ink-500 dark:text-ink-400">
              Use a passphrase you can remember, e.g. <span className="font-mono">Learne2i2026!</span>. Avoid reusing passwords from other sites.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeRules(pw: string) {
  return {
    lengthOk: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasDigit: /[0-9]/.test(pw),
  };
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-ok-600 dark:text-ok-400" : "text-ink-500 dark:text-ink-400"}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-ok-500" : "bg-ink-300 dark:bg-ink-700"}`} />
      {label}
    </li>
  );
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