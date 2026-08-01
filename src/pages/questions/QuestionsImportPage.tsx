import { useRef, useState } from "react";
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  Archive,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getToken, API_BASE } from "../../lib/api";
import toast from "react-hot-toast";

type RowOutcome = {
  rowNumber: number;
  id: string;
  action: "created" | "updated";
  warnings: string[];
};

type ImportResponse = {
  ok: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  imagesExtracted: number;
  errors: string[];
  rows: RowOutcome[];
};

type DropZoneProps = {
  label: string;
  icon: React.ReactNode;
  file: File | null;
  accept: string;
  onPicked: (f: File | null) => void;
};

// Single source of truth for a "click to pick a file" zone. The button
// opens a hidden <input type=file> via ref so we control the styling.
function DropZone({ label, icon, file, accept, onPicked }: DropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-ink-200 dark:border-ink-700 hover:border-admin-400 dark:hover:border-admin-500 bg-white dark:bg-ink-900 px-4 py-4 transition-colors text-left w-full"
      >
        <div className="flex items-center gap-2 text-ink-700 dark:text-ink-200 font-semibold text-[13px]">
          {icon}
          {label}
        </div>
        <div className="text-[12px] text-ink-500 dark:text-ink-400 truncate w-full">
          {file ? (
            <span className="text-admin-600 dark:text-admin-400">
              {file.name}{" "}
              <span className="text-ink-400">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </span>
          ) : (
            "Click to choose a file"
          )}
        </div>
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPicked(e.target.files?.[0] ?? null)}
      />
    </>
  );
}

export default function QuestionsImportPage() {
  const [xlsx, setXlsx] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const upload = async () => {
    if (!xlsx) {
      toast.error("Pick the questions.xlsx file first.");
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error("Session expired — please sign in again.");
      return;
    }
    setBusy(true);
    setResult(null);
    setPhase("Uploading workbook...");
    try {
      const fd = new FormData();
      fd.append("xlsx", xlsx);
      if (zip) fd.append("imagesZip", zip);

      setPhase(
        "Server is reading the workbook, extracting images and writing rows..."
      );
      const r = await fetch(`${API_BASE}/api/admin/questions/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (r.status === 401) {
        toast.error("Session expired — please sign in again.");
        return;
      }
      if (!r.ok) {
        let detail = `${r.status} ${r.statusText}`;
        try {
          const j = await r.json();
          detail = j?.error || j?.message || detail;
        } catch {}
        toast.error(detail);
        return;
      }

      const data = (await r.json()) as ImportResponse;
      setResult(data);
      if (data.ok) {
        toast.success(
          `Imported ${data.totalRows - data.skipped} rows ` +
            `(${data.created} new, ${data.updated} updated)`
        );
      } else if (data.created + data.updated === 0) {
        toast.error("Import ran but nothing landed — see errors below.");
      } else {
        toast("Partial import — some rows failed.", { icon: "⚠️" });
      }
      setPhase("");
    } catch (e: any) {
      toast.error(`Upload failed: ${e?.message ?? e}`);
      setPhase("");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setXlsx(null);
    setZip(null);
    setResult(null);
    setPhase("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <UploadIcon className="h-6 w-6 text-admin-600" />
          <h1 className="text-[22px] font-bold leading-tight">
            Upload Questions
          </h1>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500 dark:text-ink-400 max-w-2xl">
          Re-import the workbook you downloaded from{" "}
          <a href="/questions/export" className="text-admin-600 underline">
            Download Questions
          </a>{" "}
          (or a hand-edited copy of it). Rows are matched to the database by the
          <code className="mx-1 px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-[11.5px]">
            id
          </code>{" "}
          column — existing rows are updated in place, rows with an empty id
          become new questions with a fresh id.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* ────────── LEFT: file pickers + upload ────────── */}
        <section className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-5 space-y-4">
          <h2 className="text-[14px] font-semibold">Pick the files</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DropZone
              label="questions.xlsx (required)"
              icon={<FileSpreadsheet className="h-4 w-4 text-admin-600" />}
              file={xlsx}
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onPicked={(f) => {
                setXlsx(f);
                setResult(null);
              }}
            />
            <DropZone
              label="images.zip (optional)"
              icon={<Archive className="h-4 w-4 text-admin-600" />}
              file={zip}
              accept=".zip,application/zip"
              onPicked={(f) => {
                setZip(f);
                setResult(null);
              }}
            />
          </div>

          <div className="rounded-lg bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 px-3.5 py-2.5 text-[12.5px] flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span className="text-ink-600 dark:text-ink-300">
              If your workbook references any image paths, you must upload the
              matching <b>images.zip</b> from the same export, otherwise the
              import will be rejected as a safety check.
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={busy || !xlsx}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-admin-600 hover:bg-admin-700 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold text-[14px] px-4 py-2.5 transition-colors"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              {busy ? "Working..." : "Upload & import"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-lg border border-ink-200 dark:border-ink-700 px-4 py-2.5 text-[13px] font-medium hover:bg-ink-50 dark:hover:bg-ink-800 disabled:opacity-50"
            >
              Reset
            </button>
          </div>

          {phase && (
            <p className="text-[12px] text-ink-500 dark:text-ink-400 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> {phase}
            </p>
          )}
        </section>

        {/* ────────── RIGHT: how matching works ────────── */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-admin-600" />
              <h3 className="text-[13px] font-semibold">Match contract</h3>
            </div>
            <ul className="text-[12px] text-ink-600 dark:text-ink-300 space-y-1.5 list-disc pl-4">
              <li>
                <b>id present in DB</b> → UPDATE that row + replace its 4 options
              </li>
              <li>
                <b>id empty</b> → INSERT a new question with a fresh id (Q-XXXXXXXX)
              </li>
              <li>
                All DB writes happen in one transaction — a bad row aborts the
                whole import
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-[13px] font-semibold">Watch out</h3>
            </div>
            <ul className="text-[12px] text-ink-600 dark:text-ink-300 space-y-1.5 list-disc pl-4">
              <li>
                The workbook's <b>column order must match the export</b>; column
                A is always{" "}
                <code className="px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-[11px]">
                  id
                </code>
                .
              </li>
              <li>
                Don't delete the 3 trailing name columns — extra ones are
                ignored, missing ones break the import.
              </li>
              <li>
                Every import is recorded in the audit log with row counts.
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ───────────────────────────── Result panel ───────────────────────────── */}
      {result && (
        <section className="mt-6 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-5">
          <header className="flex items-center gap-2 mb-4">
            {result.ok ? (
              <CheckCircle2 className="h-5 w-5 text-admin-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <h2 className="text-[15px] font-semibold">
              {result.ok ? "Import complete" : "Import finished with errors"}
            </h2>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Rows" value={result.totalRows} />
            <Stat label="Created" value={result.created} accent="admin" />
            <Stat label="Updated" value={result.updated} accent="admin" />
            <Stat
              label="Skipped"
              value={result.skipped}
              accent={result.skipped ? "red" : "ink"}
            />
          </div>

          <div className="text-[12.5px] text-ink-500 dark:text-ink-400">
            Images extracted: <b>{result.imagesExtracted}</b> files
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setErrorsExpanded((v) => !v)}
                className="text-[12.5px] font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                {errorsExpanded ? "Hide" : "Show"} {result.errors.length}{" "}
                error{result.errors.length === 1 ? "" : "s"} →
              </button>
              {errorsExpanded && (
                <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 space-y-1 text-[12px] text-red-700 dark:text-red-200">
                  {result.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result.rows.length > 0 && (
            <details className="mt-4">
              <summary className="text-[12.5px] font-semibold text-ink-700 dark:text-ink-200 cursor-pointer hover:underline">
                Per-row outcomes ({result.rows.length})
              </summary>
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-ink-200 dark:border-ink-700">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-ink-50 dark:bg-ink-800 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">Row</th>
                      <th className="px-2 py-1.5 text-left font-semibold">ID</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Action</th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        Warnings
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr
                        key={r.rowNumber}
                        className="border-t border-ink-100 dark:border-ink-800"
                      >
                        <td className="px-2 py-1.5 font-mono">{r.rowNumber}</td>
                        <td className="px-2 py-1.5 font-mono break-all">
                          {r.id}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={
                              "px-1.5 py-0.5 rounded text-[10.5px] font-semibold " +
                              (r.action === "created"
                                ? "bg-admin-100 text-admin-700 dark:bg-admin-900/40 dark:text-admin-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300")
                            }
                          >
                            {r.action}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-ink-500 dark:text-ink-400">
                          {r.warnings.length ? r.warnings.join(" · ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "ink",
}: {
  label: string;
  value: number;
  accent?: "ink" | "admin" | "red";
}) {
  const colors =
    accent === "admin"
      ? "text-admin-600 dark:text-admin-400"
      : accent === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-ink-700 dark:text-ink-200";
  return (
    <div className="rounded-lg border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800/60 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className={`text-[20px] font-bold ${colors}`}>{value}</div>
    </div>
  );
}
