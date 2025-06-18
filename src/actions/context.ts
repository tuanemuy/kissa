import { BcryptPasswordHasher } from "@/core/adapters/bcrypt/passwordHasher";
import { DrizzleTursoBillingRepository } from "@/core/adapters/drizzleTurso/billingRepository";
import { DrizzleTursoCheckInRepository } from "@/core/adapters/drizzleTurso/checkInRepository";
import { getDatabase } from "@/core/adapters/drizzleTurso/client";
import { DrizzleTursoFavoriteRepository } from "@/core/adapters/drizzleTurso/favoriteRepository";
import { DrizzleTursoLocationRepository } from "@/core/adapters/drizzleTurso/locationRepository";
import { DrizzleTursoModerationRepository } from "@/core/adapters/drizzleTurso/moderationRepository";
import { DrizzleTursoNotificationRepository } from "@/core/adapters/drizzleTurso/notificationRepository";
import { DrizzleTursoRegionRepository } from "@/core/adapters/drizzleTurso/regionRepository";
import { DrizzleTursoUserRepository } from "@/core/adapters/drizzleTurso/userRepository";
import { MockNotificationService } from "@/core/adapters/mock/notificationService";
import { MockPaymentGateway } from "@/core/adapters/mock/paymentGateway";
import type { Context } from "@/core/application/context";
import { z } from "zod/v4";

// Environment variables schema for actions
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_AUTH_TOKEN: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;

// Cache for environment variables
let cachedEnv: Env | null = null;

function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables:\n${errors}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

// Create context once and reuse it
let cachedContext: Context | null = null;

export function getContext(): Context {
  if (cachedContext) {
    return cachedContext;
  }

  const env = getEnv();
  const db = getDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);

  cachedContext = {
    userRepository: new DrizzleTursoUserRepository(db),
    passwordHasher: new BcryptPasswordHasher(),
    regionRepository: new DrizzleTursoRegionRepository(db),
    locationRepository: new DrizzleTursoLocationRepository(db),
    checkInRepository: new DrizzleTursoCheckInRepository(db),
    favoriteRepository: new DrizzleTursoFavoriteRepository(db),
    moderationRepository: new DrizzleTursoModerationRepository(db),
    notificationRepository: new DrizzleTursoNotificationRepository(db),
    notificationService: new MockNotificationService(),
    billingRepository: new DrizzleTursoBillingRepository(db),
    paymentGateway: new MockPaymentGateway(),
  };

  return cachedContext;
}
