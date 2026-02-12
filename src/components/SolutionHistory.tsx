import { History, CheckCircle2, Brain, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const solutions = [
  {
    id: 1,
    problem: "Erro X ocorre quando o Setor Principal não é definido",
    solution: "Definir Setor Principal antes de criar canal",
    confirmedAt: "12/02/2026",
    usageCount: 23,
  },
  {
    id: 2,
    problem: "Agendamento invisível por falta de habilitação de profissional",
    solution: "Habilitar profissional e convênio ANTES de configurar Habilidades",
    confirmedAt: "11/02/2026",
    usageCount: 15,
  },
  {
    id: 3,
    problem: "Template de marketing rejeitado sem erro claro",
    solution: "Alterar tipo para Utilidade ou ajustar conteúdo para atender políticas Meta",
    confirmedAt: "10/02/2026",
    usageCount: 31,
  },
  {
    id: 4,
    problem: "Lead não convertido em paciente após cadastro",
    solution: "Vincular convênio e associar unidade após cadastro do número",
    confirmedAt: "09/02/2026",
    usageCount: 8,
  },
  {
    id: 5,
    problem: "Confirmação automática silenciosa sem Agente ativo",
    solution: "Ativar Agente no painel e vincular ao canal específico",
    confirmedAt: "08/02/2026",
    usageCount: 19,
  },
];

const SolutionHistory = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Soluções Registradas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Memória evolutiva — soluções confirmadas pela equipe
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{solutions.length}</p>
          <p className="text-xs text-muted-foreground">Confirmadas</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {solutions.reduce((acc, s) => acc + s.usageCount, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Aplicações</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-info" />
          </div>
          <p className="text-2xl font-bold text-foreground">94%</p>
          <p className="text-xs text-muted-foreground">Precisão</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {solutions.map((sol, index) => (
          <motion.div
            key={sol.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="relative pl-8"
          >
            {/* Timeline line */}
            {index < solutions.length - 1 && (
              <div className="absolute left-[13px] top-10 w-0.5 h-full bg-border" />
            )}
            {/* Timeline dot */}
            <div className="absolute left-1.5 top-4 w-3 h-3 rounded-full gradient-primary border-2 border-background" />

            <div className="glass-card rounded-xl p-4 mb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{sol.problem}</p>
                  <p className="text-xs text-primary mt-1 font-medium">→ {sol.solution}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground">{sol.confirmedAt}</p>
                  <p className="text-xs text-success font-medium">{sol.usageCount}x usado</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SolutionHistory;
