import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import SidebarNew from './components/SidebarNew';
import { Toaster, toast } from 'react-hot-toast';
import { createSession, getSessions, sendMessage, getSessionMessages, deleteSession } from './api/chatApi';

const App = () => {
  const [userData] = useState({
    userId: 'user-123',
    userRoles: [],
    userDetails: 'John Doe',
    userEmail: 'user@example.com',
  });

  const [sessionId, setSessionId] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [restoringSession, setRestoringSession] = useState(true);
  const lastSessionRef = useRef(null);
  const messagesEndRef = useRef(null);

  /* -------------------- API Helpers -------------------- */

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const sessions = await getSessions(userData.userId);
      setSessionHistory(sessions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const restoreLastSession = async () => {
    if (!sessionHistory || sessionHistory.length === 0) {
      setRestoringSession(false);
      return;
    }

    const storedSessionId = localStorage.getItem('lastSessionId') || lastSessionRef.current;
    const sessionToOpen =
      sessionHistory.find(s => s.session_id === storedSessionId)?.session_id ||
      sessionHistory[0].session_id;

    if (sessionToOpen) {
      setRestoringSession(true);
      await handleSessionSelect(sessionToOpen);
      setRestoringSession(false);
    } else {
      setRestoringSession(false);
    }
  };

  /* -------------------- Actions -------------------- */

  const startNewChat = async () => {
    try {
      const newSessionId = await createSession(userData.userId);
      setSessionId(newSessionId);
      setMessages([]);
      localStorage.setItem('lastSessionId', newSessionId);
      await loadSessions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create new session');
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    let activeSessionId = sessionId;

    if (!activeSessionId) {
      try {
        activeSessionId = await createSession(userData.userId);
        setSessionId(activeSessionId);
        localStorage.setItem('lastSessionId', activeSessionId);
        await loadSessions();
      } catch {
        toast.error('Failed to create session');
        return;
      }
    }

    const userMsg = { role: 'user', content: inputMessage.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const data = await sendMessage({
        message: userMsg.content,
        session_id: activeSessionId,
        user_id: userData.userId,
        user_roles: userData.userRoles,
        user_email: userData.userEmail,
      });

      setMessages(prev => [
        ...prev,
        {
          id: data.message_id,
          role: 'assistant',
          content: data.response,
          sources: data.sources || [],
          feedback: data.feedback || null,
        },
      ]);
    } catch {
      toast.error('Error sending message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionSelect = async selectedSessionId => {
    if (!selectedSessionId) return;

    setSessionId(selectedSessionId);
    setIsLoading(true);
    setMessages([]);

    try {
      const hist = await getSessionMessages(userData.userId, selectedSessionId);
      const normalized = (hist || []).map(msg => ({
        ...msg,
        feedback: msg.thumbs_up ? 'positive' : msg.thumbs_down ? 'negative' : null,
      }));
      setMessages(normalized);
      localStorage.setItem('lastSessionId', selectedSessionId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async sessionIdToDelete => {
    if (!window.confirm('Delete this chat session?')) return;

    try {
      await deleteSession(userData.userId, sessionIdToDelete);
      toast.success('Session deleted');
      if (sessionIdToDelete === sessionId) {
        setSessionId('');
        setMessages([]);
        localStorage.removeItem('lastSessionId');
      }
      await loadSessions();
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const updateFeedback = (messageId, feedback) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, feedback } : msg))
    );
  };

  /* -------------------- Lifecycle -------------------- */

  useEffect(() => {
    lastSessionRef.current = localStorage.getItem('lastSessionId') || null;
    loadSessions();
  }, []);

  useEffect(() => {
    if (!sessionsLoading) restoreLastSession();
  }, [sessionsLoading, sessionHistory]);

  /* -------------------- Render -------------------- */
  return (
    <div className="h-screen flex flex-col">
      <Toaster position="top-right" />
      <Navbar username={userData.userDetails} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r">
          <SidebarNew
            sessions={sessionHistory}
            loading={sessionsLoading}
            onSessionSelect={handleSessionSelect}
            onNewChat={startNewChat}
            selectedSessionId={sessionId}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto p-4">
            {sessionsLoading || restoringSession ? (
              <div className="italic text-gray-500">Loading last session…</div>
            ) : sessionId ? (
              <ChatWindow
                messages={messages}
                isLoading={isLoading}
                sessionId={sessionId}
                messagesEndRef={messagesEndRef}
                updateFeedback={updateFeedback}
                userId={userData.userId}
              />
            ) : (
              <div className="italic text-gray-500">
                Select a chat session or start a new one
              </div>
            )}
          </div>

          <div className="p-4 bg-white">
            <ChatInput
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleSend={handleSend}
              handleKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
