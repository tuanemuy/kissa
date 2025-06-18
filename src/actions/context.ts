import { AuthJsAuthService } from "@/core/adapters/authjs/authService";
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
import {
  type GoogleMapsConfig,
  GoogleMapsService,
} from "@/core/adapters/googlemaps/mapsService";
import {
  NodemailerNotificationService,
  type SmtpConfig,
} from "@/core/adapters/nodemailer/notificationService";
import {
  type S3Config,
  S3FileStorageService,
} from "@/core/adapters/s3/fileStorageService";
import {
  type StripeConfig,
  StripePaymentGateway,
} from "@/core/adapters/stripe/paymentGateway";
import type { Context } from "@/core/application/context";
import { z } from "zod/v4";

// Environment variables schema for actions
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_AUTH_TOKEN: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_BASIC_PRICE_ID: z.string().min(1),
  STRIPE_PREMIUM_PRICE_ID: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_SECURE: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  FROM_NAME: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_S3_ENDPOINT: z.string().url().optional(),
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
  const userRepository = new DrizzleTursoUserRepository(db);

  // Configure external services
  const stripeConfig: StripeConfig = {
    secretKey: env.STRIPE_SECRET_KEY,
    basicPriceId: env.STRIPE_BASIC_PRICE_ID,
    premiumPriceId: env.STRIPE_PREMIUM_PRICE_ID,
  };

  const smtpConfig: SmtpConfig = {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === "true",
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: env.FROM_EMAIL,
    fromName: env.FROM_NAME,
  };

  const googleMapsConfig: GoogleMapsConfig = {
    apiKey: env.GOOGLE_MAPS_API_KEY,
  };

  const s3Config: S3Config = {
    region: env.AWS_REGION || "us-east-1",
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    defaultBucket: env.AWS_S3_BUCKET,
    endpoint: env.AWS_S3_ENDPOINT,
    forcePathStyle: !!env.AWS_S3_ENDPOINT,
  };

  cachedContext = {
    userRepository,
    passwordHasher: new BcryptPasswordHasher(),
    authService: new AuthJsAuthService(userRepository),
    regionRepository: new DrizzleTursoRegionRepository(db),
    locationRepository: new DrizzleTursoLocationRepository(db),
    checkInRepository: new DrizzleTursoCheckInRepository(db),
    favoriteRepository: new DrizzleTursoFavoriteRepository(db),
    moderationRepository: new DrizzleTursoModerationRepository(db),
    notificationRepository: new DrizzleTursoNotificationRepository(db),
    notificationService: new NodemailerNotificationService(smtpConfig),
    billingRepository: new DrizzleTursoBillingRepository(db),
    paymentGateway: new StripePaymentGateway(stripeConfig),
    mapsService: new GoogleMapsService(googleMapsConfig),
    fileStorageService: new S3FileStorageService(s3Config),
  };

  return cachedContext;
}
