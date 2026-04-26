import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { LabSettings, ReviewMemoryItem, SavedProject } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const databaseFilename = process.env.APP_DB_FILENAME ?? "ai-scientist-os.db";
const databasePath = path.join(dataDirectory, databaseFilename);
const legacyReviewMemoryPath = path.join(dataDirectory, "review-memory.json");
const legacyProjectsPath = path.join(dataDirectory, "projects.json");
const legacyLabSettingsPath = path.join(dataDirectory, "lab-settings.json");

let database: Database | null = null;

function ensureDataDirectory() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function migrateLegacyJson(db: Database) {
  const reviewCount = db
    .prepare("SELECT COUNT(*) as count FROM review_memory")
    .get() as { count: number };
  const projectCount = db
    .prepare("SELECT COUNT(*) as count FROM projects")
    .get() as { count: number };

  if (reviewCount.count === 0 && fs.existsSync(legacyReviewMemoryPath)) {
    try {
      const items = JSON.parse(
        fs.readFileSync(legacyReviewMemoryPath, "utf8"),
      ) as ReviewMemoryItem[];

      const insert = db.prepare(`
        INSERT INTO review_memory (
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
        )
      `);

      const transaction = db.transaction((rows: ReviewMemoryItem[]) => {
        for (const row of rows) {
          insert.run({
            ...row,
            experimentFamily: row.experimentFamily ?? null,
            taskLabel: row.taskLabel ?? null,
            systemContext: row.systemContext ?? null,
            correction: row.correction ?? null,
            importance: row.importance ?? "medium",
            tagsJson: JSON.stringify(row.tags ?? []),
          });
        }
      });

      transaction(items);
    } catch {
      // Ignore malformed legacy data and proceed with an empty database.
    }
  }

  if (projectCount.count === 0 && fs.existsSync(legacyProjectsPath)) {
    try {
      const items = JSON.parse(
        fs.readFileSync(legacyProjectsPath, "utf8"),
      ) as SavedProject[];

      const insert = db.prepare(`
        INSERT INTO projects (id, hypothesis, parsed_json, plan_json, created_at, updated_at)
        VALUES (@id, @hypothesis, @parsed_json, @plan_json, @created_at, @updated_at)
      `);

      const transaction = db.transaction((rows: SavedProject[]) => {
        for (const row of rows) {
          insert.run({
            id: row.id,
            hypothesis: row.hypothesis,
            parsed_json: JSON.stringify(row.parsed),
            plan_json: JSON.stringify(row.plan),
            created_at: row.createdAt,
            updated_at: row.updatedAt,
          });
        }
      });

      transaction(items);
    } catch {
      // Ignore malformed legacy data and proceed with an empty database.
    }
  }

  const settingsCount = db
    .prepare("SELECT COUNT(*) as count FROM lab_settings")
    .get() as { count: number };

  if (settingsCount.count === 0 && fs.existsSync(legacyLabSettingsPath)) {
    try {
      const settings = JSON.parse(
        fs.readFileSync(legacyLabSettingsPath, "utf8"),
      ) as LabSettings;

      db.prepare(`
        INSERT INTO lab_settings (
          singleton_key,
          organization_name,
          preferred_suppliers_json,
          budget_currency,
          default_team_size,
          turnaround_days,
          compliance_notes
        ) VALUES (
          'default',
          @organization_name,
          @preferred_suppliers_json,
          @budget_currency,
          @default_team_size,
          @turnaround_days,
          @compliance_notes
        )
      `).run({
        organization_name: settings.organizationName,
        preferred_suppliers_json: JSON.stringify(settings.preferredSuppliers),
        budget_currency: settings.budgetCurrency,
        default_team_size: settings.defaultTeamSize,
        turnaround_days: settings.turnaroundDays,
        compliance_notes: settings.complianceNotes,
      });
    } catch {
      // Ignore malformed legacy data and proceed with defaults.
    }
  }
}

export function getDatabase() {
  if (database) {
    return database;
  }

  ensureDataDirectory();

  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  database.exec(`
    CREATE TABLE IF NOT EXISTS review_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      experiment_family TEXT,
      task_label TEXT,
      system_context TEXT,
      section TEXT NOT NULL,
      issue TEXT NOT NULL,
      impact TEXT NOT NULL,
      correction TEXT,
      importance TEXT,
      tags_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_review_memory_domain
    ON review_memory(domain, created_at DESC);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      hypothesis TEXT NOT NULL,
      parsed_json TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_updated_at
    ON projects(updated_at DESC);

    CREATE TABLE IF NOT EXISTS lab_settings (
      singleton_key TEXT PRIMARY KEY,
      organization_name TEXT NOT NULL,
      preferred_suppliers_json TEXT NOT NULL,
      budget_currency TEXT NOT NULL,
      default_team_size INTEGER NOT NULL,
      turnaround_days INTEGER NOT NULL,
      compliance_notes TEXT NOT NULL
    );
  `);

  const reviewMemoryColumns = [
    ["experiment_family", "TEXT"],
    ["task_label", "TEXT"],
    ["system_context", "TEXT"],
    ["correction", "TEXT"],
    ["importance", "TEXT"],
    ["tags_json", "TEXT"],
  ] as const;

  for (const [column, type] of reviewMemoryColumns) {
    try {
      database.exec(`ALTER TABLE review_memory ADD COLUMN ${column} ${type};`);
    } catch {
      // Column already exists in upgraded local databases.
    }
  }

  migrateLegacyJson(database);

  return database;
}
