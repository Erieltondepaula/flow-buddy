import { FileText, Video, Image, MessageSquare, Search, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const categories = [
  {
    id: "docs",
    title: "Documentação Oficial",
    icon: FileText,
    count: 12,
    items: [
      "Guia de Implantação v3.2",
      "Manual do Administrador",
      "Configuração de Canais WhatsApp",
      "Integração com Sistemas de Saúde",
    ],
  },
  {
    id: "procedures",
    title: "Procedimentos Internos",
    icon: MessageSquare,
    count: 8,
    items: [
      "Regras Operacionais",
      "Valores de Serviços",
      "Fluxos de Transbordo Humano",
      "Configuração de Habilidades",
    ],
  },
  {
    id: "media",
    title: "Treinamentos em Vídeo",
    icon: Video,
    count: 5,
    items: [
      "Configuração Inicial do Amigo Flow",
      "Gerenciamento de Agentes e Setores",
      "Templates de Mensagens",
    ],
  },
  {
    id: "screens",
    title: "Prints e Referências",
    icon: Image,
    count: 15,
    items: [
      "Telas de Configuração",
      "Exemplos de Erros Comuns",
      "Status de Integração",
    ],
  },
];

const KnowledgeBase = () => {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.title.toLowerCase().includes(search.toLowerCase()) ||
      cat.items.some((item) => item.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Base de Conhecimento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fonte primária e obrigatória para todas as respostas
        </p>
      </div>

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

      {/* Categories */}
      <div className="space-y-3">
        {filteredCategories.map((cat, index) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
              className="w-full glass-card rounded-xl p-4 hover-lift text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <cat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-card-foreground">{cat.title}</h3>
                    <p className="text-xs text-muted-foreground">{cat.count} documentos</p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    expandedCategory === cat.id ? "rotate-90" : ""
                  }`}
                />
              </div>
            </button>

            {expandedCategory === cat.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 ml-6 pl-7 border-l-2 border-primary/20 space-y-1"
              >
                {cat.items
                  .filter((item) => item.toLowerCase().includes(search.toLowerCase()) || !search)
                  .map((item) => (
                    <div
                      key={item}
                      className="py-2 px-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {item}
                    </div>
                  ))}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Info Card */}
      <div className="glass-card rounded-xl p-4 border-l-4 border-l-primary">
        <p className="text-sm font-semibold text-foreground">🔒 Regra de Ouro</p>
        <p className="text-xs text-muted-foreground mt-1">
          Se existir conflito entre informações, o sistema informará claramente e nunca inventará respostas.
        </p>
      </div>
    </div>
  );
};

export default KnowledgeBase;
