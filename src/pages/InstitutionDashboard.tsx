import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { InstitutionSidebar } from '@/components/dashboard/InstitutionSidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, FileText, Plus, Activity, Calendar, Building2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CertificateUpload } from '@/components/dashboard/CertificateUpload';

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeInvestors: 0,
    pendingMessages: 0,
    verificationStatus: 'pending',
  });
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && role !== 'institution') {
      navigate('/');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'institution') {
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

      const { data: institution } = await supabase
        .from('institutions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setInstitutionData(institution);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('institution_id', institution?.id || '');

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.id) || [])
        .eq('read', false);

      setDonations(conversations || []);

      setStats({
        totalConversations: conversations?.length || 0,
        activeInvestors: new Set(conversations?.map(c => c.investor_id)).size || 0,
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
                  Your institution account is pending verification. Some features may be limited.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard title="Total Donations" value={stats.totalConversations} icon={Activity} />
              <StatsCard title="Active Donors" value={stats.activeInvestors} icon={Building2} />
              <StatsCard title="Pending" value={stats.pendingMessages} icon={MessageSquare} />
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
                  <CardTitle>Recent Donations</CardTitle>
                  <CardDescription>Latest donation activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {donations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No recent donations</p>
                  ) : (
                    <div className="space-y-4">
                      {donations.slice(0, 5).map((donation) => (
                        <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium">Donation #{donation.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(donation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge>Active</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
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
                    <Plus className="mr-2 h-4 w-4" />
                    Start New Conversation
                  </Button>
                </CardContent>
              </Card>
            </div>

            {institutionData && (
              <Card>
                <CardHeader>
                  <CardTitle>Institution Details</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Institution Name</p>
                    <p className="font-medium">{institutionData.institution_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{institutionData.city}, {institutionData.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{institutionData.contact_person || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 'messages':
        navigate('/messages');
        return null;
      case 'donations':
      case 'reports':
      case 'analytics':
      case 'profile':
        return (
          <div className="space-y-6">
            <CertificateUpload 
              userType="institution"
              currentCertificateUrl={institutionData?.certificate_url}
              onUploadSuccess={fetchDashboardData}
            />
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Additional profile features coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-12">
                  Profile management features coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <InstitutionSidebar 
        selected={activeTab} 
        onSelect={setActiveTab}
        pendingCount={stats.pendingMessages}
        messageCount={stats.pendingMessages}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Institution Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your institution hub</p>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
