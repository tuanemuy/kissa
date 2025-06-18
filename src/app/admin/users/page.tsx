import { getUsers } from "@/actions/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface UserManagementPageProps {
  searchParams: {
    page?: string;
    search?: string;
    role?: string;
    subscription?: string;
    isActive?: string;
  };
}

async function UsersList({ searchParams }: UserManagementPageProps) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  const role = searchParams.role;
  const subscription = searchParams.subscription;
  const isActive =
    searchParams.isActive === "true"
      ? true
      : searchParams.isActive === "false"
        ? false
        : undefined;

  const { items: users, count } = await getUsers({
    page,
    limit: 10,
    search,
    role,
    subscription,
    isActive,
    sortField: "createdAt",
    sortOrder: "desc",
  });

  const totalPages = Math.ceil(count / 10);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              アクティブユーザー
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">編集者数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "editor").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ユーザーを検索..."
                className="pl-8"
                defaultValue={search}
                name="search"
              />
            </div>

            <Select defaultValue={role || "all"}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="ロール" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのロール</SelectItem>
                <SelectItem value="visitor">来訪者</SelectItem>
                <SelectItem value="editor">編集者</SelectItem>
                <SelectItem value="admin">管理者</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue={subscription || "all"}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="プラン" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのプラン</SelectItem>
                <SelectItem value="free">無料</SelectItem>
                <SelectItem value="basic">ベーシック</SelectItem>
                <SelectItem value="premium">プレミアム</SelectItem>
              </SelectContent>
            </Select>

            <Select
              defaultValue={
                isActive === undefined ? "all" : isActive.toString()
              }
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのステータス</SelectItem>
                <SelectItem value="true">アクティブ</SelectItem>
                <SelectItem value="false">非アクティブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role === "admin"
                        ? "管理者"
                        : user.role === "editor"
                          ? "編集者"
                          : "来訪者"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.subscription === "premium" ? "default" : "outline"
                      }
                    >
                      {user.subscription === "free"
                        ? "無料"
                        : user.subscription === "basic"
                          ? "ベーシック"
                          : "プレミアム"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "アクティブ" : "非アクティブ"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/users/${user.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {user.role !== "admin" && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * 10 + 1} - {Math.min(page * 10, count)} of {count}{" "}
            users
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/users?page=${page - 1}`}>前へ</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/users?page=${page + 1}`}>次へ</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserManagementPage({
  searchParams,
}: UserManagementPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ユーザー管理</h1>
        <p className="text-muted-foreground">
          システムユーザーの管理とモニタリング
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
        <UsersList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
