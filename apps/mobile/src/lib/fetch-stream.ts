import { ReadableStream } from "web-streams-polyfill";

export function fetchStream(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;
  
  const method = init?.method || "GET";
  const headers = new Headers(init?.headers);
  const body = init?.body;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = "text";

    headers.forEach((value, key) => {
      xhr.setRequestHeader(key, value);
    });

    let processedLength = 0;

    const stream = new ReadableStream({
      start(controller) {
        xhr.onprogress = (event) => {
          const response = xhr.responseText;
          const chunk = response.substring(processedLength);
          processedLength = response.length;

          if (chunk.length > 0) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        };

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Send any remaining data
            const response = xhr.responseText;
            const chunk = response.substring(processedLength);
            if (chunk.length > 0) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } else {
             const response = xhr.responseText;
             const chunk = response.substring(processedLength);
             if (chunk.length > 0) {
                 controller.enqueue(new TextEncoder().encode(chunk));
             }
             controller.close();
          }
        });

        xhr.addEventListener("error", () => {
          controller.error(new Error("Network request failed"));
        });

        xhr.addEventListener("timeout", () => {
          controller.error(new Error("Request timed out"));
        });
      },
      cancel() {
        xhr.abort();
      },
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 2) {
        const responseHeaders = new Headers();
        const headerLines = xhr
          .getAllResponseHeaders()
          .trim()
          .split(/[\r\n]+/);
        headerLines.forEach((line) => {
          const parts = line.split(": ");
          const key = parts.shift();
          const value = parts.join(": ");
          if (key) responseHeaders.set(key, value);
        });

        const response = {
             ok: xhr.status >= 200 && xhr.status < 300,
             status: xhr.status,
             statusText: xhr.statusText,
             headers: responseHeaders,
             body: stream,
             url: xhr.responseURL || url,
             redirected: false,
             type: 'default',
             clone: () => { throw new Error('Clone not implemented'); },
             blob: () => {
                return new Promise((resolveBlob, rejectBlob) => {
                    if (xhr.readyState === 4) {
                        resolveBlob(new Blob([xhr.responseText]));
                    } else {
                        xhr.addEventListener('load', () => resolveBlob(new Blob([xhr.responseText])));
                        xhr.addEventListener('error', () => rejectBlob(new Error('Network error')));
                    }
                });
             },
             formData: () => Promise.reject(new Error('FormData not implemented')),
             arrayBuffer: () => {
                 return new Promise((resolveBuf, rejectBuf) => {
                    if (xhr.readyState === 4) {
                        resolveBuf(new TextEncoder().encode(xhr.responseText));
                    } else {
                        xhr.addEventListener('load', () => resolveBuf(new TextEncoder().encode(xhr.responseText)));
                        xhr.addEventListener('error', () => rejectBuf(new Error('Network error')));
                    }
                });
             },
             text: () => {
                 return new Promise((resolveText, rejectText) => {
                    if (xhr.readyState === 4) {
                        resolveText(xhr.responseText);
                    } else {
                        xhr.addEventListener('load', () => resolveText(xhr.responseText));
                        xhr.addEventListener('error', () => rejectText(new Error('Network error')));
                    }
                });
             },
             json: () => {
                 return new Promise((resolveJson, rejectJson) => {
                     if (xhr.readyState === 4) {
                          try { resolveJson(JSON.parse(xhr.responseText)); } catch(e) { rejectJson(e); }
                     } else {
                          xhr.addEventListener('load', () => {
                               try { resolveJson(JSON.parse(xhr.responseText)); } catch(e) { rejectJson(e); }
                          });
                          xhr.addEventListener('error', () => rejectJson(new Error('Network error')));
                     }
                 });
             }
        } as unknown as Response;

        resolve(response);
      }
    };

    xhr.send(body as any);
  });
}
