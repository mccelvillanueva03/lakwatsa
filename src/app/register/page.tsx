import Link from 'next/link';
import { ActionForm, Field } from '@/components/action-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { registerAction } from '@/app/actions/auth';
import { Hidden } from '@/components/action-form';
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo =
    params.returnTo?.startsWith('/trips/') && params.returnTo.endsWith('/entry')
      ? params.returnTo
      : '/dashboard';
  return (
    <div className="auth-wrap">
      <p className="eyebrow mb-4">FIRST STOP: YOUR NEXT ADVENTURE</p>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Be the friend who makes it happen.</CardTitle>
          <CardDescription>
            Create your planner account. Your friends can join with a code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={registerAction} submit="Create account">
            <Hidden name="returnTo" value={returnTo} />
            <Field
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
            <Field
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={128}
              required
            />
            <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
          </ActionForm>
          <p className="mt-6 text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-link">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
