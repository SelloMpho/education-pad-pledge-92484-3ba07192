import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Search, Eye, DollarSign, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  donation_date: string;
  message: string | null;
  institution_id: string;
  created_at: string;
}

interface DonationDetails extends Donation {
  institution?: {
    institution_name: string;
    country: string;
    city: string;
  };
}

export const InvestorDonations = () => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!investor) return;

      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("investor_id", investor.id)
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
      const { data: institution } = await supabase
        .from("institutions")
        .select("institution_name, country, city")
        .eq("id", donation.institution_id)
        .single();

      setSelectedDonation({
        ...donation,
        institution,
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
      case "delivered":
        return "default";
      case "pending":
      case "processing":
        return "secondary";
      case "cancelled":
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case "pending":
        return 25;
      case "processing":
        return 50;
      case "shipped":
        return 75;
      case "completed":
      case "delivered":
        return 100;
      default:
        return 0;
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

  const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const completedDonations = donations.filter(d => d.status === 'completed' || d.status === 'delivered').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading donations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Donations</h2>
        <p className="text-muted-foreground">Track your donations and their delivery status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Donated</p>
              <p className="text-2xl font-bold">${totalDonated.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Donations</p>
              <p className="text-2xl font-bold">{donations.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold">{completedDonations}</p>
            </div>
          </div>
        </Card>
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
              <TableHead>Progress</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDonations.map((donation) => (
              <TableRow key={donation.id}>
                <TableCell className="font-medium">
                  {donation.currency} {donation.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(donation.status)}>
                    {donation.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-24">
                    <Progress value={getStatusProgress(donation.status)} />
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(donation.donation_date), "MMM dd, yyyy")}
                </TableCell>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                    {selectedDonation.currency} {selectedDonation.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedDonation.status)}>
                      {selectedDonation.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Delivery Progress</label>
                <div className="mt-2 space-y-2">
                  <Progress value={getStatusProgress(selectedDonation.status)} />
                  <p className="text-sm text-muted-foreground">
                    {selectedDonation.status === 'completed' || selectedDonation.status === 'delivered' 
                      ? 'Donation delivered successfully!' 
                      : `Currently ${selectedDonation.status}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              {selectedDonation.institution && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Institution Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Institution Name</label>
                      <p>{selectedDonation.institution.institution_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                      <p>
                        {selectedDonation.institution.city}, {selectedDonation.institution.country}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
