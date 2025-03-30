import type { Message } from "~/types/chat";
import { ChatMessageList } from "~/components/ui/chat/chat-message-list";
import { ChatInput } from "~/components/ui/chat/chat-input";
import { Button } from "~/components/ui/button";
import { PaperPlaneIcon, StopIcon } from "@radix-ui/react-icons";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState, useRef } from "react";
import type { Socket } from "socket.io-client";

export interface ChatProps {
  messages: Message[];
  chatId?: string;
  socket?: Socket;
}

export default function Chat({ 
  messages, socket
}: ChatProps) {
  const threadId = "123";
  const userId = "user-1";
  const fetcher = useFetcher();
  const abortFetcher = useFetcher();
  const [input, setInput] = useState("");
  const isSubmitting = fetcher.state === "submitting";
  const [shownMessages, setShownMessages] = useState<Message[]>(messages);
  // Track current response ID to handle streaming updates
  const currentResponseId = useRef<string | null>(null);
  // Track if we're currently waiting for a response
  const isWaitingForResponse = useRef(false);

  useEffect(() => {
    // Update shownMessages when prop messages change
    setShownMessages(messages);
  }, [messages]);
  
  // Setup socket event handler once
  useEffect(() => {
    if (!socket) return;
    
    // Define the handler outside the subscription so we can use it for cleanup
    const handleAiResponse = (response: Message) => {
      if (!response) return;
      
      console.log('AI response received:', response.id);
      
      setShownMessages((prev) => {
        // Create a new array to ensure React detects the change
        const newMessages = [...prev];
        
        // Find if we already have a message from the assistant with this ID
        const existingIndex = newMessages.findIndex(
          msg => msg.id === response.id
        );
        
        if (existingIndex >= 0) {
          // Update existing message
          newMessages[existingIndex] = response;
        } else {
          // If this is a message from a new ID and we have a currentResponseId,
          // we should replace the message with that ID
          const currentResponseIndex = currentResponseId.current 
            ? newMessages.findIndex(msg => msg.id === currentResponseId.current)
            : -1;
            
          if (currentResponseIndex >= 0) {
            // Replace the old response with the new one
            newMessages[currentResponseIndex] = response;
          } else {
            // This is a completely new message
            newMessages.push(response);
          }
          
          // Update the current response ID reference
          currentResponseId.current = response.id;
        }
        
        // Mark that we're no longer waiting for a response once we get something
        isWaitingForResponse.current = false;
        
        return newMessages;
      });
    };
    
    // // Clean up previous listeners to avoid duplicates
    // socket.off("ai response");
    
    // Set up the event listener
    socket.on("ai response", handleAiResponse);
  }, [socket]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle form submission manually to ensure proper clearing and prevent default
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Create form data manually
    const formData = new FormData();
    formData.append("input", input);
    formData.append("threadId", threadId);
    formData.append("userId", userId);
    
    // Reset the current response ID when starting a new conversation
    currentResponseId.current = null;

    // Add user message to the chat
    const userMessage: Message = { 
      id: `user-${Date.now()}`, 
      content: input, 
      role: "user", 
      createdAt: new Date().toISOString() 
    };
    
    setShownMessages(prev => [...prev, userMessage]);
    setInput("");

    // Send the message to the server
    socket?.emit('user inquiry', {input, threadId, userId});
  };

  //Function to abort the agent execution
  const handleAbort = () => {
    abortFetcher.submit(
      {}, // No form data needed
      { 
        method: "post", 
        action: `/api/abort/${threadId}` 
      }
    );
  };
  
  return (
    <div className="flex flex-col justify-between w-full h-screen">
      <div className="flex-1 overflow-hidden">
        <ChatMessageList>
          {shownMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              } mb-4`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === "assistant"
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </ChatMessageList>
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <ChatInput
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            name="input" 
            disabled={isSubmitting || isWaitingForResponse.current}
          />

          {isWaitingForResponse.current ? (
            <Button 
              type="button" 
              size="icon" 
              variant="destructive"
              className="shrink-0" 
              onClick={handleAbort}
              title="Stop generating"
            >
              <StopIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              size="icon" 
              className="shrink-0" 
              disabled={!input.trim() || isWaitingForResponse.current}
            >
              <PaperPlaneIcon className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
} 