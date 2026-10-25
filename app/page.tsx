import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  CalendarDays,
  Users,
  MoveRight,
  Sun,
} from "lucide-react";
import { redeemAction } from "./actions/access";
import { ActionForm, Field } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
async function InvalidInviteNotice({
  searchParams,
}: {
  searchParams: Promise<{ invalidCode?: string }>;
}) {
  const query = await searchParams;
  return query.invalidCode ? (
    <Alert variant="destructive" role="alert">
      <AlertDescription>
        Invalid trip code. Ask your planner for the current invite.
      </AlertDescription>
    </Alert>
  ) : null;
}
export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ invalidCode?: string }>;
}) {
  return (
    <div className="space-y-14">
      <section className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center pt-4 sm:pt-8">
        <div className="space-y-7">
          <p className="eyebrow flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Less back-and-forth, more let’s go
          </p>
          <h1 className="hero-title">
            The group chat
            <br />
            deserves a <span className="serif-accent">getaway.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Pick a place. Find your dates. Get everyone on the same page — and
            finally make that trip happen.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Let’s plan a trip <MoveRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#join">
                I have a trip code <ArrowUpRight />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Users size={16} />
            One planner. Your favorite people. A shared plan.
          </p>
        </div>
        <div className="trip-art" aria-label="Illustration of a sunny getaway">
          <div className="art-sun">
            <Sun size={46} />
          </div>
          <div className="art-mountain mountain-back" />
          <div className="art-mountain mountain-front" />
          <div className="art-water" />
          <div className="art-card">
            <p className="eyebrow">NEXT UP · YOUR NEXT ESCAPE</p>
            <p className="text-2xl font-semibold mt-3">Somewhere, together.</p>
            <div className="flex gap-3 mt-4 text-sm">
              <span className="flex items-center gap-1">
                <MapPin size={15} />A place you all love
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays size={15} />A date that works
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <div className="flex -space-x-2">
                {["A", "B", "C", "+2"].map((v, i) => (
                  <span key={v} className={`avatar avatar-${i}`}>
                    {v}
                  </span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                The whole gang is in.
              </span>
            </div>
          </div>
          <span className="art-sticker">
            out of office
            <br />
            <strong>into the good stuff ↗</strong>
          </span>
        </div>
      </section>
      <section className="grid md:grid-cols-3 gap-5">
        {[
          {
            icon: MapPin,
            n: "01",
            title: "Put your ideas out there",
            copy: "Beach, mountains, or a weekend staycation. Give your friends a few good options.",
          },
          {
            icon: Users,
            n: "02",
            title: "Let the group weigh in",
            copy: "Share a private code. Everyone votes for their favorite place, dates, and budget.",
          },
          {
            icon: CalendarDays,
            n: "03",
            title: "Make it official",
            copy: "Settle the details and keep contributions clear. All that’s left is the trip.",
          },
        ].map((s) => (
          <div key={s.n} className="step-card">
            <div className="flex justify-between items-center">
              <s.icon size={22} className="text-primary" />
              <span className="eyebrow text-muted-foreground">{s.n}</span>
            </div>
            <h2 className="text-lg font-semibold mt-5 mb-2">{s.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {s.copy}
            </p>
          </div>
        ))}
      </section>
      <section
        id="join"
        className="grid md:grid-cols-2 gap-8 items-center rounded-3xl bg-secondary p-6 sm:p-10"
      >
        <div>
          <p className="eyebrow mb-3">ALREADY PART OF THE PLAN?</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Your people are waiting.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-sm">
            Enter the code your planner shared. No account needed to join or
            take a look.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={null}>
              <InvalidInviteNotice searchParams={searchParams} />
            </Suspense>
            <ActionForm action={redeemAction} submit="Find my trip">
              <Field
                name="code"
                label="Trip code"
                placeholder="ABCD-EFGH-JKLM"
                autoComplete="off"
                maxLength={30}
                required
              />
            </ActionForm>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
