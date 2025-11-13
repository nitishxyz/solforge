import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config";
import { errorHandler } from "./middleware/error-handler";
import chat from "./routes/chat";
import chatSessions from "./routes/chat-sessions";
import balance from "./routes/balance";
import txRouter from "./routes/transactions";
import models from "./routes/models";
import topup from "./routes/topup";
import completions from "./routes/completions";

const app = new Hono();
const corsOptions = {
  origin: "*",
  allowMethods: [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "CONNECT",
  ],
  allowHeaders: ["*"],
  exposeHeaders: ["*"],
};

app.use("*", logger());
app.use("*", cors(corsOptions));

app.get("/", (c) => {
  return c.json({
    service: "ai.solforge.sh",
    version: "1.0.0",
    status: "online",
  });
});

app.route("/", chat);
app.route("/", chatSessions);
app.route("/", balance);
app.route("/", txRouter);
app.route("/", models);
app.route("/", topup);
app.route("/", completions);

app.onError(errorHandler);

export default {
  port: config.port,
  fetch: app.fetch,
  idleTimeout: 60,
};
