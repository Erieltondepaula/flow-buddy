
-- Add sub_module to knowledge_entries for hierarchical categorization
ALTER TABLE public.knowledge_entries ADD COLUMN sub_module text DEFAULT NULL;
