import { z } from "zod/v4";
import { userIdSchema } from "../user/types";

export const consentTypeSchema = z.enum([
  "necessary",
  "analytics",
  "marketing",
  "personalization",
  "third_party",
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

export const consentStatusSchema = z.enum([
  "granted",
  "denied",
  "withdrawn",
  "pending",
]);
export type ConsentStatus = z.infer<typeof consentStatusSchema>;

export const dataRetentionPurposeSchema = z.enum([
  "user_account",
  "check_in_data",
  "analytics",
  "legal_compliance",
  "security",
  "marketing",
]);
export type DataRetentionPurpose = z.infer<typeof dataRetentionPurposeSchema>;

export const privacyRequestTypeSchema = z.enum([
  "access",
  "rectification",
  "erasure",
  "portability",
  "restriction",
  "objection",
]);
export type PrivacyRequestType = z.infer<typeof privacyRequestTypeSchema>;

export const privacyRequestStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
]);
export type PrivacyRequestStatus = z.infer<typeof privacyRequestStatusSchema>;

// Consent Record
export const consentRecordSchema = z.object({
  id: z.string().uuid(),
  userId: userIdSchema.nullable(), // Allow null for anonymized records
  consentType: consentTypeSchema,
  status: consentStatusSchema,
  version: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  grantedAt: z.date().optional(),
  withdrawnAt: z.date().optional(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;

// Privacy Request
export const privacyRequestSchema = z.object({
  id: z.string().uuid(),
  userId: userIdSchema,
  type: privacyRequestTypeSchema,
  status: privacyRequestStatusSchema,
  description: z.string().optional(),
  requestedAt: z.date(),
  processedAt: z.date().optional(),
  completedAt: z.date().optional(),
  responseData: z.record(z.string(), z.unknown()).optional(),
  processorNotes: z.string().optional(),
});
export type PrivacyRequest = z.infer<typeof privacyRequestSchema>;

// Data Retention Policy
export const dataRetentionPolicySchema = z.object({
  id: z.string().uuid(),
  purpose: dataRetentionPurposeSchema,
  dataTypes: z.array(z.string()),
  retentionPeriodMonths: z.number(),
  legalBasis: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type DataRetentionPolicy = z.infer<typeof dataRetentionPolicySchema>;

// Data Processing Activity
export const dataProcessingActivitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string(),
  legalBasis: z.string(),
  dataTypes: z.array(z.string()),
  dataSubjects: z.array(z.string()),
  recipients: z.array(z.string()).optional(),
  thirdCountryTransfers: z.boolean(),
  retentionPeriod: z.string(),
  securityMeasures: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type DataProcessingActivity = z.infer<
  typeof dataProcessingActivitySchema
>;

// Cookie Consent
export const cookieConsentSchema = z.object({
  userId: userIdSchema.optional(),
  sessionId: z.string(),
  necessary: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  personalization: z.boolean(),
  consentString: z.string(),
  grantedAt: z.date(),
  expiresAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export type CookieConsent = z.infer<typeof cookieConsentSchema>;

// DTOs
export const recordConsentParamsSchema = z.object({
  userId: userIdSchema,
  consentType: consentTypeSchema,
  status: consentStatusSchema,
  version: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RecordConsentParams = z.infer<typeof recordConsentParamsSchema>;

export const createPrivacyRequestParamsSchema = z.object({
  userId: userIdSchema,
  type: privacyRequestTypeSchema,
  description: z.string().optional(),
});
export type CreatePrivacyRequestParams = z.infer<
  typeof createPrivacyRequestParamsSchema
>;

export const updateCookieConsentParamsSchema = z.object({
  sessionId: z.string(),
  necessary: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  personalization: z.boolean(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export type UpdateCookieConsentParams = z.infer<
  typeof updateCookieConsentParamsSchema
>;

// Export Data Response
export const exportDataResponseSchema = z.object({
  userId: userIdSchema,
  exportedAt: z.date(),
  dataTypes: z.record(z.string(), z.unknown()),
  format: z.enum(["json", "csv", "xml"]),
  size: z.number(),
  checksum: z.string(),
});
export type ExportDataResponse = z.infer<typeof exportDataResponseSchema>;

// Compliance Report
export const complianceReportSchema = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  consent: z.object({
    total: z.number(),
    granted: z.number(),
    denied: z.number(),
    withdrawn: z.number(),
    byType: z.record(z.string(), z.number()),
  }),
  requests: z.object({
    total: z.number(),
    byType: z.record(z.string(), z.number()),
    byStatus: z.record(z.string(), z.number()),
    averageProcessingTime: z.number(),
  }),
  retention: z.object({
    activePolicies: z.number(),
    totalPolicies: z.number(),
    dataTypesManaged: z.number(),
  }),
  processingActivities: z.number(),
  generatedAt: z.date(),
});
export type ComplianceReport = z.infer<typeof complianceReportSchema>;

// Data Processing Audit
export const dataProcessingAuditSchema = z.object({
  timestamp: z.date(),
  scope: z.enum(["user", "system"]),
  userId: z.string().optional(),
  activities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      purpose: z.string(),
      legalBasis: z.string(),
      dataTypes: z.array(z.string()),
      dataSubjects: z.array(z.string()),
      recipients: z.array(z.string()).optional(),
      thirdCountryTransfers: z.boolean(),
      retentionPeriod: z.string(),
      securityMeasures: z.array(z.string()),
      isActive: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
      compliant: z.boolean(),
    }),
  ),
  consentStatus: z.unknown().optional(),
  recommendations: z.array(z.string()),
});
export type DataProcessingAudit = z.infer<typeof dataProcessingAuditSchema>;
