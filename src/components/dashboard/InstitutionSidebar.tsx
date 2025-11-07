import { useState } from "react";
import { GraduationCap, Home, Activity, FileText, BarChart3, Settings, ChevronRight, MessageSquare, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SidebarOption {
  icon: any;
  title: string;
  value: string;
}

const menuItems: SidebarOption[] = [
  { icon: Home, title: "Overview", value: "overview" },
  { icon: Activity, title: "Donations", value: "donations" },
  { icon: MessageSquare, title: "Messages", value: "messages" },
  { icon: FileText, title: "Reports", value: "reports" },
  { icon: BarChart3, title: "Analytics", value: "analytics" },
  { icon: Settings, title: "Profile", value: "profile" },
];

interface InstitutionSidebarProps {
  selected: string;
  onSelect: (value: string) => void;
  pendingCount?: number;
  messageCount?: number;
}

export const InstitutionSidebar = ({ selected, onSelect, pendingCount, messageCount }: InstitutionSidebarProps) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate('/');
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <motion.nav
      layout
      className="sticky top-0 h-screen shrink-0 border-r border-border bg-card p-2"
      style={{
        width: open ? "225px" : "fit-content",
      }}
    >
      <TitleSection open={open} />

      <div className="space-y-1">
        {menuItems.map((item) => (
          <Option
            key={item.value}
            Icon={item.icon}
            title={item.title}
            selected={selected}
            setSelected={onSelect}
            open={open}
            notifs={
              item.value === "donations" 
                ? pendingCount 
                : item.value === "messages" 
                ? messageCount 
                : undefined
            }
          />
        ))}
      </div>

      <div className="mt-auto">
        <motion.button
          layout
          onClick={handleLogout}
          className="relative flex h-10 w-full items-center rounded-md transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <motion.div
            layout
            className="grid h-full w-10 place-content-center text-lg"
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
        </motion.button>
      </div>

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

      {notifs !== undefined && notifs > 0 && open && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          style={{ y: "-50%" }}
          transition={{ delay: 0.5 }}
          className="absolute right-2 top-1/2 size-5 rounded bg-primary text-xs text-primary-foreground flex items-center justify-center font-medium"
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
              <span className="block text-xs font-semibold">Institution Hub</span>
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
      <GraduationCap className="h-6 w-6 text-primary-foreground" />
    </motion.div>
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  return (
    <motion.button
      layout
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-border transition-colors hover:bg-muted"
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
