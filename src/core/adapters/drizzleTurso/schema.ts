import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";

// Users table
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["visitor", "editor", "admin"] }).notNull(),
  hashedPassword: text("hashed_password").notNull(),
  subscription: text("subscription", { enum: ["free", "basic", "premium"] })
    .notNull()
    .default("free"),
  profilePhotoUrl: text("profile_photo_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

// Sessions table
export const sessions = sqliteTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Regions table
export const regions = sqliteTable("regions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  coverPhotoUrl: text("cover_photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

// Locations table
export const locations = sqliteTable("locations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  address: text("address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  contactInfo: text("contact_info"), // JSON string
  operatingHours: text("operating_hours"), // JSON string
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  coverPhotoUrl: text("cover_photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

// Location Editors table (for collaboration)
export const locationEditors = sqliteTable("location_editors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  editorId: text("editor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  invitedAt: integer("invited_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
});

// Check-ins table
export const checkIns = sqliteTable("check_ins", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"),
  comment: text("comment"),
  rating: integer("rating"), // 1-5
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

// Favorites table
export const favorites = sqliteTable("favorites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  regionId: text("region_id").references(() => regions.id, {
    onDelete: "cascade",
  }),
  locationId: text("location_id").references(() => locations.id, {
    onDelete: "cascade",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Pinned Regions table
export const pinnedRegions = sqliteTable("pinned_regions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Moderation Items table
export const moderationItems = sqliteTable("moderation_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  contentType: text("content_type", {
    enum: ["region", "location", "checkIn"],
  }).notNull(),
  contentId: text("content_id").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  reportedBy: text("reported_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reportReason: text("report_reason"),
  moderatedBy: text("moderated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  moderationNote: text("moderation_note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

// Notifications table
export const notifications = sqliteTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "location_invitation",
      "content_moderation",
      "check_in_activity",
      "system",
    ],
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string for additional data
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Billing Events table
export const billingEvents = sqliteTable("billing_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  type: text("type", {
    enum: ["subscription_change", "payment", "refund"],
  }).notNull(),
  fromPlan: text("from_plan", { enum: ["free", "basic", "premium"] }),
  toPlan: text("to_plan", { enum: ["free", "basic", "premium"] }),
  amount: real("amount"),
  currency: text("currency").default("USD"),
  stripePaymentId: text("stripe_payment_id"),
  status: text("status", {
    enum: ["pending", "completed", "failed"],
  }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// File Uploads table
export const fileUploads = sqliteTable("file_uploads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // mime type
  fileSize: integer("file_size").notNull(), // bytes
  entityType: text("entity_type", {
    enum: ["user_profile", "region_cover", "location_cover", "check_in_photo"],
  }),
  entityId: text("entity_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
