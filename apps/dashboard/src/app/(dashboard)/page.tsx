import { SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";

export default async function Home() {
  return (
    <main className="text-foreground flex min-h-screen flex-col items-center justify-center">
      <SignedIn>You are signed in</SignedIn>
      <SignedOut>You are signed out</SignedOut>
      <SignOutButton> Click to Log Out</SignOutButton>
    </main>
  );
}
