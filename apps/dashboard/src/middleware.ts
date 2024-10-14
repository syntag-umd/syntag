import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "./env";
import { getActualAuth } from "./app/(auth)/utils";

const isClerkProtected = createRouteMatcher([
  "/((?!_next/static|_next/image|share|sign-in|sign-up|onboarding|monitoring|icon|api).*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isClerkProtected(request)) {
    const sessionClaims = auth().sessionClaims as CustomJwtSessionClaims | null;
    if (
      request.nextUrl.pathname.startsWith("/onboarding") ||
      request.nextUrl.pathname.startsWith("/sign-in") ||
      request.nextUrl.pathname.startsWith("/sign-up")
    ) {
      if (sessionClaims?.external_id) {
        return NextResponse.redirect(
          new URL(
            env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
            request.url,
          ),
        );
      }
      return NextResponse.next();
    }
    return NextResponse.next();
  }
  const actualAuth = await getActualAuth(auth());
  if (!actualAuth.userId) {
    auth().protect();
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  if (actualAuth.sessionClaims.external_id) {
    return NextResponse.next();
  } else {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|monitoring|icon).*)"],
};
