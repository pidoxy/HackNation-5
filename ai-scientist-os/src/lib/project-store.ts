import { buildSectionCitations } from "@/lib/citations";
import { getDatabase } from "@/lib/db";
import type { SavedProject } from "@/lib/types";

interface ProjectRow {
  id: string;
  hypothesis: string;
  parsed_json: string;
  plan_json: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ProjectRow): SavedProject {
  const parsedPlan = JSON.parse(row.plan_json) as SavedProject["plan"];

  return {
    id: row.id,
    hypothesis: row.hypothesis,
    parsed: JSON.parse(row.parsed_json) as SavedProject["parsed"],
    plan: {
      ...parsedPlan,
      sectionCitations:
        parsedPlan.sectionCitations ?? buildSectionCitations(parsedPlan.references),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(): Promise<SavedProject[]> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, hypothesis, parsed_json, plan_json, created_at, updated_at
       FROM projects
       ORDER BY updated_at DESC
       LIMIT 50`,
    )
    .all() as ProjectRow[];

  return rows.map(mapRow);
}

export async function upsertProject(project: SavedProject): Promise<SavedProject[]> {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO projects (id, hypothesis, parsed_json, plan_json, created_at, updated_at)
     VALUES (@id, @hypothesis, @parsed_json, @plan_json, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       hypothesis = excluded.hypothesis,
       parsed_json = excluded.parsed_json,
       plan_json = excluded.plan_json,
       updated_at = excluded.updated_at`,
  ).run({
    id: project.id,
    hypothesis: project.hypothesis,
    parsed_json: JSON.stringify(project.parsed),
    plan_json: JSON.stringify(project.plan),
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });

  return listProjects();
}
