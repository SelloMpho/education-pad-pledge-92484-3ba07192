import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
  read?: boolean;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList = ({ messages, currentUserId }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender_id === currentUserId;
        
        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {message.sender_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
              <div
                className={`rounded-2xl px-4 py-2 ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {!isOwnMessage && message.sender_name && (
                  <p className="text-xs font-semibold mb-1 opacity-70">
                    {message.sender_name}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                {isOwnMessage && (
                  <span className="text-xs text-muted-foreground">
                    {message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
