import {
  getModerationItemDetail,
  moderateContentAction,
} from "@/actions/moderation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  ContentType,
  ModerationStatus,
} from "@/core/domain/moderation/types";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
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

function getContentTypeDescription(contentType: ContentType) {
  switch (contentType) {
    case "region":
      return "地域情報に関する投稿";
    case "location":
      return "場所情報に関する投稿";
    case "checkIn":
      return "チェックイン情報に関する投稿";
  }
}

function ModerationActionForm({
  itemId,
  currentStatus,
}: { itemId: string; currentStatus: ModerationStatus }) {
  if (currentStatus !== "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(currentStatus)}
            審査完了
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            このアイテムは既に審査が完了しています。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>審査アクション</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form action={moderateContentAction}>
            <input type="hidden" name="id" value={itemId} />
            <input type="hidden" name="status" value="approved" />
            <Button type="submit" variant="default" className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              承認
            </Button>
          </form>

          <form action={moderateContentAction}>
            <input type="hidden" name="id" value={itemId} />
            <input type="hidden" name="status" value="rejected" />
            <Button type="submit" variant="destructive" className="w-full">
              <XCircle className="h-4 w-4 mr-2" />
              却下
            </Button>
          </form>
        </div>

        <div>
          <label
            htmlFor="moderationNote"
            className="text-sm font-medium mb-2 block"
          >
            審査メモ（任意）
          </label>
          <textarea
            id="moderationNote"
            name="moderationNote"
            placeholder="審査の理由や詳細を記載してください..."
            className="w-full min-h-[100px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ModerationDetailPage({ params }: Props) {
  const item = await getModerationItemDetail(params.id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/moderation">
            <ArrowLeft className="h-4 w-4 mr-2" />
            モデレーション管理に戻る
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Item Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                レポート詳細
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    コンテンツ種別
                  </p>
                  <Badge variant="outline">
                    {getContentTypeLabel(item.contentType)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    ステータス
                  </p>
                  <Badge
                    variant={getStatusVariant(item.status)}
                    className="flex items-center gap-1 w-fit"
                  >
                    {getStatusIcon(item.status)}
                    {item.status === "pending" && "審査待ち"}
                    {item.status === "approved" && "承認済み"}
                    {item.status === "rejected" && "却下済み"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  コンテンツID
                </p>
                <p className="font-mono text-sm bg-muted p-2 rounded">
                  {item.contentId}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  コンテンツの説明
                </p>
                <p className="text-sm">
                  {getContentTypeDescription(item.contentType)}
                </p>
              </div>

              {item.reportReason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    報告理由
                  </p>
                  <p className="text-sm bg-red-50 border border-red-200 p-3 rounded">
                    {item.reportReason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">報告日時</p>
                    <p className="text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {item.updatedAt !== item.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">更新日時</p>
                      <p className="text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Moderation History */}
          {(item.moderatedBy || item.moderationNote) && (
            <Card>
              <CardHeader>
                <CardTitle>審査履歴</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.moderatedBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">審査担当者</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {item.moderatedBy}
                      </p>
                    </div>
                  </div>
                )}

                {item.moderationNote && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      審査メモ
                    </p>
                    <p className="text-sm bg-muted p-3 rounded">
                      {item.moderationNote}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <ModerationActionForm itemId={item.id} currentStatus={item.status} />
        </div>
      </div>
    </div>
  );
}
