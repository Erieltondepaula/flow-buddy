import { ClipboardList, CheckCircle2, AlertTriangle, Clock, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  open: { icon: Clock, label: "Aberto", color: "bg-info/10 text-info border-info/20" },
  resolved: { icon: CheckCircle2, label: "Resolvido", color: "bg-success/10 text-success border-success/20" },
  escalated: { icon: AlertTriangle, label: "Escalado", color: "bg-warning/10 text-warning border-warning/20" },
};

const TicketsPanel = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    escalated: tickets.filter((t) => t.status === "escalated").length,
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tickets Catalogados</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Erros e soluções registrados automaticamente
        </p>
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
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum ticket registrado ainda. Os tickets são criados automaticamente durante o chat.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, index) => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-card-foreground truncate">
                          {ticket.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                        expandedTicket === ticket.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedTicket === ticket.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 border-t border-border space-y-3"
                    >
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-foreground mb-1">🔴 Erro Registrado</p>
                        <p className="text-sm text-muted-foreground">{ticket.error_description}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          📅 {formatDate(ticket.error_registered_at)}
                        </p>
                      </div>

                      {ticket.solution_description && (
                        <div>
                          <p className="text-xs font-semibold text-success mb-1">✅ Solução</p>
                          <p className="text-sm text-muted-foreground">{ticket.solution_description}</p>
                          {ticket.solution_registered_at && (
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              📅 {formatDate(ticket.solution_registered_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {ticket.status === "escalated" && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/20">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <p className="text-xs text-warning">Encaminhado para equipe de desenvolvimento</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketsPanel;
