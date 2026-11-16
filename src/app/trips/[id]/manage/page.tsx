import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";
import { readTrip, type Category } from "@/lib/trips";
import { requirePlanner, identity } from "@/lib/auth";
import { UserError } from "@/lib/validation";
import { localInput, dateLabel } from "@/lib/dates";
import { leaders } from "@/lib/voting";
import { manageAction } from "@/app/actions/trips";
import { uploadAction } from "@/app/actions/uploads";
import {
  ActionForm,
  Field,
  Hidden,
  SelectField,
} from "@/components/action-form";
import { TripView, displayMoney } from "@/components/trip-view";
import { FinalizeDialog } from "@/components/finalize-dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
const offset = (date: Date, zone: string) =>
  Temporal.Instant.from(date.toISOString()).toZonedDateTimeISO(zone).offset;
async function Manage({ params }: { params: Promise<{ id: string }> }) {
  const planner = await requirePlanner();
  const { id } = await params;
  let trip;
  try {
    trip = await readTrip(id, await identity(id));
  } catch (e) {
    if (e instanceof UserError) notFound();
    throw e;
  }
  if (trip.plannerId !== planner.id) notFound();
  const action = manageAction.bind(null, id);
  const planning = trip.mode === "PLANNING";
  const groups: {
    category: Category;
    options: { id: string; label: string }[];
  }[] = [
    {
      category: "destination",
      options: trip.destinations.map((o) => ({ id: o.id, label: o.name })),
    },
    {
      category: "date",
      options: trip.dates.map((o) => ({
        id: o.id,
        label: `${dateLabel(o.start, trip.timezone)} → ${dateLabel(o.end, trip.timezone)}`,
      })),
    },
    ...(trip.contributionsEnabled
      ? [
          {
            category: "contribution" as const,
            options: trip.contributions.map((o) => ({
              id: o.id,
              label: displayMoney(o.amount),
            })),
          },
        ]
      : []),
  ];
  const decisions = groups.map((g) => {
    const votes = trip.members.map((m) => m[`${g.category}VoteId`]);
    const top = leaders(
      g.options.map((o) => o.id),
      votes,
    );
    return {
      category: g.category,
      winner: top.length === 1 ? top[0] : undefined,
      options: g.options
        .filter((o) => !top.length || top.includes(o.id))
        .map((o) => ({ ...o, count: votes.filter((v) => v === o.id).length })),
    };
  });
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="eyebrow">PLANNER’S CORNER</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Keep the details in order. Keep the good times coming.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Link href={`/trips/${id}`} className="text-link text-sm">
            Member view ↗
          </Link>
          {planning && <FinalizeDialog id={id} decisions={decisions} />}
        </div>
      </div>
      <div className="grid xl:grid-cols-[1.3fr_1fr] gap-8 items-start">
        <TripView trip={trip} />
        <aside className="space-y-5 min-w-0">
          {!planning && (
            <Card>
              <CardHeader>
                <CardTitle>Settled choices</CardTitle>
                <CardDescription>
                  Correct the plan without reopening voting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionForm action={action} submit="Update settled choices">
                  <Hidden name="operation" value="settled" />
                  <SelectField
                    name="destinationId"
                    label="Settled destination choice"
                    defaultValue={trip.chosenDestinationId || ""}
                  >
                    {trip.destinations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    name="dateId"
                    label="Settled date choice"
                    defaultValue={trip.chosenDateId || ""}
                  >
                    {trip.dates.map((o) => (
                      <option key={o.id} value={o.id}>
                        {dateLabel(o.start, trip.timezone)} →{" "}
                        {dateLabel(o.end, trip.timezone)}
                      </option>
                    ))}
                  </SelectField>
                </ActionForm>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Trip details</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={action} submit="Update details">
                <Hidden name="operation" value="details" />
                <Field
                  name="title"
                  label="Trip name"
                  defaultValue={trip.title}
                  maxLength={100}
                  required
                />
                <Field
                  name="description"
                  label="Description"
                  area
                  defaultValue={trip.description}
                  maxLength={2000}
                />
                <Field
                  name="timezone"
                  label="Trip timezone"
                  defaultValue={trip.timezone}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Changing timezone changes the displayed local times; saved UTC
                  instants stay fixed.
                </p>
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invite your people</CardTitle>
              <CardDescription>
                Code holders can see member names, votes, and exact payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Codes are shown once. Generate a new one to share again. This
                revokes the old code and all existing visitor access.
              </p>
              <ActionForm action={action} submit="Generate new access code">
                <Hidden name="operation" value="rotate" />
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contribution settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={action} submit="Update contributions">
                <Hidden name="operation" value="contributions" />
                <label className="check-row">
                  <input
                    type="checkbox"
                    name="contributionsEnabled"
                    defaultChecked={trip.contributionsEnabled}
                  />
                  Track member contributions
                </label>
                {!planning && (
                  <SelectField
                    name="contributionId"
                    label="Settled contribution target"
                    required={false}
                    defaultValue={trip.chosenContributionId || ""}
                  >
                    <option value="">Choose a target to enable</option>
                    {trip.contributions.map((c) => (
                      <option value={c.id} key={c.id}>
                        {displayMoney(c.amount)}
                      </option>
                    ))}
                  </SelectField>
                )}
                <p className="text-xs text-muted-foreground">
                  Disabling hides payment controls and clears the settled
                  target. Recorded payments are retained.
                </p>
              </ActionForm>
              {!trip.contributionsEnabled && (
                <details className="mt-5">
                  <summary className="text-sm font-medium">
                    Prepare targets before enabling
                  </summary>
                  <p className="text-xs text-muted-foreground my-3">
                    {planning
                      ? "Add at least two positive options."
                      : "Add a positive settled target."}
                  </p>
                  <ActionForm action={action} submit="Add contribution target">
                    <Hidden name="operation" value="option" />
                    <Hidden name="category" value="contribution" />
                    <Hidden name="optionOperation" value="add" />
                    <Field
                      name="amount"
                      label="Amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </ActionForm>
                </details>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>People & claims</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {trip.members.map((m) => (
                <details key={m.id} className="border-b pb-4">
                  <summary className="text-sm font-medium">
                    {m.name}
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      {m.session && m.session.expiresAt > new Date()
                        ? "Claimed"
                        : "Available"}
                    </span>
                  </summary>
                  <div className="space-y-4 mt-4">
                    <ActionForm action={action} submit="Rename member">
                      <Hidden name="operation" value="member" />
                      <Hidden name="memberOperation" value="rename" />
                      <Hidden name="memberId" value={m.id} />
                      <Field
                        name="name"
                        label="Member name"
                        defaultValue={m.name}
                        maxLength={80}
                        required
                      />
                    </ActionForm>
                    <ActionForm action={action} submit="Reset member claim">
                      <Hidden name="operation" value="member" />
                      <Hidden name="memberOperation" value="reset" />
                      <Hidden name="memberId" value={m.id} />
                    </ActionForm>
                    <ActionForm action={action} submit="Remove member">
                      <Hidden name="operation" value="member" />
                      <Hidden name="memberOperation" value="delete" />
                      <Hidden name="memberId" value={m.id} />
                      <p className="text-xs text-muted-foreground">
                        Removes their votes. Payments must be zero before
                        removal.
                      </p>
                    </ActionForm>
                  </div>
                </details>
              ))}
              <ActionForm action={action} submit="Add member">
                <Hidden name="operation" value="member" />
                <Hidden name="memberOperation" value="add" />
                <Field
                  name="name"
                  label="New member name"
                  maxLength={80}
                  required
                />
              </ActionForm>
            </CardContent>
          </Card>
          {trip.contributionsEnabled && (
            <Card>
              <CardHeader>
                <CardTitle>Record payments</CardTitle>
                <CardDescription>
                  Replace the cumulative amount received from each person.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {trip.members.map((m) => (
                  <div
                    key={m.id}
                    data-testid={`payment-${m.name}`}
                    className="rounded-xl border p-4"
                  >
                    <p className="font-medium text-sm mb-3">{m.name}</p>
                    <ActionForm action={action} submit="Update payment">
                      <Hidden name="operation" value="payment" />
                      <Hidden name="memberId" value={m.id} />
                      <Field
                        name="amount"
                        label="Amount paid"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={m.amountPaid.toFixed(2)}
                        required
                      />
                    </ActionForm>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>
                {planning ? "Options on the table" : "Correct settled details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {trip.destinations.map((o) => (
                <details key={o.id} className="border-b pb-4">
                  <summary className="text-sm font-medium">
                    Destination: {o.name}
                  </summary>
                  <div className="space-y-4 mt-4">
                    <ActionForm action={action} submit="Update destination">
                      <Hidden name="operation" value="option" />
                      <Hidden name="category" value="destination" />
                      <Hidden name="optionOperation" value="edit" />
                      <Hidden name="optionId" value={o.id} />
                      <Field
                        name="name"
                        label="Destination name"
                        defaultValue={o.name}
                        required
                      />
                    </ActionForm>
                    <ActionForm
                      action={uploadAction.bind(null, id, o.id)}
                      submit="Upload image"
                    >
                      <Field
                        name="image"
                        label="Destination image (JPEG, PNG, WebP; up to 4 MiB)"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        required
                      />
                    </ActionForm>
                    {o.imageUrl && (
                      <ActionForm
                        action={uploadAction.bind(null, id, o.id)}
                        submit="Remove image"
                      >
                        <Hidden name="remove" value="yes" />
                      </ActionForm>
                    )}
                    {planning && (
                      <ActionForm action={action} submit="Delete destination">
                        <Hidden name="operation" value="option" />
                        <Hidden name="category" value="destination" />
                        <Hidden name="optionOperation" value="delete" />
                        <Hidden name="optionId" value={o.id} />
                      </ActionForm>
                    )}
                  </div>
                </details>
              ))}
              {trip.dates.map((o, i) => (
                <details key={o.id} className="border-b pb-4">
                  <summary className="text-sm font-medium">
                    Dates {i + 1}: {dateLabel(o.start, trip.timezone)}
                  </summary>
                  <div className="space-y-4 mt-4">
                    <ActionForm action={action} submit="Update dates">
                      <Hidden name="operation" value="option" />
                      <Hidden name="category" value="date" />
                      <Hidden name="optionOperation" value="edit" />
                      <Hidden name="optionId" value={o.id} />
                      <Field
                        name="start"
                        label="Start"
                        type="datetime-local"
                        defaultValue={localInput(o.start, trip.timezone)}
                        required
                      />
                      <Field
                        name="end"
                        label="End"
                        type="datetime-local"
                        defaultValue={localInput(o.end, trip.timezone)}
                        required
                      />
                      <Field
                        name="startOffset"
                        label="Start UTC offset (optional)"
                        defaultValue={offset(o.start, trip.timezone)}
                      />
                      <Field
                        name="endOffset"
                        label="End UTC offset (optional)"
                        defaultValue={offset(o.end, trip.timezone)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Clear an offset if you change a date across a
                        daylight-saving transition.
                      </p>
                    </ActionForm>
                    {planning && (
                      <ActionForm action={action} submit="Delete date option">
                        <Hidden name="operation" value="option" />
                        <Hidden name="category" value="date" />
                        <Hidden name="optionOperation" value="delete" />
                        <Hidden name="optionId" value={o.id} />
                      </ActionForm>
                    )}
                  </div>
                </details>
              ))}
              {trip.contributionsEnabled &&
                trip.contributions.map((o) => (
                  <details key={o.id} className="border-b pb-4">
                    <summary className="text-sm font-medium">
                      Contribution: {displayMoney(o.amount)}
                    </summary>
                    <div className="space-y-4 mt-4">
                      <ActionForm action={action} submit="Update amount">
                        <Hidden name="operation" value="option" />
                        <Hidden name="category" value="contribution" />
                        <Hidden name="optionOperation" value="edit" />
                        <Hidden name="optionId" value={o.id} />
                        <Field
                          name="amount"
                          label="Contribution amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          defaultValue={o.amount.toFixed(2)}
                          required
                        />
                      </ActionForm>
                      {planning && (
                        <ActionForm
                          action={action}
                          submit="Delete contribution option"
                        >
                          <Hidden name="operation" value="option" />
                          <Hidden name="category" value="contribution" />
                          <Hidden name="optionOperation" value="delete" />
                          <Hidden name="optionId" value={o.id} />
                        </ActionForm>
                      )}
                    </div>
                  </details>
                ))}
              {planning && (
                <details>
                  <summary className="text-sm font-medium">
                    Add more options
                  </summary>
                  <div className="space-y-6 mt-4">
                    <ActionForm action={action} submit="Add destination">
                      <Hidden name="operation" value="option" />
                      <Hidden name="category" value="destination" />
                      <Hidden name="optionOperation" value="add" />
                      <Field name="name" label="New destination" required />
                    </ActionForm>
                    <ActionForm action={action} submit="Add date option">
                      <Hidden name="operation" value="option" />
                      <Hidden name="category" value="date" />
                      <Hidden name="optionOperation" value="add" />
                      <Field
                        name="start"
                        label="New start"
                        type="datetime-local"
                        required
                      />
                      <Field
                        name="end"
                        label="New end"
                        type="datetime-local"
                        required
                      />
                      <Field
                        name="startOffset"
                        label="Start UTC offset (optional)"
                      />
                      <Field
                        name="endOffset"
                        label="End UTC offset (optional)"
                      />
                    </ActionForm>
                    {trip.contributionsEnabled && (
                      <ActionForm
                        action={action}
                        submit="Add contribution option"
                      >
                        <Hidden name="operation" value="option" />
                        <Hidden name="category" value="contribution" />
                        <Hidden name="optionOperation" value="add" />
                        <Field
                          name="amount"
                          label="New amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </ActionForm>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status">Loading your trip…</p>}>
      <Manage {...props} />
    </Suspense>
  );
}
