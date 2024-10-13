import { SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Home() {
  redirect("/receptionists");
}
