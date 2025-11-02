export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  CHAT_STREAM: `${API_BASE_URL}/api/chat/stream`,
  PERSONAS: `${API_BASE_URL}/api/personas`,
  SAVE_CHAT: `${API_BASE_URL}/api/chats`,
  GET_CHATS: `${API_BASE_URL}/api/chats`,
  DELETE_CHAT: (chatId) => `${API_BASE_URL}/api/chats/${chatId}`,
};
