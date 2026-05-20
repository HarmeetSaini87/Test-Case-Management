import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "dataHub", "projects.json");

function readProjects() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify([]), "utf-8");
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function writeProjects(data: any[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, projects: readProjects() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projects = readProjects();
    const existing = projects.find((p: any) => p.key === body.key);
    if (existing) return NextResponse.json({ success: false, error: "Project key already exists" }, { status: 400 });

    const project = {
      id: `proj_${Date.now()}`,
      name: body.name,
      key: body.key?.toUpperCase(),
      description: body.description || "",
      modules: body.modules || [],
      versions: body.versions || [],
      members: body.members || [],
      createdAt: new Date().toISOString(),
    };
    projects.push(project);
    writeProjects(projects);
    return NextResponse.json({ success: true, project });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const projects = readProjects();
    const idx = projects.findIndex((p: any) => p.id === body.id);
    if (idx === -1) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    projects[idx] = { ...projects[idx], ...body };
    writeProjects(projects);
    return NextResponse.json({ success: true, project: projects[idx] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const projects = readProjects();
    writeProjects(projects.filter((p: any) => p.id !== id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
