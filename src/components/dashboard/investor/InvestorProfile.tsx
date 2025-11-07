import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Building2, FileText } from 'lucide-react';
import { CertificateUpload } from '../CertificateUpload';

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  investor_type: string;
  company_name: string | null;
  certificate_url: string | null;
  verification_status: string;
}

export const InvestorProfile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (investorError) throw investorError;

      setProfile({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        investor_type: investorData.investor_type || '',
        company_name: investorData.company_name || null,
        certificate_url: investorData.certificate_url || null,
        verification_status: profileData.verification_status || 'pending',
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: investorError } = await supabase
        .from('investors')
        .update({
          company_name: profile.company_name,
        })
        .eq('user_id', user.id);

      if (investorError) throw investorError;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateUpload = () => {
    fetchProfile(); // Refresh profile after certificate upload
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-8">Profile not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Profile</h2>
        <p className="text-muted-foreground">Manage your investor profile and verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  <User className="inline h-4 w-4 mr-2" />
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investor_type">
                  <FileText className="inline h-4 w-4 mr-2" />
                  Investor Type
                </Label>
                <Input
                  id="investor_type"
                  value={profile.investor_type}
                  disabled
                  className="bg-muted"
                />
              </div>

              {profile.investor_type === 'corporate' && (
                <div className="space-y-2">
                  <Label htmlFor="company_name">
                    <Building2 className="inline h-4 w-4 mr-2" />
                    Company Name
                  </Label>
                  <Input
                    id="company_name"
                    value={profile.company_name || ''}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  />
                </div>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`text-sm font-bold ${
                    profile.verification_status === 'verified' 
                      ? 'text-green-600' 
                      : profile.verification_status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    {profile.verification_status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {profile.verification_status === 'verified' 
                    ? 'Your account is verified and active'
                    : profile.verification_status === 'rejected'
                    ? 'Please contact support for more information'
                    : 'Your account is pending verification'}
                </p>
              </div>
            </CardContent>
          </Card>

          <CertificateUpload 
            userType="investor"
            currentCertificateUrl={profile.certificate_url}
            onUploadSuccess={handleCertificateUpload} 
          />
        </div>
      </div>
    </div>
  );
};
