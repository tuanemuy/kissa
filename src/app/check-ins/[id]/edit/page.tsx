import { getCheckInAction } from "@/actions/checkIn";
import { getContext } from "@/actions/context";
import { getLocationAction } from "@/actions/location";
import { CheckInForm } from "@/app/components/checkin/CheckInForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCheckInPage({ params }: Props) {
  const { id } = await params;

  // Check if user is authenticated
  const context = getContext();
  const userResult = await context.authService.requireAuthUserId();

  if (userResult.isErr()) {
    redirect("/login");
  }

  const userId = userResult.value;

  // Get the check-in
  const checkIn = await getCheckInAction(id);

  if (!checkIn) {
    redirect("/dashboard");
  }

  // Check if the current user owns this check-in
  if (checkIn.userId !== userId) {
    redirect("/dashboard");
  }

  // Get the location
  const location = await getLocationAction(checkIn.locationId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/check-ins/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Check-in
        </Link>
      </div>

      <CheckInForm
        locationId={checkIn.locationId}
        locationName={location.name}
        checkIn={checkIn}
        mode="edit"
      />
    </div>
  );
}
