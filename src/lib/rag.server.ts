import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { getServerConfig } from "./config.server";
import { chunkMaterialText, cleanMaterialText } from "./rag/ingestion";

type IngestInput = {
  accessToken: string;
  courseId: string;
  title: string;
  text: string;
  sourceType?: "pdf" | "notes" | "text" | "unknown";
};

// Limit processing size to avoid very long ingest requests causing timeouts or heavy DB writes.
const MAX_INGEST_TEXT_CHARS = 200_000;
const CHUNK_INSERT_BATCH_SIZE = 100;

export const ingestCourseMaterial = createServerFn()
  .inputValidator((data: IngestInput) => data)
  .handler(async ({ data }) => {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getServerConfig();

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return {
        ok: false,
        reason: "Supabase server configuration is incomplete.",
      };
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: authData, error: authError } = await authClient.auth.getUser(data.accessToken);
    if (authError || !authData.user) {
      return { ok: false, reason: "Unable to validate user session." };
    }

    const userId = authData.user.id;
    // Cap ingest size to keep chunk generation and DB writes bounded for server latency
    // while still allowing large lecture uploads in a single request.
    const normalizedText = cleanMaterialText(data.text);
    const truncated = normalizedText.length > MAX_INGEST_TEXT_CHARS;
    const cleanedText = normalizedText.slice(0, MAX_INGEST_TEXT_CHARS);
    const chunks = chunkMaterialText(cleanedText);

    if (!chunks.length) {
      return { ok: false, reason: "No ingestible text found in the material." };
    }

    const { data: course, error: courseError } = await adminClient
      .from("courses")
      .select("id")
      .eq("id", data.courseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (courseError || !course) {
      return { ok: false, reason: "Course not found for current user." };
    }

    const { data: material, error: materialError } = await adminClient
      .from("course_materials")
      .insert({
        course_id: data.courseId,
        user_id: userId,
        title: data.title.trim() || "Untitled material",
        source_type: data.sourceType ?? "unknown",
        raw_text: cleanedText,
      })
      .select("id")
      .single();

    if (materialError || !material) {
      return { ok: false, reason: "Failed to store material." };
    }

    const rows = chunks.map((chunkText, index) => ({
      course_id: data.courseId,
      material_id: material.id,
      user_id: userId,
      chunk_index: index,
      chunk_text: chunkText,
      metadata: { source_type: data.sourceType ?? "unknown" },
    }));

    // Insert in smaller batches to keep payload size stable for Supabase inserts.
    for (let i = 0; i < rows.length; i += CHUNK_INSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + CHUNK_INSERT_BATCH_SIZE);
      const { error } = await adminClient.from("course_material_chunks").insert(batch);
      if (error) {
        return { ok: false, reason: "Failed to store one or more chunks." };
      }
    }

    return {
      ok: true,
      materialId: material.id,
      chunkCount: rows.length,
      truncated,
    };
  });
