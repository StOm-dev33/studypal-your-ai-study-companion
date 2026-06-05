import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/sp/AppShell";
import { requireAuth } from "@/lib/guards";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  created_at: string;
};

export const Route = createFileRoute("/courses")({
  ssr: false,
  head: () => ({ meta: [{ title: "Courses — StudyPal" }] }),
  beforeLoad: requireAuth,
  component: CoursesPage,
});

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  async function loadCourses() {
    setLoading(true);
    setError(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setCourses([]);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("courses")
      .select("id, name, code, description, created_at")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Could not load courses yet.");
      setCourses([]);
    } else {
      setCourses((data ?? []) as Course[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  async function createCourse() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("Please sign in again to create a course.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("courses").insert({
      user_id: authData.user.id,
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
    });

    if (insertError) {
      setError(insertError.message || "Failed to create course.");
      setSaving(false);
      return;
    }

    setName("");
    setCode("");
    setDescription("");
    setSaving(false);
    await loadCourses();
  }

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((course) =>
      [course.name, course.code ?? "", course.description ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [courses, search]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
        <section className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">COURSES</p>
          <h1 className="font-display text-3xl md:text-4xl">Course Library</h1>
          <p className="text-sm text-muted-foreground">
            Create, organize, and search your course containers for materials, lessons, quizzes, notes, and progress.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-xl">Create course</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Course name *"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 sm:col-span-2"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Course code (optional)"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            type="button"
            onClick={createCourse}
            disabled={!name.trim() || saving}
            className="btn-press w-full rounded-xl bg-accent py-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create course"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display text-xl">Your courses</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No courses found yet. Create your first course above.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <article key={course.id} className="space-y-4 rounded-2xl border border-border bg-card p-5">
                  <div className="space-y-1">
                    <h3 className="font-display text-xl">{course.name}</h3>
                    {course.code && (
                      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{course.code}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{course.description || "No description yet."}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["materials", "lessons", "quizzes", "notes", "progress"].map((item) => (
                      <div key={item} className="rounded-lg border border-border bg-background px-2 py-2">
                        <span className="font-mono uppercase tracking-widest text-muted-foreground">{item}</span>
                        <div className="mt-1 font-display text-lg">0</div>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/upload"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-medium hover:border-accent"
                  >
                    Add material
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
