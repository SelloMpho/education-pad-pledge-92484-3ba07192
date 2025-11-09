import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { 
  MessageCircle, 
  AlertCircle, 
  Plus, 
  ArrowLeft,
  Send,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Building2,
  User,
  Paperclip,
  Smile
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Custom types to handle Supabase type sync issues
type DbProfile = {
  id: string;
  full_name: string | null;
  email: string;
  user_type: string;
  verification_status: string;
};

type DbInvestor = {
  id: string;
  user_id: string;
  company_name: string | null;
  investor_type: string;
};

type DbInstitution = {
  id: string;
  user_id: string;
  institution_name: string;
};

type DbConversation = {
  id: string;
  investor_id: string;
  institution_id: string;
  updated_at: string;
};

type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
};

const Messages = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<'investor' | 'institution' | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>('');

  useEffect(() => {
    checkAuthAndVerification();
  }, []);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUserId && isVerified) {
      loadConversations();
    }
  }, [currentUserId, isVerified]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      subscribeToMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkAuthAndVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status, user_type')
      .eq('id', user.id)
      .single();

    if (profile?.verification_status === 'verified') {
      setIsVerified(true);
      setUserType(profile.user_type as 'investor' | 'institution');
    }
    
    setLoading(false);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations' as any)
      .select(`
        id,
        updated_at,
        institutions!conversations_institution_id_fkey(id, institution_name, user_id),
        investors!conversations_investor_id_fkey(id, company_name, investor_type, user_id)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading conversations',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const formatted = data?.map((conv: any) => {
      const isInstitution = conv.institutions.user_id === currentUserId;
      return {
        id: conv.id,
        other_party_name: isInstitution 
          ? (conv.investors.company_name || 'Investor')
          : conv.institutions.institution_name,
        other_party_type: isInstitution ? 'investor' : 'institution',
        updated_at: conv.updated_at,
        is_online: false,
      };
    }) || [];

    setConversations(formatted);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages' as any)
      .select(`
        id,
        content,
        sender_id,
        created_at,
        read,
        profiles!messages_sender_id_fkey(full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const formatted = data?.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      created_at: msg.created_at,
      read: msg.read || false,
      sender_name: msg.profiles?.full_name,
    })) || [];

    setMessages(formatted);
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('messages' as any)
            .select('id, content, sender_id, created_at, read, profiles!messages_sender_id_fkey(full_name)')
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, {
              id: newMessage.id,
              content: newMessage.content,
              sender_id: newMessage.sender_id,
              created_at: newMessage.created_at,
              read: newMessage.read || false,
              sender_name: (newMessage as any).profiles?.full_name,
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || !currentUserId) return;

    const { error } = await supabase.from('messages' as any).insert({
      conversation_id: selectedConversationId,
      sender_id: currentUserId,
      content: newMessage.trim(),
    });

    if (error) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setNewMessage('');
    loadConversations();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadAvailablePartners = async () => {
    if (!userType || !currentUserId) return;

    try {
      if (userType === 'investor') {
        const { data: institutions } = await supabase
          .from('institutions' as any)
          .select('id, institution_name, user_id')
          .neq('user_id', currentUserId);
        
        setAvailablePartners(institutions?.map((i: DbInstitution) => ({
          id: i.id,
          name: i.institution_name,
          type: 'institution'
        })) || []);
      } else {
        const { data: investors } = await supabase
          .from('investors' as any)
          .select('id, company_name, investor_type, user_id')
          .neq('user_id', currentUserId);
        
        setAvailablePartners(investors?.map((inv: DbInvestor) => ({
          id: inv.id,
          name: inv.company_name || `${inv.investor_type} Investor`,
          type: 'investor'
        })) || []);
      }
    } catch (error: any) {
      console.error('Error loading partners:', error);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedPartner || !currentUserId || !userType) return;

    try {
      // Check if conversation already exists
      const existingConv = conversations.find((conv: any) => {
        if (userType === 'investor') {
          return conv.institution_id === selectedPartner;
        } else {
          return conv.investor_id === selectedPartner;
        }
      });

      if (existingConv) {
        setSelectedConversationId(existingConv.id);
        setShowNewConversation(false);
        setSelectedPartner('');
        toast({
          title: 'Conversation exists',
          description: 'Opening existing conversation',
        });
        return;
      }

      // Get current user's investor/institution ID
      let investorId = '';
      let institutionId = '';

      if (userType === 'investor') {
        const { data: investor } = await supabase
          .from('investors' as any)
          .select('id')
          .eq('user_id', currentUserId)
          .single();
        investorId = investor?.id || '';
        institutionId = selectedPartner;
      } else {
        const { data: institution } = await supabase
          .from('institutions' as any)
          .select('id')
          .eq('user_id', currentUserId)
          .single();
        institutionId = institution?.id || '';
        investorId = selectedPartner;
      }

      const { data: newConv, error } = await supabase
        .from('conversations' as any)
        .insert({
          investor_id: investorId,
          institution_id: institutionId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Conversation created successfully',
      });

      setShowNewConversation(false);
      setSelectedPartner('');
      await loadConversations();
      setSelectedConversationId(newConv.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (isVerified && userType) {
      loadAvailablePartners();
    }
  }, [isVerified, userType]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_party_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verification Required</h1>
            <p className="text-muted-foreground">
              You must be verified to access the messaging feature. Please complete your verification process.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Messages
          </h1>
        </div>

        <div className="flex h-[calc(100vh-220px)] bg-background rounded-lg border overflow-hidden shadow-lg">
          {/* Conversations List Sidebar */}
          <div className="w-80 border-r flex flex-col bg-card">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Chats</h2>
                <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start New Conversation</DialogTitle>
                      <DialogDescription>
                        Select a {userType === 'investor' ? 'institution' : 'investor'} to start chatting
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${userType === 'investor' ? 'institution' : 'investor'}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePartners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setShowNewConversation(false);
                          setSelectedPartner('');
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateConversation} disabled={!selectedPartner}>
                          Start
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-1 ${
                      selectedConversationId === conversation.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(conversation.other_party_name)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.is_online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm truncate">
                          {conversation.other_party_name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(conversation.updated_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {conversation.other_party_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedConversation.other_party_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.other_party_name}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground capitalize">
                          {selectedConversation.other_party_type}
                        </p>
                        {selectedConversation.is_online && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-green-600 font-medium">Online</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[70%] ${
                          message.sender_id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={message.sender_id === currentUserId ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                            {message.sender_id === currentUserId ? (
                              userType === 'institution' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col ${message.sender_id === currentUserId ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.sender_id === currentUserId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.created_at)}
                            </span>
                            {message.sender_id === currentUserId && (
                              <span className="text-xs">
                                {message.read ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-card">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pr-10"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a conversation or start a new chat
                </p>
                <Button className="gap-2" onClick={() => setShowNewConversation(true)}>
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
