import { useState } from "react";
import { Heart, Home, Building2, MessageSquare, BarChart3, Settings, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface SidebarOption {
  icon: any;
  title: string;
  value: string;
}

const menuItems: SidebarOption[] = [
  { icon: Home, title: "Overview", value: "overview" },
  { icon: Heart, title: "Donations", value: "donations" },
  { icon: Building2, title: "Institutions", value: "institutions" },
  { icon: MessageSquare, title: "Messages", value: "messages" },
  { icon: BarChart3, title: "Analytics", value: "analytics" },
  { icon: Settings, title: "Profile", value: "profile" },
];

interface InvestorSidebarProps {
  selected: string;
  onSelect: (value: string) => void;
  messageCount?: number;
}

export const InvestorSidebar = ({ selected, onSelect, messageCount }: InvestorSidebarProps) => {
  const [open, setOpen] = useState(true);

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
            notifs={item.value === "messages" ? messageCount : undefined}
          />
        ))}
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
              <span className="block text-xs font-semibold">Investor Portal</span>
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
      <Heart className="h-6 w-6 text-primary-foreground" />
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
