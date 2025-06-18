import {
  deleteUserAction,
  getUserDetails,
  updateUserAction,
} from "@/actions/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Mail,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

async function UserDetailForm({ userId }: { userId: string }) {
  const user = await getUserDetails(userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            ユーザー一覧に戻る
          </Link>
        </Button>
      </div>

      {/* User Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            ユーザー詳細
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                ユーザーID
              </Label>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                作成日
              </Label>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(user.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                最終更新
              </Label>
              <p>{new Date(user.updatedAt).toLocaleDateString("ja-JP")}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Stripeカスタマー
              </Label>
              <p className="font-mono text-sm">
                {user.stripeCustomerId || "未設定"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Form */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー情報の編集</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUserAction} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="pl-8"
                    defaultValue={user.email}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">ロール</Label>
                <Select name="role" defaultValue={user.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitor">来訪者</SelectItem>
                    <SelectItem value="editor">編集者</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscription">サブスクリプションプラン</Label>
                <Select name="subscription" defaultValue={user.subscription}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">無料</SelectItem>
                    <SelectItem value="basic">ベーシック</SelectItem>
                    <SelectItem value="premium">プレミアム</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={user.isActive}
              />
              <Label htmlFor="isActive">アカウントがアクティブ</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit">変更を保存</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/users">キャンセル</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>現在のステータス</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                ロール
              </Label>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role === "admin"
                  ? "管理者"
                  : user.role === "editor"
                    ? "編集者"
                    : "来訪者"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                プラン
              </Label>
              <Badge
                variant={
                  user.subscription === "premium" ? "default" : "outline"
                }
              >
                <CreditCard className="h-3 w-3 mr-1" />
                {user.subscription === "free"
                  ? "無料"
                  : user.subscription === "basic"
                    ? "ベーシック"
                    : "プレミアム"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                アカウント状態
              </Label>
              <Badge variant={user.isActive ? "default" : "destructive"}>
                {user.isActive ? "アクティブ" : "非アクティブ"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {user.role !== "admin" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">危険な操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                この操作は元に戻すことができません。ユーザーアカウントと関連するすべてのデータが完全に削除されます。
              </p>
              <form action={deleteUserAction}>
                <input type="hidden" name="userId" value={user.id} />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  onClick={(e) => {
                    if (
                      !confirm(
                        "本当にこのユーザーを削除しますか？この操作は元に戻せません。",
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ユーザーを完全削除
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ユーザー詳細</h1>
        <p className="text-muted-foreground">ユーザー情報の確認と編集</p>
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
        <UserDetailForm userId={params.id} />
      </Suspense>
    </div>
  );
}
