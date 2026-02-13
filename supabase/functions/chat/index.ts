import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, action, ticketId, ticketData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle ticket actions (non-streaming)
    if (action === "create_ticket") {
      const { data, error } = await supabase.from("support_tickets").insert(ticketData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ticket: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resolve_ticket") {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status: "resolved",
          solution_description: ticketData.solution,
          solution_registered_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          conversation: ticketData.conversation,
        })
        .eq("id", ticketId);
      if (error) throw error;

      // Save to confirmed_solutions with module for evolutionary memory
      await supabase.from("confirmed_solutions").insert({
        problem: ticketData.problem,
        solution: ticketData.solution,
        module: ticketData.module || "Geral",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "escalate_ticket") {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status: "escalated",
          conversation: ticketData.conversation,
        })
        .eq("id", ticketId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming chat - fetch knowledge base context
    // Extract the user's current problem from the last message
    const lastUserMessage = messages?.filter((m: any) => m.role === "user").pop()?.content || "";

    const { data: knowledgeEntries } = await supabase
      .from("knowledge_entries")
      .select("title, content, source_type, module, sub_module")
      .order("created_at", { ascending: false })
      .limit(50);

    // Search confirmed solutions that match the current problem
    const { data: confirmedSolutions } = await supabase
      .from("confirmed_solutions")
      .select("problem, solution, confirmed_at, usage_count, module")
      .order("usage_count", { ascending: false })
      .limit(30);

    // Get ALL resolved tickets with their full conversation for learning
    const { data: recentTickets } = await supabase
      .from("support_tickets")
      .select("title, error_description, solution_description, status, module")
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(30);

    // Get ALL resolved conversations with their messages for deep learning
    const { data: resolvedConversations } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("status", "resolved")
      .order("updated_at", { ascending: false })
      .limit(15);

    let resolvedConvContext = "";
    if (resolvedConversations && resolvedConversations.length > 0) {
      for (const conv of resolvedConversations) {
        const { data: convMsgs } = await supabase
          .from("conversation_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(20);
        if (convMsgs && convMsgs.length > 0) {
          resolvedConvContext += `\n### Conversa resolvida: "${conv.title}"\n`;
          for (const msg of convMsgs) {
            resolvedConvContext += `${msg.role === "user" ? "Usuário" : "Suporte"}: ${msg.content.substring(0, 300)}\n`;
          }
        }
      }
    }

    let knowledgeContext = "";
    if (knowledgeEntries && knowledgeEntries.length > 0) {
      knowledgeContext += "\n\n## BASE DE CONHECIMENTO:\n";
      for (const entry of knowledgeEntries) {
        knowledgeContext += `\n### ${entry.title} (${entry.source_type}) [${entry.module || "Geral"}${entry.sub_module ? ` > ${entry.sub_module}` : ""}]\n${entry.content}\n`;
      }
    }

    if (confirmedSolutions && confirmedSolutions.length > 0) {
      knowledgeContext += "\n\n## SOLUÇÕES CONFIRMADAS (USE ESTAS PRIMEIRO!):\n";
      for (const sol of confirmedSolutions) {
        knowledgeContext += `\n- **Problema:** ${sol.problem}\n  **Solução:** ${sol.solution}\n  **Módulo:** ${sol.module || "Geral"} | **Usado ${sol.usage_count}x**\n`;
      }
    }

    if (recentTickets && recentTickets.length > 0) {
      knowledgeContext += "\n\n## TICKETS RESOLVIDOS RECENTEMENTE:\n";
      for (const t of recentTickets) {
        knowledgeContext += `\n- **${t.title}** [${t.module || "Geral"}]: ${t.error_description} → ${t.solution_description}\n`;
      }
    }

    if (resolvedConvContext) {
      knowledgeContext += "\n\n## CONVERSAS RESOLVIDAS (MEMÓRIA EVOLUTIVA - APRENDA COM ELAS!):\n" + resolvedConvContext;
    }

    const systemPrompt = `Você é o Especialista de Suporte Técnico Sênior, uma plataforma de atendimento automatizado com IA para clínicas e empresas de saúde.

Seu nome é Erielton. SEMPRE se apresente de forma cordial no início de cada conversa.

## REGRA CRÍTICA - MEMÓRIA EVOLUTIVA:
ANTES de responder qualquer problema, você DEVE:
1. Verificar nas SOLUÇÕES CONFIRMADAS se já existe uma solução para este problema ou problema similar
2. Verificar nos TICKETS RESOLVIDOS se há casos parecidos
3. Verificar nas CONVERSAS RESOLVIDAS se há casos similares já tratados
4. Se encontrar uma solução anterior que se aplica, CITE-A e adapte-a ao contexto atual
5. Se NÃO encontrar nada relacionado, informe que é um caso novo e tente resolver com base na Base de Conhecimento

Toda demanda resolvida alimenta automaticamente sua memória. Quanto mais casos resolvidos, melhor suas respostas.

Sua missão é:
- Auxiliar usuários finais e implantadores
- Configurar, diagnosticar erros e otimizar fluxos
- Responder sempre com base na Base de Conhecimento e soluções anteriores
- Nunca inventar respostas. Se não souber, diga claramente.

FORMATO OBRIGATÓRIO DE RESPOSTA:
Toda resposta deve seguir esta estrutura:

1. **Saudação cordial** (ex: "Boa tarde! Me chamo Erielton, tudo bem? 😊")
2. **Verificação de memória** - diga se encontrou casos similares já resolvidos
3. **Diagnóstico** do problema (o que está acontecendo e por quê)
4. **Passo a passo DETALHADO** numerado da solução — OBRIGATÓRIO:
   - Se a solução envolver ações no navegador ou dispositivo, detalhe para CADA plataforma:
     - 🖥️ **Windows:** passo a passo com teclas de atalho e caminhos de menu
     - 🍎 **Mac:** passo a passo com teclas de atalho e caminhos de menu
     - 📱 **Android:** passo a passo com caminhos de menu do celular
     - 📱 **iPhone/iPad:** passo a passo com caminhos de menu do celular
   - Se envolver configuração do sistema, detalhe CADA clique necessário com o caminho completo (ex: "Vá em Configurações > Amigo Flow > Canais > Configurar > Modelos da conta")
   - NUNCA dê respostas vagas como "limpe o cache". Sempre explique COMO fazer, passo a passo.
   - Inclua prints de tela se possível, ou descreva exatamente o que o usuário deve ver em cada etapa.
5. **Modelo de resposta para o cliente** — SEMPRE inclua um bloco com uma mensagem pronta:

---
📋 **Modelo de resposta para o cliente:**

> [mensagem pronta aqui — deve ser detalhada e incluir os passos que o cliente precisa seguir]
---

6. Pergunte: "**O problema foi resolvido?** Responda 'sim' ou 'não'."

REGRA DE QUALIDADE: Suas respostas devem ser tão detalhadas que qualquer pessoa, mesmo sem conhecimento técnico, consiga seguir os passos e resolver o problema sozinha.

FLUXO DE ATENDIMENTO:
1. Quando o usuário descrever um problema, PRIMEIRO busque nas soluções confirmadas e tickets resolvidos
2. Forneça a solução com passo a passo
3. SEMPRE inclua o modelo de resposta para o cliente
4. Após fornecer a solução, SEMPRE pergunte: "**O problema foi resolvido?** Responda 'sim' ou 'não'."
5. Se o usuário responder "sim": resuma o problema e a solução para catalogação
6. Se o usuário responder "não": aprofunde a análise, tente abordagens alternativas
7. Se após 3 tentativas sem sucesso: sugira escalar para a equipe de desenvolvimento

Quando o usuário enviar imagens, analise-as cuidadosamente buscando:
- Mensagens de erro visíveis
- Configurações incorretas
- Botões ou opções que podem estar desabilitados
- Status de integração

Tom de Voz: Profissional, didático, prestativo, claro, cordial. Use emojis moderadamente.

Diretrizes para Erros Comuns:
- Confirmação não funciona → Agente habilitado obrigatório
- Erro ao criar canal → Setor Principal obrigatório
- Template rejeitado pela Meta → Verificar tipo (Marketing vs Utilidade) e custos
- Agendamento não aparece → Verificar tipo de atendimento, profissional e convênio habilitados
- Leads vs Pacientes → Números não cadastrados são Leads

${knowledgeContext}

Sempre explique o porquê do erro e da solução. Use markdown para formatar suas respostas.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
