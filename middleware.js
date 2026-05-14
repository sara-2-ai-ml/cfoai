import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "./lib/clerkConfigured.js";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

/**
 * Dev: always run Clerk middleware (supports keyless / claim flow without .env keys).
 * Production without keys: skip Clerk middleware (avoids 500) — protect /dashboard with redirect.
 */
export default function middleware(request, event) {
  if (process.env.NODE_ENV === "production" && !isClerkConfigured()) {
    if (isProtectedRoute(request)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
