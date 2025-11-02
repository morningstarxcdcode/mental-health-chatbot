import { useState, useEffect, useCallback } from "react";
import { AppContext } from "./AppContext";
import PropTypes from "prop-types";
import { API_ENDPOINTS } from "../config/api";
import { logger } from "../utils/logger";

const ContextProvider = (props) => {
  const [savedChats, setSavedChats] = useState(() => {
    const saved = localStorage.getItem('savedChats');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem('currentChatId') || generateChatId();
  });

  const [isCurrentChatSaved, setIsCurrentChatSaved] = useState(false);

  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem(`chat_${currentChatId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [Input, setInput] = useState("");
  const [RecentPrompt, setRecentPrompt] = useState("");
  const [Loading, setLoading] = useState(false);
  const [ShowResult, setShowResult] = useState(chatHistory.length > 0);
  const [error, setError] = useState(null);

  function generateChatId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  function generateChatTitle(prompt) {
    if (!prompt) return "New Chat";
    return prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
  }

  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(chatHistory));
    }
    setShowResult(chatHistory.length > 0);
  }, [chatHistory, currentChatId]);

  useEffect(() => {
    localStorage.setItem('currentChatId', currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    localStorage.setItem('savedChats', JSON.stringify(savedChats));
  }, [savedChats]);

  const [currentPersona, setCurrentPersona] = useState(() => {
    const saved = localStorage.getItem('currentPersona');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentPersona) {
      localStorage.setItem('currentPersona', JSON.stringify(currentPersona));
    }
  }, [currentPersona]);

  const newChat = useCallback(() => {
    if (chatHistory.length > 0 && !isCurrentChatSaved) {
      const firstUserMessage = chatHistory.find(msg => msg.role === "user");
      const chatTitle = generateChatTitle(firstUserMessage?.parts[0] || "New Chat");
      
      const chatToSave = {
        id: currentChatId,
        title: chatTitle,
        messages: [...chatHistory],
        timestamp: Date.now()
      };

      setSavedChats(prev => {
        const exists = prev.some(chat => chat.id === currentChatId);
        if (!exists) {
          return [chatToSave, ...prev].slice(0, 50);
        }
        return prev;
      });
    }

    const newChatId = generateChatId();
    setCurrentChatId(newChatId);
    setChatHistory([]);
    setIsCurrentChatSaved(false);
    setLoading(false);
    setInput("");
    setRecentPrompt("");
  }, [chatHistory, isCurrentChatSaved, currentChatId]);

  const loadChat = useCallback((chatId) => {
    if (chatHistory.length > 0 && !isCurrentChatSaved && currentChatId !== chatId) {
      const firstUserMessage = chatHistory.find(msg => msg.role === "user");
      const chatTitle = generateChatTitle(firstUserMessage?.parts[0] || "New Chat");
      
      const chatToSave = {
        id: currentChatId,
        title: chatTitle,
        messages: [...chatHistory],
        timestamp: Date.now()
      };

      setSavedChats(prev => {
        const exists = prev.some(chat => chat.id === currentChatId);
        if (!exists) {
          return [chatToSave, ...prev].slice(0, 50);
        }
        return prev;
      });
    }

    const selectedChat = savedChats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setCurrentChatId(chatId);
      setChatHistory(selectedChat.messages);
      setIsCurrentChatSaved(true);
      
      const lastUserMessage = selectedChat.messages
        .filter(msg => msg.role === "user")
        .pop();
      if (lastUserMessage) {
        setRecentPrompt(lastUserMessage.parts[0]);
      }
    }
  }, [chatHistory, currentChatId, isCurrentChatSaved, savedChats]);

  const onSent = async (prompt, personaObject = null) => {
    const persona = personaObject || currentPersona;
    
    if (!persona) {
      logger.error("No persona available for chat");
      setChatHistory((prev) => [
        ...prev,
        { role: "model", parts: ["Please select a persona first to start chatting."] },
      ]);
      return;
    }

    setLoading(true);
    setError(null);
    const promptToSend = prompt !== undefined ? prompt : Input;
    setInput("");
    setRecentPrompt(promptToSend);

    const userMessage = { role: "user", parts: [promptToSend] };
    const newHistoryWithUserMessage = [...chatHistory, userMessage];
    const aiPlaceholder = { role: "model", parts: [""] };
    setChatHistory([...newHistoryWithUserMessage, aiPlaceholder]);

    if (isCurrentChatSaved) {
      setIsCurrentChatSaved(false);
    }

    let personaForPayload = {};
    if (persona.id === 'custom') {
      // For custom personas, include all the details
      personaForPayload = {
        id: 'custom',
        name: persona.name,
        description: persona.description,
        tone: persona.tone
      };
    } else {
      // For pre-made personas, we only need the ID
      personaForPayload = { id: persona.id };
    }

    const apiPayload = {
      message: promptToSend,
      persona: personaForPayload,
      chatHistory: newHistoryWithUserMessage.slice(-8).map(msg => ({
        role: msg.role,
        parts: Array.isArray(msg.parts) ? msg.parts : [String(msg.parts)]
      })),
    };

    try {
      const response = await fetch(API_ENDPOINTS.CHAT_STREAM, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify(apiPayload),
      });

      // Enhanced error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Response body is null. The server didn't return any data.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setChatHistory((prev) => {
          const lastMessage = prev[prev.length - 1];
          const updatedContent = lastMessage.parts[0] + chunk;
          const updatedLastMessage = { ...lastMessage, parts: [updatedContent] };
          return [...prev.slice(0, -1), updatedLastMessage];
        });
      }
    } catch (error) {
      logger.error("Chat request failed:", error);
      setError(error.message);
      
      let errorMessage = "Oops! Something went wrong.";
      
      if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        errorMessage = "🔌 Unable to connect to the server. Please check:\n" +
                      "• Your internet connection\n" +
                      "• The backend server is running (http://127.0.0.1:8000)\n" +
                      "• No firewall is blocking the connection";
      } else if (error.message.includes('500')) {
        errorMessage = "⚠️ The server encountered an error. This might be due to:\n" +
                      "• Missing GOOGLE_API_KEY in backend .env\n" +
                      "• Database connection issues\n" +
                      "• Invalid request format";
      } else if (error.message.includes('429')) {
        errorMessage = "⏱️ Too many requests. Please wait a moment and try again.";
      } else {
        errorMessage = `❌ Error: ${error.message}\n\nPlease try again or contact support if this persists.`;
      }

      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { 
          role: "model", 
          parts: [errorMessage],
          isError: true 
        },
      ]);
      setLoading(false);
    }
  };

  const retryLastMessage = useCallback(async () => {
    if (chatHistory.length < 2) return;
    
    const lastUserMessage = [...chatHistory].reverse().find(msg => msg.role === "user");
    if (lastUserMessage && lastUserMessage.parts[0]) {
      // Remove the error message
      setChatHistory(prev => prev.filter(msg => !msg.isError));
      await onSent(lastUserMessage.parts[0]);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (isCurrentChatSaved && chatHistory.length > 0) {
      setSavedChats(prev => {
        return prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chatHistory],
              timestamp: Date.now()
            };
          }
          return chat;
        });
      });
    }
  }, [chatHistory, currentChatId, isCurrentChatSaved]);

  const contextValue = {
    Input,
    setInput,
    RecentPrompt,
    setRecentPrompt: setRecentPrompt,
    Loading,
    onSent,
    newChat,
    chatHistory,
    ShowResult,
    
    savedChats,
    currentChatId,
    loadChat,
    isCurrentChatSaved,
    
    currentPersona,
    setCurrentPersona,
    
    error,
    setError,
    retryLastMessage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {props.children}
    </AppContext.Provider>
  );
};

ContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ContextProvider;