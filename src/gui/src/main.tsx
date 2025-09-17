import { createRoot } from "react-dom/client";
import "../public/app.css";
import { App } from "./app";

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("root");
  if (el) {
    const root = createRoot(el);
    root.render(<App />);
  }
});
