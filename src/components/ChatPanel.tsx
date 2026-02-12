import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Paperclip, X, CheckCircle2, XCircle, AlertTriangle, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

type TicketState = "idle" | "diagnosing" | "awaiting_confirmation" | "resolved" | "escalated";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface ChatPanelProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  onConversationUpdated?: () => void;
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! Sou o **Especialista de Suporte Técnico do Amigo Flow**. Posso ajudá-lo com:\n\n• Configuração de canais e templates\n• Diagnóstico de erros comuns\n• Otimização de fluxos de atendimento\n• Dúvidas sobre Leads, Pacientes, Agentes e Setores\n\n📎 Você pode anexar **imagens, áudios, vídeos e documentos** para eu analisar.\n\nComo posso ajudar você hoje?",
};

const ChatPanel = ({ conversationId, onConversationCreated, onConversationUpdated }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ticketState, setTicketState] = useState<TicketState>("idle");
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [currentConvId, setCurrentConvId] = useState<string | null>(conversationId);
  const [loadingConv, setLoadingConv] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([WELCOME_MSG]);
      setTicketState("idle");
      setCurrentTicketId(null);
      setCurrentConvId(null);
      setAttemptCount(0);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (convId: string) => {
    setLoadingConv(true);
    setCurrentConvId(convId);

    // Load conversation status
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", convId)
      .single();

    if (conv) {
      if (conv.status === "resolved") setTicketState("resolved");
      else if (conv.status === "escalated") setTicketState("escalated");
      else setTicketState("idle");
      setCurrentTicketId(conv.ticket_id as string | null);
    }

    // Load messages
    const { data: msgs } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (msgs && msgs.length > 0) {
      setMessages(
        msgs.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          attachments: m.attachments as Attachment[] | undefined,
        }))
      );
    } else {
      setMessages([WELCOME_MSG]);
    }
    setLoadingConv(false);
  };

  const saveMessage = async (convId: string, msg: Message) => {
    await (supabase.from("conversation_messages") as any).insert({
      conversation_id: convId,
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments || [],
    });
  };

  const createConversation = async (title: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title: title.substring(0, 100) || "Nova Conversa" })
      .select()
      .single();
    if (error || !data) return null;
    return data.id;
  };

  const updateConversationTitle = async (convId: string, title: string) => {
    await supabase
      .from("conversations")
      .update({ title: title.substring(0, 100) })
      .eq("id", convId);
    onConversationUpdated?.();
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
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
      if (att) setPendingAttachments((prev) => [...prev, att]);
    }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
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
    } catch { return null; }
  };

  const resolveTicket = async (problem: string, solution: string, conversation: Message[]) => {
    if (!currentTicketId) return;
    try {
      await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          action: "resolve_ticket", ticketId: currentTicketId,
          ticketData: { problem, solution, conversation: conversation.map((m) => ({ role: m.role, content: m.content })) },
        }),
      });
      toast.success("✅ Ticket resolvido e catalogado!");
    } catch {}
  };

  const escalateTicket = async (conversation: Message[]) => {
    if (!currentTicketId) return;
    try {
      await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          action: "escalate_ticket", ticketId: currentTicketId,
          ticketData: { conversation: conversation.map((m) => ({ role: m.role, content: m.content })) },
        }),
      });
      toast.info("🔧 Ticket escalado para a equipe de desenvolvimento");
    } catch {}
  };

  const streamAI = async (aiMessages: { role: string; content: string }[]): Promise<string> => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
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
    let assistantSoFar = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, idx);
        textBuffer = textBuffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
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
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
              }
              return [...prev, { id: "streaming", role: "assistant", content: assistantSoFar }];
            });
          }
        } catch { textBuffer = line + "\n" + textBuffer; break; }
      }
    }

    const finalId = Date.now().toString();
    setMessages((prev) => prev.map((m) => m.id === "streaming" ? { ...m, id: finalId } : m));
    return assistantSoFar;
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    const newMessages = [...messages.filter(m => m.id !== "welcome"), userMessage];
    setMessages([...messages, userMessage]);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    // Create conversation if needed
    let convId = currentConvId;
    if (!convId) {
      convId = await createConversation(input);
      if (convId) {
        setCurrentConvId(convId);
        onConversationCreated?.(convId);
      }
    } else {
      // Update title if first real message
      const realMsgs = messages.filter(m => m.id !== "welcome" && m.role === "user");
      if (realMsgs.length === 0) {
        await updateConversationTitle(convId, input);
      }
    }

    // Save user message
    if (convId) await saveMessage(convId, userMessage);

    // Create ticket on first user message
    if (ticketState === "idle" && input.trim().length > 10) {
      setTicketState("diagnosing");
      const ticketId = await createTicket(input, newMessages);
      if (ticketId) {
        setCurrentTicketId(ticketId);
        if (convId) {
          await supabase.from("conversations").update({ ticket_id: ticketId }).eq("id", convId);
        }
      }
    }

    try {
      const aiMessages = newMessages.map((m) => {
        let content = m.content;
        if (m.attachments?.length) content += "\n[Anexos: " + m.attachments.map((a) => `${a.type}: ${a.name}`).join(", ") + "]";
        return { role: m.role, content };
      });

      const assistantContent = await streamAI(aiMessages);

      // Save assistant message
      const assistantMsg: Message = { id: Date.now().toString(), role: "assistant", content: assistantContent };
      if (convId) await saveMessage(convId, assistantMsg);

      // Check if AI asked about resolution
      const lower = assistantContent.toLowerCase();
      if (lower.includes("problema foi resolvido") || lower.includes("resolvido?")) {
        setTicketState("awaiting_confirmation");
      }
      setAttemptCount((c) => c + 1);
    } catch (e) {
      const errMsg: Message = {
        id: Date.now().toString(), role: "assistant",
        content: `⚠️ ${e instanceof Error ? e.message : "Erro ao conectar com a IA."}`,
      };
      setMessages((prev) => [...prev, errMsg]);
      if (convId) await saveMessage(convId, errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolutionResponse = async (resolved: boolean) => {
    if (resolved) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
      await resolveTicket(firstUserMsg?.content || "", lastAssistantMsg?.content || "", messages);
      setTicketState("resolved");
      if (currentConvId) {
        await supabase.from("conversations").update({ status: "resolved" }).eq("id", currentConvId);
        onConversationUpdated?.();
      }
      const resolvedMsg: Message = {
        id: Date.now().toString(), role: "assistant",
        content: "✅ **Ticket resolvido e catalogado!**\n\nO problema e a solução foram registrados para consulta futura.",
      };
      setMessages((prev) => [...prev, resolvedMsg]);
      if (currentConvId) await saveMessage(currentConvId, resolvedMsg);
    } else {
      setTicketState("diagnosing");
      if (attemptCount >= 3) {
        await escalateTicket(messages);
        setTicketState("escalated");
        if (currentConvId) {
          await supabase.from("conversations").update({ status: "escalated" }).eq("id", currentConvId);
          onConversationUpdated?.();
        }
        const escMsg: Message = {
          id: Date.now().toString(), role: "assistant",
          content: "🔧 **Ticket escalado para desenvolvimento.** O problema foi registrado para análise técnica.",
        };
        setMessages((prev) => [...prev, escMsg]);
        if (currentConvId) await saveMessage(currentConvId, escMsg);
      } else {
        const noMsg: Message = { id: Date.now().toString(), role: "user", content: "Não, o problema não foi resolvido. Tente outra abordagem." };
        setMessages((prev) => [...prev, noMsg]);
        if (currentConvId) await saveMessage(currentConvId, noMsg);
        setIsLoading(true);
        try {
          const allMsgs = [...messages, noMsg].map((m) => ({ role: m.role, content: m.content }));
          const assistantContent = await streamAI(allMsgs);
          if (currentConvId) await saveMessage(currentConvId, { id: "", role: "assistant", content: assistantContent });
          if (assistantContent.toLowerCase().includes("resolvido?")) setTicketState("awaiting_confirmation");
          setAttemptCount((c) => c + 1);
        } catch {} finally { setIsLoading(false); }
      }
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) { case "image": return "🖼️"; case "audio": return "🎵"; case "video": return "🎬"; default: return "📄"; }
  };

  if (loadingConv) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chat de Suporte</h2>
          <p className="text-sm text-muted-foreground">
            Especialista IA
            {ticketState === "diagnosing" && " • 🔍 Diagnosticando"}
            {ticketState === "awaiting_confirmation" && " • ⏳ Aguardando confirmação"}
            {ticketState === "resolved" && " • ✅ Resolvido"}
            {ticketState === "escalated" && " • 🔧 Escalado"}
          </p>
        </div>
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
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-border">
                        {att.type === "image" ? (
                          <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] object-cover" />
                        ) : att.type === "audio" ? (
                          <div className="p-2"><audio controls src={att.url} className="h-8" /></div>
                        ) : att.type === "video" ? (
                          <video controls src={att.url} className="max-w-[250px] max-h-[150px]" />
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
                {msg.content && (
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-card-foreground rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
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

      {/* Resolution Bar */}
      {ticketState === "awaiting_confirmation" && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 border-t border-border bg-card">
          <p className="text-sm font-medium text-foreground text-center mb-3">O problema foi resolvido?</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleResolutionResponse(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-success-foreground text-sm font-medium hover:opacity-90">
              <CheckCircle2 className="w-4 h-4" /> Sim, resolvido!
            </button>
            <button onClick={() => handleResolutionResponse(false)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90">
              <XCircle className="w-4 h-4" /> Não, ainda não
            </button>
          </div>
          {attemptCount >= 2 && (
            <button onClick={async () => {
              await escalateTicket(messages);
              setTicketState("escalated");
              if (currentConvId) { await supabase.from("conversations").update({ status: "escalated" }).eq("id", currentConvId); onConversationUpdated?.(); }
              const m: Message = { id: Date.now().toString(), role: "assistant", content: "🔧 **Ticket escalado para desenvolvimento.**" };
              setMessages((prev) => [...prev, m]);
              if (currentConvId) await saveMessage(currentConvId, m);
            }} className="flex items-center gap-2 mx-auto mt-2 px-4 py-1.5 rounded-lg text-xs text-warning hover:text-warning/80">
              <AlertTriangle className="w-3.5 h-3.5" /> Escalar para desenvolvimento
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
              <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || isLoading} className="p-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-muted transition-colors disabled:opacity-40" title="Anexar arquivo">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Descreva o erro ou dúvida..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring border-0 disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading} className="px-4 py-3 rounded-xl gradient-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
