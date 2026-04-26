import { NextResponse } from "next/server";
import { parseHypothesisPlanner } from "@/lib/planner";

export async function POST(request: Request) {
  const body = (await request.json()) as { hypothesis?: string };
  const hypothesis = body.hypothesis?.trim();

  if (!hypothesis) {
    return NextResponse.json(
      { error: "Hypothesis is required." },
      { status: 400 },
    );
  }

  return NextResponse.json(await parseHypothesisPlanner(hypothesis));
}
