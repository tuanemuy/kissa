import { changeUserSubscription } from "@/actions/billing";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 },
      );
    }

    // Create form data for the existing action
    const formData = new FormData();
    formData.append("newPlan", planId);

    // This will redirect, so we need to handle it differently
    try {
      await changeUserSubscription(formData);
      return NextResponse.json({ success: true });
    } catch (error) {
      // If it's a redirect error, that's actually success
      if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
        return NextResponse.json({ success: true });
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to change subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to change subscription plan" },
      { status: 500 },
    );
  }
}
