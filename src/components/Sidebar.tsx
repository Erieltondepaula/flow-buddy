import { MessageSquare, BookOpen, AlertTriangle, History, ClipboardList, HelpCircle, Zap, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "chat", label: "Chat Suporte", icon: MessageSquare },
  { id: "kanban", label: "Quadro Kanban", icon: LayoutDashboard },
  { id: "tickets", label: "Tickets", icon: ClipboardList },
  { id: "knowledge", label: "Base de Conhecimento", icon: BookOpen },
  { id: "errors", label: "Erros Comuns", icon: AlertTriangle },
  { id: "history", label: "Soluções Registradas", icon: History },
];

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  return (
    <aside className="w-72 gradient-sidebar flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Suporte IA</h1>
            <p className="text-xs text-sidebar-foreground/50">Central de Atendimento</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors relative ${
                isActive
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl gradient-primary opacity-90"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-accent/30">
          <HelpCircle className="w-5 h-5 text-sidebar-primary" />
          <div>
            <p className="text-xs font-medium text-sidebar-foreground">Precisa de ajuda?</p>
            <p className="text-xs text-sidebar-foreground/50">Central de ajuda</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
