import { ClipboardList, CheckCircle2, AlertTriangle, Clock, ChevronRight, Loader2, Bot, User, ArrowLeft, MessageSquare, Pencil, Trash2, Save, X, Merge, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

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

interface DuplicateGroup {
  tickets: Ticket[];
  keyword: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  open: { icon: Clock, label: "Aberto", color: "bg-info/10 text-info border-info/20" },
  resolved: { icon: CheckCircle2, label: "Resolvido", color: "bg-success/10 text-success border-success/20" },
  escalated: { icon: AlertTriangle, label: "Escalado", color: "bg-warning/10 text-warning border-warning/20" },
};

// Simple similarity: extract significant words and compare overlap
function getSignificantWords(text: string): string[] {
  const stopWords = new Set(["o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "um", "uma", "e", "ou", "que", "para", "com", "por", "se", "ao", "este", "esta", "esse", "essa", "este", "não", "eu", "ele", "ela", "nós", "eles", "elas", "meu", "sua", "seu", "ter", "ser", "está", "foi", "isso", "como", "mais"]);
  return text.toLowerCase().replace(/[^a-záàâãéèêíìîóòôõúùûç\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
}

function areSimilar(a: string, b: string): boolean {
  const wordsA = getSignificantWords(a);
  const wordsB = getSignificantWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const setB = new Set(wordsB);
  const overlap = wordsA.filter(w => setB.has(w)).length;
  const similarity = overlap / Math.max(wordsA.length, wordsB.length);
  return similarity >= 0.5;
}

function findDuplicateGroups(tickets: Ticket[]): DuplicateGroup[] {
  const used = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < tickets.length; i++) {
    if (used.has(tickets[i].id)) continue;
    const group: Ticket[] = [tickets[i]];
    for (let j = i + 1; j < tickets.length; j++) {
      if (used.has(tickets[j].id)) continue;
      if (
        areSimilar(tickets[i].title + " " + tickets[i].error_description, tickets[j].title + " " + tickets[j].error_description)
      ) {
        group.push(tickets[j]);
        used.add(tickets[j].id);
      }
    }
    if (group.length > 1) {
      used.add(tickets[i].id);
      const keyword = getSignificantWords(tickets[i].title).slice(0, 3).join(" ");
      groups.push({ tickets: group, keyword });
    }
  }
  return groups;
}

const TicketsPanel = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [conversationMsgs, setConversationMsgs] = useState<ConversationMsg[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");
  const [editSolution, setEditSolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

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

  // All tickets for counts
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      setAllTickets(data || []);
    };
    fetchAll();
  }, [tickets]);

  const duplicateGroups = useMemo(() => findDuplicateGroups(allTickets), [allTickets]);

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditing(false);
    setLoadingConv(true);

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

  const startEdit = () => {
    if (!selectedTicket) return;
    setEditTitle(selectedTicket.title);
    setEditError(selectedTicket.error_description);
    setEditSolution(selectedTicket.solution_description || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selectedTicket) return;
    setSaving(true);
    const updates: any = {
      title: editTitle,
      error_description: editError,
    };
    if (editSolution.trim()) {
      updates.solution_description = editSolution;
    }
    const { error } = await supabase.from("support_tickets").update(updates).eq("id", selectedTicket.id);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Ticket atualizado!");
      setSelectedTicket({ ...selectedTicket, ...updates });
      setEditing(false);
      fetchTickets();
    }
    setSaving(false);
  };

  const deleteTicket = async (id: string) => {
    // Also clean up conversation link
    await supabase.from("conversations").update({ ticket_id: null }).eq("ticket_id", id);
    const { error } = await supabase.from("support_tickets").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover ticket");
    } else {
      toast.success("Ticket removido!");
      if (selectedTicket?.id === id) setSelectedTicket(null);
      setConfirmDelete(null);
      fetchTickets();
    }
  };

  const mergeTickets = async (group: DuplicateGroup) => {
    setMerging(true);
    // Keep the oldest ticket, merge info from newer ones, delete duplicates
    const sorted = [...group.tickets].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const keeper = sorted[0];
    const others = sorted.slice(1);

    // Merge error descriptions and solutions
    let mergedError = keeper.error_description;
    let mergedSolution = keeper.solution_description || "";
    const bestStatus = sorted.find(t => t.status === "resolved")?.status || keeper.status;

    for (const t of others) {
      if (t.error_description && !mergedError.includes(t.error_description)) {
        mergedError += `\n\n---\n[Unificado de "${t.title}"]\n${t.error_description}`;
      }
      if (t.solution_description && !mergedSolution.includes(t.solution_description)) {
        mergedSolution += (mergedSolution ? "\n\n---\n" : "") + `[De "${t.title}"]\n${t.solution_description}`;
      }
    }

    await supabase.from("support_tickets").update({
      error_description: mergedError,
      solution_description: mergedSolution || null,
      status: bestStatus,
    }).eq("id", keeper.id);

    // Delete duplicates
    for (const t of others) {
      await supabase.from("conversations").update({ ticket_id: keeper.id }).eq("ticket_id", t.id);
      await supabase.from("support_tickets").delete().eq("id", t.id);
    }

    toast.success(`${others.length} ticket(s) duplicado(s) unificados!`);
    setMerging(false);
    fetchTickets();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatTime = (date: string) =>
    new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

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
          <button onClick={() => { setSelectedTicket(null); setEditing(false); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-semibold bg-secondary text-secondary-foreground rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <h2 className="text-lg font-semibold text-foreground truncate">{selectedTicket.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>{config.label}</span>
              <span className="text-xs text-muted-foreground">{formatDate(selectedTicket.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <button onClick={saveEdit} disabled={saving} className="p-2 rounded-lg text-success hover:bg-success/10 transition-colors" title="Salvar">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                </button>
                <button onClick={() => setEditing(false)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors" title="Cancelar">
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button onClick={startEdit} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setConfirmDelete(selectedTicket.id)} className="p-2 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        <AnimatePresence>
          {confirmDelete === selectedTicket.id && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-6 py-3 bg-destructive/5 border-b border-destructive/20 flex items-center justify-between">
              <p className="text-sm text-destructive">Remover este ticket permanentemente?</p>
              <div className="flex gap-2">
                <button onClick={() => deleteTicket(selectedTicket.id)} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">Sim, remover</button>
                <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs">Cancelar</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info cards */}
        <div className="px-6 py-4 border-b border-border bg-card/50 space-y-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground mb-1">🔴 Erro Registrado</p>
            {editing ? (
              <textarea
                value={editError}
                onChange={(e) => setEditError(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{selectedTicket.error_description}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1">📅 {formatDate(selectedTicket.error_registered_at)}</p>
          </div>
          {(selectedTicket.solution_description || editing) && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs font-semibold text-success mb-1">✅ Solução Aplicada</p>
              {editing ? (
                <textarea
                  value={editSolution}
                  onChange={(e) => setEditSolution(e.target.value)}
                  rows={3}
                  placeholder="Descreva a solução..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{selectedTicket.solution_description}</p>
              )}
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

      {/* Duplicate detection banner */}
      {duplicateGroups.length > 0 && (
        <div className="space-y-2">
          {duplicateGroups.map((group, gi) => (
            <motion.div
              key={gi}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/20"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Link2 className="w-4 h-4 text-warning flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {group.tickets.length} tickets similares detectados
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {group.tickets.map(t => `"${t.title}"`).join(", ")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => mergeTickets(group)}
                disabled={merging}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
                Unificar
              </button>
            </motion.div>
          ))}
        </div>
      )}

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
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-card rounded-xl overflow-hidden group"
              >
                <div className="flex items-center">
                  <button
                    onClick={() => openTicketDetail(ticket)}
                    className="flex-1 p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-card-foreground truncate">{ticket.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>{config.label}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{ticket.error_description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openTicketDetail(ticket).then(() => startEdit()); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmDelete === ticket.id) {
                          deleteTicket(ticket.id);
                        } else {
                          setConfirmDelete(ticket.id);
                          setTimeout(() => setConfirmDelete(null), 3000);
                        }
                      }}
                      className={`p-1.5 rounded-md transition-colors ${confirmDelete === ticket.id ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
                      title={confirmDelete === ticket.id ? "Clique de novo para confirmar" : "Remover"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketsPanel;
