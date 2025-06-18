import { getModerationStatistics } from "@/actions/moderation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Building,
  CheckCircle,
  CheckSquare,
  Clock,
  MapPin,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function AdminStats() {
  const moderationStats = await getModerationStatistics();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総レポート数</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{moderationStats.totalCount}</div>
          <p className="text-xs text-muted-foreground">すべてのレポート</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">審査待ち</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {moderationStats.pendingCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {moderationStats.pendingCount > 0 ? "要対応" : "対応完了"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">緊急対応</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {moderationStats.urgentCount}
          </div>
          <p className="text-xs text-muted-foreground">
            24時間以上前のレポート
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminQuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            モデレーション
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            報告されたコンテンツの審査と管理
          </p>
          <Button asChild className="w-full">
            <Link href="/admin/moderation">モデレーション管理</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ユーザー管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ユーザーアカウントとサブスクリプションの管理
          </p>
          <Button asChild variant="outline" className="w-full" disabled>
            <Link href="/admin/users">ユーザー管理</Link>
          </Button>
          <p className="text-xs text-muted-foreground">近日公開予定</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            システム統計
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            システムの使用状況と統計データ
          </p>
          <Button asChild variant="outline" className="w-full" disabled>
            <Link href="/admin/analytics">統計ダッシュボード</Link>
          </Button>
          <p className="text-xs text-muted-foreground">近日公開予定</p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={`stats-${i + 1}`}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={`chart-${i + 1}`}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          管理者ダッシュボード
        </h1>
        <p className="text-muted-foreground">
          システム全体の監視とモデレーション管理
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AdminStats />
        <AdminQuickActions />
      </Suspense>
    </div>
  );
}
