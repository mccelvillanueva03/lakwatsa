import { Suspense } from "react";
import Link from "next/link";
import { readTrip, currentMember } from "@/lib/trips";
import { identity } from "@/lib/auth";
import { UserError } from "@/lib/validation";
import { TripView } from "@/components/trip-view";
import { AccessGate } from "@/components/access-gate";
async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const who = await identity(id);
  let trip;
  try {
    trip = await readTrip(id, who);
  } catch (e) {
    if (e instanceof UserError) return <AccessGate />;
    throw e;
  }
  const member = await currentMember(id, who);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {trip.mode === "PLANNING" && !member && (
        <Link className="text-link text-sm" href={`/trips/${id}/entry`}>
          Join as a member →
        </Link>
      )}
      <TripView trip={trip} memberId={member?.id} />
    </div>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status">Loading your trip…</p>}>
      <TripPage {...props} />
    </Suspense>
  );
}
