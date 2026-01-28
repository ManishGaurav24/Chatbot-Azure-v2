import { apiFetch } from './apiClient';

export const createSession = async (userId) => {
  const data = await apiFetch(`/session/new?user_id=${encodeURIComponent(userId)}`);
  return data.session_id;
}

export const getSessions = async (userId) => {
  const data = await apiFetch(
    `/sessions?user_id=${encodeURIComponent(userId)}`
  );

  // ✅ ALWAYS return an array
  return Array.isArray(data.sessions) ? data.sessions : [];
};

export const sendMessage = async (payload) => {
  return apiFetch('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getSessionMessages = async (userId, sessionId) => {
  const data = await apiFetch(
    `/session/messages?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sessionId)}`
  );

  return Array.isArray(data.messages) ? data.messages : [];
};

export const deleteSession = async (userId, sessionId) => {
  return apiFetch(
    `/session?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
    }
  );
};