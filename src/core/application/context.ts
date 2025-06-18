import type { BillingRepository } from "../domain/billing/ports/billingRepository";
import type { PaymentGateway } from "../domain/billing/ports/paymentGateway";
import type { CheckInRepository } from "../domain/checkIn/ports/checkInRepository";
import type { FavoriteRepository } from "../domain/favorite/ports/favoriteRepository";
import type { LocationRepository } from "../domain/location/ports/locationRepository";
import type { ModerationRepository } from "../domain/moderation/ports/moderationRepository";
import type { NotificationRepository } from "../domain/notification/ports/notificationRepository";
import type { NotificationService } from "../domain/notification/ports/notificationService";
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

  // Moderation domain
  moderationRepository: ModerationRepository;

  // Notification domain
  notificationRepository: NotificationRepository;
  notificationService: NotificationService;

  // Billing domain
  billingRepository: BillingRepository;
  paymentGateway: PaymentGateway;
}
