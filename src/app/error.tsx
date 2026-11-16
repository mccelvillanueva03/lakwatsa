"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="py-16 space-y-5">
      <h1 className="page-title">A small detour.</h1>
      <p className="text-muted-foreground">
        We couldn’t load this page. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
