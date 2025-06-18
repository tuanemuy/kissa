import { listCheckInsWithUserAction } from "@/actions/checkIn";
import { getContext } from "@/actions/context";
import { listRegionsAction } from "@/actions/region";
import { CheckInList } from "@/app/components/checkin/CheckInList";
import { FavoritesList } from "@/app/components/favorite/FavoritesList";
import { PinnedRegionsList } from "@/app/components/favorite/PinnedRegionsList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Globe, Lock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function RegionsList() {
  const regionsData = await listRegionsAction();
  const { items: regions } = regionsData;

  if (regions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No regions yet</h3>
            <p className="text-muted-foreground">
              Create your first region to get started.
            </p>
            <Button asChild className="mt-4">
              <Link href="/regions/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Region
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {regions.map((region) => (
        <Card key={region.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{region.name}</CardTitle>
                {region.description && (
                  <CardDescription className="mt-1 line-clamp-2">
                    {region.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant={region.isPublic ? "default" : "secondary"}>
                {region.isPublic ? (
                  <>
                    <Globe className="mr-1 h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Updated {region.updatedAt.toLocaleDateString()}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/regions/${region.id}`}>View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function RecentCheckInsList() {
  const context = getContext();
  const userResult = await context.authService.getCurrentUserId();

  if (!userResult.isOk()) {
    return null;
  }

  const userId = userResult.value;

  try {
    const checkInsData = await listCheckInsWithUserAction({
      pagination: { page: 1, limit: 5 },
      filter: { userId: userId || undefined },
      sort: { field: "createdAt", order: "desc" },
    });

    if (checkInsData.items.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No check-ins yet</h3>
              <p className="text-muted-foreground">
                Start exploring locations and check in to track your visits.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <CheckInList
        checkIns={checkInsData.items}
        showActions={true}
        currentUserId={userId || undefined}
        title="Recent Check-ins"
        description="Your latest check-ins"
      />
    );
  } catch (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Unable to load check-ins at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your regions and locations
          </p>
        </div>
        <Button asChild>
          <Link href="/regions/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Region
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Regions</CardTitle>
              <CardDescription>
                Regions are collections of locations that you can manage and
                share.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RegionsListSkeleton />}>
                <RegionsList />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>
                Your latest location visits and experiences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<CheckInsListSkeleton />}>
                <RecentCheckInsList />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<FavoritesSkeleton />}>
            <PinnedRegionsList />
          </Suspense>

          <Suspense fallback={<FavoritesSkeleton />}>
            <FavoritesList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function RegionsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckInsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
