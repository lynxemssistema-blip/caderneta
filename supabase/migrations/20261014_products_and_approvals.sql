-- Migração: Módulo de Produtos, Vínculo de Itens, Aprovação de Usuários e Validação de E-mail

-- 1. Tabela de Produtos do Restaurante
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'MEAL', -- 'MEAL' (Refeição), 'BEVERAGE' (Bebida), 'DESSERT' (Sobremesa), 'OTHER' (Outros)
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Itens do Lançamento (Para registrar os produtos consumidos)
CREATE TABLE IF NOT EXISTS public.ledger_entry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_entry_id UUID NOT NULL REFERENCES public.ledger_entries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'MEAL',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Atualizar public.consumers com email, foto, código de verificação e status de aprovação
ALTER TABLE public.consumers 
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 4. Atualizar public.profiles com foto e email caso necessário
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'APPROVED';

-- 5. RLS e Políticas para Products e Itens
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir modificacao de produtos" ON public.products FOR ALL USING (true);

CREATE POLICY "Permitir leitura de itens de lancamento" ON public.ledger_entry_items FOR SELECT USING (true);
CREATE POLICY "Permitir modificacao de itens de lancamento" ON public.ledger_entry_items FOR ALL USING (true);

-- 6. Função de Aprovação de Consumidor pelo Master do Restaurante
CREATE OR REPLACE FUNCTION public.approve_consumer(
    p_consumer_id UUID,
    p_credit_limit NUMERIC DEFAULT 200.00
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.consumers
    SET approval_status = 'APPROVED',
        status = 'ACTIVE',
        individual_credit_limit = COALESCE(p_credit_limit, individual_credit_limit),
        approved_at = now()
    WHERE id = p_consumer_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função de Verificação de Código de E-mail
CREATE OR REPLACE FUNCTION public.verify_email_code(
    p_consumer_id UUID,
    p_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN := FALSE;
BEGIN
    SELECT (verification_code = p_code AND verification_code_expires_at > now())
    INTO v_valid
    FROM public.consumers
    WHERE id = p_consumer_id;

    IF v_valid THEN
        UPDATE public.consumers
        SET email_verified = TRUE,
            verification_code = NULL
        WHERE id = p_consumer_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Seed inicial de produtos para o Restaurante demonstração
DO $$
DECLARE
    v_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    INSERT INTO public.products (tenant_id, name, category, price, is_active)
    VALUES
    (v_tenant_id, 'Almoço Comercial Completo', 'MEAL', 25.00, TRUE),
    (v_tenant_id, 'Prato Feito Especial (PF)', 'MEAL', 22.00, TRUE),
    (v_tenant_id, 'Marmitex Grande', 'MEAL', 28.00, TRUE),
    (v_tenant_id, 'Refrigerante Lata 350ml', 'BEVERAGE', 6.00, TRUE),
    (v_tenant_id, 'Suco Natural 500ml', 'BEVERAGE', 8.50, TRUE),
    (v_tenant_id, 'Cerveja Long Neck', 'BEVERAGE', 10.00, TRUE),
    (v_tenant_id, 'Pudim Caseiro Fatia', 'DESSERT', 7.00, TRUE),
    (v_tenant_id, 'Café Expresso', 'OTHER', 4.00, TRUE)
    ON CONFLICT DO NOTHING;

    -- Atualizar consumidores existentes para APPROVED no seed
    UPDATE public.consumers
    SET approval_status = 'APPROVED', email_verified = TRUE
    WHERE tenant_id = v_tenant_id;
END $$;
