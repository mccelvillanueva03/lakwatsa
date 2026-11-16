import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand, Navigation } from "@/components/nav";
import "./globals.css";
export const instant = false;
export const metadata: Metadata = {
  title: {
    default: "Trip Lang — Good trips start here",
    template: "%s · Trip Lang",
  },
  description:
    "A shared plan for your next escape. Choose a place, find a date, and get your friends on board.",
  referrer: "no-referrer",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <div className="page-width flex items-center justify-between gap-3 py-5">
            <Brand />
            <Suspense
              fallback={
                <span className="text-sm text-muted-foreground">
                  Just a moment…
                </span>
              }
            >
              <Navigation />
            </Suspense>
          </div>
        </header>
        <main id="main" className="page-width flex-1 py-8 sm:py-12">
          <Suspense fallback={<p role="status">Getting things ready…</p>}>
            {children}
          </Suspense>
        </main>
        <footer className="page-width py-8 text-xs text-muted-foreground flex flex-wrap justify-between gap-3 border-t">
          <span>A little less planning. A lot more going.</span>
          <span>Made for your kind of company.</span>
        </footer>
      </body>
    </html>
  );
}
