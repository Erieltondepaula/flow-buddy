import { AlertTriangle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const errors = [
  {
    id: 1,
    title: "Confirmação automática não funciona",
    severity: "high",
    solution:
      "A confirmação automática depende obrigatoriamente de um Agente habilitado. Verifique se o Agente está ativo, se o Setor Principal foi definido e se o canal está vinculado.",
    checklist: ["Agente habilitado", "Setor Principal definido", "Canal vinculado"],
    solvedAt: "12/02/2026",
  },
  {
    id: 2,
    title: "Erro ao criar canal",
    severity: "high",
    solution:
      "É obrigatório definir um Setor Principal antes de criar qualquer canal. Sem isso, a criação falhará silenciosamente.",
    checklist: ["Unidade habilitada", "Profissional habilitado", "Setor configurado"],
    solvedAt: "11/02/2026",
  },
  {
    id: 3,
    title: "Template rejeitado pela Meta",
    severity: "medium",
    solution:
      "Verifique o tipo do template: Marketing exige resposta do paciente e tem custos de mensageria. Atendimento/Utilidade serve para avisos. Revise o conteúdo conforme políticas da Meta.",
    checklist: ["Tipo correto selecionado", "Conteúdo conforme políticas", "Custos revisados"],
    solvedAt: "10/02/2026",
  },
  {
    id: 4,
    title: "Agendamento não aparece",
    severity: "medium",
    solution:
      "Verifique se o tipo de atendimento, profissional e convênio estão habilitados. Importante: essas configurações devem ser feitas ANTES da configuração nas Habilidades.",
    checklist: [
      "Tipo de atendimento habilitado",
      "Profissional habilitado",
      "Convênio ativo",
      "Habilidades configuradas após habilitação",
    ],
    solvedAt: "09/02/2026",
  },
  {
    id: 5,
    title: "Leads não recebem mensagens",
    severity: "low",
    solution:
      "Números não cadastrados são tratados como Leads e podem seguir regras diferentes de atendimento. Verifique as regras de atendimento para Leads no painel de configuração.",
    checklist: ["Regras de Leads configuradas", "Canal aceita Leads", "Template para Leads definido"],
    solvedAt: "08/02/2026",
  },
];

const severityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-info/10 text-info border-info/20",
};

const severityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const CommonErrors = () => {
  const [expandedError, setExpandedError] = useState<number | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Erros Comuns</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Soluções validadas e confirmadas pela equipe técnica
        </p>
      </div>

      <div className="space-y-3">
        {errors.map((error, index) => (
          <motion.div
            key={error.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-xl overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedError(expandedError === error.id ? null : error.id)
              }
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm text-card-foreground">
                      {error.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[error.severity]}`}
                      >
                        {severityLabels[error.severity]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Resolvido em {error.solvedAt}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    expandedError === error.id ? "rotate-90" : ""
                  }`}
                />
              </div>
            </button>

            {expandedError === error.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="px-4 pb-4 border-t border-border"
              >
                <p className="text-sm text-muted-foreground mt-3">{error.solution}</p>
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Checklist de Validação:</p>
                  {error.checklist.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CommonErrors;
