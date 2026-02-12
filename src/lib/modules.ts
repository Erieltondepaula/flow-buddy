export const ECOSYSTEM_MODULES = [
  "Geral",
  "Amigo Flow",
  "Amigo Clinic",
  "Amigo One",
  "Amigo Pay",
  "Amigo Bot",
  "Contabilidade",
  "Telemedicina",
  "Convênio e Particular",
] as const;

export type EcosystemModule = (typeof ECOSYSTEM_MODULES)[number];

// Complete sub-function mapping for Amigo Clinic modules (from the system screenshots)
export const AMIGO_CLINIC_MODULES: Record<string, string[]> = {
  "Módulos": [
    "Agenda", "Central de Atendimento", "Paciente", "Financeiro",
    "Contabilidade", "Configuração", "Gestão de convênio", "Estoque",
    "Agenda+", "SignBox", "Amigo Flow", "Solicitações de cirurgias",
    "Laudo", "Chat",
  ],
  "Agenda": [
    "Gerenciar atendimentos", "Reabrir atendimentos",
    "Permitir alteração de valor particular", "Permitir alteração de valor de convênios",
    "Permitir remover recibos de Pessoa Física", "Permitir remover atendimento",
    "Permitir remoção de procedimentos e materiais no atendimento/contas",
    "Permitir associar matmed a estoque",
    "Manipular bloqueio/desbloqueio de agenda",
    "Permitir visualização geral da agenda", "Gestão de Escalas",
  ],
  "Convênios": [
    "Resumo", "Produção", "Histórico de guias", "Recebimento",
    "Gestão de glosa", "Gestão de Reembolso", "Relatórios",
  ],
  "Financeiro": [
    "Dashboard", "Resumo Financeiro", "Caixa / Banco", "Contas a pagar",
    "Contas a receber", "Fluxo de Caixa", "Análise Financeira", "Fornecedores",
    "Produção individual", "Produção geral", "Repasse por atendimento",
    "Repasse por orçamento", "Cartões", "ORX", "Contas bancárias", "Unidades",
  ],
  "Avançadas": [
    "Bloquear campo 'Pago em' (contas a pagar)",
    "Aprovar orçamento sem financeiro",
    "Bloquear campo 'Recebido em' (contas a receber)",
    "Permitir aprovar lançamento no contas a pagar",
    "Desconto no orçamento", "Permitir remoção de paciente",
    "Permitir realizar baixa apenas de contas aprovadas",
    "Permitir vincular e desvincular NFSe nos atendimentos",
    "Permitir realizar saída através da aba consumo",
    "Exibir informações financeiras",
    "Fechamento de caixa e Relatório de vendas por usuário",
    "Permitir configurar sua agenda",
    "Permitir importar XML demonstrativo análise de conta",
    "Permitir exportar XML de recurso de glosa",
    "Permitir alterar conta bancária de guias nos extratos",
    "Permitir visualizar notificações críticas",
    "Exibir Honorários",
    "Permitir visualizar dados de reembolso do paciente",
    "Permitir incrementar saída de estoque via escaneamento",
  ],
  "Estoque": [
    "Resumo", "Posição", "Movimentações", "Rastreabilidade",
    "Ajuste de Inventário", "Solicitações", "Pedido de Compra", "Compras",
    "Alterar Lote/Validade", "Desfazer movimentações",
  ],
  "Configurações": [
    "Agenda", "Ações Especiais", "Cartões", "Financeiro",
    "Como conheceu", "Compartilhamentos", "Agenda+",
    "Agendador", "Agendamento on-line", "Laudo", "Consultórios e Salas",
    "Geral", "Painel Chamador", "Prontuário", "Parametrização",
    "Campos obrigatórios", "Relacionamento", "Repasse por atendimento",
    "Repasse por orçamento", "Unidades", "Usuários", "SignBox", "AmigoBot",
    "Amigo Flow", "Convênios", "Procedimentos", "Tabela de Preço",
    "MatMed", "Executantes", "Solicitantes", "Autorizadores",
    "Hospitais", "Regras de faturamento",
  ],
};

// Sectors for contacts
export const CONTACT_SECTORS = [
  "Suporte",
  "Qualidade",
  "Implantação",
  "Financeiro",
  "Contabilidade",
  "Gerência",
  "Comercial",
  "Consultoria",
  "Desenvolvimento",
  "KANS / Analistas",
] as const;

export type ContactSector = (typeof CONTACT_SECTORS)[number];
