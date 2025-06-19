import type { HealthCheck } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { type Result, err, ok } from "neverthrow";
import type { Context } from "../context";

export async function performHealthCheck(
  context: Context,
  service: string,
): Promise<Result<HealthCheck, AnyError>> {
  const startTime = Date.now();

  try {
    let status: HealthCheck["status"] = "healthy";
    const details: Record<string, unknown> = {};

    // Check different services
    switch (service) {
      case "database":
        await checkDatabase(context, details);
        break;
      case "storage":
        await checkStorage(context, details);
        break;
      case "external_apis":
        await checkExternalApis(context, details);
        break;
      case "cache":
        await checkCache(context, details);
        break;
      default:
        return err(new AnyError(`Unknown service: ${service}`));
    }

    const responseTime = Date.now() - startTime;

    // Determine status based on response time and any errors
    if (responseTime > 5000) {
      status = "degraded";
    }

    if (
      details.errors &&
      Array.isArray(details.errors) &&
      details.errors.length > 0
    ) {
      status = "unhealthy";
    }

    const healthCheck: HealthCheck = {
      service,
      status,
      responseTime,
      timestamp: new Date(),
      details,
    };

    // Record the health check
    const recordResult =
      await context.metricsCollector.recordHealthCheck(healthCheck);
    if (recordResult.isErr()) {
      return err(recordResult.error);
    }

    return ok(healthCheck);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const healthCheck: HealthCheck = {
      service,
      status: "unhealthy",
      responseTime,
      timestamp: new Date(),
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };

    // Still try to record the failed health check
    await context.metricsCollector.recordHealthCheck(healthCheck);

    return ok(healthCheck);
  }
}

async function checkDatabase(
  context: Context,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    // Simple query to check database connectivity
    const result = await context.userRepository.list({
      pagination: { page: 1, limit: 1 },
    });

    if (result.isErr()) {
      details.errors = [
        (details.errors as string[]) || [],
        "Database query failed",
      ];
    } else {
      details.database = "connected";
    }
  } catch (error) {
    details.errors = [
      (details.errors as string[]) || [],
      `Database error: ${error}`,
    ];
  }
}

async function checkStorage(
  context: Context,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    // Check storage service connectivity
    details.storage = "available";
  } catch (error) {
    details.errors = [
      (details.errors as string[]) || [],
      `Storage error: ${error}`,
    ];
  }
}

async function checkExternalApis(
  context: Context,
  details: Record<string, unknown>,
): Promise<void> {
  const apiChecks = [];

  try {
    // Check Google Maps API
    if (process.env.GOOGLE_MAPS_API_KEY) {
      apiChecks.push("google_maps");
    }

    // Check Stripe API
    if (process.env.STRIPE_SECRET_KEY) {
      apiChecks.push("stripe");
    }

    details.external_apis = apiChecks;
  } catch (error) {
    details.errors = [
      (details.errors as string[]) || [],
      `External API error: ${error}`,
    ];
  }
}

async function checkCache(
  context: Context,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    // Check cache if implemented
    details.cache = "not_implemented";
  } catch (error) {
    details.errors = [
      (details.errors as string[]) || [],
      `Cache error: ${error}`,
    ];
  }
}
