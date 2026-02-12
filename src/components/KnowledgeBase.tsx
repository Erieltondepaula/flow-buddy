import { FileText, MessageSquare, Search, ChevronRight, Plus, X, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
}

const KnowledgeBase = () => {
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"text" | "url" | "document">("text");
  const [saving, setSaving] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar base de conhecimento");
      console.error(error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("knowledge_entries").insert({
      title: newTitle,
      content: newContent,
      source_type: newType,
    });

    if (error) {
      toast.error("Erro ao salvar");
      console.error(error);
    } else {
      toast.success("Conhecimento adicionado com sucesso!");
      setNewTitle("");
      setNewContent("");
      setShowAddForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
    } else {
      toast.success("Removido com sucesso");
      fetchEntries();
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase())
  );

  const typeIcons: Record<string, typeof FileText> = {
    text: MessageSquare,
    url: FileText,
    document: FileText,
  };

  const typeLabels: Record<string, string> = {
    text: "Texto",
    url: "URL / Site",
    document: "Documento",
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Base de Conhecimento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione informações para alimentar a IA do suporte
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "Cancelar" : "Adicionar Fonte"}
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-5 space-y-4"
          >
            <h3 className="font-semibold text-foreground">Nova Fonte de Conhecimento</h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
              <div className="flex gap-2">
                {(["text", "url", "document"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      newType === t
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Regras de Confirmação Automática"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {newType === "url" ? "URL" : "Conteúdo"}
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={
                  newType === "url"
                    ? "https://docs.amigoflow.com/..."
                    : "Cole aqui o texto, regras, procedimentos, informações..."
                }
                rows={6}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0 resize-none"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar na Base de Conhecimento"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar na base de conhecimento..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? 'Nenhuma fonte adicionada ainda. Clique em "Adicionar Fonte" para começar.'
              : "Nenhum resultado encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry, index) => {
            const Icon = typeIcons[entry.source_type] || FileText;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-card-foreground">{entry.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[entry.source_type]} •{" "}
                          {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        expandedEntry === entry.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {expandedEntry === entry.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-4 pb-4 border-t border-border"
                  >
                    <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                      {entry.content.length > 500
                        ? entry.content.substring(0, 500) + "..."
                        : entry.content}
                    </p>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="glass-card rounded-xl p-4 border-l-4 border-l-primary">
        <p className="text-sm font-semibold text-foreground">🧠 Memória Evolutiva</p>
        <p className="text-xs text-muted-foreground mt-1">
          Toda informação adicionada aqui será usada pela IA para responder perguntas no Chat de Suporte. Quanto mais informação você fornecer, mais preciso o suporte será.
        </p>
      </div>
    </div>
  );
};

export default KnowledgeBase;
