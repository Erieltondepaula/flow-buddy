import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Paperclip, Image, Mic, Video, X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Attachment {
  name: string;
  url: string;
  type: string; // image, audio, video, document
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

type TicketState = "idle" | "diagnosing" | "awaiting_confirmation" | "resolved" | "escalated";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatPanel = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Olá! Sou o **Especialista de Suporte Técnico do Amigo Flow**. Posso ajudá-lo com:\n\n• Configuração de canais e templates\n• Diagnóstico de erros comuns\n• Otimização de fluxos de atendimento\n• Dúvidas sobre Leads, Pacientes, Agentes e Setores\n\n📎 Você pode anexar **imagens, áudios, vídeos e documentos** para eu analisar.\n\nComo posso ajudar você hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ticketState, setTicketState] = useState<TicketState>("idle");
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) {
      toast.error(`Erro ao enviar ${file.name}`);
      console.error(error);
      return null;
    }

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
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const att = await uploadFile(file);
      if (att) newAttachments.push(att);
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const createTicket = async (errorDescription: string, conversation: Message[]) => {
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "create_ticket",
          ticketData: {
            title: errorDescription.substring(0, 100),
            error_description: errorDescription,
            conversation: conversation.map((m) => ({ role: m.role, content: m.content })),
            attachments: conversation.flatMap((m) => m.attachments || []),
          },
        }),
      });
      const data = await resp.json();
      return data.ticket?.id || null;
    } catch (e) {
      console.error("Error creating ticket:", e);
      return null;
    }
  };

  const resolveTicket = async (problem: string, solution: string, conversation: Message[]) => {
    if (!currentTicketId) return;
    try {
      await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "resolve_ticket",
          ticketId: currentTicketId,
          ticketData: {
            problem,
            solution,
            conversation: conversation.map((m) => ({ role: m.role, content: m.content })),
          },
        }),
      });
      toast.success("✅ Ticket resolvido e catalogado!");
    } catch (e) {
      console.error("Error resolving ticket:", e);
    }
  };

  const escalateTicket = async (conversation: Message[]) => {
    if (!currentTicketId) return;
    try {
      await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "escalate_ticket",
          ticketId: currentTicketId,
          ticketData: {
            conversation: conversation.map((m) => ({ role: m.role, content: m.content })),
          },
        }),
      });
      toast.info("🔧 Ticket escalado para a equipe de desenvolvimento");
    } catch (e) {
      console.error("Error escalating ticket:", e);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    // Build message content with attachment descriptions for AI
    let aiContent = input;
    if (userMessage.attachments && userMessage.attachments.length > 0) {
      aiContent += "\n\n[Anexos enviados: " +
        userMessage.attachments.map((a) => `${a.type}: ${a.name} (${a.url})`).join(", ") +
        "]";
    }

    // Create ticket on first user problem message (if idle)
    if (ticketState === "idle" && input.trim().length > 10) {
      setTicketState("diagnosing");
      const ticketId = await createTicket(input, newMessages);
      if (ticketId) setCurrentTicketId(ticketId);
    }

    let assistantSoFar = "";

    try {
      const aiMessages = newMessages.map((m) => {
        let content = m.content;
        if (m.attachments && m.attachments.length > 0) {
          content += "\n[Anexos: " + m.attachments.map((a) => `${a.type}: ${a.name}`).join(", ") + "]";
        }
        return { role: m.role, content };
      });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: aiMessages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === "streaming") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { id: "streaming", role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m))
      );

      // Check if AI asked about resolution
      const lower = assistantSoFar.toLowerCase();
      if (lower.includes("problema foi resolvido") || lower.includes("resolvido?")) {
        setTicketState("awaiting_confirmation");
      }

      setAttemptCount((c) => c + 1);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : "Erro ao conectar com a IA."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolutionResponse = async (resolved: boolean) => {
    if (resolved) {
      // Extract problem from first user message and solution from last assistant
      const firstUserMsg = messages.find((m) => m.role === "user");
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");

      await resolveTicket(
        firstUserMsg?.content || "Problema não especificado",
        lastAssistantMsg?.content || "Solução aplicada",
        messages
      );

      setTicketState("resolved");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "✅ **Ticket resolvido e catalogado!**\n\nO problema e a solução foram registrados na base de conhecimento para consulta futura.\n\nDeseja iniciar um novo atendimento?",
        },
      ]);
    } else {
      setTicketState("diagnosing");

      if (attemptCount >= 3) {
        await escalateTicket(messages);
        setTicketState("escalated");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content:
              "🔧 **Ticket escalado para a equipe de desenvolvimento.**\n\nApós várias tentativas, este problema parece ser um bug que precisa de atenção técnica especializada. O ticket foi registrado com toda a conversa e anexos.\n\nDeseja iniciar um novo atendimento?",
          },
        ]);
      } else {
        // Send "no" as user message to continue diagnosis
        const noMsg: Message = {
          id: Date.now().toString(),
          role: "user",
          content: "Não, o problema não foi resolvido ainda. Por favor, tente outra abordagem.",
        };
        setMessages((prev) => [...prev, noMsg]);

        // Trigger new AI response
        setTimeout(() => {
          setInput("");
          // Manually trigger sending
          handleContinueDiagnosis([...messages, noMsg]);
        }, 500);
      }
    }
  };

  const handleContinueDiagnosis = async (msgs: Message[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const aiMessages = msgs.map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: aiMessages }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro na resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === "streaming") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { id: "streaming", role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m))
      );

      const lower = assistantSoFar.toLowerCase();
      if (lower.includes("problema foi resolvido") || lower.includes("resolvido?")) {
        setTicketState("awaiting_confirmation");
      }

      setAttemptCount((c) => c + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Novo atendimento iniciado! 🆕\n\nDescreva o problema ou envie imagens/arquivos para eu analisar.",
      },
    ]);
    setTicketState("idle");
    setCurrentTicketId(null);
    setAttemptCount(0);
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image": return "🖼️";
      case "audio": return "🎵";
      case "video": return "🎬";
      default: return "📄";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chat de Suporte</h2>
          <p className="text-sm text-muted-foreground">
            Especialista de Suporte Técnico Sênior • IA Ativa
            {ticketState === "diagnosing" && " • 🔍 Diagnosticando"}
            {ticketState === "awaiting_confirmation" && " • ⏳ Aguardando confirmação"}
            {ticketState === "resolved" && " • ✅ Resolvido"}
            {ticketState === "escalated" && " • 🔧 Escalado"}
          </p>
        </div>
        {(ticketState === "resolved" || ticketState === "escalated") && (
          <button
            onClick={handleNewSession}
            className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Novo Atendimento
          </button>
        )}
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
              <div className="max-w-[70%] space-y-2">
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-border">
                        {att.type === "image" ? (
                          <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 bg-card text-xs">
                            <span>{getAttachmentIcon(att.type)}</span>
                            <span className="text-card-foreground truncate max-w-[150px]">{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message bubble */}
                {msg.content && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "gradient-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-card-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
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

      {/* Resolution Confirmation Bar */}
      {ticketState === "awaiting_confirmation" && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 border-t border-border bg-card"
        >
          <p className="text-sm font-medium text-foreground text-center mb-3">O problema foi resolvido?</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => handleResolutionResponse(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 className="w-4 h-4" />
              Sim, resolvido!
            </button>
            <button
              onClick={() => handleResolutionResponse(false)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <XCircle className="w-4 h-4" />
              Não, ainda não
            </button>
          </div>
          {attemptCount >= 2 && (
            <button
              onClick={async () => {
                await escalateTicket(messages);
                setTicketState("escalated");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: "🔧 **Ticket escalado para desenvolvimento.** O problema foi registrado para análise técnica.",
                  },
                ]);
              }}
              className="flex items-center gap-2 mx-auto mt-2 px-4 py-1.5 rounded-lg text-xs text-warning hover:text-warning/80 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Escalar para desenvolvimento
            </button>
          )}
        </motion.div>
      )}

      {/* Pending Attachments */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-card flex gap-2 flex-wrap">
          {pendingAttachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-xs text-secondary-foreground">
              <span>{getAttachmentIcon(att.type)}</span>
              <span className="truncate max-w-[100px]">{att.name}</span>
              <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          {/* Attachment Button */}
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isLoading}
              className="p-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-muted transition-colors disabled:opacity-40"
              title="Anexar arquivo"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Descreva o erro ou dúvida..."
            disabled={isLoading || ticketState === "resolved" || ticketState === "escalated"}
            className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
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
