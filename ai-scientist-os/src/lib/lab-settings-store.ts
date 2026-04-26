import { getDatabase } from "@/lib/db";
import type { LabSettings } from "@/lib/types";

const defaultLabSettings: LabSettings = {
  organizationName: "Fulcrum Research Lab",
  preferredSuppliers: ["Thermo Fisher", "Sigma-Aldrich", "Qiagen"],
  budgetCurrency: "USD",
  defaultTeamSize: 3,
  turnaroundDays: 21,
  complianceNotes:
    "Prefer reagents with stable lead times and flag protocols that require IACUC, IRB, or anaerobic safety review.",
};

interface LabSettingsRow {
  organization_name: string;
  preferred_suppliers_json: string;
  budget_currency: string;
  default_team_size: number;
  turnaround_days: number;
  compliance_notes: string;
}

function mapRow(row: LabSettingsRow): LabSettings {
  return {
    organizationName: row.organization_name,
    preferredSuppliers: JSON.parse(row.preferred_suppliers_json) as string[],
    budgetCurrency: row.budget_currency,
    defaultTeamSize: row.default_team_size,
    turnaroundDays: row.turnaround_days,
    complianceNotes: row.compliance_notes,
  };
}

export async function getLabSettings(): Promise<LabSettings> {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT organization_name, preferred_suppliers_json, budget_currency, default_team_size, turnaround_days, compliance_notes
       FROM lab_settings
       WHERE singleton_key = 'default'`,
    )
    .get() as LabSettingsRow | undefined;

  if (!row) {
    await saveLabSettings(defaultLabSettings);
    return defaultLabSettings;
  }

  return mapRow(row);
}

export async function saveLabSettings(settings: LabSettings): Promise<LabSettings> {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO lab_settings (
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
    ON CONFLICT(singleton_key) DO UPDATE SET
      organization_name = excluded.organization_name,
      preferred_suppliers_json = excluded.preferred_suppliers_json,
      budget_currency = excluded.budget_currency,
      default_team_size = excluded.default_team_size,
      turnaround_days = excluded.turnaround_days,
      compliance_notes = excluded.compliance_notes`,
  ).run({
    organization_name: settings.organizationName,
    preferred_suppliers_json: JSON.stringify(settings.preferredSuppliers),
    budget_currency: settings.budgetCurrency,
    default_team_size: settings.defaultTeamSize,
    turnaround_days: settings.turnaroundDays,
    compliance_notes: settings.complianceNotes,
  });

  return settings;
}
