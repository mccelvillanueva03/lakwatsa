import { TripRefresh } from "./trip-refresh";
import Decimal from "decimal.js";
import { MapPin, CalendarDays, Users, Check } from "lucide-react";
import type { FullTrip, Category } from "@/lib/trips";
import { dateLabel } from "@/lib/dates";
import { remaining } from "@/lib/money";
import { voteAction } from "@/app/actions/trips";
import { ActionForm, SelectField, Hidden } from "./action-form";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { DestinationImage } from "./destination-image";
export const displayMoney = (amount: { toString(): string }) =>
  Number(amount.toString()).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function TripView({
  trip,
  memberId,
}: {
  trip: FullTrip;
  memberId?: string;
}) {
  const planning = trip.mode === "PLANNING";
  const target = trip.contributions.find(
    (c) => c.id === trip.chosenContributionId,
  )?.amount;
  const total = target?.mul(trip.members.length);
  const paid = trip.members.reduce(
    (s, m) => s.plus(m.amountPaid),
    new Decimal(0),
  );
  const progress = total?.gt(0)
    ? Math.min(100, paid.div(total).mul(100).toNumber())
    : 0;
  const member = trip.members.find((m) => m.id === memberId);
  const groups: {
    category: Category;
    title: string;
    options: { id: string; label: string; imageUrl?: string | null }[];
    chosen: string | null;
  }[] = [
    {
      category: "destination",
      title: "Where we’re going",
      options: trip.destinations.map((d) => ({
        id: d.id,
        label: d.name,
        imageUrl: d.imageUrl,
      })),
      chosen: trip.chosenDestinationId,
    },
    {
      category: "date",
      title: "When we’re getting away",
      options: trip.dates.map((d) => ({
        id: d.id,
        label: `${dateLabel(d.start, trip.timezone)} → ${dateLabel(d.end, trip.timezone)}`,
      })),
      chosen: trip.chosenDateId,
    },
    ...(trip.contributionsEnabled
      ? [
          {
            category: "contribution" as const,
            title: "A budget that works",
            options: trip.contributions.map((c) => ({
              id: c.id,
              label: displayMoney(c.amount) + " per member",
            })),
            chosen: trip.chosenContributionId,
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-7">
      <TripRefresh />
      <div className="flex flex-wrap gap-3 items-center">
        <Badge variant={planning ? "secondary" : "default"}>
          {planning ? "Planning" : "Planned"}
        </Badge>
        <span className="text-sm text-muted-foreground flex gap-1 items-center">
          <Users size={15} />
          {trip.members.length} people
        </span>
        <span className="text-sm text-muted-foreground">{trip.timezone}</span>
      </div>
      <div>
        <h1 className="page-title">{trip.title}</h1>
        {trip.description && (
          <p className="text-muted-foreground mt-3 whitespace-pre-wrap">
            {trip.description}
          </p>
        )}
      </div>
      <div className="rounded-xl bg-secondary px-5 py-4 text-sm">
        {planning
          ? member
            ? `You’re voting as ${member.name}. You can change your picks until the planner finalizes.`
            : "You’re viewing the plan. Claim your name on the entry page to vote."
          : "Voting is closed. Your trip is settled — time to look forward to it."}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        {groups.map((group) => (
          <Card key={group.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {group.category === "destination" ? (
                  <MapPin size={19} />
                ) : group.category === "date" ? (
                  <CalendarDays size={19} />
                ) : (
                  <span>↗</span>
                )}
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                {group.options
                  .filter((o) => planning || o.id === group.chosen)
                  .map((option) => {
                    const votes = trip.members.filter(
                      (m) => m[`${group.category}VoteId`] === option.id,
                    );
                    return (
                      <div
                        key={option.id}
                        className={`rounded-xl border p-4 ${member?.[`${group.category}VoteId`] === option.id ? "border-primary bg-secondary/40" : ""}`}
                      >
                        {group.category === "destination" && (
                          <DestinationImage
                            url={option.imageUrl}
                            name={option.label}
                          />
                        )}
                        <div className="flex justify-between gap-3">
                          <p className="font-medium text-sm">{option.label}</p>
                          {planning ? (
                            <Badge variant="outline">
                              {votes.length}{" "}
                              {votes.length === 1 ? "vote" : "votes"}
                            </Badge>
                          ) : (
                            <Check
                              size={17}
                              className="text-primary shrink-0"
                            />
                          )}
                        </div>
                        {planning && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {votes.map((m) => m.name).join(", ") ||
                              "No votes yet"}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
              {planning && member && (
                <ActionForm
                  action={voteAction.bind(null, trip.id)}
                  submit={`Save ${group.category} vote`}
                >
                  <Hidden name="category" value={group.category} />
                  <SelectField
                    name="optionId"
                    label={`${group.category[0].toUpperCase() + group.category.slice(1)} vote`}
                    defaultValue={member[`${group.category}VoteId`] || ""}
                  >
                    <option value="">Choose an option</option>
                    {group.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {trip.contributionsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Contribution progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap justify-between gap-3">
              <p className="text-2xl font-semibold">
                {displayMoney(paid)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {total
                    ? `of ${displayMoney(total)} total`
                    : "paid so far · target not settled"}
                </span>
              </p>
              {total && (
                <span className="text-sm">{Math.round(progress)}%</span>
              )}
            </div>
            <Progress value={progress} aria-label="Contribution progress" />
            <p className="text-xs text-muted-foreground">
              Amounts use the group’s agreed currency. Payments are recorded by
              your planner; no money is transferred here.
            </p>
            <div className="divide-y">
              {trip.members.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_1fr] gap-3 py-4 text-sm"
                >
                  <p className="font-medium">{m.name}</p>
                  <p>
                    <span className="text-muted-foreground">Paid </span>
                    {displayMoney(m.amountPaid)}
                  </p>
                  <p className="col-span-2 sm:col-span-1 text-muted-foreground">
                    {target
                      ? `Remaining ${displayMoney(remaining(target, m.amountPaid))}`
                      : "Target to be decided"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Who’s coming</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {trip.members.map((m) => (
            <div key={m.id} className="py-4">
              <p className="font-medium text-sm">{m.name}</p>
              {planning && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Place:{" "}
                  {trip.destinations.find((d) => d.id === m.destinationVoteId)
                    ?.name || "Not voted"}{" "}
                  · Dates:{" "}
                  {trip.dates.find((d) => d.id === m.dateVoteId)
                    ? dateLabel(
                        trip.dates.find((d) => d.id === m.dateVoteId)!.start,
                        trip.timezone,
                      )
                    : "Not voted"}
                  {trip.contributionsEnabled &&
                    ` · Budget: ${trip.contributions.find((c) => c.id === m.contributionVoteId) ? displayMoney(trip.contributions.find((c) => c.id === m.contributionVoteId)!.amount) : "Not voted"}`}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
