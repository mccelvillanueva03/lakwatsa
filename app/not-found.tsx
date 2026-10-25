import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="py-16 space-y-5">
      <h1 className="page-title">This path leads nowhere.</h1>
      <p className="text-muted-foreground">
        The page or trip is unavailable. Check your link or enter the current
        trip code.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
