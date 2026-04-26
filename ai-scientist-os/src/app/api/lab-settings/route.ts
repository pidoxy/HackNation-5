import { NextResponse } from "next/server";
import { getLabSettings, saveLabSettings } from "@/lib/lab-settings-store";
import type { LabSettings } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ settings: await getLabSettings() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<LabSettings>;

  if (
    !body.organizationName ||
    !body.preferredSuppliers ||
    !body.budgetCurrency ||
    typeof body.defaultTeamSize !== "number" ||
    typeof body.turnaroundDays !== "number" ||
    !body.complianceNotes
  ) {
    return NextResponse.json(
      {
        error:
          "organizationName, preferredSuppliers, budgetCurrency, defaultTeamSize, turnaroundDays, and complianceNotes are required.",
      },
      { status: 400 },
    );
  }

  const settings: LabSettings = {
    organizationName: body.organizationName,
    preferredSuppliers: body.preferredSuppliers,
    budgetCurrency: body.budgetCurrency,
    defaultTeamSize: body.defaultTeamSize,
    turnaroundDays: body.turnaroundDays,
    complianceNotes: body.complianceNotes,
  };

  return NextResponse.json({ settings: await saveLabSettings(settings) });
}
