import { CheckCircle2, Brain, TrendingUp, Plus, Loader2, Trash2, ArrowLeft, ChevronRight, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import ModuleFilter from "./ModuleFilter";
import { ECOSYSTEM_MODULES } from "@/lib/modules";

interface Solution {
  id: string;
  problem: string;
  solution: string;
  confirmed_at: string;
  usage_count: number;
  module?: string;
}

const SolutionHistory = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProblem, setNewProblem] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [moduleFilter, setModuleFilter] = useState("Todos");
  const [newModule, setNewModule] = useState("Geral");

  const fetchSolutions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("confirmed_solutions")
      .select("*")
      .order("usage_count", { ascending: false });

    if (!error) setSolutions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSolutions();
  }, []);

  const handleAdd = async () => {
    if (!newProblem.trim() || !newSolution.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("confirmed_solutions").insert({
      problem: newProblem,
      solution: newSolution,
      module: newModule,
    } as any);
    if (!error) {
      toast.success("Solução registrada!");
      setNewProblem("");
      setNewSolution("");
      setShowAdd(false);
      fetchSolutions();
    } else {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("confirmed_solutions").delete().eq("id", id);
    if (selectedSolution?.id === id) setSelectedSolution(null);
    fetchSolutions();
  };
  const filteredSolutions = solutions.filter(s => moduleFilter === "Todos" || s.module === moduleFilter);
  const totalUsage = filteredSolutions.reduce((acc, s) => acc + s.usage_count, 0);

  // Detail view
  if (selectedSolution) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3">
          <button onClick={() => setSelectedSolution(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Detalhes da Solução</h2>
            <p className="text-xs text-muted-foreground">
              Registrada em {new Date(selectedSolution.confirmed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            {selectedSolution.usage_count}x usada
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-xs">🔴</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">Problema Identificado</h3>
            </div>
            <div className="prose prose-sm max-w-none text-card-foreground">
              <ReactMarkdown>{selectedSolution.problem}</ReactMarkdown>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Solução Confirmada</h3>
            </div>
            <div className="prose prose-sm max-w-none text-card-foreground">
              <ReactMarkdown>{selectedSolution.solution}</ReactMarkdown>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleDelete(selectedSolution.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Remover Solução
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Soluções Registradas</h2>
          <p className="text-sm text-muted-foreground mt-1">Memória evolutiva da IA</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Registrar Solução
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5 space-y-3">
          <input value={newProblem} onChange={(e) => setNewProblem(e.target.value)} placeholder="Descreva o problema..." className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0" />
          <input value={newSolution} onChange={(e) => setNewSolution(e.target.value)} placeholder="Descreva a solução confirmada..." className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0" />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Módulo</label>
            <select value={newModule} onChange={(e) => setNewModule(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {ECOSYSTEM_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving} className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </motion.div>
      )}

      {/* Module Filter */}
      <ModuleFilter selected={moduleFilter} onChange={setModuleFilter} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{filteredSolutions.length}</p>
          <p className="text-xs text-muted-foreground">Confirmadas</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalUsage}</p>
          <p className="text-xs text-muted-foreground">Aplicações</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-info mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{filteredSolutions.length > 0 ? "Ativa" : "—"}</p>
          <p className="text-xs text-muted-foreground">Memória IA</p>
        </div>
      </div>

      {/* Solutions List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : solutions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Nenhuma solução registrada ainda. Soluções são criadas automaticamente quando tickets são resolvidos.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredSolutions.map((sol, index) => (
            <motion.button
              key={sol.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedSolution(sol)}
              className="w-full glass-card rounded-xl p-4 text-left hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{sol.problem}</p>
                  <p className="text-xs text-primary mt-1 font-medium truncate">→ {sol.solution}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(sol.confirmed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] text-primary/70">{sol.usage_count}x usada</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolutionHistory;
