import { ClipboardList, CheckCircle2, AlertTriangle, Clock, ChevronRight, Loader2, Bot, User, ArrowLeft, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Ticket {
  id: string;
  title: string;
  status: string;
  error_description: string;
  solution_description: string | null;
  error_registered_at: string;
  solution_registered_at: string | null;
  resolved_at: string | null;
  created_at: string;
  conversation: any;
}

interface ConversationMsg {
  id: string;
  role: string;
  content: string;
  created_at: string;
  attachments?: any[];
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  open: { icon: Clock, label: "Aberto", color: "bg-info/10 text-info border-info/20" },
  resolved: { icon: CheckCircle2, label: "Resolvido", color: "bg-success/10 text-success border-success/20" },
  escalated: { icon: AlertTriangle, label: "Escalado", color: "bg-warning/10 text-warning border-warning/20" },
};

const TicketsPanel = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [conversationMsgs, setConversationMsgs] = useState<ConversationMsg[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (!error) setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingConv(true);

    // Try to load from conversation_messages via conversations table
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .eq("ticket_id", ticket.id)
      .limit(1);

    if (convs && convs.length > 0) {
      const { data: msgs } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", convs[0].id)
        .order("created_at", { ascending: true });
      setConversationMsgs((msgs || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at, attachments: m.attachments as any[] })));
    } else if (ticket.conversation && Array.isArray(ticket.conversation)) {
      // Fallback to embedded conversation in ticket
      setConversationMsgs(
        (ticket.conversation as any[]).map((m, i) => ({
          id: String(i),
          role: m.role,
          content: m.content,
          created_at: ticket.created_at,
        }))
      );
    } else {
      setConversationMsgs([]);
    }
    setLoadingConv(false);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatTime = (date: string) =>
    new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  // Compute counts from unfiltered tickets
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from("support_tickets").select("*");
      setAllTickets(data || []);
    };
    fetchAll();
  }, [tickets]);

  const counts = {
    all: allTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    resolved: allTickets.filter((t) => t.status === "resolved").length,
    escalated: allTickets.filter((t) => t.status === "escalated").length,
  };

  // Detail view
  if (selectedTicket) {
    const config = statusConfig[selectedTicket.status] || statusConfig.open;
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3">
          <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{selectedTicket.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>{config.label}</span>
              <span className="text-xs text-muted-foreground">{formatDate(selectedTicket.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="px-6 py-4 border-b border-border bg-card/50 space-y-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground mb-1">🔴 Erro Registrado</p>
            <p className="text-sm text-muted-foreground">{selectedTicket.error_description}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">📅 {formatDate(selectedTicket.error_registered_at)}</p>
          </div>
          {selectedTicket.solution_description && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs font-semibold text-success mb-1">✅ Solução Aplicada</p>
              <p className="text-sm text-muted-foreground">{selectedTicket.solution_description}</p>
              {selectedTicket.solution_registered_at && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">📅 {formatDate(selectedTicket.solution_registered_at)}</p>
              )}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Conversa Completa</h3>
            <span className="text-xs text-muted-foreground">({conversationMsgs.length} mensagens)</span>
          </div>

          {loadingConv ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : conversationMsgs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem registrada para este ticket.</p>
          ) : (
            conversationMsgs.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className="max-w-[75%] space-y-1">
                  {msg.attachments && (msg.attachments as any[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(msg.attachments as any[]).map((att: any, i: number) => (
                        <div key={i} className="rounded-lg overflow-hidden border border-border">
                          {att.type === "image" ? (
                            <img src={att.url} alt={att.name} className="max-w-[180px] max-h-[120px] object-cover" />
                          ) : (
                            <div className="px-2 py-1 bg-card text-xs text-card-foreground">{att.name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-card-foreground rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  <p className={`text-[10px] ${msg.role === "user" ? "text-right" : ""} text-muted-foreground/60`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tickets Catalogados</h2>
        <p className="text-sm text-muted-foreground mt-1">Erros e soluções registrados automaticamente</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "all", label: "Todos", count: counts.all },
          { key: "open", label: "Abertos", count: counts.open },
          { key: "resolved", label: "Resolvidos", count: counts.resolved },
          { key: "escalated", label: "Escalados", count: counts.escalated },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`p-3 rounded-xl text-center transition-all text-xs font-medium ${
              filter === f.key
                ? "gradient-primary text-primary-foreground"
                : "glass-card text-card-foreground hover:bg-muted"
            }`}
          >
            <p className="text-lg font-bold">{f.count}</p>
            <p>{f.label}</p>
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum ticket registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, index) => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = config.icon;

            return (
              <motion.button
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => openTicketDetail(ticket)}
                className="w-full glass-card rounded-xl p-4 text-left hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusIcon className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-card-foreground truncate">{ticket.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{ticket.error_description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketsPanel;
