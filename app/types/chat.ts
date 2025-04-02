export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | string;
}

export type SystemMessage = {
  id: string;
  role: "user" | "assistant" | "data" | "system";
  content: string;
  createdAt?: Date | undefined;
}

export type AiResponse = {
  chunk: Pick<Message, 'id' | 'role' | 'content' | 'createdAt'>,
  isLastChunk: boolean
}