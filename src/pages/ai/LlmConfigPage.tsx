// LLM Configuration page — the platform owner sets the model name,
// base URL, and which env var holds the real API key. The Test button
// makes a real ping to the LLM so you can confirm the key works before
// pushing the change to students.
//
// IMPORTANT: the real API key is NEVER sent to or stored in the
// browser. The admin types it in once, the server stores it in the
// configured env var, and subsequent reads only show a masked preview.

import { useEffect, useState } from "react";
import { Key, Server, Thermometer, Hash, Clock, Save, Play, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, ExternalLink, RotateCcw } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import toast from "react-hot-toast";

type LlmConfig = {
  enabled: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  apiKeyEnv: string;
  apiKeySet: boolean;
  apiKeyMask: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  updatedAt: string;
  updatedBy: string;
};

type TestResult = {
  ok?: boolean;
  provider?: string;
  model?: string;
  base_url?: string;
  latency_ms?: number;
  sample?: string;
  error_code?: string;
  message?: string;
  status?: number;
};

const PROVIDER_PRESETS: Record<string, { baseUrl: string; model: string; envVar: string }> = {
  openai:    { baseUrl: "https://api.openai.com/v1",  model: "gpt-4o-mini",  envVar: "OPENAI_API_KEY" },
  MiniMax: { baseUrl: "https://api.MiniMax.com/v1", model: "MiniMax-M3",  envVar: "MiniMax_API_KEY" },
  together:  { baseUrl: "https://api.together.xyz/v1",  model: "meta-llama/Llama-3-70b-chat-hf", envVar: "TOGETHER_API_KEY" },
  groq:      { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.1-70b-versatile", envVar: "GROQ_API_KEY" },
  custom:    { baseUrl: "",                              model: "",             envVar: "OPENAI_API_KEY" },
};

export default function LlmConfigPage() {
  const [c, setC] = useState<LlmConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const load = async () => {
    try { setC(await apiGet<LlmConfig>("/api/admin/llm-config")); }
    catch (e: any) { toast.error(e?.message || "Failed to load LLM config"); }
  };
  useEffect(() => { load(); }, []);

  const save = async (override?: Partial<{ enabled: boolean; provider: string; model: string; baseUrl: string; apiKeyEnv: string; temperature: number; maxTokens: number; timeoutSeconds: number; apiKey: string }>) => {
    if (!c) return;
    setBusy(true);
    try {
      const body: any = {
        enabled: c.enabled,
        provider: c.provider,
        model: c.model,
        baseUrl: c.baseUrl,
        apiKeyEnv: c.apiKeyEnv,
        temperature: c.temperature,
        maxTokens: c.maxTokens,
        timeoutSeconds: c.timeoutSeconds,
      };
      if (override) Object.assign(body, override);
      if (newKey) body.apiKey = "set:" + newKey;
      const updated = await apiPut<LlmConfig>("/api/admin/llm-config", body);
      setC(updated);
      setNewKey("");
      setShowKeyInput(false);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await apiPost<TestResult>("/api/admin/llm-config/test");
      setTestResult(r);
      if (r.ok) toast.success(`LLM OK · ${r.latency_ms}ms`);
    } catch (e: any) {
      // api.ts throws a custom message; surface the body if any
      setTestResult({ error_code: "FAILED", message: e?.message });
      toast.error("Test failed");
    } finally { setTesting(false); }
  };

  const applyPreset = (key: string) => {
    const p = PROVIDER_PRESETS[key];
    if (!p || !c) return;
    setC({ ...c, provider: key, baseUrl: p.baseUrl, model: p.model, apiKeyEnv: p.envVar });
  };

  const clearKey = async () => {
    if (!c) return;
    if (!confirm("Remove the LLM API key? The AI will fall back to the rule-based composer.")) return;
    setBusy(true);
    try {
      const updated = await apiPut<LlmConfig>("/api/admin/llm-config", { apiKey: "clear" });
      setC(updated);
      toast.success("Key cleared");
    } catch (e: any) { toast.error(e?.message || "Failed to clear key"); }
    finally { setBusy(false); }
  };

  if (!c) return <div className="p-12 text-center text-ink-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…</div>;

  return (
    <div className="p-6 space-y-5 max-w-[1100px]">
      <div>
        <h1 className="text-[22px] font-display font-bold">LLM Configuration</h1>
        <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
          The model the Ask AI engine talks to. Changes take effect on the very next student message.
        </p>
      </div>

      {/* Status banner */}
      <div className={`rounded-lg border px-3 py-2.5 flex items-start gap-2.5 ${
        c.enabled && c.apiKeySet ? "bg-ok-500/5 border-ok-500/30" :
        c.enabled && !c.apiKeySet ? "bg-warn-500/5 border-warn-500/30" :
                                     "bg-ink-50 border-ink-200 dark:bg-ink-800/30 dark:border-ink-700"
      }`}>
        {c.enabled && c.apiKeySet
          ? <CheckCircle2 className="h-4 w-4 text-ok-600 flex-shrink-0 mt-0.5" />
          : <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${c.enabled ? "text-warn-600" : "text-ink-400"}`} />
        }
        <div className="flex-1">
          <div className="text-[13px] font-semibold">
            {c.enabled && c.apiKeySet  && "LLM is live · Ask AI uses the configured model"}
            {c.enabled && !c.apiKeySet && "LLM is enabled but no API key is set — fall back to rule-based"}
            {!c.enabled                  && "LLM is disabled — Ask AI uses the rule-based composer"}
          </div>
          <div className="text-[11.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            {c.provider} / {c.model || "(no model)"} · base URL: {c.baseUrl || "(empty)"}
            {c.updatedAt && <span> · last updated {new Date(c.updatedAt).toLocaleString()}{c.updatedBy ? ` by ${c.updatedBy}` : ""}</span>}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Provider</label>
            <div className="flex gap-1.5 mt-1">
              <select className="input" value={c.provider} onChange={e => setC({ ...c, provider: e.target.value })}>
                {Object.keys(PROVIDER_PRESETS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="button" onClick={() => applyPreset(c.provider)} className="btn-outline" title="Apply preset base URL + model + env var">
                <RotateCcw className="h-3.5 w-3.5" /> Preset
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Model</label>
            <input className="input mt-1" value={c.model} onChange={e => setC({ ...c, model: e.target.value })} placeholder="gpt-4o-mini" />
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">Base URL</label>
          <div className="relative mt-1">
            <Server className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" value={c.baseUrl} onChange={e => setC({ ...c, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">API key</label>
          <div className="mt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-ink-400" />
              {c.apiKeySet
                ? <span className="font-mono text-[12px] text-ok-700 dark:text-ok-500">● {c.apiKeyMask || "(set)"}</span>
                : <span className="text-[12px] text-warn-700 dark:text-warn-500">not set — LLM is disabled</span>}
              <button type="button" onClick={() => setShowKeyInput(s => !s)} className="text-[11px] text-admin-600 hover:underline ml-2">
                {showKeyInput ? "Cancel" : c.apiKeySet ? "Replace key" : "Set key"}
              </button>
              {c.apiKeySet && (
                <button type="button" onClick={clearKey} disabled={busy} className="text-[11px] text-bad-600 hover:underline ml-1">
                  Clear key
                </button>
              )}
            </div>
            {showKeyInput && (
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    className="input pl-9 pr-9"
                    type={showKeyInput ? "text" : "password"}
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder={c.apiKeySet ? "Paste new key" : "sk-..."}
                    autoComplete="off"
                  />
                  <Key className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                </div>
                <button type="button" onClick={() => setShowKeyInput(s => !s)} className="btn-outline" title={showKeyInput ? "Hide" : "Show"}>
                  {showKeyInput ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            <p className="text-[10.5px] text-ink-500 dark:text-ink-400">
              The key is sent to the server once, then stored in the <code className="font-mono">{c.apiKeyEnv}</code> env var. It is never saved to the database and is never sent to the browser again.
            </p>
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">API key env var name</label>
          <input className="input mt-1" value={c.apiKeyEnv} onChange={e => setC({ ...c, apiKeyEnv: e.target.value })} placeholder="OPENAI_API_KEY" />
          <p className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-1">
            The name of the env var the server reads at LLM-call time. Change this if you want to use a different env var than the default.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
              <Thermometer className="h-3 w-3 inline mr-1" /> Temperature · {c.temperature.toFixed(2)}
            </label>
            <input type="range" min="0" max="1" step="0.05" className="w-full mt-2 accent-admin-500" value={c.temperature} onChange={e => setC({ ...c, temperature: +e.target.value })} />
            <div className="text-[10.5px] text-ink-500 dark:text-ink-400 mt-0.5">0 = deterministic, 1 = creative</div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
                <Hash className="h-3 w-3 inline mr-1" /> Max tokens
              </label>
              <input className="input mt-1" type="number" min="64" max="8000" step="64" value={c.maxTokens} onChange={e => setC({ ...c, maxTokens: +e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">
                <Clock className="h-3 w-3 inline mr-1" /> Timeout (seconds)
              </label>
              <input className="input mt-1" type="number" min="5" max="120" value={c.timeoutSeconds} onChange={e => setC({ ...c, timeoutSeconds: +e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ink-200 dark:border-ink-700">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={c.enabled} onChange={e => setC({ ...c, enabled: e.target.checked })} className="accent-admin-500 h-4 w-4" />
            <span className="font-semibold">Enable LLM (fall back to rule-based when off)</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={test} disabled={testing || !c.apiKeySet} className="btn-outline">
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Test connection
            </button>
            <button type="button" onClick={() => save()} disabled={busy} className="btn-primary">
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
              ? <><CheckCircle2 className="h-4 w-4 text-ok-600" /> <span className="font-semibold text-ok-700 dark:text-ok-500">Connection OK · {testResult.latency_ms}ms</span></>
              : <><AlertCircle className="h-4 w-4 text-bad-600" /> <span className="font-semibold text-bad-700 dark:text-bad-500">Test failed</span></>
            }
          </div>
          {testResult.ok && testResult.sample && (
            <div className="mt-2 p-2 rounded bg-ink-50 dark:bg-ink-800/50 font-mono text-[11.5px] text-ink-700 dark:text-ink-200">
              <div className="text-ink-500 text-[10px] uppercase tracking-wider mb-1">Sample response</div>
              {testResult.sample}
            </div>
          )}
          {!testResult.ok && testResult.message && (
            <div className="mt-2 text-[12px] text-bad-700 dark:text-bad-400 font-mono">
              {testResult.status ? `[${testResult.status}] ` : ""}{testResult.message}
            </div>
          )}
        </div>
      )}

      {/* Help / explainer */}
      <div className="card p-4 bg-admin-500/5 border-admin-500/20">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-admin-700 dark:text-admin-300">
          <Sparkles className="h-3.5 w-3.5" /> Why this matters
        </div>
        <div className="text-[12px] text-ink-700 dark:text-ink-200 mt-1.5 space-y-1">
          <p>• The Ask AI engine in the user app uses the model configured here. No code change needed — just save and the next student message uses the new model.</p>
          <p>• If the LLM is disabled or fails, the system falls back to a rule-based composer so the chat still works.</p>
          <p>• <code className="font-mono text-[11.5px]">gpt-4o-mini</code> is the cheapest OpenAI model that still produces well-formatted JSON. <code className="font-mono text-[11.5px]">gpt-4o</code> is smarter but ~30× more expensive.</p>
        </div>
      </div>
    </div>
  );
}
