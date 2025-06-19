import { sendPushNotificationAction } from "@/actions/notifications";
import { getCurrentUser } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, body: messageBody, channels } = body;

    const result = await sendPushNotificationAction({
      userId: user,
      title: title || "Test Notification",
      body: messageBody || "This is a test notification from Kissa.",
      channels: channels || ["web"],
      priority: "normal",
    });

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to send test notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
