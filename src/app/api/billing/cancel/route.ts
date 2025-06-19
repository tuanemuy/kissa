import { cancelUserSubscription } from "@/actions/billing";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cancelAtPeriodEnd = true } = body;

    // Create form data for the existing action
    const formData = new FormData();
    formData.append("cancelAtPeriodEnd", cancelAtPeriodEnd.toString());

    // This will redirect, so we need to handle it differently
    try {
      await cancelUserSubscription(formData);
      return NextResponse.json({ success: true });
    } catch (error) {
      // If it's a redirect error, that's actually success
      if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
        return NextResponse.json({ success: true });
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
