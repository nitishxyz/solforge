import { serve } from "bun";
import indexHtml from "./public/index.html";

export interface GuiStartOptions { port?: number }

export async function startGuiServer(opts: GuiStartOptions = {}) {
  const port = Number(opts.port ?? 3000);
  const server = serve({
    port,
    routes: {
      "/": indexHtml,
      "/health": { GET: () => new Response("ok", { headers: { "content-type": "text/plain" } }) },
    },
    development: process.env.NODE_ENV !== "production",
  });
  return { server, port: server.port };
}

