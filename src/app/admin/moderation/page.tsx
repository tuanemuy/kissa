import {
  getModerationItemsList,
  getModerationStatistics,
} from "@/actions/moderation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ContentType,
  ModerationStatus,
} from "@/core/domain/moderation/types";
import { AlertTriangle, CheckCircle, Clock, Eye, XCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface SearchParams {
  page?: string;
  status?: string;
  contentType?: string;
}

interface Props {
  searchParams: SearchParams;
}

function getStatusIcon(status: ModerationStatus) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "approved":
      return <CheckCircle className="h-4 w-4" />;
    case "rejected":
      return <XCircle className="h-4 w-4" />;
  }
}

function getStatusVariant(
  status: ModerationStatus,
): "default" | "destructive" | "secondary" {
  switch (status) {
    case "pending":
      return "default";
    case "approved":
      return "secondary";
    case "rejected":
      return "destructive";
  }
}

function getContentTypeLabel(contentType: ContentType) {
  switch (contentType) {
    case "region":
      return "地域";
    case "location":
      return "場所";
    case "checkIn":
      return "チェックイン";
  }
}

async function ModerationStats() {
  const stats = await getModerationStatistics();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総レポート数</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">審査待ち</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pendingCount > 0 ? "要対応" : "対応完了"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">緊急対応</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.urgentCount}</div>
          <p className="text-xs text-muted-foreground">24時間以上前</p>
        </CardContent>
      </Card>
    </div>
  );
}

async function ModerationTable({
  searchParams,
}: { searchParams: SearchParams }) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status;
  const contentType = searchParams.contentType;

  const { items, count } = await getModerationItemsList(
    page,
    20,
    status,
    contentType,
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            モデレーションアイテムが見つかりません
          </p>
          <p className="text-sm text-muted-foreground">
            現在表示できるレポートはありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>レポート一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>コンテンツ種別</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>報告理由</TableHead>
              <TableHead>報告日時</TableHead>
              <TableHead>アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline">
                    {getContentTypeLabel(item.contentType)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusVariant(item.status)}
                    className="flex items-center gap-1 w-fit"
                  >
                    {getStatusIcon(item.status)}
                    {item.status === "pending" && "審査待ち"}
                    {item.status === "approved" && "承認済み"}
                    {item.status === "rejected" && "却下済み"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {item.reportReason || "理由なし"}
                </TableCell>
                <TableCell>
                  {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/moderation/${item.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      詳細
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {count} 件中 {(page - 1) * 20 + 1} - {Math.min(page * 20, count)}{" "}
            件を表示
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/moderation?page=${page - 1}`}>
                  前のページ
                </Link>
              </Button>
            )}
            {page * 20 < count && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/moderation?page=${page + 1}`}>
                  次のページ
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ModerationPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            モデレーション管理
          </h1>
          <p className="text-muted-foreground">
            報告されたコンテンツの審査と管理を行います
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ModerationStats />
        <ModerationTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
