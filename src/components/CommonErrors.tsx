import { AlertTriangle, CheckCircle2, ArrowRight, Plus, X, Loader2, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ModuleFilter from "./ModuleFilter";
import { ECOSYSTEM_MODULES } from "@/lib/modules";

interface ErrorEntry {
  id: string;
  title: string;
  description: string;
  solution: string;
  severity: string;
  checklist: string[];
  module: string;
  created_at: string;
}

const severityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-info/10 text-info border-info/20",
};
const severityLabels: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

const CommonErrors = () => {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState("Todos");
  const [showAdd, setShowAdd] = useState(false);
  const [editingError, setEditingError] = useState<ErrorEntry | null>(null);
  const [form, setForm] = useState({ title: "", description: "", solution: "", severity: "medium", module: "Geral", checklist: "" });
  const [saving, setSaving] = useState(false);

  const fetchErrors = async () => {
    setLoading(true);
    const { data } = await supabase.from("common_errors").select("*").order("created_at", { ascending: false });
    setErrors((data || []).map((e: any) => ({ ...e, checklist: Array.isArray(e.checklist) ? e.checklist : JSON.parse(e.checklist || "[]") })));
    setLoading(false);
  };

  useEffect(() => { fetchErrors(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.solution.trim()) { toast.error("Preencha título e solução"); return; }
    setSaving(true);
    const checklist = form.checklist.split("\n").map(s => s.trim()).filter(Boolean);
    const payload = { title: form.title, description: form.description, solution: form.solution, severity: form.severity, module: form.module, checklist };

    if (editingError) {
      await supabase.from("common_errors").update(payload as any).eq("id", editingError.id);
      toast.success("Erro atualizado");
    } else {
      await (supabase.from("common_errors") as any).insert(payload);
      toast.success("Erro cadastrado");
    }
    setForm({ title: "", description: "", solution: "", severity: "medium", module: "Geral", checklist: "" });
    setShowAdd(false);
    setEditingError(null);
    setSaving(false);
    fetchErrors();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("common_errors").delete().eq("id", id);
    toast.success("Removido");
    fetchErrors();
  };

  const startEdit = (err: ErrorEntry) => {
    setEditingError(err);
    setForm({ title: err.title, description: err.description, solution: err.solution, severity: err.severity, module: err.module, checklist: err.checklist.join("\n") });
    setShowAdd(true);
  };

  const filtered = errors.filter(e => moduleFilter === "Todos" || e.module === moduleFilter);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Erros Comuns</h2>
          <p className="text-sm text-muted-foreground mt-1">Soluções validadas para os problemas mais frequentes</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditingError(null); setForm({ title: "", description: "", solution: "", severity: "medium", module: "Geral", checklist: "" }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "Cancelar" : "Cadastrar Erro"}
        </button>
      </div>

      {/* Module Filter */}
      <ModuleFilter selected={moduleFilter} onChange={setModuleFilter} />

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground">{editingError ? "Editar Erro" : "Novo Erro Comum"}</h3>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do erro..." className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição detalhada..." rows={2} className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="Solução..." rows={2} className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Severidade</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Módulo</label>
                <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {ECOSYSTEM_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Checklist (um item por linha)</label>
              <textarea value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} placeholder="Item 1&#10;Item 2&#10;Item 3" rows={3} className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingError ? "Salvar Alterações" : "Cadastrar"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum erro cadastrado{moduleFilter !== "Todos" ? ` para ${moduleFilter}` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((error, index) => (
            <motion.div key={error.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-card rounded-xl overflow-hidden">
              <button onClick={() => setExpandedError(expandedError === error.id ? null : error.id)} className="w-full p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm text-card-foreground">{error.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[error.severity]}`}>{severityLabels[error.severity]}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{error.module}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedError === error.id ? "rotate-90" : ""}`} />
                </div>
              </button>
              {expandedError === error.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-4 border-t border-border">
                  {error.description && <p className="text-sm text-muted-foreground mt-3">{error.description}</p>}
                  <p className="text-sm text-foreground mt-2 font-medium">💡 {error.solution}</p>
                  {error.checklist.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground">Checklist:</p>
                      {error.checklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(error)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                    <button onClick={() => handleDelete(error.id)} className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80"><Trash2 className="w-3.5 h-3.5" /> Remover</button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommonErrors;
