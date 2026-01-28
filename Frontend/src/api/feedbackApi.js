import { apiFetch } from "./apiClient";

export const updateFeedback = async ({
  messageId,
  feedback,
  sessionId,
  userId,
}) => {
  return apiFetch("/update-feedback", {
    method: "POST",
    body: JSON.stringify({
      id: messageId,
      feedback,
      sessionId,
      userId,
    }),
  });
};
