import { Socket , DefaultEventsMap } from 'socket.io';
import type { AiResponse } from '~/types/chat';
import { mastraClient } from '~/lib/mastra';
import { compareResponsesAndGetResult, removeTags } from './removeTags';

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
    let controller = this.activeExecutions.get(threadId);

    if (!controller) {
      controller = new AbortController();
      this.activeExecutions.set(threadId, controller);
    }

    return controller;
  }

  public getController(threadId: string): AbortController | undefined {
    return this.activeExecutions.get(threadId);
  }

  public abortExecution(threadId: string): boolean {
    const controller = this.activeExecutions.get(threadId);

    if (controller) {
      controller.abort();
      return true;
    }

    return false;
  }

  public removeController(threadId: string): void {
    this.activeExecutions.delete(threadId);
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


export async function executeWeatherAgent(input: string, threadId: string, resourceId: string, socket: Socket<DefaultEventsMap>, responseId: string): Promise<AiResponse> {
  try {    
    // Create an abort controller for this execution
    const abortController = agentExecutionManager.createController(threadId);

    const weatherAgent = mastraClient.getAgent('weatherAgent');
   
    const response = await weatherAgent.stream({
      messages: [{ role: 'user', content: input }],
      threadId,
      resourceId,
      // signal: abortController.signal,
      memoryOptions: {
        workingMemory: { enabled: true },
      },
      onFinish: () => {
        // if(finishedReason === 'stop') {
        //   agentExecutionManager.removeController(threadId);
        // }
        socket.emit('ai response', { chunk: null, isLastChunk: true });
      }

    });
   
    let fullPermanentResponse = ''
    
    response.processDataStream({
      onTextPart: (text: string) => {
        fullPermanentResponse += text; 

        const result = compareResponsesAndGetResult(fullPermanentResponse);

        socket.emit('ai response', {
          chunk: {
            id: responseId,
            role: 'assistant',
            content: result || 'No response generated',
            createdAt: new Date().toISOString(),
          },
          isLastChunk: false
        });
      },
      onErrorPart: (error) => {
        console.error('error: >>>', error);
      },
    });
    
    const result = removeTags(fullPermanentResponse, 'working_memory') 
    
    // Return the final complete response
    return {
      chunk: {
        id: responseId,
        role: 'assistant',
        content: result || 'No response generated',
        createdAt: new Date().toISOString(),
      },
      isLastChunk: true
    };
  } catch (error) {
    console.error('Weather agent error:', error);

    if (error?.name === "AbortError") {
      console.log("Fetch aborted successfully:", threadId);
    }
    
    // Check if this is an AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('ABORT ERROR:, ABORTED', error);
      agentExecutionManager.removeController(threadId);

      return {
        chunk: {
          id: responseId,
          role: 'assistant',
          content: 'The operation was cancelled by the user.',
          createdAt: new Date().toISOString(),
        },
        isLastChunk: true
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Sorry, I encountered an error while fetching the weather information. Please try again.';

    // Store the error message with proper format (if needed)
    // await memory.addMessage({
    //   threadId: threadId,
    //   role: 'assistant', 
    //   content: errorMessage,
    //   type: 'text'
    // });
    
    agentExecutionManager.removeController(threadId);
    return {  
      chunk: {
        id: responseId,
        role: 'assistant',
        content: errorMessage,
        createdAt: new Date().toISOString(),
      },
      isLastChunk: true
    };
  }
}


// Function to abort an ongoing agent execution
export function abortAgentExecution(threadId: string): boolean {
  const aborted = agentExecutionManager.abortExecution(threadId);
  console.log('ABORT AGENT EXECUTION RESULT:', aborted);
  return aborted;
}