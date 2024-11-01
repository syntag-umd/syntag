// src/app/_middleware.ts
import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes using route matcher
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);

// Main middleware function combining both redirection and authentication checks
export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();
  const { pathname } = req.nextUrl;

  // Redirect the root URL to a specific page
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/sign-in', req.url)); // Use absolute URL
  }

  // Check if the route is protected and the user is not authenticated
  if (!userId && isProtectedRoute(req)) {
    // Add custom logic to run before redirecting
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// Middleware configuration
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
