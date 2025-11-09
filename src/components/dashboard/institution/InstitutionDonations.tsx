import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  MapPin, 
  Package, 
  Search, 
  Filter,
  CheckCircle,
  Send,
  TrendingUp,
  Users,
  Heart,
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Type definitions to handle Supabase types sync issues
type DbInvestor = {
  id: string;
  user_id: string;
  investor_type: string;
  company_name: string | null;
  certificate_url: string | null;
  created_at: string;
};

type DbProfile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  user_type: string;
  verification_status: string;
};

type DbDonation = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  message: string | null;
  donation_date: string;
  created_at: string;
  investor_id: string;
  institution_id: string;
};

interface InvestorWithProfile extends DbInvestor {
  profile: DbProfile;
  donations_count: number;
  total_pads_donated: number;
}

interface DonationStats {
  total: number;
  pending: number;
  completed: number;
  totalPads: number;
}

export function InstitutionDonations() {
  const [investors, setInvestors] = useState<InvestorWithProfile[]>([]);
  const [donations, setDonations] = useState<DbDonation[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [stats, setStats] = useState<DonationStats>({
    total: 0,
    pending: 0,
    completed: 0,
    totalPads: 0,
  });
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = investors.filter(investor =>
        (investor.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (investor.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (investor.investor_type.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredInvestors(filtered);
    } else {
      setFilteredInvestors(investors);
    }
  }, [searchQuery, investors]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch institution data
      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: any };

      if (!institution) return;

      // Fetch donations for this institution
      const { data: donationsData } = await supabase
        .from('donations')
        .select('*')
        .eq('institution_id', institution.id)
        .order('created_at', { ascending: false }) as { data: DbDonation[] | null };

      setDonations(donationsData || []);

      // Calculate stats (treating amount as number of pads)
      const total = donationsData?.length || 0;
      const pending = donationsData?.filter(d => d.status === 'pending').length || 0;
      const completed = donationsData?.filter(d => d.status === 'completed').length || 0;
      const totalPads = donationsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      setStats({ total, pending, completed, totalPads });

      // Fetch verified investors with their profiles
      const { data: investorsData } = await supabase
        .from('investors')
        .select(`
          *,
          profile:profiles!investors_user_id_fkey(*)
        `)
        .order('created_at', { ascending: false }) as { data: any[] | null };

      if (investorsData) {
        // Filter verified investors and calculate their donation stats
        const verifiedInvestors = await Promise.all(
          investorsData
            .filter(inv => inv.profile?.verification_status === 'verified')
            .map(async (inv) => {
              // Get donation stats for this investor
              const { data: invDonations } = await supabase
                .from('donations')
                .select('amount, status')
                .eq('investor_id', inv.id) as { data: any[] | null };

              const donations_count = invDonations?.length || 0;
              const total_pads_donated = invDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

              return {
                ...inv,
                profile: inv.profile,
                donations_count,
                total_pads_donated
              };
            })
        );

        setInvestors(verifiedInvestors);
        setFilteredInvestors(verifiedInvestors);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load donation data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDonation = async (investor: InvestorWithProfile) => {
    setSelectedInvestor(investor.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get institution data
      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: any };

      if (!institution) return;

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('institution_id', institution.id)
        .eq('investor_id', investor.id)
        .single() as { data: any };

      let conversationId = existingConv?.id;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            institution_id: institution.id,
            investor_id: investor.id
          })
          .select()
          .single() as { data: any };

        conversationId = newConv?.id;
      }

      // Navigate to messages
      if (conversationId) {
        setRequestSent(investor.id);
        toast({
          title: 'Request sent!',
          description: `Your donation request has been sent to ${investor.profile.full_name || investor.company_name}`,
        });
        setTimeout(() => {
          navigate('/messages');
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send donation request',
        variant: 'destructive',
      });
    } finally {
      setSelectedInvestor(null);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sanitary Pad Donations</h2>
          <p className="text-muted-foreground">Request and track pad donations for your institution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'available' ? 'default' : 'outline'}
            onClick={() => setActiveTab('available')}
          >
            Available Donors
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            Donation History
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {requestSent && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Donation request sent successfully! Redirecting to messages...
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Donations</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Requests</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Pads Received</CardDescription>
            <CardTitle className="text-3xl">{stats.totalPads.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'available' ? (
        <>
          {/* Search and Filter Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, company, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Investors Grid */}
          {filteredInvestors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No verified donors found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredInvestors.map((investor) => (
                <Card key={investor.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg">
                      {investor.profile.full_name || investor.company_name || 'Anonymous Donor'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-sm">
                      <Badge variant="outline">{investor.investor_type}</Badge>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      {/* Contact Info */}
                      {investor.profile.email && (
                        <p className="text-sm text-muted-foreground">
                          {investor.profile.email}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Package className="h-3 w-3" />
                            <span className="text-xs">Total Donated</span>
                          </div>
                          <p className="text-sm font-semibold">{investor.total_pads_donated.toLocaleString()} pads</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs">Donations Made</span>
                          </div>
                          <p className="text-sm font-semibold">{investor.donations_count}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full mt-4"
                      onClick={() => handleRequestDonation(investor)}
                      disabled={selectedInvestor === investor.id || requestSent === investor.id}
                    >
                      {requestSent === investor.id ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Request Sent
                        </>
                      ) : selectedInvestor === investor.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Request Donation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-1">How it works</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Request Donation" to send a request to a verified donor. 
                    They will be notified and can discuss the donation details through messages. 
                    Track all your requests and received donations in the History tab.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Donation History Tab */
        <Card>
          <CardHeader>
            <CardTitle>Donation History</CardTitle>
            <CardDescription>All pad donations received by your institution</CardDescription>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No donations yet</p>
                <Button onClick={() => setActiveTab('available')}>
                  Browse Available Donors
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {Number(donation.amount).toLocaleString()} pads
                          </span>
                        </div>
                        <Badge variant={getStatusVariant(donation.status)}>
                          {donation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(donation.donation_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Donor ID: {donation.investor_id.slice(0, 8)}
                        </div>
                      </div>
                      {donation.message && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Message: {donation.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
