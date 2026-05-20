import { NextResponse } from "next/server";
import { StoryRepository } from "@/lib/rtm/repositories/storyRepository";
import { StoryService } from "@/lib/rtm/services/storyService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const epicId = searchParams.get("epicId");
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId parameter is required." }, { status: 400 });
    }

    let stories = StoryRepository.findByProject(projectId);
    
    // Exclude archived stories entirely from the API response
    stories = stories.filter(s => s.status?.toUpperCase() !== "ARCHIVED");
    
    // Optional filtering by epicId
    if (epicId) {
      stories = stories.filter(s => s.epicId === epicId);
    }
    
    return NextResponse.json({ success: true, stories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const savedStory = StoryService.createOrUpdate(body);
    return NextResponse.json({ success: true, story: savedStory });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");
    
    if (!storyId) {
      return NextResponse.json({ success: false, error: "storyId parameter is required." }, { status: 400 });
    }

    StoryService.archive(storyId);
    return NextResponse.json({ success: true, message: "User Story successfully archived." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
