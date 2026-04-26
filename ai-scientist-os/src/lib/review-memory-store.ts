import { getDatabase } from "@/lib/db";
import type { ReviewMemoryItem } from "@/lib/types";

interface ReviewMemoryRow {
  domain: string;
  section: string;
  issue: string;
  impact: string;
  created_at: string;
}

function mapRow(row: ReviewMemoryRow): ReviewMemoryItem {
  return {
    domain: row.domain,
    section: row.section,
    issue: row.issue,
    impact: row.impact,
    createdAt: row.created_at,
  };
}

export async function listReviewMemory(): Promise<ReviewMemoryItem[]> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT domain, section, issue, impact, created_at
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
    `INSERT INTO review_memory (domain, section, issue, impact, created_at)
     VALUES (@domain, @section, @issue, @impact, @createdAt)`,
  ).run(item);

  return listReviewMemory();
}
