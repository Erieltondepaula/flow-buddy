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

      // Also save to confirmed_solutions for knowledge base
      await supabase.from("confirmed_solutions").insert({
        problem: ticketData.problem,
        solution: ticketData.solution,
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
    const { data: knowledgeEntries } = await supabase
      .from("knowledge_entries")
      .select("title, content, source_type")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: confirmedSolutions } = await supabase
      .from("confirmed_solutions")
      .select("problem, solution, confirmed_at, usage_count")
      .order("usage_count", { ascending: false })
      .limit(20);

    const { data: recentTickets } = await supabase
      .from("support_tickets")
      .select("title, error_description, solution_description, status")
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(10);

    let knowledgeContext = "";
    if (knowledgeEntries && knowledgeEntries.length > 0) {
      knowledgeContext += "\n\n## BASE DE CONHECIMENTO:\n";
      for (const entry of knowledgeEntries) {
        knowledgeContext += `\n### ${entry.title} (${entry.source_type})\n${entry.content}\n`;
      }
    }

    if (confirmedSolutions && confirmedSolutions.length > 0) {
      knowledgeContext += "\n\n## SOLUÇÕES CONFIRMADAS:\n";
      for (const sol of confirmedSolutions) {
        knowledgeContext += `\n- **Problema:** ${sol.problem}\n  **Solução:** ${sol.solution}\n`;
      }
    }

    if (recentTickets && recentTickets.length > 0) {
      knowledgeContext += "\n\n## TICKETS RESOLVIDOS RECENTEMENTE:\n";
      for (const t of recentTickets) {
        knowledgeContext += `\n- **${t.title}:** ${t.error_description} → ${t.solution_description}\n`;
      }
    }

    const systemPrompt = `Você é o Especialista de Suporte Técnico Sênior do Amigo Flow, uma plataforma de atendimento automatizado com IA para clínicas e empresas de saúde.

Sua missão é:
- Auxiliar usuários finais e implantadores
- Configurar, diagnosticar erros e otimizar fluxos
- Responder sempre com base na Base de Conhecimento fornecida
- Nunca inventar respostas. Se não souber, diga claramente.

FLUXO DE ATENDIMENTO IMPORTANTE:
1. Quando o usuário descrever um problema, analise e forneça a solução
2. Após fornecer uma solução, SEMPRE pergunte: "**O problema foi resolvido?** Responda 'sim' ou 'não'."
3. Se o usuário responder "sim": resuma o problema e a solução de forma clara para catalogação
4. Se o usuário responder "não": aprofunde a análise, peça mais detalhes, tente abordagens alternativas
5. Se após 3 tentativas sem sucesso: sugira escalar para a equipe de desenvolvimento

Quando o usuário enviar imagens, analise-as cuidadosamente buscando:
- Mensagens de erro visíveis
- Configurações incorretas
- Botões ou opções que podem estar desabilitados
- Status de integração

Tom de Voz: Profissional, didático, prestativo, claro.

Regra de Ouro: Se existir conflito entre informações, informe claramente.

Diretrizes para Erros Comuns:
- Confirmação não funciona → Agente habilitado obrigatório
- Erro ao criar canal → Setor Principal obrigatório
- Template rejeitado pela Meta → Verificar tipo (Marketing vs Utilidade) e custos
- Agendamento não aparece → Verificar tipo de atendimento, profissional e convênio habilitados
- Leads vs Pacientes → Números não cadastrados são Leads

Validação Obrigatória antes de responder:
- Unidade habilitada
- Profissional habilitado
- Convênio habilitado
- Setor configurado

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
