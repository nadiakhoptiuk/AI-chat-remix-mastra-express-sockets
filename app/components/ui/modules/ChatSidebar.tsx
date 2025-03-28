import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useMemo } from "react";
import { memory } from "src/mastra/agents";
import { formatRelative } from "date-fns";

interface ChatSidebarProps {
  chats: {
    id: string;
    title: string;
    createdAt: string;
  }[];
  currentChatId?: string;
}

export function ChatSidebar({ chats, currentChatId }: ChatSidebarProps) {
  const generatedChatId = useMemo(() => {
    return memory.generateId();
  }, []);

  const threadsByDate = useMemo(() => {
    return chats.map((chat) => {
      return {
        ...chat,
        createdAt: formatRelative(new Date(chat.createdAt), new Date()),
      };
    });
  }, [chats]);

  return (
    <div className="w-80 border-r min-h-screen bg-muted/40">
      <div className="flex flex-col h-full">
        
        <div className="px-4 py-3 border-b">
          <Link to={`/chat/${generatedChatId}`}>
            <Button className="w-full" variant="outline">
              New Chat
            </Button>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-2">
          <h2 className="text-lg font-semibold mb-5">Chats</h2>

          <div className="space-y-4 py-2">
            {threadsByDate.map((chat) => (
                <div key={chat.id} className="space-y-2">
                  <p className="text-xs text-muted-foreground">{chat.createdAt}</p>

                    {chat.id !== currentChatId ? <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className="block text-sm p-2 bg-gray-700 hover:bg-gray-600 focus:bg-gray-600 rounded-md"
                  >
                    {chat.title}
                  </Link> : <p className="block text-sm p-2 bg-transparent border border-gray-700 rounded-md">{chat.title}</p>}
                </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 