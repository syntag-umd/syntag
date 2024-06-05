import { ChatCompletionMessage } from "openai/resources/index.mjs";

export async function POST(req: Request) {
  const apiKey = process.env.SYNTAG_API_KEY;
  if (!apiKey) {
      throw Error("SYNTAG_API_KEY is not set");
  }

  try {
    const body = await req.json();
    const language: string = body.language;
    const id: string = body.id;
    const messages: ChatCompletionMessage[] = body.messages;
    console.log(`id: ${id} and language: ${language}`);

    const response = await fetch("https://api.syntag.ai/chat/conversation-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://api.syntag.ai",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
          "conversation_uuid": id,
          "message": messages[messages.length - 1].content,
      })
    });
    const data = await response.json();
    const text = data.response.replace(/【7†source】/g, '');
    return new Response(text, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
