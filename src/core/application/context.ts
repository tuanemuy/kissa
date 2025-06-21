import type { BackupService } from "../domain/backup/ports/backupService";
import type { BillingRepository } from "../domain/billing/ports/billingRepository";
import type { PaymentGateway } from "../domain/billing/ports/paymentGateway";
import type { CheckInRepository } from "../domain/checkIn/ports/checkInRepository";
import type { FileStorageService } from "../domain/common/ports/fileStorageService";
import type { MapsService } from "../domain/common/ports/mapsService";
import type { FavoriteRepository } from "../domain/favorite/ports/favoriteRepository";
import type { FileUploadRepository } from "../domain/fileUpload/ports/fileUploadRepository";
import type { LocationRepository } from "../domain/location/ports/locationRepository";
import type { ModerationRepository } from "../domain/moderation/ports/moderationRepository";
import type { AlertManager } from "../domain/monitoring/ports/alertManager";
import type { MetricsCollector } from "../domain/monitoring/ports/metricsCollector";
import type { NotificationRepository } from "../domain/notification/ports/notificationRepository";
import type { NotificationService } from "../domain/notification/ports/notificationService";
import type { PushNotificationService } from "../domain/notification/ports/pushNotificationService";
import type { PrivacyService } from "../domain/privacy/ports/privacyService";
import type { RegionRepository } from "../domain/region/ports/regionRepository";
import type { AuthService } from "../domain/user/ports/authService";
import type { PasswordHasher } from "../domain/user/ports/passwordHasher";
import type { UserRepository } from "../domain/user/ports/userRepository";

export interface Context {
  // User domain
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  authService: AuthService;

  // Region domain
  regionRepository: RegionRepository;

  // Location domain
  locationRepository: LocationRepository;

  // Check-in domain
  checkInRepository: CheckInRepository;

  // Favorite domain
  favoriteRepository: FavoriteRepository;

  // File upload domain
  fileUploadRepository: FileUploadRepository;

  // Moderation domain
  moderationRepository: ModerationRepository;

  // Notification domain
  notificationRepository: NotificationRepository;
  notificationService: NotificationService;
  pushNotificationService: PushNotificationService;

  // Billing domain
  billingRepository: BillingRepository;
  paymentGateway: PaymentGateway;

  // Common services
  mapsService: MapsService;
  fileStorageService: FileStorageService;

  // Monitoring services
  metricsCollector: MetricsCollector;
  alertManager: AlertManager;

  // Backup services
  backupService: BackupService;

  // Privacy services
  privacyService: PrivacyService;
}
