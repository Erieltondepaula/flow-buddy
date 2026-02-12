
-- Add module column to existing tables
ALTER TABLE public.knowledge_entries ADD COLUMN module text DEFAULT 'Geral';
ALTER TABLE public.confirmed_solutions ADD COLUMN module text DEFAULT 'Geral';
ALTER TABLE public.support_tickets ADD COLUMN module text DEFAULT 'Geral';
ALTER TABLE public.kanban_cards ADD COLUMN module text DEFAULT 'Geral';

-- Create common_errors table (dynamic, not hardcoded)
CREATE TABLE public.common_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  checklist jsonb DEFAULT '[]'::jsonb,
  module text NOT NULL DEFAULT 'Geral',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.common_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to common_errors" ON public.common_errors FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_common_errors_updated_at BEFORE UPDATE ON public.common_errors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add common_error_id to kanban_cards
ALTER TABLE public.kanban_cards ADD COLUMN common_error_id uuid DEFAULT null REFERENCES public.common_errors(id) ON DELETE SET NULL;

-- Seed preset common errors
INSERT INTO public.common_errors (title, description, solution, severity, checklist, module) VALUES
  ('Confirmação automática não funciona', 'A confirmação automática não está sendo enviada para os pacientes.', 'A confirmação automática depende obrigatoriamente de um Agente habilitado.', 'high', '["Agente habilitado", "Setor Principal definido", "Canal vinculado"]', 'Amigo Flow'),
  ('Erro ao criar canal', 'Não é possível criar um novo canal de comunicação.', 'É obrigatório definir um Setor Principal antes de criar qualquer canal.', 'high', '["Unidade habilitada", "Profissional habilitado", "Setor configurado"]', 'Amigo Flow'),
  ('Template rejeitado pela Meta', 'Template de mensagem foi rejeitado ao submeter para aprovação.', 'Verifique o tipo do template: Marketing exige resposta do paciente. Atendimento/Utilidade serve para avisos.', 'medium', '["Tipo correto selecionado", "Conteúdo conforme políticas", "Custos revisados"]', 'Amigo Flow'),
  ('Agendamento não aparece', 'Horários de agendamento não aparecem para o paciente.', 'Verifique se tipo de atendimento, profissional e convênio estão habilitados ANTES de configurar Habilidades.', 'medium', '["Tipo de atendamento habilitado", "Profissional habilitado", "Convênio ativo"]', 'Amigo Clinic'),
  ('Leads não recebem mensagens', 'Contatos novos não recebem mensagens automáticas.', 'Números não cadastrados são tratados como Leads e seguem regras diferentes.', 'low', '["Regras de Leads configuradas", "Canal aceita Leads", "Template para Leads definido"]', 'Amigo Flow');
