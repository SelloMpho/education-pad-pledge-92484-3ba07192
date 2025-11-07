import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, Building2, TrendingUp, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { UsersManagement } from '@/components/dashboard/admin/UsersManagement';
import { InstitutionsManagement } from '@/components/dashboard/admin/InstitutionsManagement';
import { InvestorsManagement } from '@/components/dashboard/admin/InvestorsManagement';
import { SettingsManagement } from '@/components/dashboard/admin/SettingsManagement';
import { DonationsManagement } from '@/components/dashboard/admin/DonationsManagement';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    institutions: 0,
    investors: 0,
    pendingVerifications: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      navigate('/');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'admin') {
      fetchDashboardData();

      // Set up realtime subscription for profiles table
      const channel = supabase
        .channel('profiles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          () => {
            // Refetch data when any change occurs
            fetchDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      const pending = profiles?.filter(p => p.verification_status === 'pending') || [];
      const institutions = profiles?.filter(p => p.user_type === 'institution') || [];
      const investors = profiles?.filter(p => p.user_type === 'investor') || [];

      setStats({
        totalUsers: profiles?.length || 0,
        institutions: institutions.length,
        investors: investors.length,
        pendingVerifications: pending.length,
      });

      setPendingUsers(pending);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleVerification = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `User ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      });

      fetchDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update verification status',
        variant: 'destructive',
      });
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} />
              <StatsCard title="Institutions" value={stats.institutions} icon={Building2} />
              <StatsCard title="Investors" value={stats.investors} icon={TrendingUp} />
              <StatsCard title="Pending Verifications" value={stats.pendingVerifications} icon={MessageSquare} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>Review and approve user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No pending verifications</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                          <TableCell className="capitalize">{user.user_type}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleVerification(user.id, 'verified')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleVerification(user.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'users':
        return <UsersManagement />;
      case 'organizations':
        return <InvestorsManagement />;
      case 'institutions':
        return <InstitutionsManagement />;
      case 'settings':
        return <SettingsManagement />;
      case 'donations':
        return <DonationsManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar selected={activeTab} onSelect={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, organizations, and system settings</p>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
