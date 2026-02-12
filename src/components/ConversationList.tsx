import { MessageSquare, Plus, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Conversation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ConversationListProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
}

const statusIcons: Record<string, typeof CheckCircle2> = {
  active: Clock,
  resolved: CheckCircle2,
  escalated: AlertTriangle,
};

const statusLabels: Record<string, string> = {
  active: "Ativa",
  resolved: "Resolvida",
  escalated: "Escalada",
};

const statusColors: Record<string, string> = {
  active: "text-info",
  resolved: "text-success",
  escalated: "text-warning",
};

const ConversationList = ({ activeConversationId, onSelectConversation }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Listen for updates
    const channel = supabase
      .channel("conversations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Expose refetch
  useEffect(() => {
    (window as any).__refetchConversations = fetchConversations;
    return () => { delete (window as any).__refetchConversations; };
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-72 border-r border-border bg-card h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Conversas</h3>
        <button
          onClick={() => onSelectConversation(null)}
          className="p-2 rounded-lg gradient-primary text-primary-foreground hover:opacity-90"
          title="Nova conversa"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const StatusIcon = statusIcons[conv.status] || Clock;
              return (
                <motion.button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusColors[conv.status]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(conv.updated_at)}</span>
                        <span className={`text-xs ${statusColors[conv.status]}`}>{statusLabels[conv.status]}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
