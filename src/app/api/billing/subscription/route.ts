import { getUserSubscriptionStatus } from "@/actions/billing";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getUserSubscriptionStatus();
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Failed to get subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
