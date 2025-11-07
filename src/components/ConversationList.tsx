import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

interface Conversation {
  id: string;
  other_party_name: string;
  other_party_type: 'institution' | 'investor';
  updated_at: string;
  unread_count?: number;
  last_message?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const ConversationList = ({ conversations, selectedId, onSelect }: ConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation to begin messaging
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            selectedId === conversation.id ? 'bg-primary/5 border-primary' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {conversation.other_party_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {conversation.other_party_name}
                </h4>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {conversation.last_message && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.last_message}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground capitalize">
                    {conversation.other_party_type}
                  </span>
                </div>
                {conversation.unread_count && conversation.unread_count > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                    {conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ConversationList;
