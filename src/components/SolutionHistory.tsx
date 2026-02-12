import { CheckCircle2, Brain, TrendingUp, Plus, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Solution {
  id: string;
  problem: string;
  solution: string;
  confirmed_at: string;
  usage_count: number;
}

const SolutionHistory = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProblem, setNewProblem] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [saving, setSaving] = useState(false);

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
    });
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
    fetchSolutions();
  };

  const totalUsage = solutions.reduce((acc, s) => acc + s.usage_count, 0);

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
          <input
            value={newProblem}
            onChange={(e) => setNewProblem(e.target.value)}
            placeholder="Descreva o problema..."
            className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0"
          />
          <input
            value={newSolution}
            onChange={(e) => setNewSolution(e.target.value)}
            placeholder="Descreva a solução confirmada..."
            className="w-full px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{solutions.length}</p>
          <p className="text-xs text-muted-foreground">Confirmadas</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalUsage}</p>
          <p className="text-xs text-muted-foreground">Aplicações</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-info mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{solutions.length > 0 ? "Ativa" : "—"}</p>
          <p className="text-xs text-muted-foreground">Memória IA</p>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : solutions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Nenhuma solução registrada ainda.
        </p>
      ) : (
        <div className="space-y-1">
          {solutions.map((sol, index) => (
            <motion.div
              key={sol.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-8"
            >
              {index < solutions.length - 1 && (
                <div className="absolute left-[13px] top-10 w-0.5 h-full bg-border" />
              )}
              <div className="absolute left-1.5 top-4 w-3 h-3 rounded-full gradient-primary border-2 border-background" />
              <div className="glass-card rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{sol.problem}</p>
                    <p className="text-xs text-primary mt-1 font-medium">→ {sol.solution}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-muted-foreground">
                      {new Date(sol.confirmed_at).toLocaleDateString("pt-BR")}
                    </span>
                    <button onClick={() => handleDelete(sol.id)} className="text-destructive/60 hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolutionHistory;
