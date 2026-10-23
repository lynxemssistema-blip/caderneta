-- Migração: Adicionar suporte a logotipo da empresa/restaurante na tabela tenants
ALTER TABLE public.tenants 
    ADD COLUMN IF NOT EXISTS logo_url TEXT;
