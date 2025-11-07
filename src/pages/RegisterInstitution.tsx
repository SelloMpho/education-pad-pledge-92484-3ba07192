import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RegisterInstitution = () => {
  const [formData, setFormData] = useState({
    institutionName: "",
    country: "",
    city: "",
    address: "",
    contactPerson: "",
    contactPosition: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
      toast({
        title: "Terms required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.contactPerson,
            phone: formData.phone,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.contactPerson,
            phone: formData.phone,
            user_type: 'institution',
          });

        if (profileError) throw profileError;

        const { error: institutionError } = await supabase
          .from('institutions')
          .insert({
            user_id: authData.user.id,
            institution_name: formData.institutionName,
            country: formData.country,
            city: formData.city,
            address: formData.address,
            contact_person: formData.contactPerson,
            contact_position: formData.contactPosition,
          });

        if (institutionError) throw institutionError;

        toast({
          title: "Registration successful!",
          description: "Your institution account has been created.",
        });

        navigate('/dashboard/institution');
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-large border-2">
              <CardHeader className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-soft mx-auto">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-3xl text-center">Register Your Institution</CardTitle>
                <CardDescription className="text-center text-base">
                  Join PadForward to connect with potential donors
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="institutionName">Institution Name</Label>
                      <Input 
                        id="institutionName" 
                        name="institutionName"
                        placeholder="University of..." 
                        value={formData.institutionName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input 
                        id="country" 
                        name="country"
                        placeholder="South Africa" 
                        value={formData.country}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        name="city"
                        placeholder="Johannesburg" 
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Physical Address</Label>
                      <Input 
                        id="address" 
                        name="address"
                        placeholder="123 Main Street" 
                        value={formData.address}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input 
                        id="contactPerson" 
                        name="contactPerson"
                        placeholder="John Doe" 
                        value={formData.contactPerson}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPosition">Position</Label>
                      <Input 
                        id="contactPosition" 
                        name="contactPosition"
                        placeholder="Director" 
                        value={formData.contactPosition}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        placeholder="institution@email.com" 
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        name="phone"
                        type="tel" 
                        placeholder="+27 12 345 6789" 
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        name="password"
                        type="password" 
                        placeholder="Create a secure password" 
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        name="confirmPassword"
                        type="password" 
                        placeholder="Confirm your password" 
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-none cursor-pointer">
                      I agree to the Terms and Conditions and Privacy Policy
                    </label>
                  </div>
                  
                  <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register Institution"}
                  </Button>
                  
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline">
                      Login here
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-8 shadow-large border-2">
              <CardHeader>
                <CardTitle className="text-xl">Next Steps After Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Verification Process</p>
                    <p className="text-sm text-muted-foreground">
                      Our team will review your application within 2-3 business days
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Complete Your Profile</p>
                    <p className="text-sm text-muted-foreground">
                      Upload necessary documents and complete your institution profile
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Connect with Donors</p>
                    <p className="text-sm text-muted-foreground">
                      Once verified, you can start connecting with potential donors
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RegisterInstitution;
