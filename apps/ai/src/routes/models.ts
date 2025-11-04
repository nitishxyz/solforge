import { Hono } from "hono";
import { PRICING } from "../services/pricing";
import { config } from "../config";

const models = new Hono();

models.get("/v1/models", async (c) => {
  const modelList = Object.entries(PRICING).map(([id, pricing]) => ({
    id,
    object: "model",
    owned_by: id.startsWith("gpt-") ? "openai" : "anthropic",
    pricing: {
      input: `$${(pricing.input * config.markup).toFixed(2)} / 1M tokens`,
      output: `$${(pricing.output * config.markup).toFixed(2)} / 1M tokens`,
    },
  }));

  return c.json({
    object: "list",
    data: modelList,
  });
});

export default models;
