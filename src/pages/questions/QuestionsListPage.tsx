import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, ChevronRight, ImageIcon, AlertCircle, CheckCircle2, FileText, ListChecks, XCircle } from "lucide-react";
import { apiGet } from "../../lib/api";

type Question = {
  id: string;
  exam: string;
  subject: string;
  chapter: string;
  year: number;
  difficulty: number;
  status: "active" | "on_hold" | "draft" | "under_review" | "rejected" | "archived" | "deleted";
  hasImage: boolean;
  hasSolution: boolean;
  correctOption: number;
  optionCount: number;
  clusterId?: number;
  textExcerpt: string;
  updatedAt: string;
  issues: string[];
};

type ExamOpt = { id: string; name: string; slug: string };
type SubjectOpt = { id: string; name: string; examId: string; slug: string };
type ChapterOpt = { id: string; name: string; subjectId: string; slug?: string };

const STATUS_BADGE: Record<string, string> = {
  active:        "badge-ok",
  on_hold:       "badge-warn",
  draft:         "badge-muted",
  under_review:  "badge-info",
  rejected:      "badge-bad",
  archived:      "badge-muted",
  deleted:       "badge-bad",
};

export default function QuestionsListPage() {
  const [q, setQ] = useState("");
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Question[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamOpt[]>([]);
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [chapters, setChapters] = useState<ChapterOpt[]>([]);
  const [chapter, setChapter] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);

  // Load the exam + subject + chapter lists from the public catalog
  // endpoints. These IDs are what the database actually stores, so
  // the filter needs to send them through (not the human-readable name).
  useEffect(() => {
    Promise.all([
      apiGet<ExamOpt[]>("/api/exams"),
      apiGet<SubjectOpt[]>("/api/subjects"),
      apiGet<ChapterOpt[]>("/api/chapters"),
    ]).then(([es, ss, cs]) => { setExams(es); setSubjects(ss); setChapters(cs); })
      .catch(() => { /* keep dropdowns empty */ });
  }, []);

  const load = async () => {
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q)       params.set("q", q);
      if (exam)    params.set("exam", exam);
      if (subject) params.set("subject", subject);
      if (chapter) params.set("chapter", chapter);
      if (issuesOnly) params.set("issuesOnly", "true");
      params.set("page", String(page));
      params.set("size", "50");
      const r = await apiGet<{ items: Question[]; total: number }>(
        `/api/admin/questions?${params.toString()}`
      );
      setRows(r.items);
      setTotal(r.total);
    } catch (e: any) {
      setErr(e?.message || "Failed to load questions");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, exam, subject, chapter, issuesOnly]);

  // When exam changes, reset subject + chapter (both are exam-scoped).
  useEffect(() => { setSubject(""); setChapter(""); }, [exam]);
  // When subject changes, reset chapter (chapter is subject-scoped).
  useEffect(() => { setChapter(""); }, [subject]);

  const subjectsForExam = exam ? subjects.filter(s => s.examId === exam) : subjects;
  const chaptersForSubject = subject
    ? chapters.filter(c => c.subjectId === subject)
    : (exam
        ? chapters.filter(c => subjectsForExam.some(s => s.id === c.subjectId))
        : chapters);

  return (
    <div className="p-6 space-y-4 max-w-[1500px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold">Question Bank</h1>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mt-0.5">
            {total.toLocaleString()} questions · {rows?.filter(r => r.issues.length > 0).length ?? 0} with issues
          </p>
        </div>
        <Link to="/questions/new" className="btn-primary">+ New question</Link>
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(); } }}
            className="input pl-9"
            placeholder="Search question text, ID, or concept…"
          />
        </div>
        <select value={exam} onChange={e => { setExam(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All exams</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={subject} onChange={e => { setSubject(e.target.value); setPage(1); }} className="input w-auto" disabled={subjectsForExam.length === 0}>
          <option value="">{exam ? "All subjects for this exam" : "All subjects"}</option>
          {subjectsForExam.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={chapter}
          onChange={e => { setChapter(e.target.value); setPage(1); }}
          className="input w-auto max-w-[260px]"
          disabled={chaptersForSubject.length === 0}
          title={chaptersForSubject.length === 0 ? "Select a subject first" : "Filter by chapter"}
        >
          <option value="">
            {!subject
              ? (exam ? "All chapters for this exam" : "All chapters")
              : "All chapters for this subject"}
          </option>
          {chaptersForSubject.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] px-2 cursor-pointer">
          <input type="checkbox" checked={issuesOnly} onChange={e => { setIssuesOnly(e.target.checked); setPage(1); }} className="accent-bad-500" />
          Issues only
        </label>
        <button type="button" onClick={() => { setPage(1); load(); }} className="btn-primary">
          <Filter className="h-3.5 w-3.5" /> Search
        </button>
      </div>

      {err && <div className="rounded-lg border border-bad-500/40 bg-bad-500/10 px-3 py-2 text-[12.5px] text-bad-600">{err}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Question</th>
                <th className="table-th">Exam / Subject</th>
                <th className="table-th">Chapter / Year</th>
                <th className="table-th">Difficulty</th>
                <th className="table-th">Status</th>
                <th className="table-th">Checks</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody>
              {rows === null && Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="table-td"><div className="h-3 w-20 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-td text-center text-ink-400 py-12">No questions match the filters.</td>
                </tr>
              )}
              {rows && rows.map(q => (
                <tr key={q.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                  <td className="table-td font-mono text-[11px] text-ink-500 dark:text-ink-400">{q.id}</td>
                  <td className="table-td max-w-md">
                    <div className="line-clamp-2 text-[12.5px]">{q.textExcerpt}</div>
                  </td>
                  <td className="table-td">
                    <div className="text-[11.5px]">{q.exam}</div>
                    <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{q.subject}</div>
                  </td>
                  <td className="table-td">
                    <div className="text-[12px] truncate max-w-[200px]">{q.chapter}</div>
                    <div className="text-[10.5px] text-ink-500 dark:text-ink-400">{q.year}</div>
                  </td>
                  <td className="table-td font-mono">{q.difficulty.toFixed(1)}</td>
                  <td className="table-td">
                    <span className={STATUS_BADGE[q.status] ?? "badge-muted"}>{q.status.replace("_", " ")}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1 text-[10.5px]">
                      {q.hasImage
                        ? <ImageIcon className="h-3 w-3 text-ok-500" />
                        : <span className="text-ink-300">—</span>}
                      {q.hasSolution
                        ? <CheckCircle2 className="h-3 w-3 text-ok-500" />
                        : <XCircle className="h-3 w-3 text-warn-500" />}
                      {q.optionCount === 4
                        ? <ListChecks className="h-3 w-3 text-ok-500" />
                        : <AlertCircle className="h-3 w-3 text-bad-500" />}
                      {q.issues.length > 0 && <span className="badge-bad text-[9.5px]">{q.issues.length}</span>}
                    </div>
                  </td>
                  <td className="table-td text-right">
                    <Link to={`/questions/${q.id}`} className="text-ink-400 hover:text-admin-600">
                      <ChevronRight className="h-4 w-4 inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
