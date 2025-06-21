import { getSessionUser } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/ui/mobile-nav";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function AdminNavigation({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  // TODO: Add proper admin role check
  // For now, we'll allow any authenticated user access to admin features
  // In production, you should check user.role === "admin" or similar

  const navigation = (
    <div className="flex h-full max-h-screen flex-col gap-2 p-4">
      <div className="flex items-center gap-2 px-2 pb-4">
        <LayoutDashboard className="h-6 w-6" />
        <h2 className="text-lg font-semibold">管理者パネル</h2>
      </div>

      <Separator />

      <nav className="flex-1 space-y-2">
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/admin">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            ダッシュボード
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/admin/moderation">
            <AlertTriangle className="mr-2 h-4 w-4" />
            モデレーション
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/admin/users">
            <Users className="mr-2 h-4 w-4" />
            ユーザー管理
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/admin/analytics">
            <TrendingUp className="mr-2 h-4 w-4" />
            統計
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          className="w-full justify-start"
          disabled
        >
          <Link href="/admin/settings">
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Link>
        </Button>
      </nav>

      <Separator />

      <div className="space-y-2">
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            エディターダッシュボード
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href="/auth/logout">
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Link>
        </Button>
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">管理者</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/10 md:block md:w-64">
        {navigation}
      </div>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background border-b md:hidden">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6" />
          <h1 className="text-lg font-semibold">管理者パネル</h1>
        </div>
        <MobileNav>{navigation}</MobileNav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="h-full p-6 pt-20 md:pt-6">{children}</div>
      </div>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 mx-auto mb-4" />
            <p>読み込み中...</p>
          </div>
        </div>
      }
    >
      <AdminNavigation>{children}</AdminNavigation>
    </Suspense>
  );
}
