// Payment Gateways (Razorpay) configuration page.
//
// Lets the admin paste their Razorpay API keys (test + live), set
// business / support details, and verify the connection works — all
// from admin.learne2i.com. Secrets are DPAPI-encrypted on the server
// (PaymentGatewayConfigService). This UI only ever sees a masked
// preview of the Key ID (e.g. "••••3kQ") and "key is set / not set"
// flags for the Key Secret and Webhook Secret. The full plaintext is
// never echoed back from the server, never persisted in localStorage,
// and never logged.
//
// Endpoints used (see backend/Learne2i.Api/Controllers/AdminPaymentGatewaysController.cs):
//   GET  /api/admin/payment-gateways/razorpay          → both modes (masked)
//   GET  /api/admin/payment-gateways/razorpay/{mode}   → one mode (masked)
//   PUT  /api/admin/payment-gateways/razorpay/{mode}   → save (any field left blank is kept as-is)
//   POST /api/admin/payment-gateways/razorpay/test?mode=… → test by creating a ₹1 Razorpay order
//   POST /api/admin/payment-gateways/razorpay/{mode}/enable|disable → toggle IsEnabled
//
// Threat model recap:
//   - DB dump: useless without the ASP.NET DataProtection key file
//     (stored outside the DB).
//   - Logs: secret values are scrubbed.
//   - Admin UI: only shows masked previews; admin re-pastes to rotate.

import { useEffect, useState } from "react";
import {
  CreditCard, Key, Webhook, Building2, Hash, Mail, Phone, Save, Play,
  Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Power, PowerOff,
  RefreshCw, Sparkles, FileWarning, ExternalLink, Zap,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import toast from "react-hot-toast";

type MaskedConfig = {
  id: string;
  provider: string;
  mode: string;
  keyIdMask: string;
  hasKeySecret: boolean;
  hasWebhookSecret: boolean;
  businessName: string;
  gstin: string;
  supportEmail: string;
  supportPhone: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

type TestResult = {
  ok?: boolean;
  razorpayOrderId?: string;
  keyIdMask?: string;
  businessName?: string;
  currency?: string;
  amountPaise?: number;
  message?: string;
  error?: string;
  code?: string;
  description?: string;
};

type Mode = "test" | "live";

const MODES: { id: Mode; label: string; description: string; tone: string }[] = [
  {
    id: "test",
    label: "Test mode",
    description: "Use Razorpay test keys. Orders are fake, no real money moves.",
    tone: "from-amber-500 to-rose-500",
  },
  {
    id: "live",
    label: "Live mode",
    description: "Use Razorpay live keys. Real money. Confirm you've switched off test mode first.",
    tone: "from-emerald-500 to-teal-600",
  },
];

export default function PaymentGatewaysPage() {
  const [activeMode, setActiveMode] = useState<Mode>("test");
  const [rows, setRows] = useState<Record<Mode, MaskedConfig | null>>({ test: null, live: null });

  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  // Secrets — typed in only when the user clicks "Replace". Empty
  // string means "keep existing".
  const [showSecrets, setShowSecrets] = useState(false);
  const [newKeyId, setNewKeyId] = useState("");
  const [newKeySecret, setNewKeySecret] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");

  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const load = async () => {
    try {
      const r = await apiGet<{ provider: string; modes: MaskedConfig[] }>(
        "/api/admin/payment-gateways/razorpay"
      );
      const byMode: Record<Mode, MaskedConfig | null> = { test: null, live: null };
      for (const m of r.modes ?? []) {
        if (m.mode === "test" || m.mode === "live") byMode[m.mode] = m;
      }
      setRows(byMode);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load Razorpay config");
    }
  };

  useEffect(() => { load(); }, []);

  // Re-sync business/support fields whenever the user switches mode tab
  useEffect(() => {
    const r = rows[activeMode];
    setBusinessName(r?.businessName ?? "");
    setGstin(r?.gstin ?? "");
    setSupportEmail(r?.supportEmail ?? "");
    setSupportPhone(r?.supportPhone ?? "");
    setNewKeyId("");
    setNewKeySecret("");
    setNewWebhookSecret("");
    setShowSecrets(false);
    setTestResult(null);
  }, [activeMode, rows]);

  const current = rows[activeMode];
  const isConfigured = !!current;

  const save = async () => {
    setBusy(true);
    try {
      const body: any = {
        businessName: businessName || null,
        gstin: gstin || null,
        supportEmail: supportEmail || null,
        supportPhone: supportPhone || null,
      };
      // Only include the secret fields if the user actually typed
      // something. Empty string = "leave existing value alone".
      if (newKeyId.trim()) body.keyId = newKeyId.trim();
      if (newKeySecret.trim()) body.keySecret = newKeySecret.trim();
      if (newWebhookSecret.trim()) body.webhookSecret = newWebhookSecret.trim();

      const saved = await apiPut<MaskedConfig>(
        `/api/admin/payment-gateways/razorpay/${activeMode}`,
        body
      );
      setRows(prev => ({ ...prev, [activeMode]: saved }));
      setNewKeyId(""); setNewKeySecret(""); setNewWebhookSecret("");
      setShowSecrets(false);
      toast.success(`${MODES.find(m => m.id === activeMode)?.label} saved`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await apiPost<TestResult>(
        `/api/admin/payment-gateways/razorpay/test?mode=${activeMode}`
      );
      setTestResult(r);
      if (r.ok) toast.success(`Razorpay OK · ${activeMode}`);
      else toast.error("Test failed");
    } catch (e: any) {
      setTestResult({ ok: false, error: "Request failed", description: e?.message });
      toast.error("Test failed");
    } finally { setTesting(false); }
  };

  const toggle = async (enable: boolean) => {
    setBusy(true);
    try {
      const path = `/api/admin/payment-gateways/razorpay/${activeMode}/${enable ? "enable" : "disable"}`;
      const saved = await apiPost<MaskedConfig>(path);
      setRows(prev => ({ ...prev, [activeMode]: saved }));
      toast.success(enable ? `${MODES.find(m => m.id === activeMode)?.label} enabled` : "Disabled");
    } catch (e: any) {
      toast.error(e?.message || (enable ? "Enable failed" : "Disable failed"));
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 space-y-5 max-w-[1100px]">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-display font-bold">Payment gateways</h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            Razorpay credentials for test + live checkout. Only one mode is "active" at a time.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-outline" title="Reload">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Mode tabs */}
      <div className="grid sm:grid-cols-2 gap-3">
        {MODES.map(m => {
          const r = rows[m.id];
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMode(m.id)}
              className={`card p-4 text-left transition-all ${
                isActive
                  ? "ring-2 ring-admin-500 border-admin-500"
                  : "hover:border-admin-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-admin-600" />
                    <span className="font-display text-[15px] font-bold">{m.label}</span>
                  </div>
                  <p className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-1">
                    {m.description}
                  </p>
                </div>
                {r ? (
                  <span className={`badge ${r.isEnabled ? "badge-ok" : "badge-warn"} whitespace-nowrap`}>
                    {r.isEnabled ? "Active" : "Configured"}
                  </span>
                ) : (
                  <span className="badge badge-warn whitespace-nowrap">Not configured</span>
                )}
              </div>
              {r && (
                <div className="mt-3 pt-3 border-t border-ink-200 dark:border-ink-700 text-[11px] text-ink-500 dark:text-ink-400 flex items-center justify-between">
                  <span className="font-mono">{r.keyIdMask || "no key"}</span>
                  <span>{r.businessName || "(no business name)"}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Status banner */}
      {!isConfigured ? (
        <div className="rounded-lg border border-warn-500/30 bg-warn-500/5 px-3 py-2.5 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-warn-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold">
              Razorpay {MODES.find(m => m.id === activeMode)?.label} not configured yet
            </div>
            <div className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-0.5">
              Paste your Razorpay Key ID, Key Secret, and Webhook Secret below and click Save.
              The credentials are DPAPI-encrypted on the server before being written to the DB.
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-lg border px-3 py-2.5 flex items-start gap-2.5 ${
          current!.isEnabled
            ? "bg-ok-500/5 border-ok-500/30"
            : "bg-ink-50 border-ink-200 dark:bg-ink-800/30 dark:border-ink-700"
        }`}>
          {current!.isEnabled
            ? <CheckCircle2 className="h-4 w-4 text-ok-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 text-ink-400 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="text-[13px] font-semibold">
              {current!.isEnabled
                ? `Razorpay ${MODES.find(m => m.id === activeMode)?.label} is live`
                : `Razorpay ${MODES.find(m => m.id === activeMode)?.label} is configured but disabled`}
            </div>
            <div className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-0.5">
              Key ID: <span className="font-mono">{current!.keyIdMask || "—"}</span>
              {" · "}
              Secret: {current!.hasKeySecret ? "set" : "missing"}
              {" · "}
              Webhook secret: {current!.hasWebhookSecret ? "set" : "missing"}
              {current!.updatedAt && (
                <> · last updated {new Date(current!.updatedAt).toLocaleString()}{current!.updatedBy ? ` by ${current!.updatedBy}` : ""}</>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card p-5 space-y-5">
        <div>
          <h2 className="text-[14px] font-display font-bold flex items-center gap-2">
            <Key className="h-4 w-4 text-admin-600" /> API credentials
          </h2>
          <p className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            Paste the values from your Razorpay dashboard (Settings → API Keys → Webhooks).
            Leave a field blank to keep its current value — partial updates are fine.
          </p>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
            <Hash className="h-3 w-3 inline mr-1" /> Key ID
          </label>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <input
                className="input pl-9"
                value={newKeyId}
                onChange={e => setNewKeyId(e.target.value)}
                placeholder={current?.keyIdMask ? `Current: ${current.keyIdMask}` : "rzp_test_… or rzp_live_…"}
                autoComplete="off"
              />
              <Key className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            </div>
            <button type="button" onClick={() => setShowSecrets(s => !s)} className="btn-outline" title={showSecrets ? "Hide secrets" : "Show secrets"}>
              {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-1">
            Looks like <code className="font-mono">rzp_test_XXXXXXXXXXXX</code> (test) or <code className="font-mono">rzp_live_XXXXXXXXXXXX</code> (live).
            {" "}{current?.keyIdMask && <>Current value: <span className="font-mono">{current.keyIdMask}</span></>}
          </p>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
            <Key className="h-3 w-3 inline mr-1" /> Key Secret
          </label>
          <input
            className="input mt-1"
            type={showSecrets ? "text" : "password"}
            value={newKeySecret}
            onChange={e => setNewKeySecret(e.target.value)}
            placeholder={current?.hasKeySecret ? "•••••• (set — paste new value to rotate)" : "Paste your Razorpay key secret"}
            autoComplete="off"
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
            <Webhook className="h-3 w-3 inline mr-1" /> Webhook signing secret
          </label>
          <input
            className="input mt-1"
            type={showSecrets ? "text" : "password"}
            value={newWebhookSecret}
            onChange={e => setNewWebhookSecret(e.target.value)}
            placeholder={current?.hasWebhookSecret ? "•••••• (set — paste new value to rotate)" : "Webhook secret from Razorpay dashboard"}
            autoComplete="off"
          />
          <p className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-1">
            Used to verify Razorpay webhook callbacks. Create one in Razorpay Dashboard → Settings → Webhooks.
            {" "}<a href="https://dashboard.razorpay.com/app/webhooks" target="_blank" rel="noreferrer" className="text-admin-600 hover:underline inline-flex items-center gap-0.5">Open Razorpay dashboard <ExternalLink className="h-2.5 w-2.5" /></a>
          </p>
        </div>

        <div className="border-t border-ink-200 dark:border-ink-700 pt-4">
          <h2 className="text-[14px] font-display font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-admin-600" /> Business details (shown on receipts)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Business name</label>
            <input className="input mt-1" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Cups Innovation" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">GSTIN</label>
            <input className="input mt-1" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
              <Mail className="h-3 w-3 inline mr-1" /> Support email
            </label>
            <input className="input mt-1" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@learne2i.com" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
              <Phone className="h-3 w-3 inline mr-1" /> Support phone
            </label>
            <input className="input mt-1" value={supportPhone} onChange={e => setSupportPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ink-200 dark:border-ink-700">
          <div className="flex items-center gap-2">
            {isConfigured && current!.isEnabled ? (
              <button type="button" onClick={() => toggle(false)} disabled={busy} className="btn-outline text-bad-600 hover:bg-bad-500/10">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
                Disable this mode
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toggle(true)}
                disabled={busy || !current?.hasKeySecret}
                className="btn-outline"
                title={!current?.hasKeySecret ? "Set the Key Secret first" : ""}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                Enable this mode
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={test}
              disabled={testing || !current?.hasKeySecret}
              className="btn-outline"
              title={!current?.hasKeySecret ? "Set the Key Secret first" : ""}
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Test connection (₹1)
            </button>
            <button type="button" onClick={save} disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`card p-4 border ${
          testResult.ok ? "border-ok-500/30 bg-ok-500/5" : "border-bad-500/30 bg-bad-500/5"
        }`}>
          <div className="flex items-center gap-2">
            {testResult.ok
              ? <><CheckCircle2 className="h-4 w-4 text-ok-600" /> <span className="font-semibold text-ok-700 dark:text-ok-500">Connection OK</span></>
              : <><AlertCircle className="h-4 w-4 text-bad-600" /> <span className="font-semibold text-bad-700 dark:text-bad-500">Test failed</span></>
            }
          </div>
          {testResult.ok && (
            <div className="mt-2 text-[12px] text-ink-700 dark:text-ink-200 space-y-1">
              <div>Razorpay order ID: <span className="font-mono">{testResult.razorpayOrderId}</span></div>
              <div>Key ID: <span className="font-mono">{testResult.keyIdMask}</span></div>
              <div>Business: {testResult.businessName}</div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-1.5 flex items-start gap-1.5">
                <FileWarning className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {testResult.message}
              </div>
            </div>
          )}
          {!testResult.ok && (
            <div className="mt-2 text-[12px] text-bad-700 dark:text-bad-400 font-mono space-y-0.5">
              {testResult.error && <div>{testResult.error}</div>}
              {testResult.code && <div className="text-[11px] opacity-80">code: {testResult.code}</div>}
              {testResult.description && <div>{testResult.description}</div>}
            </div>
          )}
        </div>
      )}

      {/* Help / explainer */}
      <div className="card p-4 bg-admin-500/5 border-admin-500/20">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-admin-700 dark:text-admin-300">
          <Sparkles className="h-3.5 w-3.5" /> How it works
        </div>
        <div className="text-[12px] text-ink-700 dark:text-ink-200 mt-1.5 space-y-1">
          <p>• <strong>Test mode</strong> is for development — use the keys from Razorpay Dashboard → Settings → API Keys → Generate Test Key. No real money moves.</p>
          <p>• <strong>Live mode</strong> is for production — only enable after you've verified everything works in test mode and you're ready to take real payments.</p>
          <p>• Only one mode can be "active" (IsEnabled=true) at a time. The checkout flow automatically picks whichever mode is active.</p>
          <p>• Secrets are encrypted with ASP.NET DataProtection (DPAPI on Windows) before being written to the DB. The plaintext never appears in the browser, logs, or DB dumps.</p>
          <p className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Test connection creates a ₹1 Razorpay order — confirm Razorpay accepted the keys without waiting for a real transaction.</p>
        </div>
      </div>
    </div>
  );
}