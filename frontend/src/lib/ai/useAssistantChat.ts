"use client";

import { useCallback, useRef, useState } from "react";
import { askAssistant, AssistantTurn } from "@/lib/api/assistant";
import { generateAiAnswer, Message } from "./consultantAdvisor";

const WELCOME: Message = {
  id: "welcome",
  sender: "ai",
  text: "Halo! Saya Asisten Pintar EstateVerse. Saya bisa membantu menghitung kemampuan bayar KPR, menjelaskan dokumen dan biaya membeli rumah, merekomendasikan rumah dari daftar EstateVerse, dan memberi tips bagi penjual yang ingin memasarkan rumahnya sendiri.",
};

// useAssistantChat manages the conversation with the online LLM and falls back to offline answers when needed.
export function useAssistantChat(propertySlug?: string) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [isThinking, setIsThinking] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const historyRef = useRef<Message[]>([WELCOME]);

  // Appends a message to both rendered state and the history used for the next request.
  const append = useCallback((msg: Message) => {
    historyRef.current = [...historyRef.current, msg];
    setMessages(historyRef.current);
  }, []);

  // Sends a question; uses the LLM when available, otherwise the built-in offline guide.
  const send = useCallback(
    async (text: string) => {
      const query = text.trim();
      if (!query || isThinking) return;
      append({ id: `u-${Date.now()}`, sender: "user", text: query });
      setIsThinking(true);
      try {
        const reply = await askAssistant(toTurns(historyRef.current), propertySlug);
        setIsOffline(false);
        append({ id: `a-${Date.now()}`, sender: "ai", text: reply });
      } catch {
        const offline = generateAiAnswer(query);
        setIsOffline(true);
        append({
          id: `o-${Date.now()}`,
          sender: "ai",
          text: offline.text,
          recommendationLink: offline.link,
          recommendationTitle: offline.title,
          offline: true,
        });
      } finally {
        setIsThinking(false);
      }
    },
    [append, isThinking, propertySlug]
  );

  // Clears the conversation back to the welcome message.
  const reset = useCallback(() => {
    historyRef.current = [WELCOME];
    setMessages(historyRef.current);
  }, []);

  return { messages, isThinking, isOffline, send, reset };
}

// toTurns converts rendered messages into the API's role/content history, skipping the static welcome.
function toTurns(messages: Message[]): AssistantTurn[] {
  return messages
    .filter((m) => m.id !== WELCOME.id)
    .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
}
