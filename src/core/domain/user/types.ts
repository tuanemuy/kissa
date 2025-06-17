import { z } from "zod";

// Branded types
export const userIdSchema = z.string().uuid().brand("UserId");
export type UserId = z.infer<typeof userIdSchema>;

export const sessionIdSchema = z.string().uuid().brand("SessionId");
export type SessionId = z.infer<typeof sessionIdSchema>;

// Enums
export const userRoleSchema = z.enum(["visitor", "editor", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const subscriptionPlanSchema = z.enum(["free", "basic", "premium"]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

// User entity
export const userSchema = z.object({
  id: userIdSchema,
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: userRoleSchema,
  subscription: subscriptionPlanSchema,
  profilePhotoUrl: z.string().url().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof userSchema>;

// Session entity
export const sessionSchema = z.object({
  id: sessionIdSchema,
  userId: userIdSchema,
  token: z.string(),
  expiresAt: z.date(),
  lastActivityAt: z.date(),
  createdAt: z.date(),
});
export type Session = z.infer<typeof sessionSchema>;

// DTOs
export const createUserParamsSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: userRoleSchema,
  password: z.string().min(8),
  subscription: subscriptionPlanSchema.optional().default("free"),
  profilePhotoUrl: z.string().url().optional(),
});
export type CreateUserParams = z.infer<typeof createUserParamsSchema>;

export const updateUserParamsSchema = z.object({
  id: userIdSchema,
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  subscription: subscriptionPlanSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserParams = z.infer<typeof updateUserParamsSchema>;

export const authenticateUserParamsSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type AuthenticateUserParams = z.infer<
  typeof authenticateUserParamsSchema
>;

export const createSessionParamsSchema = z.object({
  userId: userIdSchema,
  expiresInHours: z.number().positive().default(24),
});
export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export const updateSessionActivityParamsSchema = z.object({
  sessionId: sessionIdSchema,
});
export type UpdateSessionActivityParams = z.infer<
  typeof updateSessionActivityParamsSchema
>;

// Query types
export const listUsersQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      role: userRoleSchema.optional(),
      subscription: subscriptionPlanSchema.optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "name", "email"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Subscription limits
export const subscriptionLimits = {
  free: { regions: 1, locations: 10 },
  basic: { regions: 5, locations: 100 },
  premium: {
    regions: Number.POSITIVE_INFINITY,
    locations: Number.POSITIVE_INFINITY,
  },
} as const;

export function getSubscriptionLimit(plan: SubscriptionPlan) {
  return subscriptionLimits[plan];
}
