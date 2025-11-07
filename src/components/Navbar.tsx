import { Button } from "@/components/ui/button";
import { Heart, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  const getDashboardLink = () => {
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'institution') return '/dashboard/institution';
    if (role === 'investor') return '/dashboard/investor';
    return '/';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all">
              <Heart className="w-6 h-6 text-primary-foreground fill-current" />
            </div>
            <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              PadForward
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            {role && (
              <Link 
                to={getDashboardLink()} 
                className="text-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {role && (
              <Link to="/messages" className="text-foreground hover:text-primary transition-colors">
                Messages
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!loading && !role ? (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/#get-started">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </>
            ) : (
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
