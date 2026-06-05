import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/sp/AppShell";
import { groqStructured } from "@/lib/groq";
import { useProfile } from "@/hooks/useProfile";
import { requireAuth } from "@/lib/guards";
import { supabase } from "@/lib/supabase";
import { ingestCourseMaterial } from "@/lib/rag.server";

export const Route = createFileRoute("/upload")({
  ssr: false,
  head: () => ({ meta: [{ title: "Upload notes — StudyPal" }] }),
  beforeLoad: requireAuth,
  component: Upload,
});

const TERTIARY_FALLBACK = ["Foundations & vocabulary", "Core concepts in plain language", "Worked example: real exam question", "Common mistakes to avoid", "Quick recap & retention check"];
const SECONDARY_FALLBACK = ["Key definitions & terms", "Common JAMB/WAEC question patterns", "Past question walkthrough", "Tricky areas to watch", "Final revision checklist"];

const EXAM_PILLS = ["JAMB", "WAEC", "NECO", "POST-UTME", "GCE"];

function Upload() {
  const nav = useNavigate();
  const { profile } = useProfile();
  const structureNotes = useServerFn(groqStructured);
  const ingestMaterial = useServerFn(ingestCourseMaterial);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<"idle" | "thinking" | "ready">("idle");
  const [ingestStatus, setIngestStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [ingestMessage, setIngestMessage] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState("JAMB");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);

  const isTertiary = profile?.user_type === "tertiary";

  useEffect(() => {
    async function loadCourses() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data } = await supabase
        .from("courses")
        .select("id, name")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });

      const nextCourses = (data ?? []) as Array<{ id: string; name: string }>;
      setCourses(nextCourses);
      if (nextCourses.length && !selectedCourseId) {
        setSelectedCourseId(nextCourses[0].id);
      }
    }
    void loadCourses();
  }, [selectedCourseId]);

  async function structure() {
    setStatus("thinking");
    const fallback = isTertiary ? TERTIARY_FALLBACK : SECONDARY_FALLBACK;
    const examContext = isTertiary ? "" : `This is for ${selectedExam} exam preparation.`;
    try {
      const r = await structureNotes({
        data: {
          prompt: `Structure these notes into 5–7 ordered lesson topics. ${examContext} Subject: ${subject}. Notes: ${notes.slice(0, 4000)}`,
          schemaHint: isTertiary
            ? "Return { topics: string[] } — academic, conceptual topics suitable for university level"
            : "Return { topics: string[] } — exam-focused revision topics, each likely to appear in JAMB or WAEC",
        },
      });
      setTopics(Array.isArray((r as any).topics) ? (r as any).topics : fallback);
    } catch {
      setTopics(fallback);
    }
    setTimeout(() => setStatus("ready"), 800);
  }

  async function saveMaterialForRag() {
    if (!selectedCourseId) {
      setIngestStatus("error");
      setIngestMessage("Select a course first.");
      return;
    }

    let materialText = notes;
    if (!materialText.trim() && file) {
      materialText = await file.text();
    }

    if (!materialText.trim()) {
      setIngestStatus("error");
      setIngestMessage("Add text or a readable file first.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setIngestStatus("error");
      setIngestMessage("Please sign in again.");
      return;
    }

    setIngestStatus("saving");
    setIngestMessage("");

    const res = await ingestMaterial({
      data: {
        accessToken: token,
        courseId: selectedCourseId,
        title: (file?.name || subject || "Uploaded material").slice(0, 120),
        text: materialText,
        sourceType: file?.type?.includes("pdf") ? "pdf" : notes.trim() ? "notes" : "text",
      },
    });

    if ((res as any).ok) {
      setIngestStatus("done");
      setIngestMessage(`Material ingested (${(res as any).chunkCount} chunks).`);
      return;
    }

    setIngestStatus("error");
    setIngestMessage((res as any).reason ?? "Material ingestion failed.");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
        <div>
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            {isTertiary ? "NEW LESSON" : "EXAM MATERIAL"}
          </div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl">
            {isTertiary
              ? "Drop in your notes. We'll do the structuring."
              : "Drop in your past questions. We'll build your revision plan."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isTertiary
              ? "Upload lecture notes, textbook chapters, or past exam papers. AI organizes them into lessons."
              : "Upload JAMB/WAEC past questions, your syllabus, or handwritten notes. AI identifies exam patterns."}
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files?.[0] ?? null); }}
          className={`rounded-3xl border-2 border-dashed bg-card p-10 text-center transition ${drag ? "border-accent bg-accent/5" : "border-border"}`}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" />
            </svg>
          </div>
          <div className="mt-4 font-display text-xl">{file ? file.name : "Drag a PDF here"}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTertiary ? "or paste your lecture notes below" : "or paste your past questions below"}
          </p>
          <label className="btn-press mt-5 inline-flex cursor-pointer rounded-full border border-border bg-background px-4 py-2 text-sm">
            Choose a file
            <input type="file" accept=".pdf,.txt,.md,.docx" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            {!courses.length && (
              <p className="mt-2 text-xs text-muted-foreground">
                No courses yet. Create one first in Course Library.
              </p>
            )}
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {isTertiary ? "Course / Subject" : "Subject"}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isTertiary ? "e.g. Organic Chemistry, Business Law" : "e.g. Biology, Mathematics, Literature"}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {/* Exam type selector for secondary students */}
          {!isTertiary && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Which exam is this for?
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAM_PILLS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setSelectedExam(e)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${selectedExam === e ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder={isTertiary ? "Paste raw lecture notes here..." : "Paste past questions or revision notes here..."}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            onClick={structure}
            disabled={!subject || (!notes && !file) || status === "thinking"}
            className="btn-press w-full rounded-xl bg-accent py-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {status === "thinking" ? "Structuring..." : isTertiary ? "Structure My Notes →" : "Build My Revision Plan →"}
          </button>
          <button
            onClick={saveMaterialForRag}
            disabled={!selectedCourseId || (!notes && !file) || ingestStatus === "saving"}
            className="btn-press w-full rounded-xl border border-border py-3 text-sm font-medium disabled:opacity-50"
          >
            {ingestStatus === "saving" ? "Saving to RAG..." : "Save material to course memory"}
          </button>
          {ingestMessage && (
            <p className={`text-sm ${ingestStatus === "error" ? "text-red-500" : "text-muted-foreground"}`}>
              {ingestMessage}
            </p>
          )}
        </div>

        <AnimatePresence>
          {status === "thinking" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-3xl border border-border bg-card p-8 text-center">
              <div className="mx-auto h-3 w-3 animate-ping rounded-full bg-accent" />
              <div className="mt-4 font-display text-lg">
                {isTertiary ? "AI is organizing your content..." : "AI is identifying exam patterns..."}
              </div>
              <div className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Groq · Aethex · streaming
              </div>
            </motion.div>
          )}

          {status === "ready" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border bg-card p-6">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {isTertiary ? "Lesson plan preview" : "Revision plan preview"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isTertiary
                  ? `${topics.length} topics found. Ready to generate your study plan.`
                  : `${topics.length} exam areas identified. High-frequency topics flagged.`}
              </p>
              <ol className="mt-4 divide-y divide-border">
                {topics.map((t, i) => (
                  <li key={i} className="flex items-center gap-4 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs">
                      0{i + 1}
                    </span>
                    <span className="text-sm">{t}</span>
                    {!isTertiary && i < 2 && (
                      <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent">
                        🎯 High freq
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <button
                onClick={() => nav({ to: "/dashboard" })}
                className="btn-press mt-6 w-full rounded-xl bg-accent py-3 text-sm font-medium text-accent-foreground"
              >
                {isTertiary ? "Generate My Study Plan →" : "Generate My Revision Plan →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}