import { NextResponse } from "next/server";
import { exportPlanAsMarkdown } from "@/lib/exporters";
import type { ExportPlanRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ExportPlanRequest>;

  if (!body.hypothesis || !body.parsed || !body.plan) {
    return NextResponse.json(
      { error: "hypothesis, parsed, and plan are required." },
      { status: 400 },
    );
  }

  const markdown = exportPlanAsMarkdown({
    hypothesis: body.hypothesis,
    parsed: body.parsed,
    plan: body.plan,
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${body.plan.experimentId}.md"`,
    },
  });
}
