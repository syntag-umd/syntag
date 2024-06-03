import { SignUp } from "@clerk/nextjs";
import { env } from "~/env";

export default function Page() {
  return <SignUp path={env.NEXT_PUBLIC_CLERK_SIGN_UP_URL} />;
}
