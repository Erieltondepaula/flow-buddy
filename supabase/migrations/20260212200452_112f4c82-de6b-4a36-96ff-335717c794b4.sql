
-- Storage bucket para anexos do chat
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Política de acesso público para leitura
CREATE POLICY "Public read access for chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');

-- Política para upload público (sem auth por enquanto)
CREATE POLICY "Public upload for chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');

-- Tabela de tickets de suporte catalogados
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
  error_description TEXT NOT NULL,
  solution_description TEXT,
  conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  error_registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  solution_registered_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
