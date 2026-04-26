import { getDatabase } from "@/lib/db";
import type { ExperimentFamily, ReviewMemoryItem } from "@/lib/types";

interface ReviewMemoryRow {
  domain: string;
  experiment_family: string | null;
  task_label: string | null;
  system_context: string | null;
  section: string;
  issue: string;
  impact: string;
  correction: string | null;
  importance: "low" | "medium" | "high" | null;
  tags_json: string | null;
  created_at: string;
}

function mapRow(row: ReviewMemoryRow): ReviewMemoryItem {
  return {
    domain: row.domain,
    experimentFamily: (row.experiment_family as ExperimentFamily | null) ?? undefined,
    taskLabel: row.task_label ?? undefined,
    systemContext: row.system_context ?? undefined,
    section: row.section,
    issue: row.issue,
    impact: row.impact,
    correction: row.correction ?? undefined,
    importance: row.importance ?? "medium",
    tags: row.tags_json ? ((JSON.parse(row.tags_json) as string[]) ?? []) : [],
    createdAt: row.created_at,
  };
}

export async function listReviewMemory(): Promise<ReviewMemoryItem[]> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT domain, experiment_family, task_label, system_context, section, issue, impact, correction, importance, tags_json, created_at
       FROM review_memory
       ORDER BY created_at DESC
       LIMIT 200`,
    )
    .all() as ReviewMemoryRow[];

  return rows.map(mapRow);
}

export async function createReviewMemoryItem(
  item: ReviewMemoryItem,
): Promise<ReviewMemoryItem[]> {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO review_memory (
      domain,
      experiment_family,
      task_label,
      system_context,
      section,
      issue,
      impact,
      correction,
      importance,
      tags_json,
      created_at
    )
     VALUES (
      @domain,
      @experimentFamily,
      @taskLabel,
      @systemContext,
      @section,
      @issue,
      @impact,
      @correction,
      @importance,
      @tagsJson,
      @createdAt
    )`,
  ).run({
    ...item,
    experimentFamily: item.experimentFamily ?? null,
    taskLabel: item.taskLabel ?? null,
    systemContext: item.systemContext ?? null,
    correction: item.correction ?? null,
    importance: item.importance ?? "medium",
    tagsJson: JSON.stringify(item.tags ?? []),
  });

  return listReviewMemory();
}
