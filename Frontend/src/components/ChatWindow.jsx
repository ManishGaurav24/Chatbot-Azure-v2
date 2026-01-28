import { toast } from "react-hot-toast";
import sanitizeHtml from "sanitize-html";
import { updateFeedback as updateFeedbackApi } from "../api/feedbackApi";

// Detect docx
const isDocx = (url = "") =>
  url.toLowerCase().endsWith(".docx");

// Microsoft Office online viewer
const getViewerUrl = (url) =>
  isDocx(url)
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url;

// Markdown/BBCode-style formatter + table converter
function formatMessage(text) {
  // Escape raw HTML tags
  let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Convert markdown tables into HTML tables
  safeText = safeText.replace(/((?:\|.*\|\n)+)(?=\n|$)/g, (match) => {
    const rows = match.trim().split("\n");
    if (rows.length === 0) return match;

    // First row = headers
    const headerCells = rows[0]
      .split("|")
      .filter((c) => c.trim() !== "")
      .map(
        (c) =>
          `<th class="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">${c.trim()}</th>`
      )
      .join("");

    // Skip 2nd row (--- dashes)
    const bodyRows = rows.slice(2).map((row) => {
      const cols = row
        .split("|")
        .filter((c) => c.trim() !== "")
        .map(
          (c) =>
            `<td class="border border-gray-300 px-3 py-2">${c.trim()}</td>`
        )
        .join("");
      return `<tr>${cols}</tr>`;
    });

    return `<table class="w-full border-collapse border border-gray-300 my-4 text-sm rounded-lg overflow-hidden"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows.join(
      ""
    )}</tbody></table>`;
  });

  // Handle other markdown-like syntax
  return safeText
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<em>$1</em>")
    .replace(/``````/g, '<pre class="bg-gray-200 p-2 rounded">$1</pre>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/### (.*?)$/gm, '<h3 class="text-lg font-semibold">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="text-xl font-bold">$1</h2>')
    .replace(/# (.*?)$/gm, '<h1 class="text-2xl font-extrabold">$1</h1>')
    .replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg" />'
    )
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="text-blue-500 text-xs hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\n/g, "<br/>");
}

const ChatWindow = ({
  messages,
  isLoading,
  sessionId,
  messagesEndRef,
  updateFeedback,
  userId,
}) => {
  const sendFeedback = async (messageId, feedback) => {
    try {
      const data = await updateFeedbackApi({
        messageId,
        feedback,
        sessionId,
        userId,
      });
      console.log("Feedback API response:", data);
      const feedbackLabel =
        data.updated_message?.thumbs_up
          ? "positive"
          : data.updated_message?.thumbs_down
            ? "negative"
            : "removed";

      toast.success(`Feedback ${feedbackLabel} saved`);

      // Update UI state in App.jsx
      if (typeof updateFeedback === "function") {
        updateFeedback(messageId, feedback);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save feedback");
    }
  };

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => {
        console.log("Rendering message:", msg);
        const formatted = formatMessage(msg.content);

        const sanitizedHTML = sanitizeHtml(formatted, {
          allowedTags: [
            "b",
            "i",
            "em",
            "strong",
            "a",
            "img",
            "pre",
            "code",
            "h1",
            "h2",
            "h3",
            "br",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
          ],
          allowedAttributes: {
            a: ["href", "class", "target", "rel"],
            img: ["src", "alt", "class"],
            pre: ["class"],
            code: [],
            h1: ["class"],
            h2: ["class"],
            h3: ["class"],
            table: ["class"],
            th: ["class"],
            td: ["class"],
          },
        });

        return (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${msg.role === "user"
              ? "bg-blue-100 self-end"
              : "bg-gray-100 self-start"
              }`}
          >
            {/* Message */}
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
            />

            {/* 🔹 SOURCES / CITATIONS */}
            {/* {msg.role === "assistant" &&
              Array.isArray(msg.sources) &&
              msg.sources.length > 0 && (
                <div className="mt-3 border-t border-dashed pt-2 text-gray-600">
                  <div className="font-semibold mb-1">Sources</div>

                  <ul className="space-y-1">
                    {msg.sources.map((src, idx) => (
                      <li key={idx}>
                        <a
                          href={getViewerUrl(src.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          [{idx + 1}] {src.title}
                          {isDocx(src.url) && " (view online)"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )} */}

            {/* 🔹 SINGLE SOURCE / CITATION */}
            {msg.role === "assistant" &&
              Array.isArray(msg.sources) &&
              msg.sources.length > 0 && (() => {
                const src = msg.sources[0];

                return (
                  <div className="mt-3 border-t border-dashed pt-2 text-gray-600">
                    <div className="font-semibold mb-1">Source</div>

                    <a
                      href={getViewerUrl(src.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {src.title}
                      {isDocx(src.url) && " (view online)"}
                    </a>
                  </div>
                );
              })()}

            {/* Feedback */}
            {msg.role === "assistant" && msg.id && (
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => sendFeedback(msg.id, "positive")}
                  className={`px-2 py-1 rounded hover:bg-green-300 ${msg.feedback === "positive"
                    ? "bg-green-400"
                    : "bg-green-100"
                    }`}
                  aria-label="Give positive feedback"
                  title="Thumbs Up"
                >
                  👍
                </button>
                <button
                  onClick={() => sendFeedback(msg.id, "negative")}
                  className={`px-2 py-1 rounded hover:bg-red-300 ${msg.feedback === "negative"
                    ? "bg-red-400"
                    : "bg-red-100"
                    }`}
                  aria-label="Give negative feedback"
                  title="Thumbs Down"
                >
                  👎
                </button>
              </div>
            )}
          </div>
        );
      })}

      {isLoading && (
        <div className="italic text-gray-500">Waiting for response…</div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
