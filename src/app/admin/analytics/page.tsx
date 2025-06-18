import { getSystemStatistics } from "@/actions/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CreditCard,
  DollarSign,
  MapPin,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Suspense } from "react";

async function AnalyticsDashboard() {
  const stats = await getSystemStatistics();

  const userActivePercentage =
    stats.users.total > 0
      ? Math.round((stats.users.active / stats.users.total) * 100)
      : 0;

  const moderationPendingPercentage =
    stats.moderation.totalReports > 0
      ? Math.round(
          (stats.moderation.pendingReports / stats.moderation.totalReports) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">ユーザー統計</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                総ユーザー数
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total}</div>
              <p className="text-xs text-muted-foreground">
                アクティブ: {stats.users.active} / 非アクティブ:{" "}
                {stats.users.inactive}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                アクティブ率
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userActivePercentage}%</div>
              <Progress value={userActivePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">編集者数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.users.byRole.editors}
              </div>
              <p className="text-xs text-muted-foreground">
                来訪者: {stats.users.byRole.visitors} / 管理者:{" "}
                {stats.users.byRole.admins}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                有料プラン利用者
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.users.bySubscription.basic +
                  stats.users.bySubscription.premium}
              </div>
              <p className="text-xs text-muted-foreground">
                ベーシック: {stats.users.bySubscription.basic} / プレミアム:{" "}
                {stats.users.bySubscription.premium}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">コンテンツ統計</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">地域数</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.content.regions}</div>
              <p className="text-xs text-muted-foreground">公開済み地域</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">場所数</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.content.locations}
              </div>
              <p className="text-xs text-muted-foreground">登録済み場所</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                チェックイン数
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.content.checkIns}</div>
              <p className="text-xs text-muted-foreground">総チェックイン数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                お気に入り数
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.content.favorites}
              </div>
              <p className="text-xs text-muted-foreground">お気に入り登録数</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Moderation Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">モデレーション統計</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                総レポート数
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.moderation.totalReports}
              </div>
              <p className="text-xs text-muted-foreground">すべてのレポート</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">保留中</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.moderation.pendingReports}
              </div>
              <Progress value={moderationPendingPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">承認済み</CardTitle>
              <AlertTriangle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.moderation.approvedReports}
              </div>
              <p className="text-xs text-muted-foreground">
                承認されたレポート
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">却下済み</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.moderation.rejectedReports}
              </div>
              <p className="text-xs text-muted-foreground">
                却下されたレポート
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">収益統計</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総収益</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats.billing.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">累計収益</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">月間収益</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{stats.billing.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">今月の収益</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                アクティブ購読
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.billing.activeSubscriptions}
              </div>
              <p className="text-xs text-muted-foreground">有料プラン利用中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">転換率</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.users.total > 0
                  ? Math.round(
                      (stats.billing.activeSubscriptions / stats.users.total) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">無料→有料転換率</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Insights */}
      <div>
        <h2 className="text-xl font-semibold mb-4">クイック洞察</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>ユーザー活動</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">アクティブユーザー率</span>
                  <span className="text-sm font-medium">
                    {userActivePercentage}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">編集者比率</span>
                  <span className="text-sm font-medium">
                    {stats.users.total > 0
                      ? Math.round(
                          (stats.users.byRole.editors / stats.users.total) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">有料ユーザー率</span>
                  <span className="text-sm font-medium">
                    {stats.users.total > 0
                      ? Math.round(
                          ((stats.users.bySubscription.basic +
                            stats.users.bySubscription.premium) /
                            stats.users.total) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>コンテンツ品質</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">場所/地域比率</span>
                  <span className="text-sm font-medium">
                    {stats.content.regions > 0
                      ? Math.round(
                          stats.content.locations / stats.content.regions,
                        )
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">チェックイン/場所比率</span>
                  <span className="text-sm font-medium">
                    {stats.content.locations > 0
                      ? Math.round(
                          stats.content.checkIns / stats.content.locations,
                        )
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">モデレーション処理率</span>
                  <span className="text-sm font-medium">
                    {stats.moderation.totalReports > 0
                      ? Math.round(
                          ((stats.moderation.approvedReports +
                            stats.moderation.rejectedReports) /
                            stats.moderation.totalReports) *
                            100,
                        )
                      : 100}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">システム統計</h1>
        <p className="text-muted-foreground">
          システム全体のパフォーマンスと利用状況の分析
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex h-32 items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 mx-auto mb-4" />
              <p>読み込み中...</p>
            </div>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
