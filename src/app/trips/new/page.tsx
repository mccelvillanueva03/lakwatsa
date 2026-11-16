import { Suspense } from "react";
import { requirePlanner } from "@/lib/auth";
import { TripForm } from "@/components/trip-form";
import { Card, CardContent } from "@/components/ui/card";
async function NewTrip() {
  await requirePlanner();
  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <div>
        <p className="eyebrow">MAKE ROOM FOR SOMETHING GOOD</p>
        <h1 className="page-title mt-3">A new trip starts here.</h1>
        <p className="text-muted-foreground mt-3">
          A few details now. A whole lot to look forward to.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <TripForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Getting things ready…</p>}>
      <NewTrip />
    </Suspense>
  );
}
