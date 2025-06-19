import { getCurrentUser } from "@/lib/auth";
import { createContext } from "@/lib/context";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await createContext();
    const body = await request.json();
    const { type, description } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Request type is required" },
        { status: 400 },
      );
    }

    const result = await context.privacyService.createPrivacyRequest({
      userId: user,
      type,
      description,
    });

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to create privacy request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await createContext();
    const result = await context.privacyService.getPrivacyRequests(user);

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to get privacy requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
