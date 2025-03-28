// import { useEffect } from "react";

// import { useSocket } from "~/context";

// export default function Index() {
//   const socket = useSocket();

//   useEffect(() => {
//     if (!socket) return;

//     socket.on("event", (data) => {
//       console.log(data);
//     });

//     socket.emit("event", "ping");
//   }, [socket]);

//   return (
//     <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
//       <h1>Welcome to Remix + Socket.io</h1>
//       <div>
//         <button type="button" onClick={() => socket?.emit("event", "ping")}>
//           Send ping
//         </button>
//       </div>
//       <p>See Browser console and Server terminal</p>
//     </div>
//   );
// }



import { ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { memory } from "src/mastra/agents";
import Chat from "~/components/ui/modules/Chat";
import { agentResponseAction } from "~/services/agentResponseAction";
import { Message } from "~/types/chat";

export async function loader() {
  const threadId = "123";

  const existingThread = await memory.getThreadById({ threadId });

  if (!existingThread) {
    const newThread = await memory.createThread({
      threadId: threadId,
      resourceId: 'user-1',
      title: "Draft",
      metadata: {
        category: "support", 
      }
    });

    console.log("New thread: >>>", newThread);
    return {
      messages: []
    };
  }
 
  const { uiMessages } = await memory.query({
    threadId: existingThread.id,
    selectBy: {
      last: 50,
    },
  });

  // Convert and filter the messages to our app's Message format
  const filteredMessages = uiMessages.filter(msg => msg.content !== '' && (msg.role === 'assistant' || msg.role === 'user'));

  console.log("filteredMessages for UI:", filteredMessages);

  return {
    messages: filteredMessages as Message[]
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = formData.get("input");
  const threadId = formData.get("threadId");
  const userId = formData.get("userId");
    
  await agentResponseAction(input as string, threadId as string, userId as string);

  return {
    success: true,
  }
}

export default function IndexPage() {
  const { messages } = useLoaderData<typeof loader>();
  const id = "123";

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col">
        <Chat
          chatId={id}
          messages={messages || []}
        />
      </div>
    </div>
  );
} 