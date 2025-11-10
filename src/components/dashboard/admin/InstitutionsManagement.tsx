import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, Eye, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Institution {
  id: string;
  institution_name: string;
  country: string;
  city: string;
  address: string;
  contact_person: string;
  contact_position: string | null;
  certificate_url: string | null;
  created_at: string;
  user_id: string;
}

interface InstitutionWithProfile extends Institution {
  profiles: {
    email: string;
    full_name: string | null;
    verification_status: string;
  };
}

export const InstitutionsManagement = () => {
  const { toast } = useToast();
  const [institutions, setInstitutions] = useState<InstitutionWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionWithProfile | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchInstitutions();
    // Subscribe to realtime changes for institutions and profiles
    const channel = supabase
      .channel('admin-institutions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'institutions' },
        () => fetchInstitutions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchInstitutions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select(`
          *,
          profiles (
            email,
            full_name,
            verification_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstitutions(data as InstitutionWithProfile[] || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load institutions',
        variant: 'destructive',
      });
    }
  };

  const handleVerification = async (
    userId: string,
    status: 'verified' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', userId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: `Institution ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      });
      fetchInstitutions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update verification status',
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

  const filteredInstitutions = institutions.filter(
    (inst) => {
      const matchesSearch =
        inst.institution_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.city.toLowerCase().includes(searchTerm.toLowerCase());

      const status = (inst.profiles?.verification_status || '').toLowerCase();
      const matchesStatus =
        statusFilter === 'all' || status === statusFilter;

      const matchesPendingToggle = !pendingOnly || status === 'pending';

      return matchesSearch && matchesStatus && matchesPendingToggle;
    }
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Institutions Management</CardTitle>
          <CardDescription>View and manage all registered institutions</CardDescription>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search institutions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'verified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('verified')}
              >
                Verified
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected
              </Button>
            </div>
            <div className="flex items-center justify-end">
              <Button
                variant={pendingOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPendingOnly((p) => !p)}
              >
                {pendingOnly ? 'Showing Pending Only' : 'Show Pending Only'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.institution_name}</TableCell>
                  <TableCell>{institution.city}, {institution.country}</TableCell>
                  <TableCell>{institution.contact_person}</TableCell>
                  <TableCell>{institution.profiles?.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        institution.profiles?.verification_status === 'verified'
                          ? 'default'
                          : institution.profiles?.verification_status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {institution.profiles?.verification_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedInstitution(institution);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {institution.certificate_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCertificate(institution.certificate_url!)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {institution.profiles?.verification_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleVerification(institution.user_id, 'verified')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerification(institution.user_id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
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
            <DialogTitle>Institution Details</DialogTitle>
            <DialogDescription>View institution information</DialogDescription>
          </DialogHeader>
          {selectedInstitution && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Institution Name</p>
                  <p className="text-sm">{selectedInstitution.institution_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                  <p className="text-sm">{selectedInstitution.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Position</p>
                  <p className="text-sm">{selectedInstitution.contact_position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedInstitution.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Country</p>
                  <p className="text-sm">{selectedInstitution.country}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">City</p>
                  <p className="text-sm">{selectedInstitution.city}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-sm">{selectedInstitution.address}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
