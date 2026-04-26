import { NextResponse } from "next/server";
import { createReviewMemoryItem, listReviewMemory } from "@/lib/review-memory-store";
import type { ReviewMemoryItem } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = url.searchParams.get("domain")?.trim().toLowerCase();
  const memory = await listReviewMemory();

  const filtered = domain
    ? memory.filter((item) => item.domain.toLowerCase() === domain)
    : memory;

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
    section: body.section,
    issue: body.issue,
    impact: body.impact,
    createdAt: body.createdAt,
  };

  const items = await createReviewMemoryItem(item);
  return NextResponse.json({ items });
}
