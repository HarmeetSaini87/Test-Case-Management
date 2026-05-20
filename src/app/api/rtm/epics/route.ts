import { NextResponse } from "next/server";
import { EpicRepository } from "@/lib/rtm/repositories/epicRepository";
import { EpicService } from "@/lib/rtm/services/epicService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId parameter is required." }, { status: 400 });
    }

    let epics = EpicRepository.findByProject(projectId);
    
    // Exclude archived epics entirely from the API response
    epics = epics.filter(e => e.status?.toUpperCase() !== "ARCHIVED");
    return NextResponse.json({ success: true, epics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const savedEpic = EpicService.createOrUpdate(body);
    return NextResponse.json({ success: true, epic: savedEpic });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const epicId = searchParams.get("epicId");
    
    if (!epicId) {
      return NextResponse.json({ success: false, error: "epicId parameter is required." }, { status: 400 });
    }

    EpicService.archive(epicId);
    return NextResponse.json({ success: true, message: "Epic successfully archived." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
