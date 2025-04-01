import { Socket } from 'socket.io-client';
import type { AiResponse } from '~/types/chat';
import { maskStreamTags } from '@mastra/core/utils';
import { mastraClient } from 'server';

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


export async function executeWeatherAgent(input: string, threadId: string, resourceId: string, socket: Socket, responseId: string): Promise<AiResponse> {
  try {    
    // Create an abort controller for this execution
    const abortController = agentExecutionManager.createController(threadId);
    
    console.log('EXECUTING storage.egetThreadsByResourceId >>>>');

    const weatherAgent = mastraClient.getAgent('weatherAgent');
   
    const response = await weatherAgent.stream([{role: 'user', content: input}], {
      threadId,
      resourceId,
      abortSignal: abortController.signal,
      memoryOptions: {
        workingMemory: {
          enabled: true,
        },
      },
      onFinish: ({ 
          finishReason,
        }) => {
            // if (finishReason === 'stop') {
              socket.emit('ai response', { chunk: null, isLastChunk: true });
            // }
          }
        });

    let fullResponse = '';
    try {
      for await (const chunk of maskStreamTags(response.textStream, 'workingMemory')) {
        fullResponse += chunk;
        
        // Only emit intermediate results, not the final result
        // This will be emitted by the caller
        socket.emit('ai response', {
          chunk: {
            id: responseId,
            role: 'assistant',
            content: fullResponse || 'No response generated',
            createdAt: new Date().toISOString(),
          },
          isLastChunk: false
        });
      }
     } catch (error) {
       // Check if this was aborted
       if (error instanceof DOMException && error.name === 'AbortError') {
         throw error; // Re-throw to be caught by outer catch block
       }
       console.error('Error during streaming:', error);
    }
    
    //  mastraClient.saveMessageToMemory({ messages: [{threadId,
    //       content: fullResponse,
    //       role: 'assistant',
    //       type: 'text',}],
    //       // agentId: 'weatherAgent',
    //     });
    
    // If we completed successfully, remove the controller
    agentExecutionManager.abortExecution(threadId);
    
    // Return the final complete response
    return {
      chunk: {
        id: responseId,
        role: 'assistant',
        content: fullResponse || 'No response generated',
        createdAt: new Date().toISOString(),
      },
      isLastChunk: true
    };
  } catch (error) {
    console.error('Weather agent error:', error);
    
    // Check if this is an AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        // chunk: {
        //   // id: memory.generateId(),
        //   role: 'assistant',
        //   content: 'The operation was cancelled by the user.',
        //   createdAt: new Date().toISOString(),
        // },
        isLastChunk: true
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Sorry, I encountered an error while fetching the weather information. Please try again.';
    
    // Store the error message with proper format
    // await memory.addMessage({
    //   threadId: threadId,
    //   role: 'assistant', 
    //   content: errorMessage,
    //   type: 'text'
    // });
    
    return {  
      chunk: {
        // id: memory.generateId(),
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
  return agentExecutionManager.abortExecution(threadId);
} 