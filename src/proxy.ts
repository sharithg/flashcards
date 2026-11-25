import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything except the auth pages requires an account. Signed-out page visits are redirected to
// /sign-in; signed-out API and Server Action requests are rejected.
// The CLI API authenticates with API keys instead of sessions; each handler checks the key (src/lib/cli-auth.ts).
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/cli(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
