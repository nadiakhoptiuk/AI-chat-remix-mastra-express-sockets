import { memory } from 'src/mastra/agents';
import { mastra } from '../../src/mastra';
import type { Message } from '~/types/chat';

// Store for active agent executions by thread ID
class AgentExecutionManager {
  private static instance: AgentExecutionManager;
  private activeExecutions: Map<string, AbortController> = new Map();

  private constructor() {}

  public static getInstance(): AgentExecutionManager {
    if (!AgentExecutionManager.instance) {
      AgentExecutionManager.instance = new AgentExecutionManager();
    }
    return AgentExecutionManager.instance;
  }

  public createController(threadId: string): AbortController {
    // If there's already an active execution for this thread, abort it first
    this.abortExecution(threadId);
    
    // Create a new controller for this thread
    const controller = new AbortController();
    this.activeExecutions.set(threadId, controller);
    return controller;
  }

  public getController(threadId: string): AbortController | undefined {
    return this.activeExecutions.get(threadId);
  }

  public abortExecution(threadId: string): boolean {
    const controller = this.activeExecutions.get(threadId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(threadId);
      return true;
    }
    return false;
  }

  public clearAll(): void {
    for (const controller of this.activeExecutions.values()) {
      controller.abort();
    }
    this.activeExecutions.clear();
  }
}


// Export the manager for use in other modules
export const agentExecutionManager = AgentExecutionManager.getInstance();



export async function executeWeatherAgent(input: string, threadId: string, resourceId: string): Promise<Pick<Message, 'id' | 'role' | 'content' | 'createdAt'>> {
  try {
    const weatherAgent = mastra.getAgent('weatherAgent');
    
    // Create an abort controller for this execution
    const abortController = agentExecutionManager.createController(threadId);
    
    // Use the stream method to demonstrate longer running process that can be aborted
    console.log('stream is gonna start')
   
    const agentStream = await weatherAgent.stream('', {
      threadId,
      resourceId,
      abortSignal: abortController.signal,
    });

    let fullResponse = '';
     try {
       for await (const chunk of agentStream.textStream) {
         fullResponse += chunk;
         // In a real app, you might want to send each chunk to the client
         // This is just for demonstration purposes
       }
     } catch (error) {
       // Check if this was aborted
       if (error instanceof DOMException && error.name === 'AbortError') {
         throw error; // Re-throw to be caught by outer catch block
       }
       console.error('Error during streaming:', error);
     }
    
    // If we completed successfully, remove the controller
    agentExecutionManager.abortExecution(threadId);
    
    return {
      id: memory.generateId(),
      role: 'assistant',
      content: fullResponse || 'No response generated',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Weather agent error:', error);
    
    // Check if this is an AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        id: memory.generateId(),
        role: 'assistant',
        content: 'The operation was cancelled by the user.',
        createdAt: new Date().toISOString(),
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Sorry, I encountered an error while fetching the weather information. Please try again.';
    
    // Store the error message with proper format
    await memory.addMessage({
      threadId: threadId,
      role: 'assistant', 
      content: errorMessage,
      type: 'text'
    });
    
    return {
      id: memory.generateId(),
      role: 'assistant',
      content: errorMessage,
      createdAt: new Date().toISOString(),
    };
  }
}

// Function to abort an ongoing agent execution
export function abortAgentExecution(threadId: string): boolean {
  return agentExecutionManager.abortExecution(threadId);
} 