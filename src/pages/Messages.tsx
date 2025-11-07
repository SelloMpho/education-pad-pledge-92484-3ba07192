import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConversationList from '@/components/ConversationList';
import MessageList from '@/components/MessageList';
import MessageInput from '@/components/MessageInput';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MessageCircle, AlertCircle, Plus, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Messages = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<'investor' | 'institution' | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
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
      .from('conversations')
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
      };
    }) || [];

    setConversations(formatted);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_id,
        created_at,
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
          // Fetch full message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select('id, content, sender_id, created_at, profiles!messages_sender_id_fkey(full_name)')
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, {
              id: newMessage.id,
              content: newMessage.content,
              sender_id: newMessage.sender_id,
              created_at: newMessage.created_at,
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

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId || !currentUserId) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversationId,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Reload conversations to update last message time
    loadConversations();
  };

  const loadAvailablePartners = async () => {
    if (!userType || !currentUserId) return;

    try {
      if (userType === 'investor') {
        // Load institutions
        const { data: institutions } = await supabase
          .from('institutions')
          .select('id, institution_name, user_id')
          .neq('user_id', currentUserId);
        
        setAvailablePartners(institutions?.map(i => ({
          id: i.id,
          name: i.institution_name,
          type: 'institution'
        })) || []);
      } else {
        // Load investors
        const { data: investors } = await supabase
          .from('investors')
          .select('id, company_name, investor_type, user_id')
          .neq('user_id', currentUserId);
        
        setAvailablePartners(investors?.map(inv => ({
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
          .from('investors')
          .select('id')
          .eq('user_id', currentUserId)
          .single();
        investorId = investor?.id || '';
        institutionId = selectedPartner;
      } else {
        const { data: institution } = await supabase
          .from('institutions')
          .select('id')
          .eq('user_id', currentUserId)
          .single();
        institutionId = institution?.id || '';
        investorId = selectedPartner;
      }

      const { data: newConv, error } = await supabase
        .from('conversations')
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Messages
            </h1>
          </div>
          
          <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Select a {userType === 'investor' ? 'institution' : 'investor'} to start a conversation with
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${userType === 'investor' ? 'institution' : 'investor'}`} />
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
                    Start Conversation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          <Card className="lg:col-span-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId || undefined}
                onSelect={setSelectedConversationId}
              />
            </div>
          </Card>

          <Card className="lg:col-span-2 overflow-hidden flex flex-col">
            {selectedConversationId ? (
              <>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">
                    {conversations.find(c => c.id === selectedConversationId)?.other_party_name}
                  </h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {conversations.find(c => c.id === selectedConversationId)?.other_party_type}
                  </p>
                </div>
                <MessageList messages={messages} currentUserId={currentUserId || ''} />
                <MessageInput onSendMessage={handleSendMessage} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a conversation from the list to start messaging
                </p>
                <Button onClick={() => setShowNewConversation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Conversation
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
