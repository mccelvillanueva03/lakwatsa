import Link from "next/link";
import { ActionForm, Field } from "@/components/action-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { loginAction } from "@/app/actions/auth";
export default function SignIn() {
  return (
    <div className="auth-wrap">
      <p className="eyebrow mb-4">WELCOME BACK, PLANNER</p>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Where are we off to?</CardTitle>
          <CardDescription>Sign in to pick up your plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={loginAction} submit="Sign in">
            <Field
              name="identifier"
              label="Email or username"
              autoComplete="username"
              maxLength={254}
              required
            />
            <Field
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </ActionForm>
          <p className="mt-6 text-sm">
            New here?{" "}
            <Link href="/register" className="text-link">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
