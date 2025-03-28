import { groq } from '@ai-sdk/groq';
import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools';
import { PostgresStore } from "@mastra/pg";
import { Memory } from "@mastra/memory";

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL || '',
});

export const memory = new Memory({
  storage,
  options: {
    // Number of recent messages to include (false to disable)
    lastMessages: 50,
    // Configure vector-based semantic search (false to disable)
    semanticRecall: {
      topK: 3, // Number of semantic search results
      messageRange: 2, // Messages before and after each result
    },

    workingMemory: {
      enabled: true,
    },

    threads: {
      generateTitle: true,
    },
  },
});

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: `
      You are a helpful weather assistant that provides accurate weather information.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn’t in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative

      Use the weatherTool to fetch current weather data.
`,
  model: groq('llama-3.3-70b-versatile'),
  tools: { weatherTool },
  memory
});
