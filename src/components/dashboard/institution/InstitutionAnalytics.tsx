import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, BarChart3, MessageSquare, Users, Clock, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Conversation {
  id: string;
  investor_id: string | null;
  institution_id: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  created_at: string;
  read: boolean;
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number | string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function InstitutionAnalytics() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data: institution } = await supabase
          .from('institutions')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!institution?.id) {
          setLoading(false);
          return;
        }
        setInstitutionId(institution.id);

        const { data: convs } = await supabase
          .from('conversations')
          .select('id, investor_id, institution_id, created_at')
          .eq('institution_id', institution.id);

        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, created_at, read')
          .in('conversation_id', (convs ?? []).map(c => c.id));

        setConversations(convs ?? []);
        setMessages(msgs ?? []);
      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalConversations = conversations.length;
    const activeInvestors = new Set(conversations.map(c => c.investor_id).filter(Boolean)).size;
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(m => !m.read).length;
    const avgMessagesPerConversation = totalConversations ? (totalMessages / totalConversations) : 0;

    // Simple monthly trend from last 6 months based on conversations
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    conversations.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key] += 1;
    });

    const trend = Object.entries(buckets).map(([month, count]) => ({ month, count }));

    // Donor activity per month (unique investor_ids per month)
    const donorBuckets: Record<string, Set<string>> = {};
    Object.keys(buckets).forEach(k => (donorBuckets[k] = new Set()));
    conversations.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in donorBuckets && c.investor_id) donorBuckets[key].add(c.investor_id);
    });
    const donorTrend = Object.entries(donorBuckets).map(([month, set]) => ({ month, count: set.size }));

    // Messages per month
    const msgBuckets: Record<string, number> = {};
    Object.keys(buckets).forEach(k => (msgBuckets[k] = 0));
    messages.forEach(m => {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in msgBuckets) msgBuckets[key] += 1;
    });
    const messagesPerMonth = Object.entries(msgBuckets).map(([month, count]) => ({ month, count }));

    // Engagement score: blend of activity metrics (bounded 0..100)
    const engagementScore = Math.min(100, Math.round(
      (activeInvestors * 5) + (avgMessagesPerConversation * 10) + (totalConversations * 2) - (unreadMessages)
    ));

    return {
      totalConversations,
      activeInvestors,
      totalMessages,
      unreadMessages,
      avgMessagesPerConversation: Number(avgMessagesPerConversation.toFixed(1)),
      engagementScore: Math.max(0, engagementScore),
      trend,
      donorTrend,
      messagesPerMonth,
    };
  }, [conversations, messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading analytics…</p>
      </div>
    );
  }

  if (!institutionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>No institution found. Complete profile to view analytics.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Conversations" value={metrics.totalConversations} icon={Activity} />
        <StatCard title="Active Donors" value={metrics.activeInvestors} icon={Users} />
        <StatCard title="Messages" value={metrics.totalMessages} icon={MessageSquare} />
        <StatCard title="Unread" value={metrics.unreadMessages} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>Engagement and activity indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg. messages per conversation</span>
                <Badge variant="secondary">{metrics.avgMessagesPerConversation}</Badge>
              </div>
              <div className="h-2 bg-muted rounded">
                <div
                  className="h-2 bg-primary rounded"
                  style={{ width: `${Math.min(100, metrics.avgMessagesPerConversation * 15)}%` }}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Engagement score</span>
                <Badge>{metrics.engagementScore}</Badge>
              </div>
              <div className="h-2 bg-muted rounded">
                <div
                  className="h-2 bg-green-500 rounded"
                  style={{ width: `${metrics.engagementScore}%` }}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Unread ratio</span>
                <Badge variant="outline">{metrics.totalMessages ? Math.round((metrics.unreadMessages / metrics.totalMessages) * 100) : 0}%</Badge>
              </div>
              <div className="h-2 bg-muted rounded">
                <div
                  className="h-2 bg-orange-500 rounded"
                  style={{ width: `${metrics.totalMessages ? Math.round((metrics.unreadMessages / metrics.totalMessages) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend" className="gap-2"><BarChart3 className="h-4 w-4" /> Monthly trend</TabsTrigger>
          <TabsTrigger value="donors" className="gap-2"><Users className="h-4 w-4" /> Donor activity</TabsTrigger>
          <TabsTrigger value="messages" className="gap-2"><MessageSquare className="h-4 w-4" /> Messaging</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Conversations trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors">
          <Card>
            <CardHeader>
              <CardTitle>Donor activity</CardTitle>
              <CardDescription>Unique active donors per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.donorTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Currently {metrics.activeInvestors} unique donors engaged across {metrics.totalConversations} conversations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messaging insights</CardTitle>
              <CardDescription>Volumes and unread distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.messagesPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Unread', value: metrics.unreadMessages },
                          { name: 'Read', value: Math.max(0, metrics.totalMessages - metrics.unreadMessages) },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        <Cell fill="#ef4444" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}