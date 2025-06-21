"use client";

import { getUserCheckInHistoryAction } from "@/actions/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CheckInWithUser } from "@/core/domain/checkIn/types";
import { Calendar, MapPin, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CheckInHistoryProps {
  userId: string;
}

export function CheckInHistory({ userId }: CheckInHistoryProps) {
  const [checkIns, setCheckIns] = useState<CheckInWithUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 10;

  useEffect(() => {
    async function fetchCheckIns() {
      try {
        setLoading(true);
        setError(null);
        const result = await getUserCheckInHistoryAction(currentPage, limit);
        setCheckIns(result.items);
        setTotalCount(result.count);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "チェックイン履歴の取得に失敗しました",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCheckIns();
  }, [currentPage]);

  if (loading) {
    return <CheckInHistorySkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            チェックイン履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          チェックイン履歴 ({totalCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checkIns.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              まだチェックインがありません
            </p>
            <Button asChild>
              <Link href="/discover/locations">場所を探してチェックイン</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {checkIns.map((checkIn) => (
              <CheckInHistoryCard key={checkIn.id} checkIn={checkIn} />
            ))}

            {/* Pagination */}
            {totalCount > limit && (
              <div className="flex justify-center gap-2 pt-4">
                {currentPage > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    前のページ
                  </Button>
                )}
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  {Math.min(currentPage * limit, totalCount)} / {totalCount} 件
                </span>
                {currentPage * limit < totalCount && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    次のページ
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckInHistoryCard({ checkIn }: { checkIn: CheckInWithUser }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">場所ID: {checkIn.locationId}</span>
            {checkIn.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{checkIn.rating}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(checkIn.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {checkIn.comment && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {checkIn.comment}
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href={`/discover/locations/${checkIn.locationId}`}>
            詳細を見る
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CheckInHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={`skeleton-${i + 1}`}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
