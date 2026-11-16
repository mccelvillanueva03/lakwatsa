import { redeemAction } from "@/app/actions/access";
import { ActionForm, Field } from "./action-form";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
export function AccessGate() {
  return (
    <div className="auth-wrap">
      <Card>
        <CardHeader>
          <CardTitle>Enter your trip code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-5">
            Your access may have expired or the planner shared a new code.
          </p>
          <ActionForm action={redeemAction} submit="Open trip">
            <Field name="code" label="Trip code" required maxLength={30} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
