import { z } from "zod";

export const fastApiErrorResponse = z.object({
  detail: z.union([
    z.string(),
    z.object({
      message: z.string(),
      error: z.string(),
      statusCode: z.number(),
    }),
  ]),
});

export type FastApiErrorResponse = z.infer<typeof fastApiErrorResponse>;

export function safeToString(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    try {
      return String(obj);
    } catch (e) {
      return "";
    }
  }
}

export async function toFastApiErrorString(res: Response): Promise<string> {
  const errorResponse: FastApiErrorResponse = await res
    .json()
    .then((resjson) => {
      try {
        return fastApiErrorResponse.parse(resjson);
      } catch (e) {
        if (e instanceof z.ZodError) {
          const eStr = e.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
          return {
            detail: `Parsing: ${eStr} Actual: ${safeToString(resjson)}`,
          };
        }
        return {
          detail: "An unknown error occured parsing",
        };
      }
    })
    .catch(async (reason) => {
      let details: string;
      try {
        details = await res.text();
      } catch (e) {
        if (e instanceof Error) {
          details = e.message;
        }
        details = "An unknown error occured " + safeToString(reason);
      }
      return { detail: details };
    });
  let r: string;
  if (typeof errorResponse.detail === "string") {
    r = `${res.status} Error: ${errorResponse.detail}`;
  } else {
    r = `${errorResponse.detail.statusCode} Error: ${errorResponse.detail.message} (${errorResponse.detail.error})`;
  }
  return r;
}
