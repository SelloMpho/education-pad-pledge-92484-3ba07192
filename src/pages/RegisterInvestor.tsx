import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RegisterInvestor = () => {
  const [formData, setFormData] = useState({
    investorType: "",
    fullName: "",
    companyName: "",
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

    if (!formData.investorType) {
      toast({
        title: "Investor type required",
        description: "Please select an investor type",
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
            full_name: formData.fullName,
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
            full_name: formData.fullName,
            phone: formData.phone,
            user_type: 'investor',
          });

        if (profileError) throw profileError;

        const { error: investorError } = await supabase
          .from('investors')
          .insert({
            user_id: authData.user.id,
            investor_type: formData.investorType,
            company_name: formData.companyName || null,
          });

        if (investorError) throw investorError;

        toast({
          title: "Registration successful!",
          description: "Your investor account has been created.",
        });

        navigate('/dashboard/investor');
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-coral flex items-center justify-center shadow-soft mx-auto">
                  <Heart className="w-8 h-8 text-primary-foreground fill-current" />
                </div>
                <CardTitle className="text-3xl text-center">Register as Investor/Donor</CardTitle>
                <CardDescription className="text-center text-base">
                  Join PadForward to support educational institutions
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="investorType">Investor Type</Label>
                    <Select 
                      value={formData.investorType} 
                      onValueChange={(value) => setFormData({ ...formData, investorType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select investor type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="foundation">Foundation</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name / Contact Person</Label>
                      <Input 
                        id="fullName" 
                        name="fullName"
                        placeholder="John Doe" 
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company/Organization Name (Optional)</Label>
                      <Input 
                        id="companyName" 
                        name="companyName"
                        placeholder="Acme Foundation" 
                        value={formData.companyName}
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
                        placeholder="investor@email.com" 
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
                  
                  <Button variant="coral" size="lg" className="w-full" type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register as Investor"}
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
                  <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Verification Process</p>
                    <p className="text-sm text-muted-foreground">
                      Our team will review your application within 2-3 business days
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Browse Institutions</p>
                    <p className="text-sm text-muted-foreground">
                      Explore verified educational institutions seeking support
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Make an Impact</p>
                    <p className="text-sm text-muted-foreground">
                      Connect with institutions and start making a difference
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

export default RegisterInvestor;
