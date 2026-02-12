import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, MoreHorizontal, Pencil, Trash2, Archive, ArchiveRestore, GripVertical, Calendar, Users, MessageSquare, ClipboardList, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  description: string;
  label: string | null;
  label_color: string | null;
  start_date: string | null;
  due_date: string | null;
  group_name: string | null;
  conversation_id: string | null;
  ticket_id: string | null;
  position: number;
  archived: boolean;
  created_at: string;
}

interface KanbanColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
  color: string | null;
}

const LABEL_COLORS = [
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Verde", value: "#22c55e" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
];

const BOARD_ID = "00000000-0000-0000-0000-000000000001";

const KanbanBoard = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState("");
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [tickets, setTickets] = useState<{ id: string; title: string }[]>([]);

  const fetchData = useCallback(async () => {
    const [colRes, cardRes, convRes, tickRes] = await Promise.all([
      supabase.from("kanban_columns").select("*").eq("board_id", BOARD_ID).order("position"),
      supabase.from("kanban_cards").select("*").order("position"),
      supabase.from("conversations").select("id, title").order("updated_at", { ascending: false }),
      supabase.from("support_tickets").select("id, title").order("created_at", { ascending: false }),
    ]);
    setColumns((colRes.data as any[]) || []);
    setCards((cardRes.data as any[]) || []);
    setConversations(convRes.data || []);
    setTickets(tickRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // === Column CRUD ===
  const addColumn = async () => {
    if (!newColumnTitle.trim()) return;
    const pos = columns.length;
    await (supabase.from("kanban_columns") as any).insert({ board_id: BOARD_ID, title: newColumnTitle.trim(), position: pos });
    setNewColumnTitle("");
    setAddingColumn(false);
    fetchData();
  };

  const updateColumn = async (id: string, title: string) => {
    await supabase.from("kanban_columns").update({ title } as any).eq("id", id);
    setEditingColumn(null);
    fetchData();
  };

  const deleteColumn = async (id: string) => {
    const colCards = cards.filter(c => c.column_id === id);
    if (colCards.length > 0) { toast.error("Remova todos os cards desta coluna primeiro"); return; }
    await supabase.from("kanban_columns").delete().eq("id", id);
    fetchData();
    toast.success("Coluna removida");
  };

  // === Card CRUD ===
  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    const colCards = cards.filter(c => c.column_id === columnId && !c.archived);
    await (supabase.from("kanban_cards") as any).insert({
      column_id: columnId,
      title: newCardTitle.trim(),
      position: colCards.length,
    });
    setNewCardTitle("");
    setAddingCardCol(null);
    fetchData();
    toast.success("Card criado");
  };

  const updateCard = async (card: KanbanCard) => {
    await supabase.from("kanban_cards").update({
      title: card.title,
      description: card.description,
      label: card.label,
      label_color: card.label_color,
      start_date: card.start_date,
      due_date: card.due_date,
      group_name: card.group_name,
      conversation_id: card.conversation_id,
      ticket_id: card.ticket_id,
    } as any).eq("id", card.id);
    setEditingCard(null);
    fetchData();
    toast.success("Card atualizado");
  };

  const deleteCard = async (id: string) => {
    await supabase.from("kanban_cards").delete().eq("id", id);
    setEditingCard(null);
    fetchData();
    toast.success("Card removido");
  };

  const toggleArchive = async (card: KanbanCard) => {
    await supabase.from("kanban_cards").update({ archived: !card.archived } as any).eq("id", card.id);
    setEditingCard(null);
    fetchData();
    toast.success(card.archived ? "Card restaurado" : "Card arquivado");
  };

  // === Drag & Drop ===
  const handleDragStart = (cardId: string) => setDraggedCard(cardId);
  const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOverCol(colId); };
  const handleDragLeave = () => setDragOverCol(null);
  const handleDrop = async (colId: string) => {
    if (!draggedCard) return;
    const card = cards.find(c => c.id === draggedCard);
    if (!card || card.column_id === colId) { setDraggedCard(null); setDragOverCol(null); return; }
    const colCards = cards.filter(c => c.column_id === colId && !c.archived);
    await supabase.from("kanban_cards").update({ column_id: colId, position: colCards.length } as any).eq("id", draggedCard);
    setDraggedCard(null);
    setDragOverCol(null);
    fetchData();
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;
  const isOverdue = (d: string | null) => d ? new Date(d) < new Date() : false;

  const filteredCards = (colId: string) => cards.filter(c => c.column_id === colId && (showArchived ? c.archived : !c.archived));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">📋 Quadro Kanban</h2>
          <p className="text-xs text-muted-foreground">{columns.length} colunas • {cards.filter(c => !c.archived).length} cards ativos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showArchived ? "bg-warning/10 text-warning" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? "Ver ativos" : "Arquivados"}
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full items-start">
          {columns.map(col => (
            <div
              key={col.id}
              className={`w-72 flex-shrink-0 rounded-xl bg-card border transition-colors flex flex-col max-h-full ${dragOverCol === col.id ? "border-primary border-2" : "border-border"}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column Header */}
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.color || "#6b7280" }} />
                  {editingColumn === col.id ? (
                    <input
                      value={editColTitle}
                      onChange={(e) => setEditColTitle(e.target.value)}
                      onBlur={() => updateColumn(col.id, editColTitle)}
                      onKeyDown={(e) => e.key === "Enter" && updateColumn(col.id, editColTitle)}
                      autoFocus
                      className="text-sm font-semibold text-foreground bg-transparent border-b border-primary focus:outline-none flex-1"
                    />
                  ) : (
                    <h3 className="text-sm font-semibold text-foreground truncate">{col.title}</h3>
                  )}
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{filteredCards(col.id).length}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { setEditingColumn(col.id); setEditColTitle(col.title); }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteColumn(col.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                <AnimatePresence>
                  {filteredCards(col.id).sort((a, b) => a.position - b.position).map(card => (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: draggedCard === card.id ? 0.5 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable
                      onDragStart={() => handleDragStart(card.id)}
                      onDragEnd={() => { setDraggedCard(null); setDragOverCol(null); }}
                      onClick={() => setEditingCard({ ...card })}
                      className="bg-secondary rounded-lg p-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group"
                    >
                      {card.label_color && (
                        <div className="w-full h-1.5 rounded-full mb-2" style={{ backgroundColor: card.label_color }} />
                      )}
                      {card.label && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white mb-1.5 inline-block" style={{ backgroundColor: card.label_color || "#6b7280" }}>
                          {card.label}
                        </span>
                      )}
                      <p className="text-sm font-medium text-secondary-foreground leading-snug">{card.title}</p>
                      {card.group_name && (
                        <p className="text-[10px] text-primary/70 mt-1 flex items-center gap-1"><Users className="w-3 h-3" />{card.group_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {card.due_date && (
                          <span className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded ${isOverdue(card.due_date) ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(card.start_date)} - {formatDate(card.due_date)}
                            {isOverdue(card.due_date) && " Em Atraso"}
                          </span>
                        )}
                        {card.conversation_id && <MessageSquare className="w-3 h-3 text-primary/50" />}
                        {card.ticket_id && <ClipboardList className="w-3 h-3 text-warning/50" />}
                        {card.description && <span className="text-[10px] text-muted-foreground">≡</span>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add Card */}
              {!showArchived && (
                <div className="p-2 border-t border-border">
                  {addingCardCol === col.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(col.id); } }}
                        placeholder="Título do card..."
                        autoFocus
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => addCard(col.id)} className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">Adicionar</button>
                        <button onClick={() => { setAddingCardCol(null); setNewCardTitle(""); }} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingCardCol(col.id)} className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Adicionar um cartão
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Column */}
          <div className="w-72 flex-shrink-0">
            {addingColumn ? (
              <div className="bg-card border border-border rounded-xl p-3 space-y-2">
                <input
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addColumn()}
                  placeholder="Título da coluna..."
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <button onClick={addColumn} className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">Adicionar</button>
                  <button onClick={() => { setAddingColumn(false); setNewColumnTitle(""); }} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs">Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingColumn(true)} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-card/50 border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                <Plus className="w-4 h-4" /> Adicionar coluna
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {editingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto"
            onClick={() => setEditingCard(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl w-full max-w-2xl mb-16 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{columns.find(c => c.id === editingCard.column_id)?.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleArchive(editingCard)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" title={editingCard.archived ? "Restaurar" : "Arquivar"}>
                    {editingCard.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { if (confirm("Remover este card permanentemente?")) deleteCard(editingCard.id); }} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingCard(null)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Title */}
                <input
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  className="w-full text-xl font-bold text-foreground bg-transparent focus:outline-none border-b border-transparent focus:border-primary/30 pb-1"
                  placeholder="Título do card"
                />

                {/* Label */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Etiqueta</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={editingCard.label || ""}
                      onChange={(e) => setEditingCard({ ...editingCard, label: e.target.value || null })}
                      placeholder="Ex: DANILO, ISABELA..."
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-1">
                      {LABEL_COLORS.map(lc => (
                        <button key={lc.value} onClick={() => setEditingCard({ ...editingCard, label_color: lc.value })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${editingCard.label_color === lc.value ? "border-white scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: lc.value }}
                          title={lc.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Data início</label>
                    <input
                      type="date"
                      value={editingCard.start_date ? editingCard.start_date.split("T")[0] : ""}
                      onChange={(e) => setEditingCard({ ...editingCard, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Data entrega</label>
                    <input
                      type="date"
                      value={editingCard.due_date ? editingCard.due_date.split("T")[0] : ""}
                      onChange={(e) => setEditingCard({ ...editingCard, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
                  <input
                    value={editingCard.group_name || ""}
                    onChange={(e) => setEditingCard({ ...editingCard, group_name: e.target.value || null })}
                    placeholder="Nome do grupo do cliente..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
                  <textarea
                    value={editingCard.description || ""}
                    onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                    rows={4}
                    placeholder="Descreva o acompanhamento do cliente..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {/* Linked Conversation */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vincular Conversa</label>
                  <select
                    value={editingCard.conversation_id || ""}
                    onChange={(e) => setEditingCard({ ...editingCard, conversation_id: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Nenhuma</option>
                    {conversations.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                {/* Linked Ticket */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vincular Ticket</label>
                  <select
                    value={editingCard.ticket_id || ""}
                    onChange={(e) => setEditingCard({ ...editingCard, ticket_id: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Nenhum</option>
                    {tickets.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>

                {/* Move to column */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mover para coluna</label>
                  <select
                    value={editingCard.column_id}
                    onChange={(e) => setEditingCard({ ...editingCard, column_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                {/* Save */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => updateCard(editingCard)} className="flex-1 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                    Salvar alterações
                  </button>
                  <button onClick={() => setEditingCard(null)} className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-muted">
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KanbanBoard;
