import { useLoaderData } from "@remix-run/react";
import Chat from "~/components/ui/modules/Chat";
import { Message, SystemMessage } from "~/types/chat";
import { io } from "socket.io-client";
import { useEffect , useState } from "react";
import type { Socket } from "socket.io-client";
import { mastraClient } from "~/lib/mastra";

export async function loader() {
  const threadId = "123";
  const resourceId = "user-1";

  const existingThread = await mastraClient.getMemoryThread(threadId, 'weatherAgent');

  if (!existingThread) {
    await mastraClient.createMemoryThread({
      title: "Draft",
      threadId: threadId,
      resourceid: resourceId,
      agentId: 'weatherAgent',
      metadata: {
        category: "support", 
      }
    });

    return {
      messages: []
    };
  }
 
  const { uiMessages } = await existingThread.getMessages();

  // Convert and filter the messages to our app's Message format
  const filteredMessages = uiMessages.filter((msg: SystemMessage) => msg.content !== '' && (msg.role === 'assistant' || msg.role === 'user'));

  return {
    messages: filteredMessages as Message[]
  };
}

export default function IndexPage() {
  const { messages } = useLoaderData<typeof loader>();
  const id = "123";

  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    const socket = io();
    setSocket(socket);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("confirmation", (data) => {
      console.log('socket confirmation,', data);
    });
  }, [socket]);


  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col">
        <Chat
          chatId={id}
          messages={messages || []}
          socket={socket}
        />
      </div>
    </div>
  );
} 