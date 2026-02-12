import { FileText, MessageSquare, Image as ImageIcon, Search, ChevronRight, Plus, X, Loader2, Trash2, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
  attachments?: Attachment[];
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
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setEntries((data || []) as unknown as KnowledgeEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    const ext = file.name.split(".").pop();
    const path = `kb-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) { toast.error(`Erro ao enviar ${file.name}`); return null; }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    let type = "document";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("audio/")) type = "audio";
    else if (file.type.startsWith("video/")) type = "video";
    return { name: file.name, url: urlData.publicUrl, type };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const att = await uploadFile(file);
      if (att) setNewAttachments((prev) => [...prev, att]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || (!newContent.trim() && newAttachments.length === 0)) {
      toast.error("Preencha título e conteúdo ou anexe imagens");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("knowledge_entries").insert({
      title: newTitle,
      content: newContent || `[${newAttachments.length} anexo(s)]`,
      source_type: newType,
      attachments: newAttachments,
    } as any);
    if (!error) {
      toast.success("Conhecimento adicionado com sucesso!");
      setNewTitle(""); setNewContent(""); setNewAttachments([]); setShowAddForm(false);
      fetchEntries();
    } else { toast.error("Erro ao salvar"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("knowledge_entries").delete().eq("id", id);
    toast.success("Removido"); fetchEntries();
  };

  const filteredEntries = entries.filter(
    (e) => e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabels: Record<string, string> = { text: "Texto", url: "URL / Site", document: "Documento" };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Base de Conhecimento</h2>
          <p className="text-sm text-muted-foreground mt-1">Adicione textos, prints e arquivos para alimentar a IA</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "Cancelar" : "Adicionar Fonte"}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Nova Fonte de Conhecimento</h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
              <div className="flex gap-2">
                {(["text", "url", "document"] as const).map((t) => (
                  <button key={t} onClick={() => setNewType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newType === t ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Tela de Configuração de Canais" className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{newType === "url" ? "URL" : "Conteúdo"}</label>
              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Cole aqui o texto, regras, procedimentos..." rows={4} className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0 resize-none" />
            </div>

            {/* Image/File Upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">📎 Anexar Imagens / Prints / Arquivos</label>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {uploading ? "Enviando..." : "Selecionar arquivos"}
              </button>

              {newAttachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {newAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {att.type === "image" ? (
                        <img src={att.url} alt={att.name} className="w-16 h-16 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center"><FileText className="w-6 h-6 text-muted-foreground" /></div>
                      )}
                      <span className="text-xs text-card-foreground flex-1 truncate">{att.name}</span>
                      <button onClick={() => setNewAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-destructive/60 hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleAdd} disabled={saving} className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar na Base de Conhecimento"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na base de conhecimento..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{entries.length === 0 ? 'Clique em "Adicionar Fonte" para começar.' : "Nenhum resultado."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry, index) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="glass-card rounded-xl overflow-hidden">
              <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)} className="w-full p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {entry.attachments && entry.attachments.length > 0
                        ? <ImageIcon className="w-5 h-5 text-primary" />
                        : <MessageSquare className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-card-foreground">{entry.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[entry.source_type]} • {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                        {entry.attachments && entry.attachments.length > 0 && ` • ${entry.attachments.length} anexo(s)`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEntry === entry.id ? "rotate-90" : ""}`} />
                </div>
              </button>
              {expandedEntry === entry.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{entry.content.length > 500 ? entry.content.substring(0, 500) + "..." : entry.content}</p>
                  {entry.attachments && entry.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.attachments.map((att: Attachment, i: number) => (
                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                          {att.type === "image" ? (
                            <img src={att.url} alt={att.name} className="w-24 h-24 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                          ) : (
                            <div className="px-3 py-2 rounded-lg bg-muted text-xs text-foreground hover:bg-muted/80">📄 {att.name}</div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  <button onClick={() => handleDelete(entry.id)} className="mt-3 flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80">
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-xl p-4 border-l-4 border-l-primary">
        <p className="text-sm font-semibold text-foreground">🧠 Memória Evolutiva</p>
        <p className="text-xs text-muted-foreground mt-1">Toda informação adicionada aqui (textos, prints, arquivos) será usada pela IA no Chat de Suporte.</p>
      </div>
    </div>
  );
};

export default KnowledgeBase;
