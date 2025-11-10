import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface InvestorReportData {
  totalDonations: number;
  totalAmount: number;
  supportedInstitutions: number;
  averageDonation: number;
  donationsByMonth: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  donationsByInstitution: Array<{
    institution_id: string;
    institution_name: string;
    amount: number;
    count: number;
  }>;
  largestDonation: number;
  medianDonation: number;
}

export default function InvestorReports() {
  const [reportData, setReportData] = useState<InvestorReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: investor } = await supabase
        .from('investors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!investor) {
        toast({
          title: 'Investor profile not found',
          description: 'Please complete your investor profile to view reports.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data: donations, error } = await supabase
        .from('donations')
        .select('*')
        .eq('investor_id', investor.id);

      if (error) throw error;

      const list = donations || [];
      const totalDonations = list.length || 0;
      const amounts = list.map(d => Number(d.amount)).filter(a => !Number.isNaN(a));
      const totalAmount = amounts.reduce((sum, a) => sum + a, 0) || 0;
      const supportedInstitutions = new Set(list.map(d => d.institution_id)).size;
      const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;
      const largestDonation = amounts.length ? Math.max(...amounts) : 0;
      const sortedAmounts = [...amounts].sort((a, b) => a - b);
      const medianDonation = sortedAmounts.length
        ? (sortedAmounts.length % 2 === 0
            ? (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
            : sortedAmounts[Math.floor(sortedAmounts.length / 2)])
        : 0;

      const donationsByMonth = list.reduce((acc: any[], donation) => {
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
      }, []);

      // Institution analytics
      const institutionIds = Array.from(new Set(list.map(d => d.institution_id).filter(Boolean)));
      let institutionNameMap = new Map<string, string>();
      if (institutionIds.length) {
        const { data: institutions, error: instErr } = await supabase
          .from('institutions')
          .select('id,name')
          .in('id', institutionIds);
        if (!instErr && institutions) {
          institutionNameMap = new Map(institutions.map((i: any) => [i.id, i.name || i.id]));
        }
      }

      const donationsByInstitution = list.reduce((acc: any[], donation) => {
        const id = donation.institution_id;
        const name = institutionNameMap.get(id) || id || 'Unknown';
        const existing = acc.find((x) => x.institution_id === id);
        if (existing) {
          existing.amount += Number(donation.amount);
          existing.count += 1;
        } else {
          acc.push({ institution_id: id, institution_name: name, amount: Number(donation.amount), count: 1 });
        }
        return acc;
      }, []);

      setReportData({
        totalDonations,
        totalAmount,
        supportedInstitutions,
        averageDonation,
        donationsByMonth: donationsByMonth.slice(-6),
        donationsByInstitution: donationsByInstitution.sort((a, b) => b.amount - a.amount),
        largestDonation,
        medianDonation,
      });
    } catch (error: any) {
      toast({
        title: 'Error fetching report data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!reportData) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    setExporting(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      doc.setFontSize(18);
      doc.text('Investor Impact Report', 40, 40);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);

      autoTable(doc, {
        startY: 80,
        head: [['Metric', 'Value']],
        body: [
          ['Total Donations', String(reportData.totalDonations)],
          ['Total Amount Donated', `$${reportData.totalAmount.toLocaleString()}`],
          ['Institutions Supported', String(reportData.supportedInstitutions)],
          ['Average Donation', `$${reportData.averageDonation.toFixed(2)}`],
          ['Largest Donation', `$${reportData.largestDonation.toLocaleString()}`],
          ['Median Donation', `$${reportData.medianDonation.toFixed(2)}`],
        ],
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Month', 'Donations', 'Amount']],
        body: reportData.donationsByMonth.map(m => [
          m.month,
          String(m.count),
          `$${m.amount.toLocaleString()}`,
        ]),
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Institution', 'Donations', 'Amount']],
        body: reportData.donationsByInstitution.map((i) => [
          i.institution_name,
          String(i.count),
          `$${i.amount.toLocaleString()}`,
        ]),
      });

      doc.save(`investor_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: 'Export Complete', description: 'PDF report downloaded.' });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Impact Report</h2>
          <p className="text-muted-foreground">
            An overview of your donation activity.
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
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      {reportData && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalDonations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Amount Donated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Institutions Supported</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.supportedInstitutions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.averageDonation.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Donation Amount</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.donationsByMonth}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Donation Counts</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2">Month</th>
                        <th className="py-2">Donations</th>
                        <th className="py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.donationsByMonth.map((m) => (
                        <tr key={m.month} className="border-t">
                          <td className="py-2">{m.month}</td>
                          <td className="py-2">{m.count}</td>
                          <td className="py-2">${m.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Institution analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Donations by Institution</CardTitle>
                <CardDescription>Distribution of total donated amount</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.donationsByInstitution}
                      dataKey="amount"
                      nameKey="institution_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {reportData.donationsByInstitution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"][index % 6]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Institutions</CardTitle>
                <CardDescription>By total donated amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2">Institution</th>
                        <th className="py-2">Donations</th>
                        <th className="py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.donationsByInstitution.slice(0, 10).map((i) => (
                        <tr key={i.institution_id} className="border-t">
                          <td className="py-2">{i.institution_name}</td>
                          <td className="py-2">{i.count}</td>
                          <td className="py-2">${i.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donation insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Largest Donation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.largestDonation.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Median Donation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.medianDonation.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.averageDonation.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}