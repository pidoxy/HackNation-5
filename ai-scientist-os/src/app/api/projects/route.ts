import { NextResponse } from "next/server";
import { listProjects, upsertProject } from "@/lib/project-store";
import type { SavedProject } from "@/lib/types";

export async function GET() {
  const items = await listProjects();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SavedProject>;

  if (
    !body.id ||
    !body.hypothesis ||
    !body.parsed ||
    !body.plan ||
    !body.createdAt ||
    !body.updatedAt
  ) {
    return NextResponse.json(
      { error: "id, hypothesis, parsed, plan, createdAt, and updatedAt are required." },
      { status: 400 },
    );
  }

  const project: SavedProject = {
    id: body.id,
    hypothesis: body.hypothesis,
    parsed: body.parsed,
    plan: body.plan,
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
  };

  const items = await upsertProject(project);
  return NextResponse.json({ items });
}
