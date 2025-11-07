import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { InvestorSidebar } from '@/components/dashboard/InvestorSidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Building2, FileText, Plus, Heart, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CertificateUpload } from '@/components/dashboard/CertificateUpload';
import { InvestorDonations } from '@/components/dashboard/investor/InvestorDonations';
import { InstitutionsList } from '@/components/dashboard/investor/InstitutionsList';
import { InvestorAnalytics } from '@/components/dashboard/investor/InvestorAnalytics';
import { InvestorProfile } from '@/components/dashboard/investor/InvestorProfile';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeInstitutions: 0,
    pendingMessages: 0,
    verificationStatus: 'pending',
  });
  const [investorData, setInvestorData] = useState<any>(null);

  useEffect(() => {
    if (!loading && role !== 'investor') {
      navigate('/');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'investor') {
      fetchDashboardData();
    }
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: investor } = await supabase
        .from('investors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setInvestorData(investor);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('investor_id', investor?.id || '');

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.id) || [])
        .eq('read', false);

      setStats({
        totalConversations: conversations?.length || 0,
        activeInstitutions: new Set(conversations?.map(c => c.institution_id)).size || 0,
        pendingMessages: messages?.length || 0,
        verificationStatus: profile?.verification_status || 'pending',
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {stats.verificationStatus === 'pending' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your investor account is pending verification. Some features may be limited.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard title="Total Donations" value={stats.totalConversations} icon={Heart} />
              <StatsCard title="Institutions Supported" value={stats.activeInstitutions} icon={Building2} />
              <StatsCard title="Messages" value={stats.pendingMessages} icon={MessageSquare} />
              <StatsCard 
                title="Status" 
                value={
                  <Badge variant={stats.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                    {stats.verificationStatus}
                  </Badge>
                } 
                icon={CheckCircle} 
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and navigation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => navigate('/messages')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    View Messages
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={stats.verificationStatus !== 'verified'}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Browse Institutions
                  </Button>
                </CardContent>
              </Card>

              {investorData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Investor Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Investor Type</p>
                      <p className="font-medium">{investorData.investor_type || 'N/A'}</p>
                    </div>
                    {investorData.company_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{investorData.company_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );
      case 'donations':
        return <InvestorDonations />;
      case 'institutions':
        return <InstitutionsList />;
      case 'messages':
        navigate('/messages');
        return null;
      case 'analytics':
        return <InvestorAnalytics />;
      case 'profile':
        return <InvestorProfile />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <InvestorSidebar 
        selected={activeTab} 
        onSelect={setActiveTab}
        messageCount={stats.pendingMessages}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Investor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your investor portal</p>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
