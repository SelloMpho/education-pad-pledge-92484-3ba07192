import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  donation_date: string;
  message: string | null;
  investor_id: string;
  institution_id: string;
  created_at: string;
}

interface DonationDetails extends Donation {
  investor?: {
    company_name: string | null;
    investor_type: string;
    user_id: string;
  };
  institution?: {
    institution_name: string;
    country: string;
    city: string;
    user_id: string;
  };
  investor_profile?: {
    full_name: string | null;
    email: string;
  };
  institution_profile?: {
    full_name: string | null;
    email: string;
  };
}

export const DonationsManagement = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<DonationDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      toast({
        title: "Error",
        description: "Failed to load donations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (donation: Donation) => {
    try {
      // Fetch investor details
      const { data: investor } = await supabase
        .from("investors")
        .select("company_name, investor_type, user_id")
        .eq("id", donation.investor_id)
        .single();

      // Fetch institution details
      const { data: institution } = await supabase
        .from("institutions")
        .select("institution_name, country, city, user_id")
        .eq("id", donation.institution_id)
        .single();

      // Fetch investor profile
      const { data: investorProfile } = investor?.user_id
        ? await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", investor.user_id)
            .single()
        : { data: null };

      // Fetch institution profile
      const { data: institutionProfile } = institution?.user_id
        ? await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", institution.user_id)
            .single()
        : { data: null };

      setSelectedDonation({
        ...donation,
        investor,
        institution,
        investor_profile: investorProfile || undefined,
        institution_profile: institutionProfile || undefined,
      });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Error fetching donation details:", error);
      toast({
        title: "Error",
        description: "Failed to load donation details",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "cancelled":
      case "failed":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredDonations = donations.filter((donation) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      donation.id.toLowerCase().includes(searchLower) ||
      donation.status.toLowerCase().includes(searchLower) ||
      donation.currency.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading donations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Donations Management</h2>
          <p className="text-muted-foreground">View and manage all donations</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-5 w-5" />
          <span className="text-sm">{donations.length} total donations</span>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by ID, status, or currency..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDonations.map((donation) => (
              <TableRow key={donation.id}>
                <TableCell className="font-medium">
                  {donation.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(donation.status)}>
                    {donation.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(donation.donation_date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>{donation.currency}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(donation)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredDonations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No donations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Donation Details</DialogTitle>
          </DialogHeader>
          {selectedDonation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-lg font-semibold">
                    {selectedDonation.amount.toLocaleString()} {selectedDonation.currency}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedDonation.status)}>
                      {selectedDonation.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Donation Date</label>
                  <p>{format(new Date(selectedDonation.donation_date), "PPP")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p>{format(new Date(selectedDonation.created_at), "PPP")}</p>
                </div>
              </div>

              {selectedDonation.message && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{selectedDonation.message}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Investor Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                    <p>{selectedDonation.investor?.company_name || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Investor Type</label>
                    <p>{selectedDonation.investor?.investor_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                    <p>{selectedDonation.investor_profile?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{selectedDonation.investor_profile?.email}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Institution Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Institution Name</label>
                    <p>{selectedDonation.institution?.institution_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p>
                      {selectedDonation.institution?.city}, {selectedDonation.institution?.country}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                    <p>{selectedDonation.institution_profile?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{selectedDonation.institution_profile?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
