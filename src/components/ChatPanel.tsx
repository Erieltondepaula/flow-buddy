import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Olá! Sou o Especialista de Suporte Técnico do **Amigo Flow**. Posso ajudá-lo com:\n\n• Configuração de canais e templates\n• Diagnóstico de erros comuns\n• Otimização de fluxos de atendimento\n• Dúvidas sobre Leads, Pacientes, Agentes e Setores\n\nComo posso ajudar você hoje?",
    timestamp: new Date(),
  },
];

const ChatPanel = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const simulateResponse = (userMsg: string) => {
    setIsTyping(true);
    setTimeout(() => {
      let response = "";

      if (userMsg.toLowerCase().includes("confirmação")) {
        response =
          "⚠️ **Confirmação automática não funciona?**\n\nA confirmação automática depende obrigatoriamente de um **Agente habilitado**. Verifique:\n\n1. Se o Agente está ativo no painel\n2. Se o Setor Principal foi definido\n3. Se o canal está corretamente vinculado\n\n✅ *Solução confirmada em 12/02/2026*";
      } else if (userMsg.toLowerCase().includes("canal") || userMsg.toLowerCase().includes("erro")) {
        response =
          "🔧 **Erro ao criar canal**\n\nÉ obrigatório definir um **Setor Principal** antes de criar qualquer canal.\n\n**Checklist de validação:**\n- ✅ Unidade habilitada\n- ✅ Profissional habilitado\n- ✅ Convênio habilitado\n- ✅ Setor configurado\n\nSe algum desses itens estiver ausente, o canal não será criado corretamente.";
      } else if (userMsg.toLowerCase().includes("template") || userMsg.toLowerCase().includes("meta")) {
        response =
          "📋 **Templates e Meta**\n\nExistem dois tipos principais:\n\n• **Marketing**: Exige resposta do paciente. Tem custos de mensageria associados.\n• **Atendimento/Utilidade**: Para avisos e notificações.\n\n⚠️ Templates rejeitados pela Meta geralmente violam as políticas de conteúdo. Revise o texto e tente novamente.";
      } else if (userMsg.toLowerCase().includes("lead") || userMsg.toLowerCase().includes("paciente")) {
        response =
          "👥 **Leads vs Pacientes**\n\nNúmeros **não cadastrados** no sistema são tratados como **Leads**. Eles podem seguir regras de atendimento diferentes.\n\nPara converter um Lead em Paciente:\n1. Cadastre o número no sistema\n2. Vincule ao convênio\n3. Associe à unidade correta";
      } else {
        response =
          "Entendi sua dúvida. Para que eu possa ajudar da melhor forma, por favor:\n\n1. Descreva o erro ou situação em detalhes\n2. Se possível, envie prints da tela\n3. Informe a unidade e o canal utilizado\n\nAssim posso consultar a Base de Conhecimento e fornecer a solução mais precisa.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    simulateResponse(input);
  };

  const formatContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return (
        <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} className="block" />
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold text-foreground">Chat de Suporte</h2>
        <p className="text-sm text-muted-foreground">
          Especialista de Suporte Técnico Sênior
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-card-foreground rounded-bl-md"
                }`}
              >
                {formatContent(msg.content)}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Analisando...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Descreva o erro ou dúvida..."
            className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-3 rounded-xl gradient-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
