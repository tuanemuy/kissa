// Mock context utilities for testing application services
import { MockCheckInRepository } from "@/core/adapters/mock/checkInRepository";
import { MockFavoriteRepository } from "@/core/adapters/mock/favoriteRepository";
import { MockFileUploadRepository } from "@/core/adapters/mock/fileUploadRepository";
import { MockLocationRepository } from "@/core/adapters/mock/locationRepository";
import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import { MockNotificationService } from "@/core/adapters/mock/notificationService";
import { MockPasswordHasher } from "@/core/adapters/mock/passwordHasher";
import { MockPaymentGateway } from "@/core/adapters/mock/paymentGateway";
import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { BackupService } from "@/core/domain/backup/ports/backupService";
import type { BillingRepository } from "@/core/domain/billing/ports/billingRepository";
import type { FileStorageService } from "@/core/domain/common/ports/fileStorageService";
import type { MapsService } from "@/core/domain/common/ports/mapsService";
import type { ModerationRepository } from "@/core/domain/moderation/ports/moderationRepository";
import type { AlertManager } from "@/core/domain/monitoring/ports/alertManager";
import type { MetricsCollector } from "@/core/domain/monitoring/ports/metricsCollector";
import type { PushNotificationService } from "@/core/domain/notification/ports/pushNotificationService";
import type { PrivacyService } from "@/core/domain/privacy/ports/privacyService";
import type {
  AuthError,
  AuthService,
} from "@/core/domain/user/ports/authService";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import type { RepositoryError } from "@/lib/error";
import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

// Mock implementations for services that don't have existing mock classes

class MockAuthService implements AuthService {
  async getCurrentUser(): Promise<Result<User | null, AuthError>> {
    const mockUser: User = {
      id: "mock-user-id" as UserId,
      email: "test@example.com",
      name: "Test User",
      role: "visitor",
      subscription: "free",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return ok(mockUser);
  }

  async getCurrentUserId(): Promise<Result<UserId | null, AuthError>> {
    return ok("mock-user-id" as UserId);
  }

  async requireAuth(): Promise<Result<User, AuthError>> {
    const mockUser: User = {
      id: "mock-user-id" as UserId,
      email: "test@example.com",
      name: "Test User",
      role: "visitor",
      subscription: "free",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return ok(mockUser);
  }

  async requireAuthUserId(): Promise<Result<UserId, AuthError>> {
    return ok("mock-user-id" as UserId);
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<Result<User, AuthError>> {
    const mockUser: User = {
      id: "mock-user-id" as UserId,
      email,
      name: "Test User",
      role: "visitor",
      subscription: "free",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return ok(mockUser);
  }

  async signOut(): Promise<Result<void, AuthError>> {
    return ok(undefined);
  }
}

class MockBillingRepository implements BillingRepository {
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any params for testing
  async create(params: any): Promise<Result<any, RepositoryError>> {
    return ok({ id: "mock-billing-event-id", ...params });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any id for testing
  async findById(id: any): Promise<Result<any | null, RepositoryError>> {
    return ok({ id, type: "payment", status: "completed" });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any params for testing
  async updateStatus(params: any): Promise<Result<any, RepositoryError>> {
    return ok({ id: params.id, status: params.status });
  }

  async list(
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any query for testing
    query: any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any items for testing
  ): Promise<Result<{ items: any[]; count: number }, RepositoryError>> {
    return ok({ items: [], count: 0 });
  }

  async findLatestByUser(
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any userId for testing
    userId: any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any result for testing
  ): Promise<Result<any | null, RepositoryError>> {
    return ok({
      id: "latest-event",
      userId,
      type: "payment",
      status: "completed",
    });
  }

  async calculateTotalSpent(
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any userId for testing
    userId: any,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Result<number, RepositoryError>> {
    return ok(0);
  }
}

class MockModerationRepository implements ModerationRepository {
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async create(): Promise<Result<any, RepositoryError>> {
    return ok({});
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async findById(): Promise<Result<any, RepositoryError>> {
    return ok({});
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async findByContent(): Promise<Result<any, RepositoryError>> {
    return ok(null);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async update(): Promise<Result<any, RepositoryError>> {
    return ok({});
  }

  async list(): Promise<
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any items for testing
    Result<{ items: any[]; count: number }, RepositoryError>
  > {
    return ok({ items: [], count: 0 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async moderate(): Promise<Result<any, RepositoryError>> {
    return ok({});
  }

  async countPending(): Promise<Result<number, RepositoryError>> {
    return ok(0);
  }

  async countOlderThan24Hours(): Promise<Result<number, RepositoryError>> {
    return ok(0);
  }
}

class MockMapsService implements MapsService {
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async geocode(address: string): Promise<Result<any, Error>> {
    return ok({
      address,
      latitude: 35.6762,
      longitude: 139.6503,
      placeId: "mock-place-id",
    });
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, Error>> {
    return ok({
      address: "Mock Address",
      placeId: "mock-place-id",
    });
  }

  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    );
  }
}

class MockFileStorageService implements FileStorageService {
  async uploadFile(
    fileBuffer: Buffer,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any metadata for testing
    metadata: any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any options for testing
    options?: any,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, Error>> {
    return ok({
      url: "https://mock-storage.com/mock-file.jpg",
      key: "mock-file-key",
      bucket: "mock-bucket",
    });
  }

  async deleteFile(key: string, bucket?: string): Promise<Result<void, Error>> {
    return ok(undefined);
  }

  async getSignedUrl(
    key: string,
    bucket?: string,
    expiresInSeconds?: number,
  ): Promise<Result<string, Error>> {
    return ok(`https://mock-storage.com/signed/${key}`);
  }

  async getFileMetadata(
    key: string,
    bucket?: string,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, Error>> {
    return ok({
      name: "mock-file.jpg",
      size: 1024,
      mimeType: "image/jpeg",
      lastModified: new Date(),
    });
  }

  async fileExists(
    key: string,
    bucket?: string,
  ): Promise<Result<boolean, Error>> {
    return ok(true);
  }
}

class MockMetricsCollector implements MetricsCollector {
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any metric for testing
  async recordMetric(metric: any): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  async getMetrics(timeRange: { start: Date; end: Date }): Promise<
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
    Result<any[], AnyError>
  > {
    return ok([]);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any healthCheck for testing
  async recordHealthCheck(healthCheck: any): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getHealthStatus(): Promise<Result<any[], AnyError>> {
    return ok([]);
  }
}

class MockAlertManager implements AlertManager {
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any rule for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async createRule(rule: any): Promise<Result<any, AnyError>> {
    return ok({ id: "mock-rule-id", createdAt: new Date(), ...rule });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any updates for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async updateRule(id: string, updates: any): Promise<Result<any, AnyError>> {
    return ok({ id, ...updates });
  }

  async deleteRule(id: string): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getRules(): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  async triggerAlert(
    ruleId: string,
    message: string,
    metadata?: Record<string, unknown>,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-alert-id",
      ruleId,
      message,
      metadata,
      createdAt: new Date(),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async resolveAlert(alertId: string): Promise<Result<any, AnyError>> {
    return ok({ id: alertId, status: "resolved", resolvedAt: new Date() });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getActiveAlerts(): Promise<Result<any[], AnyError>> {
    return ok([]);
  }
}

class MockBackupService implements BackupService {
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any config for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async createBackup(config: any): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-backup-job-id",
      status: "pending",
      config,
      createdAt: new Date(),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getBackupStatus(jobId: string): Promise<Result<any, AnyError>> {
    return ok({
      id: jobId,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async listBackups(limit?: number): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  async deleteBackup(jobId: string): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  async restoreBackup(
    backupId: string,
    targetLocation: string,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-restore-job-id",
      backupId,
      status: "pending",
      startedAt: new Date(),
      targetLocation,
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getRestoreStatus(jobId: string): Promise<Result<any, AnyError>> {
    return ok({
      id: jobId,
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
    });
  }

  async validateBackup(backupId: string): Promise<Result<boolean, AnyError>> {
    return ok(true);
  }

  async cleanupExpiredBackups(
    retentionDays: number,
  ): Promise<Result<number, AnyError>> {
    return ok(0);
  }
}

class MockPrivacyService implements PrivacyService {
  // Consent Management
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any params for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async recordConsent(params: any): Promise<Result<any, AnyError>> {
    return ok({ id: "mock-consent-id", ...params, recordedAt: new Date() });
  }

  async withdrawConsent(
    userId: string,
    consentType: string,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-consent-id",
      userId,
      consentType,
      status: "withdrawn",
      withdrawnAt: new Date(),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getUserConsents(userId: string): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  // Cookie Consent
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any params for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async updateCookieConsent(params: any): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-cookie-consent-id",
      ...params,
      updatedAt: new Date(),
    });
  }

  async getCookieConsent(
    sessionId: string,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any | null, AnyError>> {
    return ok({
      sessionId,
      preferences: { analytics: true, marketing: false },
    });
  }

  // Privacy Requests (GDPR Rights)
  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any params for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async createPrivacyRequest(params: any): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-privacy-request-id",
      ...params,
      status: "pending",
      createdAt: new Date(),
    });
  }

  async processPrivacyRequest(
    requestId: string,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({ id: requestId, status: "processed", processedAt: new Date() });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getPrivacyRequests(userId: string): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  // Data Export (Right to Portability)
  async exportUserData(
    userId: string,
    format: "json" | "csv" | "xml",
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      userId,
      format,
      url: "https://mock-export.com/data.json",
      expiresAt: new Date(),
    });
  }

  // Data Deletion (Right to Erasure)
  async deleteUserData(
    userId: string,
    keepForCompliance?: boolean,
  ): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  async anonymizeUserData(userId: string): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  // Data Retention
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getRetentionPolicies(): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  async applyRetentionPolicies(): Promise<Result<number, AnyError>> {
    return ok(0);
  }

  // Data Processing Activities (Article 30 GDPR)
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getProcessingActivities(): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  // Compliance Reporting
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      period: { startDate, endDate },
      summary: { totalRequests: 0, completedRequests: 0 },
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async auditDataProcessing(userId?: string): Promise<Result<any, AnyError>> {
    return ok({
      auditId: "mock-audit-id",
      userId,
      timestamp: new Date(),
      findings: [],
    });
  }
}

class MockPushNotificationService implements PushNotificationService {
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: "web" | "ios" | "android",
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-device-token-id",
      userId,
      token,
      platform,
      registeredAt: new Date(),
    });
  }

  async unregisterDeviceToken(
    tokenId: string,
  ): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getUserDeviceTokens(userId: string): Promise<Result<any[], AnyError>> {
    return ok([]);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any params for testing
  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async sendPushNotification(params: any): Promise<Result<any[], AnyError>> {
    return ok([
      {
        id: "mock-notification-job-id",
        notificationId: "mock-notification-id",
        userId: params.userId,
        channel: "mobile",
        status: "sent",
        title: params.title,
        body: params.body,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    ]);
  }

  async sendToChannel(
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any channel for testing
    channel: any,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  ): Promise<Result<any, AnyError>> {
    return ok({
      id: "mock-notification-job-id",
      notificationId: "mock-notification-id",
      userId,
      channel,
      status: "sent",
      title,
      body,
      data,
      sentAt: new Date(),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async getNotificationStatus(jobId: string): Promise<Result<any, AnyError>> {
    return ok({
      id: jobId,
      status: "delivered",
      sentAt: new Date(),
      deliveredAt: new Date(),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock method returns any for testing
  async retryFailedNotification(jobId: string): Promise<Result<any, AnyError>> {
    return ok({
      id: jobId,
      status: "retrying",
      retriedAt: new Date(),
    });
  }

  async processNotificationQueue(): Promise<Result<number, AnyError>> {
    return ok(0);
  }

  async updateDeliveryStatus(
    jobId: string,
    status: "delivered" | "failed",
    reason?: string,
  ): Promise<Result<void, AnyError>> {
    return ok(undefined);
  }
}

/**
 * Creates a complete mock context with all services mocked
 * @param overrides - Partial context to override specific services
 * @returns Complete Context with all required services
 */
export function createMockContext(overrides: Partial<Context> = {}): Context {
  const defaultContext: Context = {
    // User domain
    userRepository: new MockUserRepository(),
    passwordHasher: new MockPasswordHasher(),
    authService: new MockAuthService(),

    // Region domain
    regionRepository: new MockRegionRepository(),

    // Location domain
    locationRepository: new MockLocationRepository(),

    // Check-in domain
    checkInRepository: new MockCheckInRepository(),

    // Favorite domain
    favoriteRepository: new MockFavoriteRepository(),

    // File upload domain
    fileUploadRepository: new MockFileUploadRepository(),

    // Moderation domain
    moderationRepository: new MockModerationRepository(),

    // Notification domain
    notificationRepository: new MockNotificationRepository(),
    notificationService: new MockNotificationService(),
    pushNotificationService: new MockPushNotificationService(),

    // Billing domain
    billingRepository: new MockBillingRepository(),
    paymentGateway: new MockPaymentGateway(),

    // Common services
    mapsService: new MockMapsService(),
    fileStorageService: new MockFileStorageService(),

    // Monitoring services
    metricsCollector: new MockMetricsCollector(),
    alertManager: new MockAlertManager(),

    // Backup services
    backupService: new MockBackupService(),

    // Privacy services
    privacyService: new MockPrivacyService(),
  };

  return { ...defaultContext, ...overrides };
}
