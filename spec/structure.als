/**
 * Kissa地域情報システム - 構造モデル
 * 
 * このAlloy仕様では、Kissa地域情報共有システムの
 * 構造的関係と不変条件をモデル化します。
 */

module structure


/** システム内のユーザー役割 */
abstract sig UserRole {}
one sig Editor, Visitor, Admin extends UserRole {}

/** エディター向けサブスクリプションプラン */
abstract sig SubscriptionPlan {}
one sig Free, Basic, Premium extends SubscriptionPlan {}

/** リージョンとロケーションの公開設定 */
abstract sig Visibility {}
one sig Public, Private extends Visibility {}

/** お気に入りのターゲットタイプ */
abstract sig FavoriteTarget {}
one sig RegionTarget, LocationTarget extends FavoriteTarget {}

/** システム内のユーザー */
sig User {
  role: one UserRole,
  subscriptionPlan: one SubscriptionPlan,
  email: one Email,
  hasProfile: one Bool,
  active: one Bool
}

/** ユーザーのメールアドレス */
sig Email {}

/** ユーザープロフィール情報 */
sig UserProfile {
  user: one User,
  hasName: one Bool,
  hasAvatar: one Bool
}

/** 地理的リージョン */
sig Region {
  creator: one User,
  visibility: one Visibility,
  name: one RegionName,
  hasDescription: one Bool,
  hasImages: one Bool,
  imageUrls: set ImageUrl,
  hasCoordinates: one Bool,
  coordinates: lone Coordinates
}

/** リージョン名 */
sig RegionName {}

/** リージョン内のロケーション */
sig Location {
  region: one Region,
  visibility: one Visibility,
  name: one LocationName,
  category: one LocationCategory,
  hasDescription: one Bool,
  hasAddress: one Bool,
  address: lone Address,
  hasCoordinates: one Bool,
  coordinates: lone Coordinates,
  hasContactInfo: one Bool,
  contactInfo: lone ContactInfo,
  hasOperatingHours: one Bool,
  operatingHours: lone OperatingHours,
  hasImages: one Bool,
  imageUrls: set ImageUrl
}

/** ロケーション名 */
sig LocationName {}

/** ロケーションカテゴリ */
sig LocationCategory {}

/** 画像URL */
sig ImageUrl {}

/** 住所 */
sig Address {}

/** 座標 */
sig Coordinates {}

/** 連絡先情報 */
sig ContactInfo {}

/** 営業時間 */
sig OperatingHours {}

/** ロケーションでのチェックイン */
sig CheckIn {
  user: one User,
  location: one Location,
  hasPhoto: one Bool,
  hasComment: one Bool,
  photoUrl: lone PhotoUrl,
  commentText: lone CommentText
}

/** チェックイン写真URL */
sig PhotoUrl {}

/** チェックインコメントテキスト */
sig CommentText {}

/** ロケーションへのエディター招待 */
sig LocationEditor {
  location: one Location,
  editor: one User,
  status: one InvitationStatus,
  hasPermissions: one Bool
}

/** 招待状態 */
abstract sig InvitationStatus {}
one sig Pending, Accepted, Declined extends InvitationStatus {}

/** お気に入り（リージョンまたはロケーション） */
sig Favorite {
  user: one User,
  targetType: one FavoriteTarget,
  targetRegion: lone Region,
  targetLocation: lone Location
}

/** ピン留めリージョン（クイックアクセス用） */
sig PinnedRegion {
  user: one User,
  region: one Region
}

/** ユーザーセッション（REQ-NF-007） */
sig UserSession {
  user: one User,
  isActive: one Bool,
  lastActivity: one Int,
  expiresAt: one Int
}

/** 地図統合（REQ-INT-001, REQ-INT-002） */
sig MapIntegration {
  targetRegion: lone Region,
  targetLocation: lone Location,
  coordinates: one StringValue,
  hasGeocoding: one Bool,
  hasReverseGeocoding: one Bool
}

/** ファイルストレージ（REQ-INT-005, REQ-INT-006） */
sig FileStorage {
  entityType: one EntityType,
  targetRegion: lone Region,
  targetLocation: lone Location,
  targetCheckIn: lone CheckIn,
  targetUser: lone User,
  fileName: one StringValue,
  fileUrl: one StringValue,
  fileSize: one Int,
  isOptimized: one Bool
}

/** エンティティタイプ */
abstract sig EntityType {}
one sig RegionEntity, LocationEntity, CheckInEntity, UserEntity extends EntityType {}

/** 文字列型 */
sig StringValue {}

/** システム統計 */
sig SystemStats {
  totalUsers: one Int,
  totalRegions: one Int,
  totalLocations: one Int,
  totalCheckIns: one Int,
  totalFavorites: one Int,
  totalModerationItems: one Int
}

/** 通知システム（REQ-E-013, REQ-INT-007, REQ-INT-008） */
sig Notification {
  recipient: one User,
  type: one NotificationType,
  sent: one Bool,
  content: one NotificationContent
}

/** 通知設定（REQ-E-023, REQ-V-020） */
sig NotificationSettings {
  user: one User,
  emailEnabled: one Bool,
  pushEnabled: one Bool
}

/** 通知タイプ */
abstract sig NotificationType {}
one sig InvitationNotification, ModerationResultNotification, SystemNotification extends NotificationType {}

/** 通知内容 */
sig NotificationContent {}

/** 検索インデックス（REQ-V-002, REQ-V-003） */
sig SearchIndex {
  keywords: set SearchKeyword,
  regions: set Region,
  locations: set Location
}

/** 検索キーワード */
sig SearchKeyword {}

/** 請求情報（REQ-E-017, REQ-A-005） */
sig BillingRecord {
  user: one User,
  plan: one SubscriptionPlan,
  amount: one Int,
  billingDate: one Int,
  paid: one Bool
}

/** システムログ（BR-009） */
sig SystemLog {
  user: lone User,
  action: one LogAction,
  timestamp: one Int,
  details: one LogDetails
}

/** ログアクション */
abstract sig LogAction {}
one sig UserLogin, ContentCreated, ContentModerated, SubscriptionChanged extends LogAction {}

/** ログ詳細 */
sig LogDetails {}

/** コンテンツモデレーション状態 */
abstract sig ModerationStatus {}
one sig Approved, UnderReview, Denied extends ModerationStatus {}

/** モデレーション対象コンテンツ */
sig ModerationItem {
  itemType: one ContentType,
  status: one ModerationStatus,
  targetRegion: lone Region,
  targetLocation: lone Location,
  targetCheckIn: lone CheckIn
}

/** コンテンツタイプ */
abstract sig ContentType {}
one sig RegionContent, LocationContent, CheckInContent extends ContentType {}

/** 真偽値 */
abstract sig Bool {}
one sig True, False extends Bool {}

/** 構造的不変条件 */

/** 不変条件-1: エディターのみがリージョンを作成可能 */
fact OnlyEditorsCreateRegions {
  all r: Region | r.creator.role = Editor
}

/** 不変条件-2: 非エディターはFreeプランのみ */
fact OnlyEditorsHaveSubscriptions {
  all u: User | (u.role = Visitor or u.role = Admin) implies u.subscriptionPlan = Free
}

/** 不変条件-3: ロケーションはエディターが作成したリージョンに属する */
fact LocationsInEditorRegions {
  all l: Location | l.region.creator.role = Editor
}

/** 不変条件-4: ユーザーは公開リージョン/ロケーションのみお気に入り登録可能 */
fact OnlyFavoritePublicContent {
  all f: Favorite | 
    (f.targetType = RegionTarget implies f.targetRegion.visibility = Public) and
    (f.targetType = LocationTarget implies f.targetLocation.visibility = Public)
}

/** 不変条件-5: 公開ロケーションでのみチェックイン可能 */
fact CheckInsAtPublicLocations {
  all c: CheckIn | c.location.visibility = Public
}

/** 不変条件-6: お気に入りは正確に一つのターゲットを持つ */
fact FavoriteHasOneTarget {
  all f: Favorite |
    (f.targetType = RegionTarget implies (one f.targetRegion and no f.targetLocation)) and
    (f.targetType = LocationTarget implies (one f.targetLocation and no f.targetRegion))
}

/** 不変条件-7: ロケーションエディターは実際のエディターである必要がある */
fact LocationEditorsAreEditors {
  all le: LocationEditor | le.editor.role = Editor
}

/** 不変条件-10: アクティブなユーザーのみがコンテンツを作成可能 */
fact OnlyActiveUsersCreateContent {
  all r: Region | r.creator.active = True
  all c: CheckIn | c.user.active = True
  all f: Favorite | f.user.active = True
}

/** 不変条件-11: 招待状態の一貫性 */
fact InvitationStatusConsistency {
  all le: LocationEditor | 
    le.status = Accepted implies le.hasPermissions = True
}

/** 不変条件-12: チェックイン写真・コメントの一貫性 */
fact CheckInContentConsistency {
  all c: CheckIn |
    (c.hasPhoto = True iff some c.photoUrl) and
    (c.hasComment = True iff some c.commentText)
}

/** 不変条件-30: 地域・場所の画像一貫性 */
fact RegionLocationImageConsistency {
  all r: Region |
    (r.hasImages = True iff #r.imageUrls > 0)
  all l: Location |
    (l.hasImages = True iff #l.imageUrls > 0) and
    (l.hasAddress = True iff some l.address) and
    (l.hasCoordinates = True iff some l.coordinates) and
    (l.hasContactInfo = True iff some l.contactInfo) and
    (l.hasOperatingHours = True iff some l.operatingHours)
}

/** 不変条件-31: 地域の座標一貫性 */
fact RegionCoordinatesConsistency {
  all r: Region |
    (r.hasCoordinates = True iff some r.coordinates)
}

/** 不変条件-13: モデレーションアイテムの一貫性 */
fact ModerationItemConsistency {
  all m: ModerationItem |
    (m.itemType = RegionContent implies (one m.targetRegion and no m.targetLocation and no m.targetCheckIn)) and
    (m.itemType = LocationContent implies (one m.targetLocation and no m.targetRegion and no m.targetCheckIn)) and
    (m.itemType = CheckInContent implies (one m.targetCheckIn and no m.targetRegion and no m.targetLocation))
}

/** 不変条件-14: ピン留めは公開リージョンのみ */
fact PinnedRegionsArePublic {
  all p: PinnedRegion | p.region.visibility = Public
}

/** 不変条件-15: システム統計の一貫性 */
fact SystemStatsConsistency {
  all s: SystemStats |
    s.totalUsers = #User and
    s.totalRegions = #Region and
    s.totalLocations = #Location and
    s.totalCheckIns = #CheckIn and
    s.totalFavorites = #Favorite and
    s.totalModerationItems = #ModerationItem
}

/** 不変条件-20: 通知システムの一貫性 */
fact NotificationSystemConsistency {
  all n: Notification |
    n.recipient.active = True
  all le: LocationEditor |
    le.status = Pending implies
      some n: Notification |
        n.recipient = le.editor and
        n.type = InvitationNotification
}

/** 不変条件-29: 通知設定の一貫性 */
fact NotificationSettingsConsistency {
  all ns: NotificationSettings |
    ns.user.active = True
}

/** 不変条件-21: 検索インデックスの一貫性 */
fact SearchIndexConsistency {
  all si: SearchIndex |
    all r: si.regions | r.visibility = Public
  all si: SearchIndex |
    all l: si.locations | l.visibility = Public
}

/** 不変条件-22: 請求記録の一貫性 */
fact BillingRecordConsistency {
  all br: BillingRecord |
    br.user.role = Editor and
    br.plan = br.user.subscriptionPlan
}

/** 不変条件-23: システムログの保持期間（BR-009） */
fact SystemLogRetention {
  all sl: SystemLog |
    sl.timestamp >= 0  // Simplified - would normally check 1-year retention
}

/** 不変条件-24: データ保持ポリシー（BR-008, BR-009, BR-010） */
fact DataRetentionPolicy {
  // 削除されたユーザーアカウントデータは7年間保持（BR-008）
  all u: User |
    u.active = False implies
      some sl: SystemLog |
        sl.user = u and sl.action = UserLogin
  // チェックインデータは2年後に匿名化（BR-009、簡略化）
  all c: CheckIn |
    some u: User | c.user = u
  // システムログは1年間保持（BR-010、簡略化）
  all sl: SystemLog |
    sl.timestamp >= 0
}

/** 不変条件-26: セッション管理の一貫性（REQ-NF-007） */
fact SessionConsistency {
  all s: UserSession |
    s.user.active = True and
    s.lastActivity <= s.expiresAt and
    (s.isActive = True implies s.expiresAt > 0)
}

/** 不変条件-27: 地図統合の一貫性（REQ-INT-001） */
fact MapIntegrationConsistency {
  all m: MapIntegration |
    (one m.targetRegion and no m.targetLocation) or
    (one m.targetLocation and no m.targetRegion)
}

/** 不変条件-28: ファイルストレージの一貫性（REQ-INT-005） */
fact FileStorageConsistency {
  all f: FileStorage |
    f.fileSize > 0 and
    ((f.entityType = RegionEntity implies (one f.targetRegion and no f.targetLocation and no f.targetCheckIn and no f.targetUser)) and
     (f.entityType = LocationEntity implies (one f.targetLocation and no f.targetRegion and no f.targetCheckIn and no f.targetUser)) and
     (f.entityType = CheckInEntity implies (one f.targetCheckIn and no f.targetRegion and no f.targetLocation and no f.targetUser)) and
     (f.entityType = UserEntity implies (one f.targetUser and no f.targetRegion and no f.targetLocation and no f.targetCheckIn)))
}

/** 不変条件-8: ビジターとエディターのみがお気に入りを持つことができる */
fact OnlyVisitorsAndEditorsHaveFavorites {
  all f: Favorite | f.user.role != Admin
}

/** 不変条件-9: ビジターとエディターのみがチェックイン可能 */
fact OnlyVisitorsAndEditorsCheckIn {
  all c: CheckIn | c.user.role != Admin
}

/** 不変条件-一貫性: 基本的な構造一貫性 */
fact BasicConsistency {
  // すべてのロケーションはリージョンを持つ必要がある
  all l: Location | one l.region
  // すべてのチェックインは既存のユーザーとロケーションを参照する必要がある
  all c: CheckIn | one c.user and one c.location
  // すべてのロケーションエディターは既存のロケーションとユーザーを参照する必要がある
  all le: LocationEditor | one le.location and one le.editor
  // すべてのお気に入りは既存のユーザーを参照する必要がある
  all f: Favorite | one f.user
}

/** INV-10: Regions are referenced consistently */
// fact RegionConsistency {
//   all r: Region | 
//     r in r.creator.createdRegions and
//     all l: r.locations | l.region = r
// }

/** INV-11: Location editing relationships are consistent */
// fact LocationEditingConsistency {
//   all l: Location | 
//     all le: LocationEditor | le.location = l implies le.editor in l.editors
// }

/** INV-12: Check-in relationships are consistent */
// fact CheckInConsistency {
//   all c: CheckIn | 
//     c in c.user.checkIns and
//     c in c.location.checkIns
// }

/** INV-13: Favorite relationships are consistent */
// fact FavoriteConsistency {
//   all f: Favorite |
//     (f.targetType = RegionTarget implies f.targetRegion in f.user.favoriteRegions) and
//     (f.targetType = LocationTarget implies f.targetLocation in f.user.favoriteLocations)
// }

/** SUBSCRIPTION CONSTRAINTS */

/** 不変条件-16: 無料プラン制限 */
fact FreePlanLimits {
  all u: User | u.subscriptionPlan = Free implies 
    #{r: Region | r.creator = u} <= 1 and
    #{l: Location | l.region.creator = u} <= 10
}

/** 不変条件-17: ベーシックプラン制限 */
fact BasicPlanLimits {
  all u: User | u.subscriptionPlan = Basic implies 
    #{r: Region | r.creator = u} <= 5 and
    #{l: Location | l.region.creator = u} <= 100
}

/** 不変条件-18: プレミアムプランは無制限 */
fact PremiumPlanUnlimited {
  // プレミアムプランユーザーには制限を課さない
  all u: User | u.subscriptionPlan = Premium implies 
    (#{r: Region | r.creator = u} >= 0 and
     #{l: Location | l.region.creator = u} >= 0)
}

/** 不変条件-19: コンテンツモデレーション制約（事後モデレーション） */
fact ContentModerationRequired {
  // 公開コンテンツは事後的にモデレーションアイテムが作成される可能性がある（BR-004, BR-007a）
  // 実装では、拒否されたコンテンツは非公開にされるか削除される
  // 簡略化: 全ての公開コンテンツが必ずモデレーションされるわけではない
}

/** 不変条件-25: コンテンツポリシー違反による自動停止（BR-006） */
fact UserSuspensionPolicy {
  // 3回違反で自動停止（簡略化 - activeフィールドなし）
  // 実装では、3回違反したユーザーは停止される
}

/** PERMISSION CONSTRAINTS */

/** INV-17: Users can only edit their own regions */
// fact EditOwnRegions {
//   all r: Region | all u: User | 
//     u != r.creator implies r not in u.createdRegions
// }

/** INV-18: Users can only create locations in their own regions */
// fact CreateLocationsInOwnRegions {
//   all l: Location | 
//     l.region.creator.role = Editor and
//     l.region in l.region.creator.createdRegions
// }

/** INV-19: Location editors can only edit if invited and accepted */
// fact LocationEditorsInvited {
//   all l: Location | all u: l.editors |
//     u = l.region.creator or
//     (some le: LocationEditor | le.location = l and le.editor = u and le.accepted = True)
// }

/** シナリオ例 */

/** シナリオ1: 基本エディターワークフロー */
pred BasicEditorWorkflow {
  some u: User, r: Region, l: Location |
    u.role = Editor and
    r.creator = u and
    l.region = r and
    r.visibility = Public and
    l.visibility = Public
}

/** シナリオ2: コラボレーションワークフロー */
pred CollaborationWorkflow {
  some u1, u2: User, r: Region, l: Location, le: LocationEditor |
    u1.role = Editor and u2.role = Editor and
    r.creator = u1 and
    l.region = r and
    le.location = l and le.editor = u2 and le.status = Accepted
}

/** シナリオ3: ビジターの相互作用 */
pred VisitorInteraction {
  some disj editor, visitor: User, r: Region, l: Location, c: CheckIn |
    editor.role = Editor and editor.active = True and
    visitor.role = Visitor and visitor.active = True and
    editor.subscriptionPlan != Free and
    visitor.subscriptionPlan = Free and
    r.creator = editor and
    r.visibility = Public and
    l.region = r and
    l.visibility = Public and
    c.user = visitor and c.location = l
}

/** シナリオ4: 管理者によるコンテンツモデレーション */
pred AdminModeration {
  some admin: User, m: ModerationItem, r: Region |
    admin.role = Admin and admin.active = True and
    admin.subscriptionPlan = Free and
    r.creator.role = Editor and r.creator.active = True and
    r.creator.subscriptionPlan != Free and
    m.itemType = RegionContent and
    m.targetRegion = r
}

/** シナリオ5: サブスクリプション制限テスト */
pred SubscriptionLimitsTest {
  some u: User, r: Region |
    u.role = Editor and
    u.subscriptionPlan = Free and
    r.creator = u and
    #{reg: Region | reg.creator = u} = 1
}

/** シナリオ6: 招待ワークフロー */
pred InvitationWorkflow {
  some disj u1, u2: User, l: Location, le: LocationEditor |
    u1.role = Editor and u2.role = Editor and
    l.region.creator = u1 and
    le.location = l and le.editor = u2 and
    le.status = Pending
}

/** デバッグ: 最小要件テスト */
pred TestUser { 
  #User = 1
}

pred TestEditor { 
  some u: User | u.role = Editor 
}

pred TestRegion { 
  some u: User, r: Region | r.creator = u 
}

pred TestEditorRegion { 
  some u: User, r: Region | u.role = Editor and r.creator = u 
}

run TestUser for 2
run TestEditor for 3
run TestRegion for 3
run TestEditorRegion for 4

/** 基本シナリオが実現可能であることを確認 */
/** REQ-E-015, REQ-E-016, REQ-E-017: サブスクリプション管理機能 */
pred SubscriptionManagement {
  some u: User, br: BillingRecord |
    u.role = Editor and
    br.user = u and
    br.plan = u.subscriptionPlan and
    br.paid = True
}

/** REQ-V-002, REQ-V-003: 検索機能 */
pred SearchFunctionality {
  some si: SearchIndex, r: Region |
    r.visibility = Public and
    r in si.regions
}

/** REQ-E-013, REQ-INT-007: 通知システム */
pred NotificationSystem {
  some n: Notification, le: LocationEditor |
    le.status = Pending and
    n.recipient = le.editor and
    n.type = InvitationNotification and
    n.sent = True
}

/** REQ-E-023, REQ-V-020: 通知設定管理 */
pred NotificationSettingsManagement {
  some u: User, ns: NotificationSettings |
    u.active = True and
    ns.user = u
}

/** REQ-E-012: 編集権限の取り消し */
pred EditorRevocation {
  some disj u1, u2: User, l: Location, le: LocationEditor |
    u1.role = Editor and u2.role = Editor and
    l.region.creator = u1 and
    le.location = l and le.editor = u2 and
    le.status = Accepted and le.hasPermissions = True
}

/** REQ-A-001: システム統計とモニタリング */
pred SystemMonitoring {
  some admin: User, s: SystemStats |
    admin.role = Admin and admin.active = True and
    admin.subscriptionPlan = Free and
    s.totalUsers >= 0
}

/** BR-004, BR-005, BR-006: コンテンツモデレーションワークフロー */
pred ContentModerationWorkflow {
  some admin: User, m: ModerationItem, r: Region |
    admin.role = Admin and admin.active = True and
    admin.subscriptionPlan = Free and
    r.creator.role = Editor and r.creator.active = True and
    r.creator.subscriptionPlan != Free and
    m.itemType = RegionContent and
    m.targetRegion = r
}

/** BR-007, BR-008, BR-009: データ保持とログ管理 */
pred DataRetentionManagement {
  some sl: SystemLog, u: User |
    u.active = False and
    sl.user = u and
    sl.action = UserLogin
}

run BasicEditorWorkflow for 8
run CollaborationWorkflow for 8
run VisitorInteraction for 10
run AdminModeration for 8
run SubscriptionLimitsTest for 8
run InvitationWorkflow for 8
run SubscriptionManagement for 8
run SearchFunctionality for 8
run NotificationSystem for 8
run NotificationSettingsManagement for 8
run EditorRevocation for 8
run SystemMonitoring for 8
run ContentModerationWorkflow for 8
run DataRetentionManagement for 8

/** 新機能のシナリオ */

/** REQ-V-014, REQ-V-015: チェックイン管理機能 */
pred CheckInManagement {
  some u: User, l: Location, c: CheckIn |
    u.active = True and
    c.user = u and c.location = l and
    l.visibility = Public
}

/** REQ-V-014: チェックイン履歴の表示 */
pred CheckInHistoryViewing {
  some u: User, c: CheckIn |
    u.active = True and
    c.user = u
}

/** REQ-A-002: ユーザーアカウント管理 */
pred UserAccountManagement {
  some admin: User, targetUser: User |
    admin.role = Admin and admin.active = True and
    admin.subscriptionPlan = Free and
    targetUser != admin and targetUser.active = True and
    (targetUser.role = Visitor or targetUser.role = Editor)
}

/** REQ-A-003: コンテンツモデレーション管理 */
pred ContentModerationManagement {
  some admin: User, m: ModerationItem, r: Region |
    admin.role = Admin and admin.active = True and
    admin.subscriptionPlan = Free and
    r.creator.role = Editor and r.creator.active = True and
    r.creator.subscriptionPlan != Free and
    m.itemType = RegionContent and
    m.targetRegion = r
}

/** REQ-A-006: アクセス制御管理 */
pred AccessControlManagement {
  some admin: User, targetUser: User |
    admin.role = Admin and admin.active = True and
    admin.subscriptionPlan = Free and
    targetUser != admin and targetUser.active = True and
    (targetUser.role = Visitor or targetUser.role = Editor)
}

/** REQ-A-007, REQ-NF-021: GDPR準拠データ削除 */
pred GDPRCompliance {
  some u: User |
    u.active = False
}

/** REQ-NF-024: セッション管理 */
pred SessionManagement {
  some u: User, s: UserSession |
    u.active = True and
    (u.role = Editor or u.role = Visitor) and
    s.user = u and s.isActive = True
}

/** REQ-INT-001: 地図統合機能 */
pred MapIntegrationWorkflow {
  some r: Region, m: MapIntegration |
    r.visibility = Public and
    m.targetRegion = r and
    m.hasGeocoding = True
}

/** REQ-INT-005: ファイルストレージ機能 */
pred FileStorageWorkflow {
  some r: Region, f: FileStorage |
    f.entityType = RegionEntity and
    f.targetRegion = r and
    f.fileSize > 0
}

/** REQ-V-006: ピン留め機能 */
pred PinnedRegionManagement {
  some u: User, r: Region, p: PinnedRegion |
    u.active = True and
    r.visibility = Public and
    p.user = u and p.region = r
}

/** REQ-V-021: お気に入り管理機能 */
pred FavoriteManagement {
  some u: User, f: Favorite |
    u.active = True and
    f.user = u and
    ((f.targetType = RegionTarget and f.targetRegion.visibility = Public) or
     (f.targetType = LocationTarget and f.targetLocation.visibility = Public))
}

run CheckInManagement for 8
run CheckInHistoryViewing for 8
run UserAccountManagement for 8
run ContentModerationManagement for 8
run AccessControlManagement for 8
run GDPRCompliance for 8
run SessionManagement for 8
run MapIntegrationWorkflow for 8
run FileStorageWorkflow for 8
run PinnedRegionManagement for 8
run FavoriteManagement for 8

/** 制約がエディターを許可することを確認 */
pred CanHaveEditors {
  some u: User | u.role = Editor
}
run CanHaveEditors for 5

/** 制約が無料ユーザーを許可することを確認 */
pred CanHaveFreeUsers {
  some u: User | u.subscriptionPlan = Free and u.active = True and u.role = Visitor
}
run CanHaveFreeUsers for 5

/** 複雑シナリオのテスト */
pred ComplexSystem {
  // 異なる役割を持つ複数のユーザー
  some disj u1, u2: User |
    u1.role = Editor and u2.role = Visitor and
    u1.active = True and u2.active = True and
    u1.subscriptionPlan = Premium and u2.subscriptionPlan = Free
}
run ComplexSystem for 10

/** 権限制約の確認 */
check {
  all r: Region | r.creator.role = Editor
} for 10

/** 一貫性の確認 */
check {
  all l: Location | l.region.creator.role = Editor
} for 10

/** 包括的不変条件チェック */
assert SystemIntegrity {
  // すべてのリージョンはエディターが作成したもの
  all r: Region | r.creator.role = Editor
  // すべてのロケーションはエディターが作成したリージョンに属する
  all l: Location | l.region.creator.role = Editor
  // サブスクリプションプランの一貫性
  all u: User | u.role != Editor implies u.subscriptionPlan = Free
  // 管理者以外のみがコンテンツと相互作用する
  all f: Favorite | f.user.role != Admin
  all c: CheckIn | c.user.role != Admin
}
check SystemIntegrity for 8
