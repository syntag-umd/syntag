import { GoogleAuth } from "google-auth-library";
import { env } from "~/env";

const auth = new GoogleAuth({
  credentials: {
    client_email: env.GC_SERVICE_EMAIL,
    private_key: env.GC_SERVICE_PRIVATE_KEY,
  },
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/cloud-tasks",
  ],
});

export async function getAccessToken() {
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error("No access token found in response");
    }
    return tokenResponse.token;
  } catch (e) {
    console.error(`Error getting access token: ${JSON.stringify(e)}`);
  }
}
