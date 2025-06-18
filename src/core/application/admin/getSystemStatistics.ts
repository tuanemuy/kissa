import { ApplicationError } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export interface SystemStatistics {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: {
      visitors: number;
      editors: number;
      admins: number;
    };
    bySubscription: {
      free: number;
      basic: number;
      premium: number;
    };
  };
  content: {
    regions: number;
    locations: number;
    checkIns: number;
    favorites: number;
  };
  moderation: {
    totalReports: number;
    pendingReports: number;
    approvedReports: number;
    rejectedReports: number;
  };
  billing: {
    totalRevenue: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
  };
}

export async function getSystemStatistics(
  context: Context,
): Promise<Result<SystemStatistics, ApplicationError>> {
  try {
    // Get user statistics
    const usersResult = await context.userRepository.list({
      pagination: { page: 1, limit: 10000 }, // Get all users for stats
    });

    if (usersResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to get user statistics",
          usersResult.error,
        ),
      );
    }

    const users = usersResult.value.items;
    const userStats = {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      byRole: {
        visitors: users.filter((u) => u.role === "visitor").length,
        editors: users.filter((u) => u.role === "editor").length,
        admins: users.filter((u) => u.role === "admin").length,
      },
      bySubscription: {
        free: users.filter((u) => u.subscription === "free").length,
        basic: users.filter((u) => u.subscription === "basic").length,
        premium: users.filter((u) => u.subscription === "premium").length,
      },
    };

    // Get content statistics
    const regionsResult = await context.regionRepository.list({
      pagination: { page: 1, limit: 10000 },
    });

    const locationsResult = await context.locationRepository.list({
      pagination: { page: 1, limit: 10000 },
    });

    const checkInsResult = await context.checkInRepository.list({
      pagination: { page: 1, limit: 10000 },
    });

    if (
      regionsResult.isErr() ||
      locationsResult.isErr() ||
      checkInsResult.isErr()
    ) {
      return err(new ApplicationError("Failed to get content statistics"));
    }

    // Calculate favorites count by summing individual user favorites
    let totalFavorites = 0;
    for (const user of users) {
      const favCountResult =
        await context.favoriteRepository.countFavoritesByUser(user.id);
      if (favCountResult.isOk()) {
        totalFavorites += favCountResult.value;
      }
    }

    const contentStats = {
      regions: regionsResult.value.count,
      locations: locationsResult.value.count,
      checkIns: checkInsResult.value.count,
      favorites: totalFavorites,
    };

    // Get moderation statistics
    const moderationResult = await context.moderationRepository.list({
      pagination: { page: 1, limit: 10000 },
    });

    if (moderationResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to get moderation statistics",
          moderationResult.error,
        ),
      );
    }

    const moderationItems = moderationResult.value.items;
    const moderationStats = {
      totalReports: moderationItems.length,
      pendingReports: moderationItems.filter((m) => m.status === "pending")
        .length,
      approvedReports: moderationItems.filter((m) => m.status === "approved")
        .length,
      rejectedReports: moderationItems.filter((m) => m.status === "rejected")
        .length,
    };

    // Get billing statistics
    const billingResult = await context.billingRepository.list({
      pagination: { page: 1, limit: 10000 },
    });

    if (billingResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to get billing statistics",
          billingResult.error,
        ),
      );
    }

    const billingItems = billingResult.value.items;
    const totalRevenue = billingItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = billingItems
      .filter((item) => {
        const itemDate = new Date(item.createdAt);
        return (
          itemDate.getMonth() === currentMonth &&
          itemDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    const billingStats = {
      totalRevenue,
      activeSubscriptions: users.filter((u) => u.subscription !== "free")
        .length,
      monthlyRevenue,
    };

    const statistics: SystemStatistics = {
      users: userStats,
      content: contentStats,
      moderation: moderationStats,
      billing: billingStats,
    };

    return ok(statistics);
  } catch (error) {
    return err(
      new ApplicationError("Failed to generate system statistics", error),
    );
  }
}
