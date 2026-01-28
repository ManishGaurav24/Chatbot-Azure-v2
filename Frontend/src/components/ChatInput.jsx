import { Send } from 'lucide-react';

const ChatInput = ({
  inputMessage,
  setInputMessage,
  handleSend,
  handleKeyDown,
  isLoading,
}) => (
  <div className="border-t p-4 bg-white">
    <div className="flex items-stretch gap-1">
      {/* Textarea wrapper */}
      <div className="relative flex-1">
        <textarea
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type your message…"
          rows={1}
          className="
            w-full
            border
            px-3 py-2
            pr-24
            rounded-l-md
            resize-none
            overflow-y-auto
            min-h-[44px]
            max-h-[120px]
            leading-6
          "
        />

        {/* Shift + Enter hint */}
        {!inputMessage && (
          <div className="absolute bottom-4 right-3 flex items-center gap-1 text-xs text-gray-500 pointer-events-none">
            <kbd className="px-2 py-0.5 rounded-md border bg-gray-100 shadow-[0_2px_0_#d1d5db] font-medium">
              ⇧ SHIFT
            </kbd>
            <span>+</span>
            <kbd className="px-2 py-0.5 rounded-md border bg-gray-100 shadow-[0_2px_0_#d1d5db] font-medium">
              ↵ ENTER
            </kbd>
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={isLoading || !inputMessage.trim()}
        className="
          max-h-[44px]
          px-4
          bg-brand text-white
          rounded-r-md
          flex items-center justify-center
          hover:bg-brand-hover
          shadow-sm hover:shadow-md
          disabled:opacity-50
          disabled:cursor-not-allowed
          transition-all
        "
      >
        <Send size={16} />
      </button>
    </div>
  </div>
);

export default ChatInput;
