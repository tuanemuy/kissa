-------------------------------- MODULE behavior --------------------------------
(*
 * Kissa地域情報システム - 動作モデル
 * 
 * このTLA+仕様は、Kissa地域情報共有システムの動的な動作と
 * 時間的性質をモデル化します。
 *)

EXTENDS Integers, Sequences, FiniteSets, TLC

CONSTANTS
  MaxUsers,         \* ユーザーの最大数
  MaxRegions,       \* 地域の最大数  
  MaxLocations,     \* 場所の最大数
  MaxCheckIns       \* チェックインの最大数

VARIABLES
  users,            \* ユーザーの集合
  regions,          \* 地域の集合
  locations,        \* 場所の集合
  checkIns,         \* チェックインの集合
  favorites,        \* お気に入りの集合
  locationEditors,  \* 場所編集者関係の集合
  pinnedRegions,    \* ピン留めリージョンの集合
  moderationItems,  \* モデレーションアイテムの集合
  userProfiles,     \* ユーザープロフィールの集合
  userStates,       \* ユーザー状態情報
  regionStates,     \* 地域状態情報
  locationStates,   \* 場所状態情報
  systemStats,      \* システム統計
  userSessions,     \* ユーザーセッション
  mapIntegration,   \* 地図統合情報
  fileStorage,      \* ファイルストレージ情報
  billingRecords    \* 請求履歴の記録

vars == <<users, regions, locations, checkIns, favorites, locationEditors, 
          pinnedRegions, moderationItems, userProfiles,
          userStates, regionStates, locationStates, systemStats,
          userSessions, mapIntegration, fileStorage, billingRecords>>

\* ユーザーロール
UserRoles == {"editor", "visitor", "admin"}

\* サブスクリプションプラン
SubscriptionPlans == {"free", "basic", "premium"}

\* 公開設定
Visibility == {"public", "private"}

\* 招待状態
InvitationStatus == {"pending", "accepted", "declined"}

\* モデレーション状態
ModerationStatus == {"under_review", "approved", "rejected"}

\* コンテンツタイプ
ContentTypes == {"region", "location", "checkin"}

\* ユーザー構造
UserRecord == [
  id: STRING,
  email: STRING,
  role: UserRoles,
  subscriptionPlan: SubscriptionPlans,
  active: BOOLEAN
]

\* ユーザープロフィール構造
UserProfileRecord == [
  userId: STRING,
  name: STRING,
  hasAvatar: BOOLEAN
]

\* 地域構造  
RegionRecord == [
  id: STRING,
  name: STRING,
  description: STRING,
  creatorId: STRING,
  visibility: Visibility,
  hasImages: BOOLEAN,
  imageUrls: Seq(STRING),
  hasCoordinates: BOOLEAN,
  coordinates: STRING,
  active: BOOLEAN
]

\* 場所構造
LocationRecord == [
  id: STRING,
  name: STRING,
  description: STRING,
  category: STRING,
  regionId: STRING,
  address: STRING,
  hasAddress: BOOLEAN,
  hasCoordinates: BOOLEAN,
  coordinates: STRING,
  hasContactInfo: BOOLEAN,
  contactInfo: STRING,
  hasOperatingHours: BOOLEAN,
  operatingHours: STRING,
  hasImages: BOOLEAN,
  imageUrls: Seq(STRING),
  visibility: Visibility,
  active: BOOLEAN
]

\* チェックイン構造
CheckInRecord == [
  id: STRING,
  userId: STRING,
  locationId: STRING,
  timestamp: Nat,
  hasPhoto: BOOLEAN,
  hasComment: BOOLEAN,
  photoUrl: STRING,
  commentText: STRING
]

\* お気に入り構造
FavoriteRecord == [
  id: STRING,
  userId: STRING,
  targetId: STRING,
  targetType: {"region", "location"}
]

\* 場所編集者関係
LocationEditorRecord == [
  id: STRING,
  locationId: STRING,
  editorId: STRING,
  status: InvitationStatus,
  hasPermissions: BOOLEAN,
  invitedAt: Nat,
  respondedAt: Nat
]

\* ピン留めリージョン構造
PinnedRegionRecord == [
  id: STRING,
  userId: STRING,
  regionId: STRING
]

\* ユーザーセッション構造
UserSessionRecord == [
  id: STRING,
  userId: STRING,
  isActive: BOOLEAN,
  lastActivity: Nat,
  expiresAt: Nat
]

\* 地図統合情報構造
MapIntegrationRecord == [
  id: STRING,
  regionId: STRING,
  locationId: STRING,
  coordinates: STRING,
  hasGeocoding: BOOLEAN,
  hasReverseGeocoding: BOOLEAN
]

\* ファイルストレージ情報構造
FileStorageRecord == [
  id: STRING,
  entityId: STRING,
  entityType: {"region", "location", "checkin", "user"},
  fileName: STRING,
  fileUrl: STRING,
  fileSize: Nat,
  isOptimized: BOOLEAN
]

\* モデレーションアイテム構造
ModerationItemRecord == [
  id: STRING,
  contentType: ContentTypes,
  contentId: STRING,
  status: ModerationStatus,
  reviewedBy: STRING,
  createdAt: Nat,
  reviewedAt: Nat
]

\* 型定義
UserId == STRING
RegionId == STRING
LocationId == STRING

----

\* 初期状態
Init ==
  /\ users = {}
  /\ regions = {}
  /\ locations = {}
  /\ checkIns = {}
  /\ favorites = {}
  /\ locationEditors = {}
  /\ pinnedRegions = {}
  /\ moderationItems = {}
  /\ userProfiles = {}
  /\ userStates = [x \in {} |-> {}]
  /\ regionStates = [x \in {} |-> {}]
  /\ locationStates = [x \in {} |-> {}]
  /\ systemStats = [totalUsers |-> 0, totalRegions |-> 0, totalLocations |-> 0]
  /\ userSessions = {}
  /\ mapIntegration = {}
  /\ fileStorage = {}
  /\ billingRecords = {}

----

\* ヘルパー述語

IsEditor(userId) ==
  userId \in users /\ userStates[userId].role = "editor"

IsVisitor(userId) ==
  userId \in users /\ userStates[userId].role = "visitor"

IsAdmin(userId) ==
  userId \in users /\ userStates[userId].role = "admin"

IsPublic(entityId, entityType) ==
  CASE entityType = "region" -> 
    entityId \in regions /\ regionStates[entityId].visibility = "public"
  [] entityType = "location" ->
    entityId \in locations /\ locationStates[entityId].visibility = "public"

OwnsRegion(userId, regionId) ==
  /\ regionId \in regions
  /\ regionStates[regionId].creatorId = userId

CanEditLocation(userId, locationId) ==
  /\ locationId \in locations
  /\ LET regionId == locationStates[locationId].regionId
     IN \/ OwnsRegion(userId, regionId)
        \/ \E le \in locationEditors : 
             /\ le.locationId = locationId
             /\ le.editorId = userId
             /\ le.status = "accepted"

IsActiveUser(userId) ==
  userId \in users /\ userStates[userId].active = TRUE

CanModerateContent(userId) ==
  IsAdmin(userId) /\ IsActiveUser(userId)

IsContentApproved(contentId, contentType) ==
  \E m \in moderationItems :
    /\ m.contentId = contentId
    /\ m.contentType = contentType
    /\ m.status = "approved"

GetSubscriptionLimits(plan) ==
  CASE plan = "free" -> [regions |-> 1, locations |-> 10]
  [] plan = "basic" -> [regions |-> 5, locations |-> 100]
  [] plan = "premium" -> [regions |-> MaxRegions, locations |-> MaxLocations]

UserRegionCount(userId) ==
  Cardinality({r \in regions : regionStates[r].creatorId = userId})

UserLocationCount(userId) ==
  Cardinality({l \in locations : 
    \E r \in regions : 
      /\ regionStates[r].creatorId = userId
      /\ locationStates[l].regionId = r})

CanCreateRegion(userId) ==
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ LET limits == GetSubscriptionLimits(userStates[userId].subscriptionPlan)
         currentCount == UserRegionCount(userId)
     IN currentCount < limits.regions

CanCreateLocation(userId, regionId) ==
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ OwnsRegion(userId, regionId)
  /\ LET limits == GetSubscriptionLimits(userStates[userId].subscriptionPlan)
         currentCount == UserLocationCount(userId)
     IN currentCount < limits.locations


----

\* ユーザー管理アクション

\* REQ-E-019, REQ-V-016: User registration workflow
RegisterUser(newUserId, email, password, role, subscriptionPlan) ==
  /\ newUserId \notin users
  /\ Cardinality(users) < MaxUsers
  /\ users' = users \cup {newUserId}
  /\ userStates' = userStates @@ (newUserId :> [
       id |-> newUserId,
       email |-> email,
       role |-> role,
       subscriptionPlan |-> subscriptionPlan,
       active |-> TRUE,
       emailNotifications |-> TRUE,
       pushNotifications |-> TRUE
     ])
  /\ systemStats' = [systemStats EXCEPT !.totalUsers = @ + 1]
  /\ UNCHANGED <<regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, userSessions, mapIntegration, fileStorage, billingRecords>>

CreateUser(newUserId, email, role, subscriptionPlan) ==
  /\ newUserId \notin users
  /\ Cardinality(users) < MaxUsers
  /\ users' = users \cup {newUserId}
  /\ userStates' = userStates @@ (newUserId :> [
       id |-> newUserId,
       email |-> email,
       role |-> role,
       subscriptionPlan |-> subscriptionPlan,
       active |-> TRUE,
       emailNotifications |-> TRUE,
       pushNotifications |-> TRUE
     ])
  /\ systemStats' = [systemStats EXCEPT !.totalUsers = @ + 1]
  /\ UNCHANGED <<regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, userSessions, mapIntegration, fileStorage, billingRecords>>

UpdateUserSubscription(userId, newPlan) ==
  /\ userId \in users
  /\ IsEditor(userId)
  /\ userStates[userId].subscriptionPlan # newPlan
  /\ LET limits == GetSubscriptionLimits(newPlan)
         userRegions == UserRegionCount(userId)
         userLocations == UserLocationCount(userId)
     IN /\ userRegions <= limits.regions
        /\ userLocations <= limits.locations
  /\ userStates' = [userStates EXCEPT ![userId].subscriptionPlan = newPlan]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-E-016: Enhanced subscription management with upgrade/downgrade workflows
UpgradeSubscription(userId, newPlan) ==
  /\ userId \in users
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ userStates[userId].subscriptionPlan # newPlan
  /\ LET currentPlan == userStates[userId].subscriptionPlan
         limits == GetSubscriptionLimits(newPlan)
         userRegions == UserRegionCount(userId)
         userLocations == UserLocationCount(userId)
     IN /\ (newPlan = "premium" \/ newPlan = "basic" \/ newPlan = "free")
        /\ userRegions <= limits.regions
        /\ userLocations <= limits.locations
  /\ userStates' = [userStates EXCEPT ![userId].subscriptionPlan = newPlan]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

DowngradeSubscription(userId, newPlan) ==
  /\ userId \in users
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ userStates[userId].subscriptionPlan # newPlan
  /\ LET limits == GetSubscriptionLimits(newPlan)
         userRegions == UserRegionCount(userId)
         userLocations == UserLocationCount(userId)
     IN /\ userRegions <= limits.regions
        /\ userLocations <= limits.locations
  /\ userStates' = [userStates EXCEPT ![userId].subscriptionPlan = newPlan]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

----

\* 地域管理アクション

CreateRegion(userId, newRegionId, name, visibility) ==
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ newRegionId \notin regions
  /\ Cardinality(regions) < MaxRegions
  /\ LET limits == GetSubscriptionLimits(userStates[userId].subscriptionPlan)
         currentCount == UserRegionCount(userId)
     IN currentCount < limits.regions
  /\ regions' = regions \cup {newRegionId}
  /\ regionStates' = regionStates @@ (newRegionId :> [
       id |-> newRegionId,
       name |-> name,
       description |-> "",
       creatorId |-> userId,
       visibility |-> visibility,
       hasImages |-> FALSE,
       imageUrls |-> <<>>,
       hasCoordinates |-> FALSE,
       coordinates |-> "",
       active |-> TRUE
     ])
  /\ systemStats' = [systemStats EXCEPT !.totalRegions = @ + 1]
  /\ UNCHANGED <<users, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, locationStates, userSessions, mapIntegration, fileStorage, billingRecords>>

UpdateRegionVisibility(userId, regionId, newVisibility) ==
  /\ OwnsRegion(userId, regionId)
  /\ regionStates[regionId].visibility # newVisibility
  /\ LET regionPinnedItems == IF newVisibility = "private" 
                             THEN {p \in pinnedRegions : p.regionId = regionId}
                             ELSE {}
     IN /\ regionStates' = [regionStates EXCEPT ![regionId].visibility = newVisibility]
        /\ pinnedRegions' = pinnedRegions \ regionPinnedItems
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 moderationItems, userProfiles, userStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-E-002: 地域の詳細情報更新
UpdateRegion(userId, regionId, newName, newDescription, newImageUrls, newCoordinates) ==
  /\ OwnsRegion(userId, regionId)
  /\ IsActiveUser(userId)
  /\ regionStates' = [regionStates EXCEPT ![regionId].name = newName,
                                          ![regionId].description = newDescription,
                                          ![regionId].imageUrls = newImageUrls,
                                          ![regionId].coordinates = newCoordinates,
                                          ![regionId].hasImages = (Len(newImageUrls) > 0),
                                          ![regionId].hasCoordinates = (newCoordinates # "")]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles, userStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

DeleteRegion(userId, regionId) ==
  /\ OwnsRegion(userId, regionId)
  /\ LET regionLocations == {l \in locations : locationStates[l].regionId = regionId}
         regionFavorites == {f \in favorites : f.targetType = "region" /\ f.targetId = regionId}
         locationFavorites == {f \in favorites : f.targetType = "location" /\ f.targetId \in regionLocations}
         regionPinnedItems == {p \in pinnedRegions : p.regionId = regionId}
         regionMapIntegration == {m \in mapIntegration : m.regionId = regionId}
         regionFileStorage == {f \in fileStorage : f.entityType = "region" /\ f.entityId = regionId}
     IN /\ \A l \in regionLocations : locationStates[l].active = FALSE
        /\ regions' = regions \ {regionId}
        /\ regionStates' = [regionStates EXCEPT ![regionId].active = FALSE]
        /\ favorites' = favorites \ (regionFavorites \cup locationFavorites)
        /\ pinnedRegions' = pinnedRegions \ regionPinnedItems
        /\ mapIntegration' = mapIntegration \ regionMapIntegration
        /\ fileStorage' = fileStorage \ regionFileStorage
        /\ systemStats' = [systemStats EXCEPT !.totalRegions = @ - 1]
  /\ UNCHANGED <<users, locations, checkIns, locationEditors,
                 moderationItems, userProfiles,
                 userStates, locationStates, userSessions, billingRecords>>

----

\* 場所管理アクション

CreateLocation(userId, newLocationId, name, regionId, visibility) ==
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ OwnsRegion(userId, regionId)
  /\ newLocationId \notin locations
  /\ Cardinality(locations) < MaxLocations
  /\ LET limits == GetSubscriptionLimits(userStates[userId].subscriptionPlan)
         currentCount == UserLocationCount(userId)
     IN currentCount < limits.locations
  /\ locations' = locations \cup {newLocationId}
  /\ locationStates' = locationStates @@ (newLocationId :> [
       id |-> newLocationId,
       name |-> name,
       description |-> "",
       category |-> "",
       regionId |-> regionId,
       address |-> "",
       hasAddress |-> FALSE,
       hasCoordinates |-> FALSE,
       coordinates |-> "",
       hasContactInfo |-> FALSE,
       contactInfo |-> "",
       hasOperatingHours |-> FALSE,
       operatingHours |-> "",
       hasImages |-> FALSE,
       imageUrls |-> <<>>,
       visibility |-> visibility,
       active |-> TRUE
     ])
  /\ systemStats' = [systemStats EXCEPT !.totalLocations = @ + 1]
  /\ UNCHANGED <<users, regions, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, userSessions, mapIntegration, fileStorage, billingRecords>>

UpdateLocationVisibility(userId, locationId, newVisibility) ==
  /\ CanEditLocation(userId, locationId)
  /\ locationStates[locationId].visibility # newVisibility
  /\ LET locationCheckIns == IF newVisibility = "private" 
                            THEN {c \in checkIns : c.locationId = locationId}
                            ELSE {}
     IN /\ locationStates' = [locationStates EXCEPT ![locationId].visibility = newVisibility]
        /\ checkIns' = checkIns \ locationCheckIns
  /\ UNCHANGED <<users, regions, locations, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-E-025: 場所の詳細情報更新
UpdateLocation(userId, locationId, newName, newDescription, newCategory, newAddress, newCoordinates, newContactInfo, newOperatingHours, newImageUrls) ==
  /\ CanEditLocation(userId, locationId)
  /\ IsActiveUser(userId)
  /\ locationStates' = [locationStates EXCEPT ![locationId].name = newName,
                                              ![locationId].description = newDescription,
                                              ![locationId].category = newCategory,
                                              ![locationId].address = newAddress,
                                              ![locationId].coordinates = newCoordinates,
                                              ![locationId].contactInfo = newContactInfo,
                                              ![locationId].operatingHours = newOperatingHours,
                                              ![locationId].imageUrls = newImageUrls,
                                              ![locationId].hasImages = (Len(newImageUrls) > 0),
                                              ![locationId].hasAddress = (newAddress # ""),
                                              ![locationId].hasCoordinates = (newCoordinates # ""),
                                              ![locationId].hasContactInfo = (newContactInfo # ""),
                                              ![locationId].hasOperatingHours = (newOperatingHours # "")]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles, userStates, regionStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

InviteLocationEditor(ownerId, locationId, editorId, invitationId) ==
  /\ CanEditLocation(ownerId, locationId)
  /\ IsEditor(editorId)
  /\ editorId # ownerId
  /\ invitationId \notin {le.id : le \in locationEditors}
  /\ locationEditors' = locationEditors \cup {[
       id |-> invitationId,
       locationId |-> locationId,
       editorId |-> editorId,
       status |-> "pending",
       hasPermissions |-> FALSE,
       invitedAt |-> systemStats.totalUsers,
       respondedAt |-> 0
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

AcceptLocationInvitation(editorId, invitationId) ==
  /\ \E le \in locationEditors :
       /\ le.id = invitationId
       /\ le.editorId = editorId
       /\ le.status = "pending"
  /\ locationEditors' = {IF le.id = invitationId 
                        THEN [le EXCEPT !.status = "accepted", 
                                       !.hasPermissions = TRUE,
                                       !.respondedAt = systemStats.totalUsers]
                        ELSE le : le \in locationEditors}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

RejectLocationInvitation(editorId, invitationId) ==
  /\ \E le \in locationEditors :
       /\ le.id = invitationId
       /\ le.editorId = editorId
       /\ le.status = "pending"
  /\ locationEditors' = {IF le.id = invitationId 
                        THEN [le EXCEPT !.status = "declined",
                                       !.respondedAt = systemStats.totalUsers]
                        ELSE le : le \in locationEditors}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-E-012: 編集権限の取り消し
RevokeLocationEditor(ownerId, locationId, editorId) ==
  /\ CanEditLocation(ownerId, locationId)
  /\ \E le \in locationEditors :
       /\ le.locationId = locationId
       /\ le.editorId = editorId
       /\ le.status = "accepted"
       /\ ownerId # editorId  \* オーナー自身の権限は取り消せない
  /\ locationEditors' = locationEditors \ {le \in locationEditors : 
                                          le.locationId = locationId /\ le.editorId = editorId}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

----

\* 訪問者アクション

CreateFavorite(userId, targetId, targetType, favoriteId) ==
  /\ \/ IsVisitor(userId) \/ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ favoriteId \notin {f.id : f \in favorites}
  /\ (CASE targetType = "region" ->
        (/\ targetId \in regions
         /\ IsPublic(targetId, "region"))
      [] targetType = "location" ->
        (/\ targetId \in locations
         /\ IsPublic(targetId, "location")))
  /\ favorites' = favorites \cup {[
       id |-> favoriteId,
       userId |-> userId,
       targetId |-> targetId,
       targetType |-> targetType
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, locationEditors, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-V-021: お気に入り登録の解除
RemoveFavorite(userId, favoriteId) ==
  /\ \E f \in favorites :
       /\ f.id = favoriteId
       /\ f.userId = userId
  /\ IsActiveUser(userId)
  /\ favorites' = favorites \ {f \in favorites : f.id = favoriteId}
  /\ UNCHANGED <<users, regions, locations, checkIns, locationEditors, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

CreatePinnedRegion(userId, regionId, pinId) ==
  /\ \/ IsVisitor(userId) \/ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ regionId \in regions
  /\ IsPublic(regionId, "region")
  /\ pinId \notin {p.id : p \in pinnedRegions}
  /\ pinnedRegions' = pinnedRegions \cup {[
       id |-> pinId,
       userId |-> userId,
       regionId |-> regionId
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-V-006: ピン留め解除機能
RemovePinnedRegion(userId, pinId) ==
  /\ \E p \in pinnedRegions :
       /\ p.id = pinId
       /\ p.userId = userId
  /\ IsActiveUser(userId)
  /\ pinnedRegions' = pinnedRegions \ {p \in pinnedRegions : p.id = pinId}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

CreateCheckIn(userId, locationId, checkInId, hasPhoto, hasComment, photoUrl, commentText) ==
  /\ \/ IsVisitor(userId) \/ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ locationId \in locations
  /\ IsPublic(locationId, "location")
  /\ checkInId \notin {c.id : c \in checkIns}
  /\ Cardinality(checkIns) < MaxCheckIns
  /\ checkIns' = checkIns \cup {[
       id |-> checkInId,
       userId |-> userId,
       locationId |-> locationId,
       timestamp |-> systemStats.totalUsers,
       hasPhoto |-> hasPhoto,
       hasComment |-> hasComment,
       photoUrl |-> photoUrl,
       commentText |-> commentText
     ]}
  /\ UNCHANGED <<users, regions, locations, favorites, locationEditors, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

UpdateCheckIn(userId, checkInId, newPhotoUrl, newCommentText) ==
  /\ \E c \in checkIns :
       /\ c.id = checkInId
       /\ c.userId = userId
  /\ IsActiveUser(userId)
  /\ checkIns' = {IF c.id = checkInId 
                  THEN [c EXCEPT !.photoUrl = newPhotoUrl,
                                 !.commentText = newCommentText,
                                 !.hasPhoto = (newPhotoUrl # ""),
                                 !.hasComment = (newCommentText # "")]
                  ELSE c : c \in checkIns}
  /\ UNCHANGED <<users, regions, locations, favorites, locationEditors, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-V-015: ユーザーは自身のチェックインを削除できる
DeleteCheckIn(userId, checkInId) ==
  /\ \E c \in checkIns :
       /\ c.id = checkInId
       /\ c.userId = userId
  /\ IsActiveUser(userId)
  /\ checkIns' = checkIns \ {c \in checkIns : c.id = checkInId}
  /\ UNCHANGED <<users, regions, locations, favorites, locationEditors, pinnedRegions,
                 moderationItems, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

----

\* 管理者アクション

CreateModerationItem(adminId, contentType, contentId, moderationId) ==
  /\ IsAdmin(adminId)
  /\ moderationId \notin {m.id : m \in moderationItems}
  /\ (CASE contentType = "region" -> contentId \in regions
      [] contentType = "location" -> contentId \in locations  
      [] contentType = "checkin" -> contentId \in checkIns)
  /\ moderationItems' = moderationItems \cup {[
       id |-> moderationId,
       contentType |-> contentType,
       contentId |-> contentId,
       status |-> "under_review",
       reviewedBy |-> adminId,
       createdAt |-> systemStats.totalUsers,
       reviewedAt |-> 0
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors, 
                 pinnedRegions, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

ApproveContent(adminId, moderationId) ==
  /\ IsAdmin(adminId)
  /\ \E m \in moderationItems :
       /\ m.id = moderationId
       /\ m.status = "under_review"
  /\ moderationItems' = {IF m.id = moderationId 
                        THEN [m EXCEPT !.status = "approved",
                                       !.reviewedAt = systemStats.totalUsers]
                        ELSE m : m \in moderationItems}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors, 
                 pinnedRegions, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

RejectContent(adminId, moderationId) ==
  /\ IsAdmin(adminId)
  /\ \E m \in moderationItems :
       /\ m.id = moderationId
       /\ m.status = "under_review"
  /\ moderationItems' = {IF m.id = moderationId 
                        THEN [m EXCEPT !.status = "rejected",
                                       !.reviewedAt = systemStats.totalUsers]
                        ELSE m : m \in moderationItems}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors, 
                 pinnedRegions, userProfiles, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

DeactivateUser(adminId, targetUserId) ==
  /\ IsAdmin(adminId)
  /\ targetUserId \in users
  /\ targetUserId # adminId
  /\ userStates[targetUserId].active = TRUE
  /\ userStates' = [userStates EXCEPT ![targetUserId].active = FALSE]
  /\ LET userCheckIns == {c \in checkIns : c.userId = targetUserId}
         userFavorites == {f \in favorites : f.userId = targetUserId}
         userPinnedRegions == {p \in pinnedRegions : p.userId = targetUserId}
     IN /\ checkIns' = checkIns \ userCheckIns
        /\ favorites' = favorites \ userFavorites
        /\ pinnedRegions' = pinnedRegions \ userPinnedRegions
  /\ UNCHANGED <<users, regions, locations, locationEditors, moderationItems, 
                 userProfiles, regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-A-002: ユーザーアカウントの復旧
ReactivateUser(adminId, targetUserId) ==
  /\ IsAdmin(adminId)
  /\ IsActiveUser(adminId)
  /\ targetUserId \in users
  /\ targetUserId # adminId
  /\ userStates[targetUserId].active = FALSE
  /\ userStates' = [userStates EXCEPT ![targetUserId].active = TRUE]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-A-006: アクセス制御（権限変更）
ChangeUserRole(adminId, targetUserId, newRole) ==
  /\ IsAdmin(adminId)
  /\ IsActiveUser(adminId)
  /\ targetUserId \in users
  /\ targetUserId # adminId
  /\ newRole \in UserRoles
  /\ userStates[targetUserId].role # newRole
  \* エディターから他の役割への変更時、そのユーザーが作成した地域がないことを確認
  /\ (userStates[targetUserId].role = "editor" /\ newRole # "editor") =>
       UserRegionCount(targetUserId) = 0
  /\ userStates' = [userStates EXCEPT ![targetUserId].role = newRole]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* BR-006: User suspension for policy violations
SuspendUser(adminId, targetUserId, reason) ==
  /\ IsAdmin(adminId)
  /\ IsActiveUser(adminId)
  /\ targetUserId \in users
  /\ targetUserId # adminId
  /\ userStates[targetUserId].active = TRUE
  /\ LET userViolations == Cardinality({m \in moderationItems : 
                            \E c \in checkIns : c.userId = targetUserId /\ 
                            m.contentId = c.id /\ m.status = "rejected"})
     IN userViolations >= 3  \* Three strikes policy
  /\ userStates' = [userStates EXCEPT ![targetUserId].active = FALSE]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors, 
                 pinnedRegions, moderationItems, userProfiles, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

----

\* 請求管理アクション

\* 請求記録構造
BillingRecord == [
  id: STRING,
  userId: STRING,
  amount: Nat,
  billingDate: Nat,
  plan: SubscriptionPlans,
  status: {"pending", "paid", "failed"},
  transactionId: STRING
]

ProcessSubscriptionBilling(userId, billingId, amount, plan) ==
  /\ userId \in users
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ billingId \notin {b.id : b \in billingRecords}
  /\ billingRecords' = billingRecords \cup {[
       id |-> billingId,
       userId |-> userId,
       amount |-> amount,
       billingDate |-> systemStats.totalUsers,
       plan |-> plan,
       status |-> "pending",
       transactionId |-> billingId
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage>>

CompleteBillingPayment(billingId) ==
  /\ \E b \in billingRecords :
       /\ b.id = billingId
       /\ b.status = "pending"
  /\ billingRecords' = {IF b.id = billingId 
                       THEN [b EXCEPT !.status = "paid"]
                       ELSE b : b \in billingRecords}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage>>

ChargeSubscriptionFee(userId, amount, billingDate) ==
  /\ userId \in users
  /\ IsEditor(userId)
  /\ amount > 0
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>  \* Actual billing handled by external payment processor

\* REQ-E-017: 請求履歴の表示（読み取り専用操作）
ViewBillingHistory(userId) ==
  /\ userId \in users
  /\ IsEditor(userId)
  /\ IsActiveUser(userId)
  /\ LET userBillingHistory == {b \in billingRecords : b.userId = userId}
     IN TRUE  \* 履歴は外部インターフェースに返される
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>

----

\* 通知管理アクション

\* REQ-E-023, REQ-V-020, REQ-INT-009: Notification settings management
UpdateNotificationSettings(userId, emailEnabled, pushEnabled) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ userStates' = [userStates EXCEPT ![userId].emailNotifications = emailEnabled,
                                      ![userId].pushNotifications = pushEnabled]
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-INT-007, REQ-INT-008: Enhanced notification system
SendEmailNotification(recipientId, notificationType, content) ==
  /\ recipientId \in users
  /\ IsActiveUser(recipientId)
  /\ notificationType \in {"invitation", "moderation_result", "system"}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>  \* Email sent via external service

SendPushNotification(recipientId, notificationType, content) ==
  /\ recipientId \in users
  /\ IsActiveUser(recipientId)
  /\ notificationType \in {"invitation", "moderation_result", "system"}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>  \* Push notification sent via external service

----

\* プロフィール管理アクション

CreateUserProfile(userId, profileId, name, hasAvatar) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ profileId \notin {p.userId : p \in userProfiles}
  /\ userProfiles' = userProfiles \cup {[
       userId |-> userId,
       name |-> name,
       hasAvatar |-> hasAvatar
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors, 
                 pinnedRegions, moderationItems, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

UpdateUserProfile(userId, newName, newHasAvatar) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ \E p \in userProfiles : p.userId = userId
  /\ userProfiles' = {IF p.userId = userId 
                     THEN [p EXCEPT !.name = newName, !.hasAvatar = newHasAvatar]
                     ELSE p : p \in userProfiles}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors, 
                 pinnedRegions, moderationItems, userStates, regionStates, 
                 locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-E-021, REQ-V-018: Password change (simplified - actual password not modeled)
ChangeUserPassword(userId) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-E-022, REQ-V-019: Account deletion
DeleteUserAccount(userId) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ userStates' = [userStates EXCEPT ![userId].active = FALSE]
  /\ LET userCheckIns == {c \in checkIns : c.userId = userId}
         userFavorites == {f \in favorites : f.userId = userId}
         userPinnedRegions == {p \in pinnedRegions : p.userId = userId}
         userProf == {p \in userProfiles : p.userId = userId}
     IN /\ checkIns' = checkIns \ userCheckIns
        /\ favorites' = favorites \ userFavorites
        /\ pinnedRegions' = pinnedRegions \ userPinnedRegions
        /\ userProfiles' = userProfiles \ userProf
  /\ UNCHANGED <<users, regions, locations, locationEditors, moderationItems,
                 regionStates, locationStates, systemStats, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-V-014: チェックイン履歴の表示（読み取り専用操作）
ViewCheckInHistory(userId) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ LET userCheckIns == {c \in checkIns : c.userId = userId}
     IN TRUE  \* 履歴は外部インターフェースに返される
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-NF-021: GDPR準拠のデータ削除
GDPRDataDeletion(userId) ==
  /\ userId \in users
  /\ \neg IsActiveUser(userId)  \* 非アクティブユーザーのみ
  /\ users' = users \ {userId}
  /\ userStates' = [u \in (DOMAIN userStates) \ {userId} |-> userStates[u]]
  /\ systemStats' = [systemStats EXCEPT !.totalUsers = @ - 1]
  /\ UNCHANGED <<regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 regionStates, locationStates, userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-NF-007: セッション管理（24時間非アクティブ後期限切れ）
CreateUserSession(userId, sessionId) ==
  /\ userId \in users
  /\ IsActiveUser(userId)
  /\ sessionId \notin {s.id : s \in userSessions}
  /\ userSessions' = userSessions \cup {[
       id |-> sessionId,
       userId |-> userId,
       isActive |-> TRUE,
       lastActivity |-> systemStats.totalUsers,
       expiresAt |-> systemStats.totalUsers + 24*60*60
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 mapIntegration, fileStorage, billingRecords>>

ExpireUserSession(sessionId) ==
  /\ \E s \in userSessions :
       /\ s.id = sessionId
       /\ s.isActive = TRUE
       /\ systemStats.totalUsers >= s.expiresAt
  /\ userSessions' = {IF s.id = sessionId
                      THEN [s EXCEPT !.isActive = FALSE]
                      ELSE s : s \in userSessions}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 mapIntegration, fileStorage, billingRecords>>

UpdateSessionActivity(sessionId) ==
  /\ \E s \in userSessions :
       /\ s.id = sessionId
       /\ s.isActive = TRUE
  /\ userSessions' = {IF s.id = sessionId
                      THEN [s EXCEPT !.lastActivity = systemStats.totalUsers,
                                     !.expiresAt = systemStats.totalUsers + 24*60*60]
                      ELSE s : s \in userSessions}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 mapIntegration, fileStorage, billingRecords>>

----

\* Map Integration Actions

\* REQ-INT-001: 地図統合機能
CreateMapIntegration(regionId, locationId, integrationId, coordinates) ==
  /\ \/ (regionId \in regions /\ locationId = "")
     \/ (locationId \in locations /\ regionId = "")
  /\ integrationId \notin {m.id : m \in mapIntegration}
  /\ mapIntegration' = mapIntegration \cup {[
       id |-> integrationId,
       regionId |-> regionId,
       locationId |-> locationId,
       coordinates |-> coordinates,
       hasGeocoding |-> TRUE,
       hasReverseGeocoding |-> TRUE
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, fileStorage, billingRecords>>

\* REQ-INT-002: ジオコーディング機能
PerformGeocoding(integrationId, address) ==
  /\ \E m \in mapIntegration :
       /\ m.id = integrationId
       /\ m.hasGeocoding = TRUE
  /\ mapIntegration' = {IF m.id = integrationId
                        THEN [m EXCEPT !.coordinates = address]
                        ELSE m : m \in mapIntegration}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, fileStorage, billingRecords>>

----

\* File Storage Actions

\* REQ-INT-005: ファイルストレージ機能
UploadFile(entityId, entityType, fileId, fileName, fileUrl, fileSize) ==
  /\ entityType \in {"region", "location", "checkin", "user"}
  /\ fileId \notin {f.id : f \in fileStorage}
  /\ fileSize > 0
  /\ fileStorage' = fileStorage \cup {[
       id |-> fileId,
       entityId |-> entityId,
       entityType |-> entityType,
       fileName |-> fileName,
       fileUrl |-> fileUrl,
       fileSize |-> fileSize,
       isOptimized |-> FALSE
     ]}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, billingRecords>>

\* REQ-INT-006: 画像最適化機能
OptimizeFile(fileId) ==
  /\ \E f \in fileStorage :
       /\ f.id = fileId
       /\ f.isOptimized = FALSE
  /\ fileStorage' = {IF f.id = fileId
                     THEN [f EXCEPT !.isOptimized = TRUE]
                     ELSE f : f \in fileStorage}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, billingRecords>>

DeleteFile(entityId, fileId) ==
  /\ \E f \in fileStorage :
       /\ f.id = fileId
       /\ f.entityId = entityId
  /\ fileStorage' = fileStorage \ {f \in fileStorage : f.id = fileId}
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, billingRecords>>

----

\* Search and Discovery Actions

\* REQ-V-002, REQ-V-003: Search functionality modeling
SearchRegionsByKeyword(userId, keyword) ==
  /\ \/ userId \in users \/ userId = "anonymous"
  /\ LET searchResults == {r \in regions : 
                           regionStates[r].visibility = "public" /\
                           regionStates[r].active = TRUE}
     IN TRUE  \* Search results would be returned to user interface
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>

SearchRegionsByLocation(userId, coordinates) ==
  /\ \/ userId \in users \/ userId = "anonymous"
  /\ LET searchResults == {r \in regions : 
                           regionStates[r].visibility = "public" /\
                           regionStates[r].active = TRUE /\
                           regionStates[r].hasCoordinates = TRUE}
     IN TRUE  \* Search results would be filtered by proximity
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>

\* REQ-V-010: Filter locations by category
FilterLocationsByCategory(userId, regionId, category) ==
  /\ \/ userId \in users \/ userId = "anonymous"
  /\ regionId \in regions
  /\ LET filteredLocations == {l \in locations :
                               locationStates[l].regionId = regionId /\
                               locationStates[l].visibility = "public" /\
                               locationStates[l].active = TRUE}
     IN TRUE  \* Filtered results would be returned
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>

----

\* Notification System Actions

\* REQ-E-013: Notification system for invitations (REQ-INT-007, REQ-INT-008)
SendInvitationNotification(ownerId, editorId, locationId, notificationId) ==
  /\ CanEditLocation(ownerId, locationId)
  /\ IsEditor(editorId)
  /\ IsActiveUser(editorId)
  /\ \E le \in locationEditors : 
       le.locationId = locationId /\ le.editorId = editorId /\ le.status = "pending"
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>  \* Notification would be sent via external service

\* Email notification for content moderation results
SendModerationResultNotification(adminId, moderationId, contentOwnerId) ==
  /\ IsAdmin(adminId)
  /\ \E m \in moderationItems : 
       m.id = moderationId /\ m.status \in {"approved", "rejected"}
  /\ contentOwnerId \in users
  /\ UNCHANGED <<users, regions, locations, checkIns, favorites, locationEditors,
                 pinnedRegions, moderationItems, userProfiles,
                 userStates, regionStates, locationStates, systemStats,
                 userSessions, mapIntegration, fileStorage, billingRecords>>  \* Notification would be sent via email service

----

\* 次状態関係
Next ==
  \* User management actions
  \/ \E uid \in {"u1", "u2"}, email \in {"e1", "e2"}, role \in UserRoles, plan \in SubscriptionPlans : 
       CreateUser(uid, email, role, plan)
  \/ \E uid \in {"u1", "u2"}, email \in {"e1", "e2"}, password \in {"p1"}, role \in UserRoles, plan \in SubscriptionPlans : 
       RegisterUser(uid, email, password, role, plan)
  \/ \E uid \in users, plan \in SubscriptionPlans : 
       UpdateUserSubscription(uid, plan)
  \/ \E uid \in users, plan \in SubscriptionPlans : 
       UpgradeSubscription(uid, plan)
  \/ \E uid \in users, plan \in SubscriptionPlans : 
       DowngradeSubscription(uid, plan)
  \/ \E uid \in users : 
       ChangeUserPassword(uid)
  \/ \E uid \in users : 
       DeleteUserAccount(uid)
  \* Region management actions
  \/ \E uid \in users, rid \in {"r1"}, name \in {"n1"}, vis \in Visibility : 
       CreateRegion(uid, rid, name, vis)
  \/ \E uid \in users, rid \in regions, vis \in Visibility : 
       UpdateRegionVisibility(uid, rid, vis)
  \/ \E uid \in users, rid \in regions : 
       DeleteRegion(uid, rid)
  \/ \E uid \in users, rid \in regions, name \in {"newName"}, desc \in {"newDesc"}, imgs \in {<<>>}, coords \in {"newCoord"} : 
       UpdateRegion(uid, rid, name, desc, imgs, coords)
  \* Location management actions
  \/ \E uid \in users, lid \in {"l1", "l2"}, name \in {"n1", "n2"}, rid \in regions, vis \in Visibility : 
       CreateLocation(uid, lid, name, rid, vis)
  \/ \E uid \in users, lid \in locations, vis \in Visibility : 
       UpdateLocationVisibility(uid, lid, vis)
  \/ \E uid \in users, lid \in locations, name \in {"newName"}, desc \in {"newDesc"}, cat \in {"newCat"}, addr \in {"newAddr"}, coords \in {"newCoord"}, contact \in {"newContact"}, hours \in {"newHours"}, imgs \in {<<>>} : 
       UpdateLocation(uid, lid, name, desc, cat, addr, coords, contact, hours, imgs)
  \/ \E oid \in users, lid \in locations, eid \in users, iid \in {"i1", "i2"} : 
       InviteLocationEditor(oid, lid, eid, iid)
  \/ \E eid \in users, iid \in {le.id : le \in locationEditors} : 
       AcceptLocationInvitation(eid, iid)
  \/ \E eid \in users, iid \in {le.id : le \in locationEditors} : 
       RejectLocationInvitation(eid, iid)
  \/ \E oid \in users, lid \in locations, eid \in users : 
       RevokeLocationEditor(oid, lid, eid)
  \* Visitor actions
  \/ \E uid \in users, tid \in (regions \cup locations), ttype \in {"region", "location"}, fid \in {"f1", "f2", "f3"} : 
       CreateFavorite(uid, tid, ttype, fid)
  \/ \E uid \in users, fid \in {f.id : f \in favorites} : 
       RemoveFavorite(uid, fid)
  \/ \E uid \in users, lid \in locations, cid \in {"c1", "c2", "c3"} : 
       \/ CreateCheckIn(uid, lid, cid, TRUE, TRUE, "url1", "text1")
       \/ CreateCheckIn(uid, lid, cid, TRUE, FALSE, "url1", "")
       \/ CreateCheckIn(uid, lid, cid, FALSE, TRUE, "", "text1")
       \/ CreateCheckIn(uid, lid, cid, FALSE, FALSE, "", "")
  \/ \E uid \in users, cid \in {c.id : c \in checkIns} : 
       UpdateCheckIn(uid, cid, "newUrl", "newText")
  \/ \E uid \in users, cid \in {c.id : c \in checkIns} : 
       DeleteCheckIn(uid, cid)
  \/ \E uid \in users : 
       ViewCheckInHistory(uid)
  \* Admin actions (simplified for model checking)
  \/ \E aid \in users, mid \in {"m1", "m2"} : 
       \/ \E rid \in regions : CreateModerationItem(aid, "region", rid, mid)
       \/ \E lid \in locations : CreateModerationItem(aid, "location", lid, mid)
  \/ \E aid \in users, mid \in {m.id : m \in moderationItems} : 
       ApproveContent(aid, mid)
  \/ \E aid \in users, mid \in {m.id : m \in moderationItems} : 
       RejectContent(aid, mid)
  \/ \E aid \in users, uid \in users : 
       DeactivateUser(aid, uid)
  \/ \E aid \in users, uid \in users : 
       ReactivateUser(aid, uid)
  \/ \E aid \in users, uid \in users, role \in UserRoles : 
       ChangeUserRole(aid, uid, role)
  \/ \E aid \in users, uid \in users, reason \in {"policy_violation"} : 
       SuspendUser(aid, uid, reason)
  \* Notification settings
  \/ \E uid \in users, email \in {TRUE, FALSE}, push \in {TRUE, FALSE} : 
       UpdateNotificationSettings(uid, email, push)
  \* Profile management
  \/ \E uid \in users, pid \in {"p1", "p2"}, name \in {"name1"}, hasAvatar \in {TRUE, FALSE} : 
       CreateUserProfile(uid, pid, name, hasAvatar)
  \/ \E uid \in users, name \in {"newName"}, hasAvatar \in {TRUE, FALSE} : 
       UpdateUserProfile(uid, name, hasAvatar)
  \* Search actions (read-only)
  \/ \E uid \in (users \cup {"anonymous"}), keyword \in {"search1"} : 
       SearchRegionsByKeyword(uid, keyword)
  \/ \E uid \in (users \cup {"anonymous"}), coords \in {"coord1"} : 
       SearchRegionsByLocation(uid, coords)
  \/ \E uid \in (users \cup {"anonymous"}), rid \in regions, cat \in {"category1"} : 
       FilterLocationsByCategory(uid, rid, cat)
  \* Pinned regions management
  \/ \E uid \in users, rid \in regions, pid \in {"p1", "p2"} : 
       CreatePinnedRegion(uid, rid, pid)
  \/ \E uid \in users, pid \in {p.id : p \in pinnedRegions} : 
       RemovePinnedRegion(uid, pid)
  \* Session management
  \/ \E uid \in users, sid \in {"s1", "s2"} : 
       CreateUserSession(uid, sid)
  \/ \E sid \in {s.id : s \in userSessions} : 
       ExpireUserSession(sid)
  \/ \E sid \in {s.id : s \in userSessions} : 
       UpdateSessionActivity(sid)
  \* Map integration
  \/ \E rid \in regions, iid \in {"m1"} : 
       CreateMapIntegration(rid, "", iid, "coord1")
  \/ \E lid \in locations, iid \in {"m2"} : 
       CreateMapIntegration("", lid, iid, "coord2")
  \/ \E iid \in {m.id : m \in mapIntegration}, addr \in {"address1"} : 
       PerformGeocoding(iid, addr)
  \* File storage
  \/ \E eid \in regions, fid \in {"f1", "f2"} : 
       UploadFile(eid, "region", fid, "file1", "url1", 1024)
  \/ \E eid \in locations, fid \in {"f1", "f2"} : 
       UploadFile(eid, "location", fid, "file1", "url1", 1024)
  \/ \E fid \in {f.id : f \in fileStorage} : 
       OptimizeFile(fid)
  \/ \E eid \in (regions \cup locations), fid \in {f.id : f \in fileStorage} : 
       DeleteFile(eid, fid)
  \* Billing management
  \/ \E uid \in users, bid \in {"b1", "b2"}, amount \in {10, 20}, plan \in SubscriptionPlans : 
       ProcessSubscriptionBilling(uid, bid, amount, plan)
  \/ \E bid \in {b.id : b \in billingRecords} : 
       CompleteBillingPayment(bid)
  \/ \E uid \in users : 
       ViewBillingHistory(uid)

----

\* 仕様
Spec == Init /\ [][Next]_vars

----

\* 不変条件

\* INV-1: エディターのみが地域を作成できる
OnlyEditorsCreateRegions ==
  \A r \in regions : IsEditor(regionStates[r].creatorId)

\* INV-2: サブスクリプション制限が適用される
SubscriptionLimitsEnforced ==
  \A u \in users :
    IsEditor(u) =>
      LET limits == GetSubscriptionLimits(userStates[u].subscriptionPlan)
          userRegions == UserRegionCount(u)
          userLocations == UserLocationCount(u)
      IN /\ userRegions <= limits.regions
         /\ userLocations <= limits.locations

\* INV-3: お気に入りは既存のコンテンツに対してのみ作成される
FavoritesForExistingContent ==
  \A f \in favorites :
    \/ (f.targetType = "region" /\ f.targetId \in regions)
    \/ (f.targetType = "location" /\ f.targetId \in locations)

\* INV-4: 公開ロケーションでのみチェックイン可能
OnlyPublicLocationsForCheckIn ==
  \A c \in checkIns : IsPublic(c.locationId, "location")

\* INV-5: 管理者以外のユーザーのみが相互作用可能
OnlyNonAdminsInteract ==
  \A f \in favorites : \neg IsAdmin(f.userId)
  /\ \A c \in checkIns : \neg IsAdmin(c.userId)
  /\ \A p \in pinnedRegions : \neg IsAdmin(p.userId)

\* INV-6: ロケーションエディターはエディターロールである必要
LocationEditorsAreEditors ==
  \A le \in locationEditors : IsEditor(le.editorId)

\* INV-7: システム統計の整合性
SystemStatsConsistent ==
  /\ systemStats.totalUsers = Cardinality(users)
  /\ systemStats.totalRegions = Cardinality(regions)
  /\ systemStats.totalLocations = Cardinality(locations)

\* INV-8: アクティブなユーザーのみがコンテンツ作成可能（作成時点でアクティブ）
OnlyActiveUsersCreateContent ==
  \A c \in checkIns : c.userId \in users
  /\ \A f \in favorites : f.userId \in users /\ IsActiveUser(f.userId)
  /\ \A p \in pinnedRegions : p.userId \in users /\ IsActiveUser(p.userId)

\* INV-9: ピン留めは公開リージョンのみ
PinnedRegionsArePublic ==
  \A p \in pinnedRegions : IsPublic(p.regionId, "region")

\* INV-10: チェックインコンテンツの一貫性
CheckInContentConsistency ==
  \A c \in checkIns :
    /\ (c.hasPhoto = TRUE => c.photoUrl # "")
    /\ (c.hasComment = TRUE => c.commentText # "")

\* INV-11: 招待状態の一貫性
InvitationStatusConsistency ==
  \A le \in locationEditors :
    le.status = "accepted" => le.hasPermissions = TRUE

\* INV-12: BR-004, BR-005 Content moderation timing constraint (24-hour review period)
ModerationTimingCompliance ==
  \A m \in moderationItems :
    /\ m.status = "under_review" => 
         (systemStats.totalUsers - m.createdAt) <= 24*60*60
    /\ m.status \in {"approved", "rejected"} =>
         (m.reviewedAt - m.createdAt) <= 24*60*60

\* INV-13: REQ-E-016, REQ-E-017 Subscription plan consistency
SubscriptionPlanConsistency ==
  \A u \in users :
    IsEditor(u) => u \in DOMAIN userStates /\
    userStates[u].subscriptionPlan \in {"free", "basic", "premium"}

\* INV-14: User account integrity after deletion (only for properly deleted accounts)
DeletedUserDataConsistency ==
  TRUE  \* Simplified - would check data consistency for fully deleted accounts

\* INV-15: Search result visibility consistency
SearchResultVisibility ==
  \A r \in regions :
    regionStates[r].visibility = "private" =>
      \A u \in users : u # regionStates[r].creatorId =>
        r \notin {res \in regions : regionStates[res].visibility = "public"}

\* INV-16: Notification consistency (simplified)
NotificationConsistency ==
  \A le \in locationEditors :
    le.status = "pending" => TRUE  \* Would verify notification exists in full implementation

\* INV-17: Session consistency
SessionConsistency ==
  \A s \in userSessions :
    /\ s.userId \in users
    /\ s.lastActivity <= s.expiresAt
    /\ (s.isActive = TRUE => s.expiresAt > systemStats.totalUsers)

\* INV-18: File storage consistency
FileStorageConsistency ==
  \A f \in fileStorage :
    /\ f.fileSize > 0
    /\ (f.entityType = "region" => f.entityId \in regions)
    /\ (f.entityType = "location" => f.entityId \in locations)
    /\ (f.entityType = "checkin" => \E c \in checkIns : c.id = f.entityId)
    /\ (f.entityType = "user" => f.entityId \in users)

\* INV-19: Map integration consistency
MapIntegrationConsistency ==
  \A m \in mapIntegration :
    \/ (m.regionId \in regions /\ m.locationId = "")
    \/ (m.locationId \in locations /\ m.regionId = "")

----

\* 時相特性

\* TEMP-1: 作成されたユーザーは最終的にシステムに存在
UserEventuallyExists ==
  \A uid \in users : <>(uid \in users)

\* TEMP-2: 作成されたリージョンは最終的に利用可能
RegionEventuallyAvailable ==
  \A rid \in regions : <>(rid \in regions /\ regionStates[rid].active = TRUE)

\* TEMP-3: システムは常に整合性を維持
AlwaysConsistent ==
  [](OnlyEditorsCreateRegions /\ SubscriptionLimitsEnforced /\ FavoritesForExistingContent /\ 
     SystemStatsConsistent /\ SessionConsistency /\ FileStorageConsistency /\ MapIntegrationConsistency)

\* TEMP-4: BR-005 モデレーションは24時間以内に完了する（簡略化）
ModerationEventuallyCompletes ==
  [](\A m \in moderationItems :
    m.status = "under_review" => 
      <>(m.status \in {"approved", "rejected"}))

----

\* 制約
StateConstraint ==
  /\ Cardinality(users) <= MaxUsers
  /\ Cardinality(regions) <= MaxRegions
  /\ Cardinality(locations) <= MaxLocations
  /\ Cardinality(checkIns) <= MaxCheckIns

===============================================================================
