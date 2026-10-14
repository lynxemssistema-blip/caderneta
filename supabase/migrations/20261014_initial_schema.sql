-- Migração Inicial: Sistema Caderneta (Micro-SaaS Multi-tenant)
-- Supabase Self-Hosted PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tenants (Restaurantes assinantes do SaaS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    trade_name VARCHAR(150) NOT NULL,
    document_number VARCHAR(20), -- CNPJ ou CPF
    phone VARCHAR(20) NOT NULL,
    pix_key VARCHAR(100),
    pix_key_type VARCHAR(20) DEFAULT 'ALEATORIA', -- CPF, CNPJ, EMAIL, TELEFONE, ALEATORIA
    subscription_status VARCHAR(30) DEFAULT 'ACTIVE', -- TRIAL, ACTIVE, PAST_DUE, CANCELLED
    trial_until TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- 2. Perfis de Acesso de Usuários (Vinculados ou independentes do auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'CASHIER', -- 'SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'COMPANY_MANAGER', 'CONSUMER'
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    pin_hash VARCHAR(255), -- Hash bcrypt do PIN numérico de 4 a 6 dígitos
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Empresas Conveniadas (Clientes Corporativos do Restaurante)
CREATE TABLE IF NOT EXISTS public.corporate_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    manager_profile_id UUID REFERENCES public.profiles(id),
    company_name VARCHAR(150) NOT NULL,
    cnpj VARCHAR(20),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'QUINZENAL', -- 'SEMANAL', 'QUINZENAL', 'MENSAL'
    closing_day INTEGER DEFAULT 15, -- Dia de fechamento ou dia da semana
    payment_terms_days INTEGER DEFAULT 5, -- Dias após fechamento para pagar
    spending_limit_per_user NUMERIC(10,2) DEFAULT 0.00, -- 0.00 para ilimitado
    company_covers_only_meal BOOLEAN DEFAULT TRUE, -- Se TRUE, extras vão para conta pessoal
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Clientes Finais e Vínculos Corporativos
CREATE TABLE IF NOT EXISTS public.consumers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id),
    corporate_client_id UUID REFERENCES public.corporate_clients(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pin_hash VARCHAR(255), -- Armazena o hash do PIN de 4 dígitos para validação rápida no balcão
    has_individual_account BOOLEAN DEFAULT TRUE,
    individual_credit_limit NUMERIC(10,2) DEFAULT 200.00,
    individual_billing_cycle VARCHAR(20) DEFAULT 'SEMANAL',
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Lançamentos da Caderneta (Ledger Diário)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    consumer_id UUID NOT NULL REFERENCES public.consumers(id),
    corporate_client_id UUID REFERENCES public.corporate_clients(id),
    payer_type VARCHAR(20) NOT NULL, -- 'COMPANY' ou 'INDIVIDUAL'
    meal_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    extra_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00, -- Refrigerante, doce, etc.
    total_amount NUMERIC(10,2) GENERATED ALWAYS AS (meal_amount + extra_amount) STORED,
    description TEXT,
    signature_verified BOOLEAN DEFAULT FALSE,
    invoice_id UUID, -- Chave estrangeira para settlements/fatura
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'BILLED', 'PAID', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Faturas / Fechamentos (Settlements)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    corporate_client_id UUID REFERENCES public.corporate_clients(id),
    consumer_id UUID REFERENCES public.consumers(id), -- Preenchido se for fatura PF
    type VARCHAR(20) NOT NULL, -- 'COMPANY_INVOICE' ou 'INDIVIDUAL_INVOICE'
    cycle_start DATE NOT NULL,
    cycle_end DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(30), -- 'PIX', 'DINHEIRO', 'CARTAO'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar FK de invoice em ledger_entries se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ledger_entries_invoice'
    ) THEN
        ALTER TABLE public.ledger_entries 
        ADD CONSTRAINT fk_ledger_entries_invoice 
        FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_ledger_tenant ON public.ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_consumer ON public.ledger_entries(consumer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON public.ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_consumers_phone ON public.consumers(phone);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices(due_date, status);

-- 8. Funções de Negócio: Validação de PIN de 4 dígitos via pgcrypto
CREATE OR REPLACE FUNCTION public.verify_consumer_pin(p_consumer_id UUID, p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_hash TEXT;
BEGIN
    SELECT pin_hash INTO v_hash FROM public.consumers WHERE id = p_consumer_id;
    IF v_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN (v_hash = crypt(p_pin, v_hash));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar para definir PIN
CREATE OR REPLACE FUNCTION public.set_consumer_pin(p_consumer_id UUID, p_pin TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.consumers 
    SET pin_hash = crypt(p_pin, gen_salt('bf', 8))
    WHERE id = p_consumer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para Fechamento de Ciclo (Gerar Faturas a partir de pendências)
CREATE OR REPLACE FUNCTION public.close_cycle_and_generate_invoices(
    p_tenant_id UUID,
    p_due_days INT DEFAULT 5
)
RETURNS TABLE (
    generated_invoices_count INT,
    total_billed_amount NUMERIC
) AS $$
DECLARE
    r_corp RECORD;
    r_indiv RECORD;
    v_new_inv_id UUID;
    v_total NUMERIC;
    v_count INT := 0;
    v_sum NUMERIC := 0.00;
BEGIN
    -- 1. Faturas Corporativas
    FOR r_corp IN 
        SELECT corporate_client_id, SUM(total_amount) AS sum_amount, MIN(created_at::date) AS min_d, MAX(created_at::date) AS max_d
        FROM public.ledger_entries
        WHERE tenant_id = p_tenant_id 
          AND corporate_client_id IS NOT NULL 
          AND payer_type = 'COMPANY'
          AND status = 'PENDING'
        GROUP BY corporate_client_id
    LOOP
        INSERT INTO public.invoices (
            tenant_id, corporate_client_id, type, cycle_start, cycle_end, due_date, total_amount, status
        ) VALUES (
            p_tenant_id,
            r_corp.corporate_client_id,
            'COMPANY_INVOICE',
            r_corp.min_d,
            CURRENT_DATE,
            CURRENT_DATE + (p_due_days || ' days')::INTERVAL,
            r_corp.sum_amount,
            'OPEN'
        ) RETURNING id INTO v_new_inv_id;

        UPDATE public.ledger_entries
        SET status = 'BILLED', invoice_id = v_new_inv_id
        WHERE tenant_id = p_tenant_id 
          AND corporate_client_id = r_corp.corporate_client_id
          AND payer_type = 'COMPANY'
          AND status = 'PENDING';

        v_count := v_count + 1;
        v_sum := v_sum + r_corp.sum_amount;
    END LOOP;

    -- 2. Faturas Individuais
    FOR r_indiv IN 
        SELECT consumer_id, SUM(total_amount) AS sum_amount, MIN(created_at::date) AS min_d, MAX(created_at::date) AS max_d
        FROM public.ledger_entries
        WHERE tenant_id = p_tenant_id 
          AND payer_type = 'INDIVIDUAL'
          AND status = 'PENDING'
        GROUP BY consumer_id
    LOOP
        INSERT INTO public.invoices (
            tenant_id, consumer_id, type, cycle_start, cycle_end, due_date, total_amount, status
        ) VALUES (
            p_tenant_id,
            r_indiv.consumer_id,
            'INDIVIDUAL_INVOICE',
            r_indiv.min_d,
            CURRENT_DATE,
            CURRENT_DATE + (p_due_days || ' days')::INTERVAL,
            r_indiv.sum_amount,
            'OPEN'
        ) RETURNING id INTO v_new_inv_id;

        UPDATE public.ledger_entries
        SET status = 'BILLED', invoice_id = v_new_inv_id
        WHERE tenant_id = p_tenant_id 
          AND consumer_id = r_indiv.consumer_id
          AND payer_type = 'INDIVIDUAL'
          AND status = 'PENDING';

        v_count := v_count + 1;
        v_sum := v_sum + r_indiv.sum_amount;
    END LOOP;

    RETURN QUERY SELECT v_count, v_sum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Configuração de RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas padrão para anon/authenticated (compatível com modo self-hosted + JWT ou balcão offline)
CREATE POLICY "Permitir leitura pública/balcão para tenants" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Permitir modificação de tenants" ON public.tenants FOR ALL USING (true);

CREATE POLICY "Permitir leitura de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir modificação de perfis" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Permitir leitura de convenios" ON public.corporate_clients FOR SELECT USING (true);
CREATE POLICY "Permitir modificação de convenios" ON public.corporate_clients FOR ALL USING (true);

CREATE POLICY "Permitir leitura de clientes" ON public.consumers FOR SELECT USING (true);
CREATE POLICY "Permitir modificação de clientes" ON public.consumers FOR ALL USING (true);

CREATE POLICY "Permitir leitura de lancamentos" ON public.ledger_entries FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de lancamentos" ON public.ledger_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de lancamentos" ON public.ledger_entries FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura de faturas" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Permitir atualizacao de faturas" ON public.invoices FOR ALL USING (true);

-- 11. Carga de Dados Inicial (Seed para demonstração em Restaurante Real)
DO $$
DECLARE
    v_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_corp1_id UUID := 'b0000000-0000-0000-0000-000000000001';
    v_corp2_id UUID := 'b0000000-0000-0000-0000-000000000002';
    v_c1 UUID := 'c0000000-0000-0000-0000-000000000001';
    v_c2 UUID := 'c0000000-0000-0000-0000-000000000002';
    v_c3 UUID := 'c0000000-0000-0000-0000-000000000003';
    v_c4 UUID := 'c0000000-0000-0000-0000-000000000004';
BEGIN
    -- Inserir Restaurante
    INSERT INTO public.tenants (id, trade_name, document_number, phone, pix_key, pix_key_type, subscription_status)
    VALUES (v_tenant_id, 'Restaurante & Bar Sabor da Vila', '12.345.678/0001-90', '(11) 98765-4321', 'restaurante@sabordavila.com.br', 'EMAIL', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET trade_name = EXCLUDED.trade_name;

    -- Inserir Empresas Conveniadas
    INSERT INTO public.corporate_clients (id, tenant_id, company_name, cnpj, billing_cycle, closing_day, payment_terms_days, spending_limit_per_user, company_covers_only_meal)
    VALUES 
    (v_corp1_id, v_tenant_id, 'Oficina Mecânica São Jorge', '22.333.444/0001-55', 'QUINZENAL', 15, 5, 45.00, TRUE),
    (v_corp2_id, v_tenant_id, 'Transportadora Rápido Sol', '33.444.555/0001-66', 'MENSAL', 30, 5, 0.00, FALSE)
    ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name;

    -- Inserir Consumidores com PIN padrão '1234'
    INSERT INTO public.consumers (id, tenant_id, corporate_client_id, name, phone, pin_hash, has_individual_account, individual_credit_limit, status)
    VALUES 
    (v_c1, v_tenant_id, v_corp1_id, 'Carlos Alberto Mecânico', '(11) 99111-2233', crypt('1234', gen_salt('bf', 8)), TRUE, 300.00, 'ACTIVE'),
    (v_c2, v_tenant_id, v_corp1_id, 'Marcos Eletricista', '(11) 99222-3344', crypt('1234', gen_salt('bf', 8)), TRUE, 250.00, 'ACTIVE'),
    (v_c3, v_tenant_id, v_corp2_id, 'Roberto Motorista', '(11) 99333-4455', crypt('1234', gen_salt('bf', 8)), TRUE, 500.00, 'ACTIVE'),
    (v_c4, v_tenant_id, NULL, 'Dona Maria Vizinha (Fiado Avulso)', '(11) 99444-5566', crypt('1234', gen_salt('bf', 8)), TRUE, 200.00, 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- Inserir Lançamentos de Demonstração
    INSERT INTO public.ledger_entries (tenant_id, consumer_id, corporate_client_id, payer_type, meal_amount, extra_amount, description, signature_verified, status, created_at)
    VALUES 
    (v_tenant_id, v_c1, v_corp1_id, 'COMPANY', 26.00, 0.00, 'Prato Executivo Almoço', TRUE, 'PENDING', now() - interval '2 days'),
    (v_tenant_id, v_c1, NULL, 'INDIVIDUAL', 0.00, 7.00, 'Refrigerante Lata (Extra da Refeição)', TRUE, 'PENDING', now() - interval '2 days'),
    (v_tenant_id, v_c2, v_corp1_id, 'COMPANY', 28.50, 0.00, 'Comercial Completo', TRUE, 'PENDING', now() - interval '1 day'),
    (v_tenant_id, v_c3, v_corp2_id, 'COMPANY', 32.00, 6.00, 'Marmita Grande + Guaraná (Empresa cobre total)', TRUE, 'PENDING', now() - interval '3 hours'),
    (v_tenant_id, v_c4, NULL, 'INDIVIDUAL', 22.00, 4.00, 'Almoço + Café Expresso', TRUE, 'PENDING', now() - interval '1 day')
    ON CONFLICT DO NOTHING;

END $$;
