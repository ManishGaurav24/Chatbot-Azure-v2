import { Calendar, Trash2, CircleFadingPlus } from 'lucide-react';

const SidebarSkeleton = () => (
  <div className="space-y-3">
    {[...Array(10)].map((_, i) => (
      <div
        key={i}
        className="h-14 bg-gray-200 rounded-lg animate-pulse"
      />
    ))}
  </div>
);

const SidebarNew = ({
  sessions = [],
  loading,
  selectedSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
}) => {
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };
  const formatRelativeTime = (isoTime) => {
    if (!isoTime) return '';

    const now = new Date();
    const past = new Date(isoTime);
    const diffMs = now - past;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  const getPreviewText = (lastMessage) => {
    if (!lastMessage) return 'New conversation';
    return lastMessage.slice(0, 35);
  };

  return (
    <div className="h-full w-80 bg-gray-50 flex flex-col border-r">
      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full bg-brand text-white py-3 rounded-lg font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          New Chat<span><CircleFadingPlus className="w-5 h-5" /> </span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-sm text-gray-500 mb-3 flex items-center gap-2">
          <Calendar size={14} />
          All Conversations
        </h3>

        {loading ? (
          <SidebarSkeleton />
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-2 rounded-lg cursor-pointer flex justify-between items-center
                  ${selectedSessionId === session.id
                    ? 'bg-slate-300 shadow '
                    : 'hover:bg-slate-200'
                  }`}
              >
                <div
                  className="flex-1 min-w-0"
                  onClick={() => onSessionSelect(session.id)}
                >
                  <p className="text-sm font-medium truncate">
                    {getPreviewText(session.last_message)}
                  </p>

                  <p className="text-xs text-gray-400 flex justify-between items-center gap-2 px-3">
                    <span>{formatTimestamp(session.last_message_at)}</span>
                    <span>{formatRelativeTime(session.last_message_at)}</span>
                    <span>{session.message_count} msgs</span>
                  </p>
                </div>

                {onDeleteSession && (
                  <Trash2
                    size={16}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                    onClick={() => onDeleteSession(session.id)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarNew;
