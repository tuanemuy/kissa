import { getSessionUser } from "@/actions/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Edit, Mail, Save, Shield, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function ProfileInfo() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                メールアドレス
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{user.email}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                アカウント作成日
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {new Date(user.createdAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              アカウントステータス
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Badge variant={user.isActive ? "secondary" : "destructive"}>
                {user.isActive ? "アクティブ" : "非アクティブ"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>パスワード変更</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            セキュリティのため、定期的にパスワードを変更することをお勧めします。
          </p>

          <form className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">現在のパスワード</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
              />
            </div>

            <Button type="submit" disabled>
              <Save className="h-4 w-4 mr-2" />
              パスワードを更新
            </Button>
            <p className="text-xs text-muted-foreground">
              ※ この機能は近日公開予定です
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アカウント設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">通知設定</p>
              <p className="text-xs text-muted-foreground">
                メール通知やプッシュ通知の設定を管理
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Edit className="h-4 w-4 mr-2" />
              設定
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">プライバシー設定</p>
              <p className="text-xs text-muted-foreground">
                プロフィールの公開範囲とプライバシー設定
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Edit className="h-4 w-4 mr-2" />
              設定
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">データのエクスポート</p>
              <p className="text-xs text-muted-foreground">
                アカウントデータをダウンロード
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Edit className="h-4 w-4 mr-2" />
              エクスポート
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ※ これらの機能は近日公開予定です
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }, (_, i) => (
        <Card key={`profile-${i + 1}`}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">プロフィール</h1>
        <p className="text-muted-foreground">
          アカウント情報とセキュリティ設定を管理します
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button asChild variant="outline">
          <Link href="/dashboard">ダッシュボードに戻る</Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/profile/subscription">サブスクリプション管理</Link>
        </Button>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ProfileInfo />
      </Suspense>
    </div>
  );
}
