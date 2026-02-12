import { FileText, MessageSquare, Image as ImageIcon, Search, ChevronRight, ChevronDown, Plus, X, Loader2, Trash2, Paperclip, Video, Volume2, FolderOpen, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ModuleFilter from "./ModuleFilter";
import { ECOSYSTEM_MODULES } from "@/lib/modules";

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
  module?: string;
  sub_module?: string | null;
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
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("Todos");
  const [newModule, setNewModule] = useState("Geral");
  const [newSubModule, setNewSubModule] = useState("");
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
      toast.error("Preencha título e conteúdo ou anexe arquivos");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("knowledge_entries").insert({
      title: newTitle,
      content: newContent || `[${newAttachments.length} anexo(s)]`,
      source_type: newType,
      attachments: newAttachments,
      module: newModule,
      sub_module: newSubModule.trim() || null,
    } as any);
    if (!error) {
      toast.success("Conhecimento adicionado com sucesso!");
      setNewTitle(""); setNewContent(""); setNewAttachments([]); setShowAddForm(false); setNewModule("Geral"); setNewSubModule("");
      fetchEntries();
    } else { toast.error("Erro ao salvar"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("knowledge_entries").delete().eq("id", id);
    toast.success("Removido"); fetchEntries();
  };

  const filteredEntries = entries.filter(
    (e) => (moduleFilter === "Todos" || e.module === moduleFilter) &&
      (e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase()))
  );

  // Group entries by module, then sub_module
  const groupedByModule = filteredEntries.reduce<Record<string, Record<string, KnowledgeEntry[]>>>((acc, entry) => {
    const mod = entry.module || "Geral";
    const sub = entry.sub_module || "Geral";
    if (!acc[mod]) acc[mod] = {};
    if (!acc[mod][sub]) acc[mod][sub] = [];
    acc[mod][sub].push(entry);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = { text: "Texto", url: "URL / Site", document: "Documento" };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "audio": return <Volume2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const renderAttachment = (att: Attachment, i: number) => {
    if (att.type === "image") {
      return (
        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
          <img src={att.url} alt={att.name} className="w-24 h-24 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
        </a>
      );
    }
    if (att.type === "video") {
      return (
        <div key={i} className="rounded-lg overflow-hidden border border-border">
          <video src={att.url} controls className="w-64 max-h-40 rounded-lg" />
          <p className="text-[10px] text-muted-foreground px-2 py-1 truncate">{att.name}</p>
        </div>
      );
    }
    if (att.type === "audio") {
      return (
        <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <audio src={att.url} controls className="h-8" />
          <span className="text-[10px] text-muted-foreground truncate">{att.name}</span>
        </div>
      );
    }
    return (
      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-muted text-xs text-foreground hover:bg-muted/80 flex items-center gap-2">
        <FileText className="w-4 h-4" /> {att.name}
      </a>
    );
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Base de Conhecimento</h2>
          <p className="text-sm text-muted-foreground mt-1">Organize por módulo e sub-função com textos, vídeos, áudios e imagens</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "Cancelar" : "Adicionar Conhecimento"}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Novo Conhecimento</h3>

            {/* Module + Sub-module row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Módulo</label>
                <select value={newModule} onChange={(e) => setNewModule(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {ECOSYSTEM_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sub-função (opcional)</label>
                <input type="text" value={newSubModule} onChange={(e) => setNewSubModule(e.target.value)} placeholder="Ex: Contas a Pagar, Configuração..." className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

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
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Como configurar Contas a Receber" className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{newType === "url" ? "URL" : "Conteúdo / Descrição detalhada"}</label>
              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Cole aqui toda informação possível: regras, procedimentos, passo-a-passo, dicas..." rows={6} className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0 resize-none" />
            </div>

            {/* Media Upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">📎 Anexar Imagens, Vídeos, Áudios e Documentos</label>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {uploading ? "Enviando..." : "Selecionar arquivos (imagens, vídeos, áudios, docs)"}
              </button>

              {newAttachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {newAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                      {att.type === "image" ? (
                        <img src={att.url} alt={att.name} className="w-14 h-14 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                          {getAttachmentIcon(att.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-card-foreground truncate block">{att.name}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{att.type}</span>
                      </div>
                      <button onClick={() => setNewAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-destructive/60 hover:text-destructive p-1">
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

      {/* Module Filter */}
      <ModuleFilter selected={moduleFilter} onChange={setModuleFilter} />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na base de conhecimento..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : Object.keys(groupedByModule).length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{entries.length === 0 ? 'Clique em "Adicionar Conhecimento" para começar.' : "Nenhum resultado."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByModule).map(([moduleName, subModules]) => (
            <div key={moduleName} className="glass-card rounded-xl overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => setExpandedModule(expandedModule === moduleName ? null : moduleName)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-card-foreground">{moduleName}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {Object.values(subModules).flat().length} entrada(s) • {Object.keys(subModules).length} sub-função(ões)
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedModule === moduleName ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {expandedModule === moduleName && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border">
                    {Object.entries(subModules).map(([subName, subEntries]) => (
                      <div key={subName} className="border-b border-border/50 last:border-b-0">
                        {/* Sub-module header */}
                        <div className="px-5 py-2 bg-muted/20 flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-primary" />
                          <span className="text-xs font-semibold text-primary">{subName}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{subEntries.length}</span>
                        </div>

                        {/* Entries */}
                        {subEntries.map(entry => (
                          <div key={entry.id} className="border-b border-border/30 last:border-b-0">
                            <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)} className="w-full px-6 py-3 text-left hover:bg-muted/20 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    {entry.attachments && entry.attachments.length > 0
                                      ? getAttachmentIcon(entry.attachments[0].type)
                                      : <MessageSquare className="w-4 h-4 text-primary" />
                                    }
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm text-card-foreground">{entry.title}</h4>
                                    <p className="text-[10px] text-muted-foreground">
                                      {typeLabels[entry.source_type]} • {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                                      {entry.attachments && entry.attachments.length > 0 && ` • ${entry.attachments.length} anexo(s)`}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedEntry === entry.id ? "rotate-90" : ""}`} />
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedEntry === entry.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-4">
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content.length > 800 ? entry.content.substring(0, 800) + "..." : entry.content}</p>

                                  {entry.attachments && entry.attachments.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Anexos</p>
                                      <div className="flex flex-wrap gap-2">
                                        {entry.attachments.map((att, i) => renderAttachment(att, i))}
                                      </div>
                                    </div>
                                  )}

                                  <button onClick={() => handleDelete(entry.id)} className="mt-3 flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80">
                                    <Trash2 className="w-3.5 h-3.5" /> Remover
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-xl p-4 border-l-4 border-l-primary">
        <p className="text-sm font-semibold text-foreground">🧠 Memória Evolutiva</p>
        <p className="text-xs text-muted-foreground mt-1">Organize por módulo e sub-função. Adicione textos, prints, vídeos e áudios. Toda informação será usada pela IA no Chat de Suporte.</p>
      </div>
    </div>
  );
};

export default KnowledgeBase;
