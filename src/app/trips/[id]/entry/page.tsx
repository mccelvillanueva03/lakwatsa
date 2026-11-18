import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readTrip, currentMember } from '@/lib/trips';
import { identity } from '@/lib/auth';
import { UserError } from '@/lib/validation';
import { claimAction } from '@/app/actions/access';
import { ActionForm, SelectField } from '@/components/action-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/access-gate';
async function Entry({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const who = await identity(id);
  let trip;
  try {
    trip = await readTrip(id, who);
  } catch (e) {
    if (e instanceof UserError) return <AccessGate />;
    throw e;
  }
  if (trip.mode === 'PLANNED') redirect(`/trips/${id}`);
  const member = await currentMember(id, who);
  if (member) redirect(`/trips/${id}`);
  const available = trip.members.filter((m) => !m.session || m.session.expiresAt <= new Date());
  return (
    <div className="auth-wrap">
      <p className="eyebrow mb-4">YOU’RE INVITED</p>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{trip.title}</CardTitle>
          <CardDescription>Find your name and help shape the plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {available.length ? (
            <ActionForm action={claimAction.bind(null, id)} submit="Join as member">
              <SelectField name="memberId" label="Your name">
                <option value="">Choose your name</option>
                {available.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
              </SelectField>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted-foreground">
              All member names are claimed. Ask your planner to reset your name if you changed
              devices.
            </p>
          )}
          <div className="border-t pt-5">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/trips/${id}`}>View trip only</Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              View the full plan, votes, and contributions without claiming a name.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status">Loading your trip…</p>}>
      <Entry {...props} />
    </Suspense>
  );
}
