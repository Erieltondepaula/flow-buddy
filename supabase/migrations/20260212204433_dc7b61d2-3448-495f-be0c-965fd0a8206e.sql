
-- Kanban boards
CREATE TABLE public.kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to kanban_boards" ON public.kanban_boards FOR ALL USING (true) WITH CHECK (true);

-- Kanban columns
CREATE TABLE public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  color text DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to kanban_columns" ON public.kanban_columns FOR ALL USING (true) WITH CHECK (true);

-- Kanban cards
CREATE TABLE public.kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  label text DEFAULT null,
  label_color text DEFAULT null,
  start_date timestamptz DEFAULT null,
  due_date timestamptz DEFAULT null,
  group_name text DEFAULT null,
  conversation_id uuid DEFAULT null REFERENCES public.conversations(id) ON DELETE SET NULL,
  ticket_id uuid DEFAULT null REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to kanban_cards" ON public.kanban_cards FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_kanban_boards_updated_at BEFORE UPDATE ON public.kanban_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kanban_cards_updated_at BEFORE UPDATE ON public.kanban_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default board with columns
INSERT INTO public.kanban_boards (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Quadro Principal');
INSERT INTO public.kanban_columns (board_id, title, position, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'A Fazer', 0, '#3b82f6'),
  ('00000000-0000-0000-0000-000000000001', 'Em Andamento', 1, '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001', 'Concluído', 2, '#22c55e');
