import Link from 'next/link';
import { Compass } from 'lucide-react';
import { plannerForToken } from '@/lib/auth-service';
import { plannerToken } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { Button } from './ui/button';
export function Brand() {
  return (
    <Link href="/" className="brand">
      <Compass size={27} strokeWidth={1.8} />
      <span>
        trip lang<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
export async function Navigation() {
  const planner = await plannerForToken(await plannerToken());
  return (
    <nav
      className="flex flex-wrap items-center gap-2 sm:gap-5 text-sm"
      aria-label="Main navigation"
    >
      {planner ? (
        <>
          <Link href="/dashboard" className="nav-link">
            My trips
          </Link>
          <Link href="/account" className="nav-link">
            Account
          </Link>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </>
      ) : (
        <>
          <Link href="/sign-in" className="nav-link">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Start planning</Link>
          </Button>
        </>
      )}
    </nav>
  );
}
