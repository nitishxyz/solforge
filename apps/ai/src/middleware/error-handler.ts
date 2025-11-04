import { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("Error:", err);

  if (err.message.includes("Insufficient balance")) {
    return c.json(
      {
        error: {
          message: "Insufficient balance for this request",
          type: "insufficient_balance",
        },
      },
      400
    );
  }

  return c.json(
    {
      error: {
        message: "Internal server error",
        type: "server_error",
        details: err.message,
      },
    },
    500
  );
};
