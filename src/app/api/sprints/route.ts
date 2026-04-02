import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "dataHub", "sprints.json");

function read() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, "[]", "utf-8");
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}
function write(d: any[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(d, null, 2), "utf-8");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const sprints = read().filter((s: any) => !project || s.project === project);
  return NextResponse.json({ success: true, sprints });
}

export async function POST(req: Request) {
  const body = await req.json();
  const sprints = read();
  if (body.id) {
    const idx = sprints.findIndex((s: any) => s.id === body.id);
    if (idx !== -1) { sprints[idx] = { ...sprints[idx], ...body }; write(sprints); return NextResponse.json({ success: true, sprint: sprints[idx] }); }
  }
  const sprint = { id: `spr_${Date.now()}`, ...body, createdAt: new Date().toISOString() };
  sprints.push(sprint);
  write(sprints);
  return NextResponse.json({ success: true, sprint });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  write(read().filter((s: any) => s.id !== id));
  return NextResponse.json({ success: true });
}
