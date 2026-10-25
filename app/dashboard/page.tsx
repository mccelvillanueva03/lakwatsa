import { Suspense } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight, MapPin, CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { requirePlanner } from "@/lib/auth";
import { dateLabel } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Prisma } from "@prisma/client";
async function Dashboard() {
  const planner = await requirePlanner();
  const trips = await db.trip.findMany({
    where: { plannerId: planner.id },
    include: {
      chosenDate: true,
      chosenDestination: true,
      chosenContribution: true,
      members: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-9">
      <div className="flex flex-wrap justify-between items-end gap-5">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER, OUT THERE</p>
          <h1 className="page-title mt-3">Good things on the horizon.</h1>
          <p className="text-muted-foreground mt-3">
            All your people. All your plans. Right here.
          </p>
        </div>
        <Button asChild>
          <Link href="/trips/new">
            <Plus />
            Plan a trip
          </Link>
        </Button>
      </div>
      {!trips.length ? (
        <Card className="py-12 text-center">
          <CardContent>
            <MapPin className="mx-auto text-primary mb-5" size={36} />
            <h2 className="text-2xl font-semibold">
              A blank calendar is an invitation.
            </h2>
            <p className="text-muted-foreground mt-3 mb-6">
              Start with an idea. We’ll help you get everyone there.
            </p>
            <Button asChild>
              <Link href="/trips/new">
                Plan a trip <ArrowUpRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => {
            const target = trip.chosenContribution?.amount;
            const total = target?.mul(trip.members.length);
            const paid = trip.members.reduce(
              (sum, m) => sum.plus(m.amountPaid),
              new Prisma.Decimal(0),
            );
            const progress = total?.gt(0)
              ? Math.min(100, paid.div(total).mul(100).toNumber())
              : 0;
            return (
              <Card key={trip.id}>
                <CardHeader>
                  <div className="flex justify-between">
                    <Badge
                      variant={
                        trip.mode === "PLANNING" ? "secondary" : "default"
                      }
                    >
                      {trip.mode === "PLANNING" ? "Planning" : "Planned"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {trip.members.length} people
                    </span>
                  </div>
                  <CardTitle className="text-xl pt-3">
                    <Link
                      href={`/trips/${trip.id}/manage`}
                      className="hover:underline"
                    >
                      {trip.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <MapPin size={16} />
                    {trip.chosenDestination?.name || "Finding your place"}
                  </p>
                  <p className="text-sm text-muted-foreground flex gap-2">
                    <CalendarDays size={16} />
                    {trip.chosenDate
                      ? dateLabel(trip.chosenDate.start, trip.timezone)
                      : "Dates up for a vote"}
                  </p>
                  {trip.contributionsEnabled && (
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span>Contribution progress</span>
                        <span>
                          {target
                            ? `${Math.round(progress)}%`
                            : "Target to be decided"}
                        </span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  <Link
                    className="text-link text-sm inline-flex items-center gap-2"
                    href={`/trips/${trip.id}/manage`}
                  >
                    Open plan <ArrowUpRight size={16} />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Getting things ready…</p>}>
      <Dashboard />
    </Suspense>
  );
}
