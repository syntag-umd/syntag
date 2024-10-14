import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
} from "next/server";

const isClerkProtected = createRouteMatcher([
  "/((?!onboarding|_next/static|_next/image|sign-in|sign-up|monitoring|icon).*)",
]);

export default clerkMiddleware(async (auth, request, event) => {
  /* 
  console.log(request);
  console.log("====================================");
  console.log(request.nextUrl);
  console.log("===================================="); 
  */

  if (!isClerkProtected(request)) {
    if (request.nextUrl.pathname.startsWith("/onboarding")) {
      const sessionClaims = auth().sessionClaims as CustomJwtSessionClaims;
      if (sessionClaims.external_id) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const sessionClaims = auth().sessionClaims as CustomJwtSessionClaims | null;
  if (!sessionClaims) {
    auth().protect();
    auth().redirectToSignIn();
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  if (!sessionClaims.external_id) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  auth().protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|sign-in|sign-up|monitoring|icon).*)",
  ],
};
