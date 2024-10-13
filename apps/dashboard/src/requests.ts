import { auth } from "@clerk/nextjs/server";
import { env } from "./env";
import { z } from "zod";

export async function query(url: string, body: string) {
  const token = await auth().getToken();

  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-CLERK-JWT": token,
      },
      body: body,
    });

    const data: unknown = await response.json();
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function mutate(url: string, body: string) {
  const token = await auth().getToken();

  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-CLERK-JWT": token,
      },
      body: body,
    });
    const data: unknown = await response.json();
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
const path_fetch = z.string().startsWith("/");

export async function fastApiFetch(
  path: z.infer<typeof path_fetch>,
  token: string,
  init?: RequestInit,
) {
  if (!init) {
    init = {};
  }

  const headers = new Headers(init.headers);
  headers.append("X-CLERK-JWT", token);

  init.headers = headers;
  /* fastAPI can not read body if this is not set */
  if (!init.headers.get("content-type")) {
    init.headers.set("content-type", "application/json");
  }

  const url = `${env.NEXT_PUBLIC_FASTAPI_BASE_URL}${path}`;
  console.log("fetching fastapi:", url);
  return fetch(url, init);
}
