import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";
import type {
  ComplianceReport,
  ConsentRecord,
  CookieConsent,
  CreatePrivacyRequestParams,
  DataProcessingActivity,
  DataProcessingAudit,
  DataRetentionPolicy,
  ExportDataResponse,
  PrivacyRequest,
  RecordConsentParams,
  UpdateCookieConsentParams,
} from "../types";

export interface PrivacyService {
  // Consent Management
  recordConsent(
    params: RecordConsentParams,
  ): Promise<Result<ConsentRecord, AnyError>>;
  withdrawConsent(
    userId: string,
    consentType: string,
  ): Promise<Result<ConsentRecord, AnyError>>;
  getUserConsents(userId: string): Promise<Result<ConsentRecord[], AnyError>>;

  // Cookie Consent
  updateCookieConsent(
    params: UpdateCookieConsentParams,
  ): Promise<Result<CookieConsent, AnyError>>;
  getCookieConsent(
    sessionId: string,
  ): Promise<Result<CookieConsent | null, AnyError>>;

  // Privacy Requests (GDPR Rights)
  createPrivacyRequest(
    params: CreatePrivacyRequestParams,
  ): Promise<Result<PrivacyRequest, AnyError>>;
  processPrivacyRequest(
    requestId: string,
  ): Promise<Result<PrivacyRequest, AnyError>>;
  getPrivacyRequests(
    userId: string,
  ): Promise<Result<PrivacyRequest[], AnyError>>;

  // Data Export (Right to Portability)
  exportUserData(
    userId: string,
    format: "json" | "csv" | "xml",
  ): Promise<Result<ExportDataResponse, AnyError>>;

  // Data Deletion (Right to Erasure)
  deleteUserData(
    userId: string,
    keepForCompliance?: boolean,
  ): Promise<Result<void, AnyError>>;
  anonymizeUserData(userId: string): Promise<Result<void, AnyError>>;

  // Data Retention
  getRetentionPolicies(): Promise<Result<DataRetentionPolicy[], AnyError>>;
  applyRetentionPolicies(): Promise<Result<number, AnyError>>;

  // Data Processing Activities (Article 30 GDPR)
  getProcessingActivities(): Promise<
    Result<DataProcessingActivity[], AnyError>
  >;

  // Compliance Reporting
  generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<Result<ComplianceReport, AnyError>>;
  auditDataProcessing(
    userId?: string,
  ): Promise<Result<DataProcessingAudit, AnyError>>;
}
