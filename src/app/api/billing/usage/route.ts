import { getCurrentUser } from "@/lib/auth";
import { createContext } from "@/lib/context";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await createContext();

    // Get current month's usage
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    // Get check-ins count
    const checkInsResult = await context.checkInRepository.list({
      pagination: { page: 1, limit: 1000 },
      filter: {
        userId: user,
      },
    });

    // Get locations count
    const locationsResult = await context.locationRepository.list({
      pagination: { page: 1, limit: 1000 },
    });

    // Mock subscription data for now
    const subscriptionResult = { isOk: () => true, value: { plan: "free" } };

    // Default limits based on plan
    let limits = {
      checkIns: 10,
      locations: 3,
      storage: 100 * 1024 * 1024, // 100MB
    };

    if (subscriptionResult.isOk() && subscriptionResult.value) {
      const subscription = subscriptionResult.value;
      switch (subscription.plan) {
        case "premium":
          limits = {
            checkIns: -1, // unlimited
            locations: 50,
            storage: 1024 * 1024 * 1024, // 1GB
          };
          break;
        case "business":
          limits = {
            checkIns: -1, // unlimited
            locations: -1, // unlimited
            storage: 10 * 1024 * 1024 * 1024, // 10GB
          };
          break;
      }
    }

    const usage = {
      checkIns: {
        current: checkInsResult.isOk() ? checkInsResult.value.items.length : 0,
        limit: limits.checkIns,
      },
      locations: {
        current: locationsResult.isOk()
          ? locationsResult.value.items.length
          : 0,
        limit: limits.locations,
      },
      storage: {
        current: 50 * 1024 * 1024, // Mock: 50MB used
        limit: limits.storage,
      },
    };

    return NextResponse.json(usage);
  } catch (error) {
    console.error("Failed to get usage data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
