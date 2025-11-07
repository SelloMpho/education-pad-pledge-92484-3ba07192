import { useState } from "react";
import { Shield, Users, Building2, GraduationCap, Heart, Settings, Home, ChevronRight, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SidebarOption {
  icon: any;
  title: string;
  value: string;
}

const menuItems: SidebarOption[] = [
  { icon: Home, title: "Overview", value: "overview" },
  { icon: Users, title: "Users", value: "users" },
  { icon: Building2, title: "Organizations", value: "organizations" },
  { icon: GraduationCap, title: "Institutions", value: "institutions" },
  { icon: Heart, title: "Donations", value: "donations" },
  { icon: Settings, title: "Settings", value: "settings" },
];

interface AdminSidebarProps {
  selected: string;
  onSelect: (value: string) => void;
}

export const AdminSidebar = ({ selected, onSelect }: AdminSidebarProps) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.nav
      layout
      className="sticky top-0 h-screen shrink-0 border-r border-border bg-card p-2 flex flex-col"
      style={{
        width: open ? "225px" : "fit-content",
      }}
    >
      <TitleSection open={open} />

      <div className="space-y-1 flex-1">
        {menuItems.map((item) => (
          <Option
            key={item.value}
            Icon={item.icon}
            title={item.title}
            selected={selected}
            setSelected={onSelect}
            open={open}
          />
        ))}
      </div>

      <LogoutButton open={open} onLogout={handleLogout} />
      <ToggleClose open={open} setOpen={setOpen} />
    </motion.nav>
  );
};

interface OptionProps {
  Icon: any;
  title: string;
  selected: string;
  setSelected: (value: string) => void;
  open: boolean;
  notifs?: number;
}

const Option = ({ Icon, title, selected, setSelected, open, notifs }: OptionProps) => {
  const isSelected = selected === title.toLowerCase();
  
  return (
    <motion.button
      layout
      onClick={() => setSelected(title.toLowerCase())}
      className={`relative flex h-10 w-full items-center rounded-md transition-colors ${
        isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <motion.div
        layout
        className="grid h-full w-10 place-content-center text-lg"
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      {open && (
        <motion.span
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.125 }}
          className="text-xs font-medium"
        >
          {title}
        </motion.span>
      )}

      {notifs && open && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          style={{ y: "-50%" }}
          transition={{ delay: 0.5 }}
          className="absolute right-2 top-1/2 size-4 rounded bg-primary text-xs text-primary-foreground flex items-center justify-center"
        >
          {notifs}
        </motion.span>
      )}
    </motion.button>
  );
};

const TitleSection = ({ open }: { open: boolean }) => {
  return (
    <div className="mb-3 border-b border-border pb-3">
      <div className="flex cursor-pointer items-center justify-between rounded-md transition-colors hover:bg-muted p-2">
        <div className="flex items-center gap-2">
          <Logo />
          {open && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.125 }}
            >
              <span className="block text-xs font-semibold">Admin Panel</span>
              <span className="block text-xs text-muted-foreground">PadForward</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <motion.div
      layout
      className="grid size-10 shrink-0 place-content-center rounded-md bg-primary"
    >
      <Shield className="h-6 w-6 text-primary-foreground" />
    </motion.div>
  );
};

const LogoutButton = ({ open, onLogout }: { open: boolean; onLogout: () => void }) => {
  return (
    <motion.button
      layout
      onClick={onLogout}
      className="w-full border-t border-border transition-colors hover:bg-destructive/10 text-destructive"
    >
      <div className="flex items-center p-2">
        <motion.div
          layout
          className="grid size-10 place-content-center text-lg"
        >
          <LogOut className="h-5 w-5" />
        </motion.div>
        {open && (
          <motion.span
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.125 }}
            className="text-xs font-medium"
          >
            Logout
          </motion.span>
        )}
      </div>
    </motion.button>
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  return (
    <motion.button
      layout
      onClick={() => setOpen(!open)}
      className="w-full border-t border-border transition-colors hover:bg-muted"
    >
      <div className="flex items-center p-2">
        <motion.div
          layout
          className="grid size-10 place-content-center text-lg"
        >
          <ChevronRight
            className={`transition-transform h-5 w-5 ${open && "rotate-180"}`}
          />
        </motion.div>
        {open && (
          <motion.span
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.125 }}
            className="text-xs font-medium"
          >
            Collapse
          </motion.span>
        )}
      </div>
    </motion.button>
  );
};
