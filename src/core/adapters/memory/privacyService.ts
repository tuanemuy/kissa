import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { UserId } from "@/core/domain/user/types";
import type { PrivacyService } from "@/core/domain/privacy/ports/privacyService";
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
} from "@/core/domain/privacy/types";
import { AnyError } from "@/lib/errors";
import { type Result, err, ok } from "neverthrow";

export class MemoryPrivacyService implements PrivacyService {
  private consentRecords: ConsentRecord[] = [];
  private privacyRequests: PrivacyRequest[] = [];
  private cookieConsents: CookieConsent[] = [];
  private retentionPolicies: DataRetentionPolicy[] = [];
  private processingActivities: DataProcessingActivity[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  async recordConsent(
    params: RecordConsentParams,
  ): Promise<Result<ConsentRecord, AnyError>> {
    try {
      // Withdraw previous consent of the same type
      const existingConsent = this.consentRecords.find(
        (c) =>
          c.userId === params.userId && c.consentType === params.consentType,
      );

      if (existingConsent) {
        existingConsent.status = "withdrawn";
        existingConsent.withdrawnAt = new Date();
      }

      const consent: ConsentRecord = {
        id: randomUUID(),
        ...params,
        grantedAt: params.status === "granted" ? new Date() : undefined,
        withdrawnAt:
          params.status === "denied" || params.status === "withdrawn"
            ? new Date()
            : undefined,
        expiresAt: this.calculateExpiryDate(params.consentType),
      };

      this.consentRecords.push(consent);
      return ok(consent);
    } catch (error) {
      return err(new AnyError("Failed to record consent", error));
    }
  }

  async withdrawConsent(
    userId: UserId,
    consentType: string,
  ): Promise<Result<ConsentRecord, AnyError>> {
    try {
      const consent = this.consentRecords.find(
        (c) =>
          c.userId === userId &&
          c.consentType === consentType &&
          c.status === "granted",
      );

      if (!consent) {
        return err(new AnyError("Consent record not found"));
      }

      consent.status = "withdrawn";
      consent.withdrawnAt = new Date();

      return ok(consent);
    } catch (error) {
      return err(new AnyError("Failed to withdraw consent", error));
    }
  }

  async getUserConsents(
    userId: UserId,
  ): Promise<Result<ConsentRecord[], AnyError>> {
    try {
      const userConsents = this.consentRecords.filter(
        (c) => c.userId === userId,
      );

      // Get latest consent for each type
      const latestConsents = new Map<string, ConsentRecord>();
      for (const consent of userConsents) {
        const existing = latestConsents.get(consent.consentType);
        if (
          !existing ||
          (consent.grantedAt &&
            existing.grantedAt &&
            consent.grantedAt > existing.grantedAt)
        ) {
          latestConsents.set(consent.consentType, consent);
        }
      }

      return ok(Array.from(latestConsents.values()));
    } catch (error) {
      return err(new AnyError("Failed to get user consents", error));
    }
  }

  async updateCookieConsent(
    params: UpdateCookieConsentParams,
  ): Promise<Result<CookieConsent, AnyError>> {
    try {
      // Remove existing consent for this session
      this.cookieConsents = this.cookieConsents.filter(
        (c) => c.sessionId !== params.sessionId,
      );

      const consentString = this.generateConsentString(params);
      const cookieConsent: CookieConsent = {
        ...params,
        consentString,
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };

      this.cookieConsents.push(cookieConsent);
      return ok(cookieConsent);
    } catch (error) {
      return err(new AnyError("Failed to update cookie consent", error));
    }
  }

  async getCookieConsent(
    sessionId: string,
  ): Promise<Result<CookieConsent | null, AnyError>> {
    try {
      const consent = this.cookieConsents.find(
        (c) => c.sessionId === sessionId,
      );

      if (consent && consent.expiresAt > new Date()) {
        return ok(consent);
      }

      return ok(null);
    } catch (error) {
      return err(new AnyError("Failed to get cookie consent", error));
    }
  }

  async createPrivacyRequest(
    params: CreatePrivacyRequestParams,
  ): Promise<Result<PrivacyRequest, AnyError>> {
    try {
      const request: PrivacyRequest = {
        id: randomUUID(),
        ...params,
        status: "pending",
        requestedAt: new Date(),
      };

      this.privacyRequests.push(request);

      // Auto-process certain types of requests
      if (params.type === "access" || params.type === "portability") {
        setTimeout(() => this.processPrivacyRequest(request.id), 1000);
      }

      return ok(request);
    } catch (error) {
      return err(new AnyError("Failed to create privacy request", error));
    }
  }

  async processPrivacyRequest(
    requestId: string,
  ): Promise<Result<PrivacyRequest, AnyError>> {
    try {
      const request = this.privacyRequests.find((r) => r.id === requestId);
      if (!request) {
        return err(new AnyError("Privacy request not found"));
      }

      request.status = "in_progress";
      request.processedAt = new Date();

      // Simulate processing based on request type
      switch (request.type) {
        case "access":
          request.responseData = await this.collectUserData(request.userId);
          break;
        case "portability":
          request.responseData = await this.exportUserDataInternal(
            request.userId,
          );
          break;
        case "erasure":
          await this.deleteUserDataInternal(request.userId);
          break;
        case "rectification":
          // Would integrate with user data update functionality
          break;
      }

      request.status = "completed";
      request.completedAt = new Date();

      return ok(request);
    } catch (error) {
      return err(new AnyError("Failed to process privacy request", error));
    }
  }

  async getPrivacyRequests(
    userId: UserId,
  ): Promise<Result<PrivacyRequest[], AnyError>> {
    try {
      const userRequests = this.privacyRequests
        .filter((r) => r.userId === userId)
        .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

      return ok(userRequests);
    } catch (error) {
      return err(new AnyError("Failed to get privacy requests", error));
    }
  }

  async exportUserData(
    userId: UserId,
    format: "json" | "csv" | "xml",
  ): Promise<Result<ExportDataResponse, AnyError>> {
    try {
      const userData = await this.collectUserData(userId);
      const formattedData = this.formatExportData(userData, format);

      const dataString = JSON.stringify(formattedData);
      const checksum = createHash("sha256").update(dataString).digest("hex");

      const response: ExportDataResponse = {
        userId,
        exportedAt: new Date(),
        dataTypes: userData,
        format,
        size: dataString.length,
        checksum,
      };

      return ok(response);
    } catch (error) {
      return err(new AnyError("Failed to export user data", error));
    }
  }

  async deleteUserData(
    userId: UserId,
    keepForCompliance = false,
  ): Promise<Result<void, AnyError>> {
    try {
      await this.deleteUserDataInternal(userId, keepForCompliance);
      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to delete user data", error));
    }
  }

  async anonymizeUserData(userId: UserId): Promise<Result<void, AnyError>> {
    try {
      // In a real implementation, this would anonymize user data across all systems
      console.log(`Anonymizing data for user ${userId}`);

      // Remove personal identifiers but keep aggregated data for analytics
      this.consentRecords = this.consentRecords.map((record) =>
        record.userId === userId
          ? {
              ...record,
              userId: null, // Anonymized - no longer associated with specific user
              ipAddress: undefined,
              userAgent: undefined,
            }
          : record,
      );

      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to anonymize user data", error));
    }
  }

  async getRetentionPolicies(): Promise<
    Result<DataRetentionPolicy[], AnyError>
  > {
    try {
      return ok([...this.retentionPolicies]);
    } catch (error) {
      return err(new AnyError("Failed to get retention policies", error));
    }
  }

  async applyRetentionPolicies(): Promise<Result<number, AnyError>> {
    try {
      let deletedCount = 0;

      for (const policy of this.retentionPolicies) {
        if (!policy.isActive) continue;

        const cutoffDate = new Date();
        cutoffDate.setMonth(
          cutoffDate.getMonth() - policy.retentionPeriodMonths,
        );

        // Apply policy based on data type and purpose
        switch (policy.purpose) {
          case "check_in_data":
            // Would delete old check-in data
            deletedCount += await this.deleteOldCheckIns(cutoffDate);
            break;
          case "analytics":
            // Would delete old analytics data
            deletedCount += await this.deleteOldAnalytics(cutoffDate);
            break;
        }
      }

      return ok(deletedCount);
    } catch (error) {
      return err(new AnyError("Failed to apply retention policies", error));
    }
  }

  async getProcessingActivities(): Promise<
    Result<DataProcessingActivity[], AnyError>
  > {
    try {
      return ok([...this.processingActivities]);
    } catch (error) {
      return err(new AnyError("Failed to get processing activities", error));
    }
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<Result<ComplianceReport, AnyError>> {
    try {
      const consentMetrics = this.calculateConsentMetrics(startDate, endDate);
      const requestMetrics = this.calculateRequestMetrics(startDate, endDate);
      const retentionMetrics = this.calculateRetentionMetrics();

      const report = {
        period: { start: startDate, end: endDate },
        consent: consentMetrics,
        requests: requestMetrics,
        retention: retentionMetrics,
        processingActivities: this.processingActivities.length,
        generatedAt: new Date(),
      };

      return ok(report);
    } catch (error) {
      return err(new AnyError("Failed to generate compliance report", error));
    }
  }

  async auditDataProcessing(
    userId?: UserId,
  ): Promise<Result<DataProcessingAudit, AnyError>> {
    try {
      const audit = {
        timestamp: new Date(),
        scope: (userId ? "user" : "system") as "user" | "system",
        userId,
        activities: this.processingActivities.map((activity) => ({
          ...activity,
          compliant: this.assessActivityCompliance(activity),
        })),
        consentStatus: userId ? await this.getUserConsents(userId) : null,
        recommendations: this.generateComplianceRecommendations(),
      };

      return ok(audit);
    } catch (error) {
      return err(new AnyError("Failed to audit data processing", error));
    }
  }

  // Private helper methods
  private calculateExpiryDate(consentType: string): Date {
    const expiryDate = new Date();

    switch (consentType) {
      case "necessary":
        // No expiry for necessary cookies
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        break;
      case "analytics":
      case "marketing":
        // 13 months for analytics and marketing
        expiryDate.setMonth(expiryDate.getMonth() + 13);
        break;
      default:
        // 12 months default
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    return expiryDate;
  }

  private generateConsentString(params: UpdateCookieConsentParams): string {
    const consentData = {
      necessary: params.necessary,
      analytics: params.analytics,
      marketing: params.marketing,
      personalization: params.personalization,
      timestamp: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(consentData)).toString("base64");
  }

  private async collectUserData(
    userId: UserId,
  ): Promise<Record<string, unknown>> {
    // Collect user data from all systems
    return {
      profile: { userId, collected: true },
      checkins: { count: 0, data: [] },
      consents: this.consentRecords.filter((c) => c.userId === userId),
      preferences: {},
      activity: {},
    };
  }

  private async exportUserDataInternal(
    userId: UserId,
  ): Promise<Record<string, unknown>> {
    return this.collectUserData(userId);
  }

  private formatExportData(
    data: Record<string, unknown>,
    format: string,
  ): unknown {
    switch (format) {
      case "json":
        return data;
      case "csv":
        // Convert to CSV format
        return "CSV format not implemented";
      case "xml":
        // Convert to XML format
        return "XML format not implemented";
      default:
        return data;
    }
  }

  private async deleteUserDataInternal(
    userId: UserId,
    keepForCompliance = false,
  ): Promise<void> {
    // Delete user data across all systems
    this.consentRecords = this.consentRecords.filter(
      (c) => c.userId !== userId,
    );
    this.privacyRequests = this.privacyRequests.filter(
      (r) => r.userId !== userId,
    );

    if (!keepForCompliance) {
      // Also delete data that might be required for compliance
      console.log(`Deleting all data for user ${userId}`);
    } else {
      console.log(`Deleting user data for ${userId}, keeping compliance data`);
    }
  }

  private async deleteOldCheckIns(cutoffDate: Date): Promise<number> {
    // Would delete check-ins older than cutoff date
    return 0;
  }

  private async deleteOldAnalytics(cutoffDate: Date): Promise<number> {
    // Would delete analytics data older than cutoff date
    return 0;
  }

  private calculateConsentMetrics(
    startDate: Date,
    endDate: Date,
  ): ComplianceReport["consent"] {
    const periodConsents = this.consentRecords.filter(
      (c) => c.grantedAt && c.grantedAt >= startDate && c.grantedAt <= endDate,
    );

    return {
      total: periodConsents.length,
      granted: periodConsents.filter((c) => c.status === "granted").length,
      denied: periodConsents.filter((c) => c.status === "denied").length,
      withdrawn: periodConsents.filter((c) => c.status === "withdrawn").length,
      byType: this.groupBy(periodConsents, "consentType"),
    };
  }

  private calculateRequestMetrics(
    startDate: Date,
    endDate: Date,
  ): ComplianceReport["requests"] {
    const periodRequests = this.privacyRequests.filter(
      (r) => r.requestedAt >= startDate && r.requestedAt <= endDate,
    );

    return {
      total: periodRequests.length,
      byType: this.groupBy(periodRequests, "type"),
      byStatus: this.groupBy(periodRequests, "status"),
      averageProcessingTime:
        this.calculateAverageProcessingTime(periodRequests),
    };
  }

  private calculateRetentionMetrics(): ComplianceReport["retention"] {
    return {
      activePolicies: this.retentionPolicies.filter((p) => p.isActive).length,
      totalPolicies: this.retentionPolicies.length,
      dataTypesManaged: new Set(
        this.retentionPolicies.flatMap((p) => p.dataTypes),
      ).size,
    };
  }

  private assessActivityCompliance(activity: DataProcessingActivity): boolean {
    // Basic compliance checks
    return !!(
      activity.legalBasis &&
      activity.purpose &&
      activity.retentionPeriod &&
      activity.securityMeasures.length > 0
    );
  }

  private generateComplianceRecommendations(): string[] {
    const recommendations = [];

    if (
      this.processingActivities.some((a) => !this.assessActivityCompliance(a))
    ) {
      recommendations.push(
        "Review and update processing activities with missing compliance information",
      );
    }

    if (this.retentionPolicies.filter((p) => p.isActive).length === 0) {
      recommendations.push("Implement data retention policies");
    }

    return recommendations;
  }

  private groupBy<T extends Record<string, unknown>>(
    array: T[],
    key: keyof T,
  ): Record<string, number> {
    return array.reduce(
      (acc, item) => {
        const group = String(item[key]);
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private calculateAverageProcessingTime(requests: PrivacyRequest[]): number {
    const completedRequests = requests.filter(
      (r) => r.completedAt && r.processedAt,
    );
    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((sum, request) => {
      const completedTime = request.completedAt?.getTime() || 0;
      const processedTime = request.processedAt?.getTime() || 0;
      return sum + (completedTime - processedTime);
    }, 0);

    return totalTime / completedRequests.length / (1000 * 60 * 60 * 24); // Days
  }

  private initializeDefaultPolicies(): void {
    this.retentionPolicies = [
      {
        id: randomUUID(),
        purpose: "user_account",
        dataTypes: ["profile", "preferences", "authentication"],
        retentionPeriodMonths: 84, // 7 years
        legalBasis: "Contract performance",
        description: "User account data retained for service provision",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        purpose: "check_in_data",
        dataTypes: ["check_ins", "location_data"],
        retentionPeriodMonths: 24, // 2 years
        legalBasis: "Legitimate interest",
        description: "Check-in data for service improvement",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    this.processingActivities = [
      {
        id: randomUUID(),
        name: "User Registration and Authentication",
        purpose: "Provide access to Kissa services",
        legalBasis: "Contract performance",
        dataTypes: ["email", "password_hash", "profile_data"],
        dataSubjects: ["users"],
        thirdCountryTransfers: false,
        retentionPeriod: "7 years after account closure",
        securityMeasures: ["encryption", "access_controls", "audit_logging"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}
