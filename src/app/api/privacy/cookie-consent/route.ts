import { createContext } from "@/lib/context";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const context = await createContext();
    const body = await request.json();

    const {
      sessionId,
      necessary,
      analytics,
      marketing,
      personalization,
      ipAddress,
      userAgent,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const result = await context.privacyService.updateCookieConsent({
      sessionId,
      necessary: necessary ?? true,
      analytics: analytics ?? false,
      marketing: marketing ?? false,
      personalization: personalization ?? false,
      ipAddress,
      userAgent,
    });

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to update cookie consent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await createContext();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const result = await context.privacyService.getCookieConsent(sessionId);

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to get cookie consent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
