import { apiClient } from "./client";

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

// askAssistant sends the conversation to the backend LLM; it throws (e.g. 503) when the model is unavailable.
export async function askAssistant(messages: AssistantTurn[], propertySlug?: string): Promise<string> {
  const data = await apiClient<{ reply: string }>("/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ messages, property_slug: propertySlug ?? "" }),
  });
  return data.reply;
}
