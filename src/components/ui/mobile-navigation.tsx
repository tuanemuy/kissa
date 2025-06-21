"use client";

import {
  Compass,
  Heart,
  Home,
  MapPin,
  Menu,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "./button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

export interface MobileNavigationProps {
  isAuthenticated?: boolean;
  userRole?: "editor" | "admin" | null;
}

export function MobileNavigation({
  isAuthenticated = false,
  userRole = null,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const publicRoutes = [
    { href: "/", label: "ホーム", icon: Home },
    { href: "/discover", label: "発見", icon: Compass },
    { href: "/discover/locations", label: "場所検索", icon: MapPin },
  ];

  const authenticatedRoutes = [
    { href: "/dashboard", label: "ダッシュボード", icon: User },
    { href: "/profile", label: "プロフィール", icon: Settings },
  ];

  const adminRoutes = [{ href: "/admin", label: "管理", icon: Settings }];

  const allRoutes = [
    ...publicRoutes,
    ...(isAuthenticated ? authenticatedRoutes : []),
    ...(userRole === "admin" ? adminRoutes : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Navigation Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">メニューを開く</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Kissa</SheetTitle>
            <SheetDescription>
              地域の素晴らしい場所を発見・共有しよう
            </SheetDescription>
          </SheetHeader>

          <nav className="mt-6 space-y-2">
            {allRoutes.map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(route.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {route.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-4 border-t">
            {!isAuthenticated ? (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                    ログイン
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                    新規登録
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // TODO: Implement logout functionality
                    setIsOpen(false);
                  }}
                >
                  ログアウト
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <nav className="flex items-center justify-around py-2">
          {publicRoutes.slice(0, 4).map((route) => {
            const Icon = route.icon;
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`flex flex-col items-center gap-1 p-2 min-w-0 ${
                  isActive(route.href)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs truncate">{route.label}</span>
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 p-2 min-w-0 ${
                isActive("/dashboard")
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs truncate">マイページ</span>
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}

export interface DesktopNavigationProps {
  isAuthenticated?: boolean;
  userRole?: "editor" | "admin" | null;
}

export function DesktopNavigation({
  isAuthenticated = false,
  userRole = null,
}: DesktopNavigationProps) {
  const pathname = usePathname();

  const publicRoutes = [
    { href: "/", label: "ホーム" },
    { href: "/discover", label: "発見" },
    { href: "/discover/locations", label: "場所検索" },
  ];

  const authenticatedRoutes = [
    { href: "/dashboard", label: "ダッシュボード" },
    { href: "/profile", label: "プロフィール" },
  ];

  const adminRoutes = [{ href: "/admin", label: "管理" }];

  const allRoutes = [
    ...publicRoutes,
    ...(isAuthenticated ? authenticatedRoutes : []),
    ...(userRole === "admin" ? adminRoutes : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="hidden lg:block sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold text-xl">Kissa</span>
        </Link>

        <nav className="flex items-center space-x-6 text-sm font-medium">
          {allRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`transition-colors hover:text-foreground/80 ${
                isActive(route.href) ? "text-foreground" : "text-foreground/60"
              }`}
            >
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-2">
          {!isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">ログイン</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register">新規登録</Link>
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement logout functionality
              }}
            >
              ログアウト
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

interface NavigationProps {
  isAuthenticated?: boolean;
  userRole?: "editor" | "admin" | null;
}

export function Navigation({
  isAuthenticated = false,
  userRole = null,
}: NavigationProps) {
  return (
    <>
      <DesktopNavigation
        isAuthenticated={isAuthenticated}
        userRole={userRole}
      />
      <MobileNavigation isAuthenticated={isAuthenticated} userRole={userRole} />
    </>
  );
}
