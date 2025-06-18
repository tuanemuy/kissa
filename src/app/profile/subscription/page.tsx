import {
  cancelUserSubscription,
  changeUserSubscription,
  getUserBillingHistory,
  getUserSubscriptionStatus,
} from "@/actions/billing";
import { getSessionUser } from "@/actions/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubscriptionPlan } from "@/core/domain/user/types";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  Crown,
  DollarSign,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function getPlanIcon(plan: SubscriptionPlan) {
  switch (plan) {
    case "free":
      return <CheckCircle className="h-4 w-4" />;
    case "basic":
      return <Zap className="h-4 w-4" />;
    case "premium":
      return <Crown className="h-4 w-4" />;
  }
}

function getPlanLabel(plan: SubscriptionPlan) {
  switch (plan) {
    case "free":
      return "フリープラン";
    case "basic":
      return "ベーシックプラン";
    case "premium":
      return "プレミアムプラン";
  }
}

function getPlanPrice(plan: SubscriptionPlan) {
  switch (plan) {
    case "free":
      return "無料";
    case "basic":
      return "¥980/月";
    case "premium":
      return "¥1,980/月";
  }
}

function getPlanFeatures(plan: SubscriptionPlan) {
  const features = {
    free: [
      "地域作成: 3個まで",
      "場所登録: 地域あたり5個まで",
      "基本統計情報",
      "コミュニティサポート",
    ],
    basic: [
      "地域作成: 10個まで",
      "場所登録: 地域あたり20個まで",
      "詳細統計情報",
      "メールサポート",
      "エクスポート機能",
    ],
    premium: [
      "地域作成: 無制限",
      "場所登録: 無制限",
      "高度な統計分析",
      "優先サポート",
      "API アクセス",
      "カスタム統合",
    ],
  };
  return features[plan];
}

async function SubscriptionStatus() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  const subscriptionStatus = await getUserSubscriptionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          現在のサブスクリプション
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlanIcon(subscriptionStatus.plan)}
            <div>
              <p className="font-medium">
                {getPlanLabel(subscriptionStatus.plan)}
              </p>
              <p className="text-sm text-muted-foreground">
                {getPlanPrice(subscriptionStatus.plan)}
              </p>
            </div>
          </div>
          <Badge
            variant={subscriptionStatus.isActive ? "secondary" : "destructive"}
          >
            {subscriptionStatus.isActive ? "アクティブ" : "非アクティブ"}
          </Badge>
        </div>

        {subscriptionStatus.isActive && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>サブスクリプション状態: アクティブ</span>
          </div>
        )}

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">プランの機能</p>
          <ul className="text-sm space-y-1">
            {getPlanFeatures(subscriptionStatus.plan).map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

async function PlanUpgrade() {
  const subscriptionStatus = await getUserSubscriptionStatus();
  const currentPlan = subscriptionStatus.plan;

  const plans: SubscriptionPlan[] = ["free", "basic", "premium"];
  const availableUpgrades = plans.filter((plan) => {
    if (currentPlan === "free") return plan !== "free";
    if (currentPlan === "basic") return plan === "premium";
    return false;
  });

  if (availableUpgrades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>プランアップグレード</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            現在、最高プランをご利用いただいています。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>プランアップグレード</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableUpgrades.map((plan) => (
          <div key={plan} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getPlanIcon(plan)}
                <div>
                  <p className="font-medium">{getPlanLabel(plan)}</p>
                  <p className="text-sm text-muted-foreground">
                    {getPlanPrice(plan)}
                  </p>
                </div>
              </div>
              <form action={changeUserSubscription}>
                <input type="hidden" name="newPlan" value={plan} />
                <Button type="submit" disabled>
                  アップグレード
                </Button>
              </form>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">追加機能</p>
              <ul className="text-sm space-y-1">
                {getPlanFeatures(plan)
                  .filter(
                    (feature) =>
                      !getPlanFeatures(currentPlan).includes(feature),
                  )
                  .map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          ※ 決済機能は近日公開予定です。現在はモック表示となっています。
        </p>
      </CardContent>
    </Card>
  );
}

async function BillingHistory() {
  const billingHistory = await getUserBillingHistory(1, 10);

  if (billingHistory.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            請求履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">請求履歴がありません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          請求履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>プラン</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billingHistory.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                </TableCell>
                <TableCell>
                  {item.toPlan ? getPlanLabel(item.toPlan) : "N/A"}
                </TableCell>
                <TableCell>
                  {item.amount ? `¥${item.amount.toLocaleString()}` : "無料"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === "completed" ? "secondary" : "destructive"
                    }
                  >
                    {item.status === "completed"
                      ? "完了"
                      : item.status === "failed"
                        ? "失敗"
                        : "処理中"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function CancelSubscription() {
  const subscriptionStatus = await getUserSubscriptionStatus();

  if (subscriptionStatus.plan === "free") {
    return null;
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          サブスクリプションのキャンセル
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          サブスクリプションをキャンセルすると、現在の請求期間の終了時にプランがフリープランに変更されます。
        </p>

        <form action={cancelUserSubscription}>
          <input type="hidden" name="cancelAtPeriodEnd" value="true" />
          <Button type="submit" variant="destructive" disabled>
            <XCircle className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          ※ この機能は近日公開予定です
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
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

export default function SubscriptionPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/profile">
            <ArrowLeft className="h-4 w-4 mr-2" />
            プロフィールに戻る
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          サブスクリプション管理
        </h1>
        <p className="text-muted-foreground">
          プランの確認・変更や請求履歴を管理します
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <SubscriptionStatus />
        <PlanUpgrade />
        <BillingHistory />
        <CancelSubscription />
      </Suspense>
    </div>
  );
}
