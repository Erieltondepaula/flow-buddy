
-- Create table for module responsible contacts
CREATE TABLE public.module_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  sector TEXT NOT NULL,
  module TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_contacts ENABLE ROW LEVEL SECURITY;

-- Allow all access (same pattern as other tables in this project)
CREATE POLICY "Allow all access to module_contacts"
ON public.module_contacts
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_module_contacts_updated_at
BEFORE UPDATE ON public.module_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
