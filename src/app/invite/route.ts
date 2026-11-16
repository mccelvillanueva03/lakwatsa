import { NextRequest, NextResponse } from "next/server";
import { redeemCode } from "@/lib/trips";
import { cookieOptions } from "@/lib/auth";
export async function GET(request: NextRequest) {
  try {
    const access = await redeemCode(
      request.nextUrl.searchParams.get("code") || "",
    );
    const response = new NextResponse(null, {
      status: 303,
      headers: {
        Location: `/trips/${access.tripId}${access.mode === "PLANNING" ? "/entry" : ""}`,
      },
    });
    response.cookies.set(`trip_access_${access.tripId}`, access.viewerToken, {
      ...cookieOptions,
      expires: access.expiresAt,
    });
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    const response = new NextResponse(null, {
      status: 303,
      headers: { Location: "/?invalidCode=1" },
    });
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
