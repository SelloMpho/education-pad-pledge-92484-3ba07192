import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface InstitutionRow {
  id: string;
  user_id: string;
  institution_name: string | null;
  contact_person: string | null;
  city: string | null;
  country: string | null;
  certificate_url?: string | null;
}

export default function InstitutionProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [form, setForm] = useState({
    institution_name: '',
    contact_person: '',
    city: '',
    country: '',
    description: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
          .from('institutions')
          .select('id, user_id, institution_name, contact_person, city, country, certificate_url')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setInstitution(data as InstitutionRow);
          setForm({
            institution_name: data.institution_name ?? '',
            contact_person: data.contact_person ?? '',
            city: data.city ?? '',
            country: data.country ?? '',
            description: '',
          });
        }
      } catch (e) {
        console.error('Profile load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async () => {
    if (!institution) return;
    try {
      setSaving(true);
      const payload = {
        institution_name: form.institution_name || null,
        contact_person: form.contact_person || null,
        city: form.city || null,
        country: form.country || null,
      };
      const { error } = await supabase
        .from('institutions')
        .update(payload)
        .eq('id', institution.id);
      if (error) throw error;
      toast({ title: 'Profile updated', description: 'Your institution details were saved.' });
    } catch (e: any) {
      console.error('Save error:', e);
      toast({ title: 'Failed to save', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (!institution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>No institution found. Complete registration to edit profile.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Institution Profile</CardTitle>
        <CardDescription>Manage your institution’s public information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="institution_name">Institution name</Label>
            <Input id="institution_name" value={form.institution_name} onChange={updateField('institution_name')} placeholder="e.g., Bright Future Academy" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact person</Label>
            <Input id="contact_person" value={form.contact_person} onChange={updateField('contact_person')} placeholder="e.g., Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={updateField('city')} placeholder="e.g., Nairobi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={form.country} onChange={updateField('country')} placeholder="e.g., Kenya" />
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}