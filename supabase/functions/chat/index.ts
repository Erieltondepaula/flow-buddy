import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch knowledge base from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Build knowledge context
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
        knowledgeContext += `\n- **Problema:** ${sol.problem}\n  **Solução:** ${sol.solution} (Confirmada em ${sol.confirmed_at}, usada ${sol.usage_count}x)\n`;
      }
    }

    const systemPrompt = `Você é o Especialista de Suporte Técnico Sênior do Amigo Flow, uma plataforma de atendimento automatizado com IA para clínicas e empresas de saúde.

Sua missão é:
- Auxiliar usuários finais e implantadores
- Configurar, diagnosticar erros e otimizar fluxos
- Responder sempre com base na Base de Conhecimento fornecida
- Nunca inventar respostas. Se não souber, diga claramente.

Tom de Voz: Profissional, didático, prestativo, claro.

Regra de Ouro: Se existir conflito entre informações, informe o usuário claramente.

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
