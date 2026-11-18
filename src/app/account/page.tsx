import { Suspense } from 'react';
import { requirePlanner } from '@/lib/auth';
import { accountAction } from '@/app/actions/auth';
import { ActionForm, Field, Hidden } from '@/components/action-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
async function Account() {
  const planner = await requirePlanner();
  return (
    <div className="max-w-2xl space-y-7">
      <div>
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1 className="page-title mt-3">A few personal details.</h1>
        <p className="text-muted-foreground mt-2">{planner.email}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={accountAction} submit="Update username">
            <Hidden name="change" value="username" />
            <Field
              name="username"
              label="Username (optional)"
              defaultValue={planner.username || ''}
              autoComplete="username"
              minLength={3}
              maxLength={32}
            />
            <p className="text-sm text-muted-foreground">
              Use 3–32 letters, numbers, or underscores. Leave empty to remove.
            </p>
          </ActionForm>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={accountAction} submit="Change password">
            <Hidden name="change" value="password" />
            <Field
              name="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
            <Field
              name="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <p className="text-sm text-muted-foreground">
              Changing your password signs out all other browsers.
            </p>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Getting things ready…</p>}>
      <Account />
    </Suspense>
  );
}
