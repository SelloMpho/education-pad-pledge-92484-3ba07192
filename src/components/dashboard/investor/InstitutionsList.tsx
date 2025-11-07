import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Building2, Mail } from 'lucide-react';

interface Institution {
  id: string;
  institution_name: string;
  country: string;
  city: string;
  address: string;
  contact_person: string;
  contact_position: string | null;
}

export const InstitutionsList = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('institution_name');

      if (error) throw error;
      setInstitutions(data || []);
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

  const handleContactInstitution = async (institutionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: investor } = await supabase
        .from('investors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!investor) throw new Error('Investor profile not found');

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('investor_id', investor.id)
        .eq('institution_id', institutionId)
        .single();

      if (existingConv) {
        window.location.href = `/messages?conversation=${existingConv.id}`;
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          investor_id: investor.id,
          institution_id: institutionId,
        })
        .select()
        .single();

      if (error) throw error;

      window.location.href = `/messages?conversation=${newConv.id}`;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredInstitutions = institutions.filter((inst) =>
    inst.institution_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading institutions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Institutions</h2>
        <p className="text-muted-foreground">Browse and connect with verified institutions</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search institutions by name, country, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInstitutions.map((institution) => (
          <Card key={institution.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {institution.institution_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {institution.city}, {institution.country}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  <span className="font-medium">Contact:</span> {institution.contact_person}
                </p>
                {institution.contact_position && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Position:</span> {institution.contact_position}
                  </p>
                )}
                <p className="text-muted-foreground">
                  <span className="font-medium">Address:</span> {institution.address}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => handleContactInstitution(institution.id)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Institution
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInstitutions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No institutions found</p>
        </div>
      )}
    </div>
  );
};
