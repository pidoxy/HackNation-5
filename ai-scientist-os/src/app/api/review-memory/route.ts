import { NextResponse } from "next/server";
import { createReviewMemoryItem, listReviewMemory } from "@/lib/review-memory-store";
import type { ReviewMemoryItem } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = url.searchParams.get("domain")?.trim().toLowerCase();
  const experimentFamily = url.searchParams.get("experimentFamily")?.trim().toLowerCase();
  const memory = await listReviewMemory();

  const filtered = memory.filter((item) => {
    const domainMatches = domain ? item.domain.toLowerCase() === domain : true;
    const familyMatches = experimentFamily
      ? (item.experimentFamily ?? "").toLowerCase() === experimentFamily
      : true;

    return domainMatches && familyMatches;
  });

  return NextResponse.json({ items: filtered });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ReviewMemoryItem>;

  if (!body.domain || !body.section || !body.issue || !body.impact || !body.createdAt) {
    return NextResponse.json(
      { error: "domain, section, issue, impact, and createdAt are required." },
      { status: 400 },
    );
  }

  const item: ReviewMemoryItem = {
    domain: body.domain,
    experimentFamily: body.experimentFamily,
    taskLabel: body.taskLabel,
    systemContext: body.systemContext,
    section: body.section,
    issue: body.issue,
    impact: body.impact,
    correction: body.correction,
    importance: body.importance ?? "medium",
    tags: body.tags ?? [],
    createdAt: body.createdAt,
  };

  const items = await createReviewMemoryItem(item);
  return NextResponse.json({ items });
}
