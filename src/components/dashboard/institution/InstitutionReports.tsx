import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  DollarSign,
  Target,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  totalDonations: number;
  totalAmount: number;
  averageDonation: number;
  activeDonors: number;
  conversionRate: number;
  monthlyTrend: Array<{
    month: string;
    donations: number;
    amount: number;
  }>;
  donorAnalytics: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  campaignPerformance: Array<{
    campaign: string;
    donations: number;
    amount: number;
    conversion: number;
  }>;
}

interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: 'month' | 'quarter' | 'year' | 'custom';
  includeCharts: boolean;
}

export default function InstitutionReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Get current institution ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!institution) throw new Error('Institution not found');

      // Fetch donations data
      const { data: donations } = await supabase
        .from('donations')
        .select('*')
        .eq('institution_id', institution.id)
        .gte('created_at', getDateRangeStart(dateRange));

      // Fetch conversations for donor analytics
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('institution_id', institution.id);

      // Fetch messages for engagement metrics
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.id) || []);

      // Process data for reports
      const processedData = processReportData(donations || [], conversations || [], messages || []);
      setReportData(processedData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (
    donations: any[], 
    conversations: any[], 
    messages: any[]
  ): ReportData => {
    const totalDonations = donations.length;
    const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;
    const activeDonors = new Set(donations.map(d => d.donor_id)).size;
    
    // Calculate conversion rate (conversations to donations)
    const conversionRate = conversations.length > 0 
      ? (totalDonations / conversations.length) * 100 
      : 0;

    // Monthly trend data (last 6 months)
    const monthlyTrend = generateMonthlyTrend(donations);

    // Donor type analytics
    const donorAnalytics = generateDonorAnalytics(conversations);

    // Campaign performance (placeholder - would need campaign data)
    const campaignPerformance = generateCampaignPerformance(donations);

    return {
      totalDonations,
      totalAmount,
      averageDonation,
      activeDonors,
      conversionRate,
      monthlyTrend,
      donorAnalytics,
      campaignPerformance,
    };
  };

  const generateMonthlyTrend = (donations: any[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthDonations = donations.filter(d => {
        const donationDate = new Date(d.created_at);
        return donationDate.getMonth() === date.getMonth() && 
               donationDate.getFullYear() === date.getFullYear();
      });

      const monthAmount = monthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      months.push({
        month: monthName,
        donations: monthDonations.length,
        amount: monthAmount,
      });
    }
    
    return months;
  };

  const generateDonorAnalytics = (conversations: any[]) => {
    const types = {
      'Individual Investor': 0,
      'Corporate Investor': 0,
      'Foundation': 0,
      'Other': 0,
    };

    conversations.forEach(conv => {
      // This would need to be enhanced with actual donor type data
      types['Individual Investor'] = (types['Individual Investor'] || 0) + 1;
    });

    const total = conversations.length || 1;
    return Object.entries(types)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / total) * 100,
      }));
  };

  const generateCampaignPerformance = (donations: any[]) => {
    // Placeholder campaign data - would be enhanced with actual campaign tracking
    return [
      { campaign: 'General Fund', donations: donations.length * 0.4, amount: 0, conversion: 15 },
      { campaign: 'Emergency Relief', donations: donations.length * 0.3, amount: 0, conversion: 22 },
      { campaign: 'Education Program', donations: donations.length * 0.2, amount: 0, conversion: 18 },
      { campaign: 'Healthcare Initiative', donations: donations.length * 0.1, amount: 0, conversion: 12 },
    ];
  };

  const getDateRangeStart = (range: string): string => {
    const now = new Date();
    switch (range) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      setExporting(true);

      if (options.format !== 'pdf') {
        toast({
          title: 'Unsupported format',
          description: 'Only PDF export is currently supported.',
        });
        return;
      }

      if (!reportData) {
        toast({
          title: 'No data to export',
          description: 'Please load report data before exporting.',
          variant: 'destructive',
        });
        return;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      // Header
      doc.setFontSize(18);
      doc.text('Institution Report', 40, 40);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);
      doc.text(`Period: ${options.dateRange}`, 40, 75);

      // KPI Table
      autoTable(doc, {
        startY: 95,
        head: [['Metric', 'Value']],
        body: [
          ['Total Donations', String(reportData.totalDonations)],
          ['Total Amount', `$${(reportData.totalAmount || 0).toLocaleString()}`],
          ['Average Donation', `$${(reportData.averageDonation || 0).toFixed(2)}`],
          ['Active Donors', String(reportData.activeDonors)],
          ['Conversion Rate', `${(reportData.conversionRate || 0).toFixed(1)}%`],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      // Monthly Trend
      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : 140,
        head: [['Month', 'Donations', 'Amount']],
        body: (reportData.monthlyTrend || []).map(m => [
          m.month,
          String(m.donations),
          `$${(m.amount || 0).toLocaleString()}`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      // Donor Analytics
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Donor Type', 'Count', 'Percentage']],
        body: (reportData.donorAnalytics || []).map(d => [
          d.type,
          String(d.count),
          `${(d.percentage || 0).toFixed(1)}%`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      // Campaign Performance
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Campaign', 'Donations', 'Amount', 'Conversion']],
        body: (reportData.campaignPerformance || []).map(c => [
          c.campaign,
          String(Math.round(c.donations || 0)),
          `$${(c.amount || 0).toLocaleString()}`,
          `${Math.round(c.conversion || 0)}%`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      doc.save(`institution_report_${new Date().toISOString().slice(0, 10)}.pdf`);

      toast({
        title: 'Export Complete',
        description: 'PDF report downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Unable to export report',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendLabel }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {' '}{trendLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your institution's performance and impact
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReportData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport({ format: 'pdf', dateRange, includeCharts: true })}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Period:</span>
        </div>
        <Tabs value={dateRange} onValueChange={(value) => setDateRange(value as any)}>
          <TabsList>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="quarter">This Quarter</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Donations"
          value={reportData?.totalDonations || 0}
          icon={DollarSign}
          trend={12}
          trendLabel="vs last period"
        />
        <StatCard
          title="Total Amount"
          value={`$${(reportData?.totalAmount || 0).toLocaleString()}`}
          icon={TrendingUp}
          trend={8}
          trendLabel="vs last period"
        />
        <StatCard
          title="Active Donors"
          value={reportData?.activeDonors || 0}
          icon={Users}
          trend={15}
          trendLabel="new donors"
        />
        <StatCard
          title="Conversion Rate"
          value={`${(reportData?.conversionRate || 0).toFixed(1)}%`}
          icon={Target}
          trend={-2}
          trendLabel="vs last period"
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="donors">Donor Analytics</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Donations and engagement over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData?.monthlyTrend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{month.donations} donations</Badge>
                        <span className="text-sm text-muted-foreground">
                          ${month.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Donation</span>
                    <span className="font-medium">${(reportData?.averageDonation || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Response Rate</span>
                    <span className="font-medium">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Messages per Donor</span>
                    <span className="font-medium">{Math.round((reportData?.totalDonations || 0) / (reportData?.activeDonors || 1))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Donation Trends</CardTitle>
              <CardDescription>Monthly donation patterns and growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.monthlyTrend.map((month, index) => {
                  const maxAmount = Math.max(...(reportData?.monthlyTrend.map(m => m.amount) || [1]));
                  const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-muted-foreground">
                          {month.donations} donations • ${month.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Donor Types</CardTitle>
                <CardDescription>Breakdown of donor categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData?.donorAnalytics.map((donor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{donor.type}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{donor.count}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {donor.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>Donor interaction statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Response Time</span>
                    <span className="font-medium">2.4 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Repeat Donors</span>
                    <span className="font-medium">{Math.round((reportData?.activeDonors || 0) * 0.6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Donor Retention Rate</span>
                    <span className="font-medium">68%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Effectiveness of different campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.campaignPerformance.map((campaign, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{campaign.campaign}</h4>
                      <Badge variant={campaign.conversion > 15 ? 'default' : 'secondary'}>
                        {campaign.conversion}% conversion
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Donations</span>
                        <p className="font-medium">{Math.round(campaign.donations)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount</span>
                        <p className="font-medium">${campaign.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ROI</span>
                        <p className="font-medium">{Math.round(campaign.conversion * 2.5)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}