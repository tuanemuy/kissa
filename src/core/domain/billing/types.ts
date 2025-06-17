import { z } from "zod/v4";
import { subscriptionPlanSchema, userIdSchema } from "../user/types";

// Branded types
export const billingEventIdSchema = z.string().uuid().brand("BillingEventId");
export type BillingEventId = z.infer<typeof billingEventIdSchema>;

// Enums
export const billingEventTypeSchema = z.enum([
  "subscription_change",
  "payment",
  "refund",
]);
export type BillingEventType = z.infer<typeof billingEventTypeSchema>;

export const billingStatusSchema = z.enum(["pending", "completed", "failed"]);
export type BillingStatus = z.infer<typeof billingStatusSchema>;

// Billing event entity
export const billingEventSchema = z.object({
  id: billingEventIdSchema,
  userId: userIdSchema,
  type: billingEventTypeSchema,
  fromPlan: subscriptionPlanSchema.nullable(),
  toPlan: subscriptionPlanSchema.nullable(),
  amount: z.number().nonnegative().nullable(),
  currency: z.string().default("USD"),
  stripePaymentId: z.string().nullable(),
  status: billingStatusSchema,
  createdAt: z.date(),
});
export type BillingEvent = z.infer<typeof billingEventSchema>;

// DTOs
export const createBillingEventParamsSchema = z.object({
  userId: userIdSchema,
  type: billingEventTypeSchema,
  fromPlan: subscriptionPlanSchema.optional(),
  toPlan: subscriptionPlanSchema.optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().optional().default("USD"),
  stripePaymentId: z.string().optional(),
  status: billingStatusSchema.optional().default("pending"),
});
export type CreateBillingEventParams = z.infer<
  typeof createBillingEventParamsSchema
>;

export const updateBillingEventStatusParamsSchema = z.object({
  id: billingEventIdSchema,
  status: billingStatusSchema,
  stripePaymentId: z.string().optional(),
});
export type UpdateBillingEventStatusParams = z.infer<
  typeof updateBillingEventStatusParamsSchema
>;

// Query types
export const listBillingEventsQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      userId: userIdSchema.optional(),
      type: billingEventTypeSchema.optional(),
      status: billingStatusSchema.optional(),
      fromDate: z.date().optional(),
      toDate: z.date().optional(),
    })
    .optional(),
});
export type ListBillingEventsQuery = z.infer<
  typeof listBillingEventsQuerySchema
>;
