import { json, type ActionFunctionArgs } from "@remix-run/node";
import { abortAgentExecution } from "~/services/agent.server";

export async function action({ params }: ActionFunctionArgs) {
  const threadId = params.threadId;
  
  if (!threadId) {
    return json({ success: false, message: "Thread ID is required" }, { status: 400 });
  }
  
  const aborted = abortAgentExecution(threadId);
  
  if (aborted) {
    return json({ success: true, message: "Agent execution aborted successfully" });
  } else {
    return json({ success: false, message: "No active agent execution found for this thread" });
  }
} 