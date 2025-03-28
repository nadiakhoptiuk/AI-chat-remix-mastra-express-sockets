import { executeWeatherAgent } from "~/services/agent.server";

export async function agentResponseAction(input: string, threadId: string, userId: string) {
  // The executeWeatherAgent function already saves the message to memory
  // through the agent.generate() call, so we don't need to save it again
  const response = await executeWeatherAgent(input, threadId, userId);

  return response;
}