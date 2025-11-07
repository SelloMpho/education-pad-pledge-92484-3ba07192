import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, Eye, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Investor {
  id: string;
  investor_type: string;
  company_name: string | null;
  certificate_url: string | null;
  created_at: string;
  user_id: string;
}

interface InvestorWithProfile extends Investor {
  profiles: {
    email: string;
    full_name: string | null;
    phone: string | null;
    verification_status: string;
  };
}

export const InvestorsManagement = () => {
  const { toast } = useToast();
  const [investors, setInvestors] = useState<InvestorWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorWithProfile | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select(`
          *,
          profiles (
            email,
            full_name,
            phone,
            verification_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestors(data as InvestorWithProfile[] || []);
    } catch (error) {
      console.error('Error fetching investors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investors',
        variant: 'destructive',
      });
    }
  };

  const handleViewCertificate = async (certificateUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from('certificates')
        .createSignedUrl(certificateUrl, 60);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load certificate',
        variant: 'destructive',
      });
    }
  };

  const filteredInvestors = investors.filter(
    (inv) =>
      inv.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.investor_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Investors Management</CardTitle>
          <CardDescription>View and manage all registered investors</CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search investors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell className="font-medium">{investor.profiles?.full_name || 'N/A'}</TableCell>
                  <TableCell>{investor.profiles?.email}</TableCell>
                  <TableCell className="capitalize">{investor.investor_type}</TableCell>
                  <TableCell>{investor.company_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        investor.profiles?.verification_status === 'verified'
                          ? 'default'
                          : investor.profiles?.verification_status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {investor.profiles?.verification_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedInvestor(investor);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {investor.certificate_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCertificate(investor.certificate_url!)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Investor Details</DialogTitle>
            <DialogDescription>View investor information</DialogDescription>
          </DialogHeader>
          {selectedInvestor && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-sm">{selectedInvestor.profiles?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedInvestor.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedInvestor.profiles?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Investor Type</p>
                  <p className="text-sm capitalize">{selectedInvestor.investor_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="text-sm">{selectedInvestor.company_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
                  <Badge
                    variant={
                      selectedInvestor.profiles?.verification_status === 'verified'
                        ? 'default'
                        : selectedInvestor.profiles?.verification_status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {selectedInvestor.profiles?.verification_status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
