import { performHealthCheck } from "@/core/application/monitoring/performHealthCheck";
import { createContext } from "@/lib/context";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const context = await createContext();
    const url = new URL(request.url);
    const service = url.searchParams.get("service");

    if (service) {
      // Check specific service
      const result = await performHealthCheck(context, service);

      if (result.isErr()) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 500 },
        );
      }

      const healthCheck = result.value;
      const statusCode =
        healthCheck.status === "healthy"
          ? 200
          : healthCheck.status === "degraded"
            ? 200
            : 503;

      return NextResponse.json(healthCheck, { status: statusCode });
    }
    // Check all services
    const services = ["database", "storage", "external_apis", "cache"];
    const healthChecks = await Promise.all(
      services.map(async (serviceName) => {
        const result = await performHealthCheck(context, serviceName);
        return result.isOk() ? result.value : null;
      }),
    );

    const validHealthChecks = healthChecks.filter((check) => check !== null);
    const overallStatus = validHealthChecks.every(
      (check) => check.status === "healthy",
    )
      ? "healthy"
      : validHealthChecks.some((check) => check.status === "unhealthy")
        ? "unhealthy"
        : "degraded";

    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    return NextResponse.json(
      {
        status: overallStatus,
        services: validHealthChecks,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
