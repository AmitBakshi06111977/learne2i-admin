import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  ImageIcon,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { apiGet, getToken, API_BASE } from "../../lib/api";
import toast from "react-hot-toast";

type ExamOpt    = { id: string; name: string; slug: string };
type SubjectOpt = { id: string; name: string; examId: string; slug: string };
type ChapterOpt = { id: string; name: string; subjectId: string; slug?: string };

const YEARS = Array.from({ length: 2026 - 2014 + 1 }, (_, i) => 2014 + i).reverse();

export default function QuestionsExportPage() {
  // ----- filter state -----
  const [exam,    setExam]    = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [year,    setYear]    = useState<number | "">("");

  // ----- dropdown data -----
  const [exams,    setExams]    = useState<ExamOpt[]>([]);
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [chapters, setChapters] = useState<ChapterOpt[]>([]);

  // ----- download state -----
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  // Load the catalog dropdowns from the public endpoints (same source
  // QuestionsListPage uses, so the IDs match what the DB actually stores).
  useEffect(() => {
    Promise.all([
      apiGet<ExamOpt[]>("/api/exams"),
      apiGet<SubjectOpt[]>("/api/subjects"),
      apiGet<ChapterOpt[]>("/api/chapters"),
    ]).then(([es, ss, cs]) => { setExams(es); setSubjects(ss); setChapters(cs); })
      .catch(() => { toast.error("Could not load exam/subject/chapter lists"); });
  }, []);

  // Cascade filters so the user can't pick an impossible combination.
  const filteredSubjects = useMemo(
    () => exam ? subjects.filter(s => s.examId === exam) : subjects,
    [subjects, exam]
  );
  const filteredChapters = useMemo(
    () => subject ? chapters.filter(c => c.subjectId === subject) : chapters,
    [chapters, subject]
  );

  const atLeastOneFilter =
    exam !== "" || subject !== "" || chapter !== "" || year !== "";

  const buildSummary = (): string => {
      const parts: string[] = [];
      const e = exam    ? exams.find(x => x.id === exam)             : null;
      const s = subject ? subjects.find(x => x.id === subject)       : null;
      const c = chapter ? chapters.find(x => x.id === chapter)       : null;
      parts.push(`exam = ${e?.name    ?? "All exams"}`);
      parts.push(`subject = ${s?.name ?? "All subjects"}`);
      parts.push(`chapter = ${c?.name ?? "All chapters"}`);
      parts.push(`year = ${year === "" ? "All years" : String(year)}`);
      return parts.join(" · ");
    };

  const download = async () => {
    if (!atLeastOneFilter) {
      toast.error("Pick at least one filter (exam, subject, chapter, or year).");
      return;
    }
    setBusy(true);
    setProgress("Requesting export...");

    try {
      const params = new URLSearchParams();
      if (exam)    params.set("exam",    exam);
      if (subject) params.set("subject", subject);
      if (chapter) params.set("chapter", chapter);
      if (year !== "") params.set("year", String(year));

      const url = `${API_BASE}/api/admin/questions/export.zip?${params.toString()}`;
      const token = getToken();
      if (!token) {
        toast.error("Session expired — please sign in again.");
        return;
      }

      setProgress("Server is building the workbook and bundling images...");
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (r.status === 401) {
        toast.error("Session expired — please sign in again.");
        return;
      }
      if (!r.ok) {
        // Try to surface a server-side error message.
        let detail = `${r.status} ${r.statusText}`;
        try { const j = await r.json(); detail = j?.error || j?.message || detail; } catch {}
        toast.error(detail);
        return;
      }

      // Pull the filename out of Content-Disposition if the server sent one;
      // fall back to a friendly default.
      const cd = r.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="?([^"]+)"?/i);
      const filename = m?.[1] ?? `questions_${Date.now()}.zip`;

      setProgress("Saving file...");
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success(`Downloaded ${filename}`);
      setProgress("");
    } catch (e: any) {
      toast.error(`Download failed: ${e?.message ?? e}`);
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="h-6 w-6 text-admin-600" />
          <h1 className="text-[22px] font-bold leading-tight">Download Questions</h1>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-500 dark:text-ink-400 max-w-2xl">
          Export questions from the database as an Excel workbook. Each row is one question,
          every column mirrors the DB schema verbatim, and every referenced image is bundled
          in a sibling <code className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-[11.5px]">images/</code> folder inside the zip.
          You'll get <code className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-[11.5px]">questions.xlsx</code> + <code className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-[11.5px]">images/&lt;path&gt;...</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* ----- LEFT: filter form ----- */}
        <section className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-ink-500" />
            <h2 className="text-[14px] font-semibold">Filters</h2>
            <span className="text-[11.5px] text-ink-400">(at least one required)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-medium text-ink-600 dark:text-ink-300 mb-1">Exam</label>
              <select
                value={exam}
                onChange={e => { setExam(e.target.value); setSubject(""); setChapter(""); }}
                className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-2 text-[13px]"
              >
                            <option value="">All exams</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-ink-600 dark:text-ink-300 mb-1">Subject</label>
              <select
                value={subject}
                onChange={e => { setSubject(e.target.value); setChapter(""); }}
                className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-2 text-[13px]"
              >
                            <option value="">All subjects</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-ink-600 dark:text-ink-300 mb-1">Chapter</label>
              <select
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-2 text-[13px]"
              >
                            <option value="">All chapters</option>
                {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-ink-600 dark:text-ink-300 mb-1">Year</label>
              <select
                value={year === "" ? "" : String(year)}
                onChange={e => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-2 text-[13px]"
              >
                            <option value="">All years</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Summary line */}
          <div className="mt-5 rounded-lg bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 px-3.5 py-2.5 text-[12.5px]">
            <span className="text-ink-500 dark:text-ink-400 mr-1">Will export:</span>
            <span className="font-medium">{buildSummary()}</span>
          </div>

          <button
            type="button"
            onClick={download}
            disabled={busy || !atLeastOneFilter}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-admin-600 hover:bg-admin-700 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold text-[14px] px-4 py-2.5 transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? "Working..." : "Download questions.xlsx + images"}
          </button>

          {progress && (
            <p className="mt-3 text-[12px] text-ink-500 dark:text-ink-400 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> {progress}
            </p>
          )}
        </section>

        {/* ----- RIGHT: what you'll get ----- */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-admin-600" />
              <h3 className="text-[13px] font-semibold">What's in the zip</h3>
            </div>
            <ul className="text-[12px] text-ink-600 dark:text-ink-300 space-y-1.5">
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-admin-500 flex-shrink-0 mt-0.5" /> <span><b>questions.xlsx</b> — 31 columns per row, one row per question</span></li>
              <li className="flex gap-2"><ImageIcon className="h-3.5 w-3.5 text-admin-500 flex-shrink-0 mt-0.5" /> <span><b>images/&lt;path&gt;...</b> — every referenced question, solution, and option image</span></li>
            </ul>
          </div>

          <div className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-[13px] font-semibold">Heads up</h3>
            </div>
            <ul className="text-[12px] text-ink-600 dark:text-ink-300 space-y-1.5 list-disc pl-4">
              <li>No <code className="px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-[11px]">id</code> field in the Excel means column A — keep it so you can match rows back when re-uploading.</li>
              <li>Large exports (thousands of rows) can take a minute or two.</li>
              <li>Every download is recorded in the audit log.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}