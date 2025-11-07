import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, DollarSign, Building2, Calendar } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  totalDonations: number;
  totalAmount: number;
  institutionsSupported: number;
  averageDonation: number;
  donationsByMonth: { month: string; amount: number; count: number }[];
}

export const InvestorAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription for donations
    const channel = supabase
      .channel('donations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations'
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: investor } = await supabase
        .from('investors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!investor) throw new Error('Investor profile not found');

      const { data: donations, error } = await supabase
        .from('donations')
        .select('*')
        .eq('investor_id', investor.id);

      if (error) throw error;

      // Calculate analytics
      const totalDonations = donations?.length || 0;
      const totalAmount = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const institutionsSupported = new Set(donations?.map(d => d.institution_id)).size;
      const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

      // Group by month
      const donationsByMonth = donations?.reduce((acc: any[], donation) => {
        const date = new Date(donation.donation_date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const existing = acc.find(item => item.month === monthYear);
        if (existing) {
          existing.amount += Number(donation.amount);
          existing.count += 1;
        } else {
          acc.push({
            month: monthYear,
            amount: Number(donation.amount),
            count: 1,
          });
        }
        return acc;
      }, []) || [];

      setAnalytics({
        totalDonations,
        totalAmount,
        institutionsSupported,
        averageDonation,
        donationsByMonth: donationsByMonth.slice(-6), // Last 6 months
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Analytics</h2>
        <p className="text-muted-foreground">Track your donation impact and trends</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDonations}</div>
            <p className="text-xs text-muted-foreground">All-time contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total donated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Institutions Supported</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.institutionsSupported}</div>
            <p className="text-xs text-muted-foreground">Organizations helped</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.averageDonation.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per contribution</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>Monthly donation amounts over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: "Amount",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <BarChart data={analytics.donationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donation Volume</CardTitle>
            <CardDescription>Number of donations per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Donations",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <LineChart data={analytics.donationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
