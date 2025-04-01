import { MastraClient } from "@mastra/client-js";

let mastraClientInstance: any;

export const mastraClient = (() => {
  if (!mastraClientInstance) {
    mastraClientInstance = new MastraClient({
      baseUrl: process.env.MASTRA_API_URL || 'http://localhost:4111',
    });
  }
  return mastraClientInstance;
})();