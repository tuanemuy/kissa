import { z } from "zod";
import { locationIdSchema } from "../location/types";
import { userIdSchema } from "../user/types";

// Branded types
export const checkInIdSchema = z.string().uuid().brand("CheckInId");
export type CheckInId = z.infer<typeof checkInIdSchema>;

// Check-in entity
export const checkInSchema = z.object({
  id: checkInIdSchema,
  userId: userIdSchema,
  locationId: locationIdSchema,
  photoUrl: z.string().url().nullable(),
  comment: z.string().max(500).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  isPublic: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type CheckIn = z.infer<typeof checkInSchema>;

// DTOs
export const createCheckInParamsSchema = z.object({
  userId: userIdSchema,
  locationId: locationIdSchema,
  photoUrl: z.string().url().optional(),
  comment: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().optional().default(true),
});
export type CreateCheckInParams = z.infer<typeof createCheckInParamsSchema>;

export const updateCheckInParamsSchema = z.object({
  id: checkInIdSchema,
  photoUrl: z.string().url().nullable().optional(),
  comment: z.string().max(500).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateCheckInParams = z.infer<typeof updateCheckInParamsSchema>;

// Query types
export const listCheckInsQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      userId: userIdSchema.optional(),
      locationId: locationIdSchema.optional(),
      isPublic: z.boolean().optional(),
      hasPhoto: z.boolean().optional(),
      minRating: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "rating"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListCheckInsQuery = z.infer<typeof listCheckInsQuerySchema>;

// Check-in with relations
export const checkInWithUserSchema = checkInSchema.extend({
  user: z.object({
    id: userIdSchema,
    name: z.string(),
    profilePhotoUrl: z.string().url().nullable(),
  }),
});
export type CheckInWithUser = z.infer<typeof checkInWithUserSchema>;

export const checkInWithLocationSchema = checkInSchema.extend({
  location: z.object({
    id: locationIdSchema,
    name: z.string(),
    address: z.string().nullable(),
  }),
});
export type CheckInWithLocation = z.infer<typeof checkInWithLocationSchema>;
