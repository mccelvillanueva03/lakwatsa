"use client";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ActionForm, Hidden, SelectField } from "./action-form";
import { manageAction } from "@/app/actions/trips";
type Decision = {
  category: string;
  winner?: string;
  options: { id: string; label: string; count: number }[];
};
export function FinalizeDialog({
  id,
  decisions,
}: {
  id: string;
  decisions: Decision[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Finalize trip</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Make it official.</DialogTitle>
          <DialogDescription>
            Unique winners are selected automatically. Resolve tied or unvoted
            categories below. Voting cannot be reopened.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={manageAction.bind(null, id)}
          submit="Confirm and close voting"
        >
          <Hidden name="operation" value="finalize" />
          {decisions.map((d) => (
            <div key={d.category}>
              {d.winner ? (
                <div className="rounded-lg bg-secondary p-4 text-sm">
                  <p className="font-semibold capitalize">
                    {d.category} winner
                  </p>
                  <p className="mt-1">
                    {d.options.find((o) => o.id === d.winner)?.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.options.find((o) => o.id === d.winner)?.count} votes
                  </p>
                </div>
              ) : (
                <SelectField
                  name={d.category}
                  label={`${d.category[0].toUpperCase() + d.category.slice(1)} decision`}
                >
                  <option value="">Choose a tied or unvoted option</option>
                  {d.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} — {o.count} votes
                    </option>
                  ))}
                </SelectField>
              )}
            </div>
          ))}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
