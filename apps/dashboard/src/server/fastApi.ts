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

export async function toFastApiErrorResponse(
  resjsonPromise: Promise<unknown>,
): Promise<FastApiErrorResponse> {
  const errorResponse: FastApiErrorResponse = await resjsonPromise
    .then((resjson) => {
      try {
        return fastApiErrorResponse.parse(resjson);
      } catch (e) {
        if (e instanceof z.ZodError) {
          const eStr = e.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
          return {
            detail: `Error parsing: ${eStr} Actual: ${safeToString(resjson)}`,
          };
        }
        return {
          detail: "An unknown error occured parsing",
        };
      }
    })
    .catch((reason) => {
      let details = "";
      try {
        details = "Error: " + JSON.stringify(reason);
      } catch (e) {
        details = "An unknown error occured";
      }
      return { detail: details };
    });

  return errorResponse;
}
