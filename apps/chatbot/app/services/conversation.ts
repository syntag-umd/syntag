export async function generateId(language: string) {
  const apiKey = process.env.SYNTAG_API_KEY;
  if (!apiKey) {
    throw Error("SYNTAG_API_KEY is not set");
  }

  try {
    const response = await fetch(
      "https://api.syntag.ai/chat/create-conversation/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://api.syntag.ai",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "GPT_3_5_TURBO",
          medium: "CHAT",
          language: language,
        }),
      },
    );
    const data = await response.json();
    return data.uuid;
  } catch (error) {
    console.error(`Failed to generate id: ${error}`);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
