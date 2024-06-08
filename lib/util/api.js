import { SSE } from "./sse.js";
export const streamResponse = (query) => {
    return new SSE("http://99.233.10.238:5000/chat", {
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({
        message: query
      }),
    });
  };