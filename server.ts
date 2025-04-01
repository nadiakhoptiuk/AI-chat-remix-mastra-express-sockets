import { createServer } from "http";
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { Server } from "socket.io";
import { executeWeatherAgent } from "./app/services/agent.server.js";
import dotenv from "dotenv";
import { MastraClient } from '@mastra/client-js';

dotenv.config({ path: './.env.development' });  // Шлях до твого .env файлу

let mastraClientInstance: any;

export const mastraClient = (() => {
  if (!mastraClientInstance) {
    mastraClientInstance = new MastraClient({
      baseUrl: process.env.MASTRA_API_URL || 'http://localhost:4111',
    });
  }
  return mastraClientInstance;
})();

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
});

const app = express();

// You need to create the HTTP server from the Express app
const httpServer = createServer(app);

// And then attach the socket.io server to the HTTP server
const io = new Server(httpServer);



// Then you can use `io` to listen the `connection` event and get a socket
// from a client
io.on("connection", (socket) => {
  // from this point you are on the WS connection with a specific client
  console.log('socket', socket.id, "connected");
  // console.log("Inside WebSocket:", {
  //     storageExists: !!storage,
  //     agentExists: !!weatherAgent,
  //     memoryExists: !!memory,
  //   }, storage);

  socket.emit("emit, confirmation", "connected!");

  socket.on('user inquiry', async (msg) => {
    console.log('user message: ', msg.input);
    
    const response = await executeWeatherAgent(msg.input, msg.threadId, msg.userId, socket, msg.responseId);

    socket.emit('ai response', response)
  });

  socket.on('disconnect', () => {
    console.log('socket', socket.id, 'disconnected');
  });
});

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }));

app.use(morgan("tiny"));

// handle SSR requests
app.all("*", remixHandler);

const port = process.env.PORT || 3005;

// instead of running listen on the Express app, do it on the HTTP server
httpServer.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
