import { SignIn } from "@clerk/nextjs";
import { env } from "~/env";

export default function Page() {
  return <SignIn path={env.NEXT_PUBLIC_CLERK_SIGN_IN_URL} />;
}
