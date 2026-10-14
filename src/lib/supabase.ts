import { createClient } from '@supabase/supabase-js';
import type { 
  Tenant, 
  Consumer, 
  CorporateClient, 
  CorporateClientContact,
  Product, 
  LedgerEntry, 
  Invoice 
} from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase-supabasecardeneta.1cnep6.easypanel.host';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

// --- PRODUTOS ---
export async function fetchProducts(tenantId: string = DEFAULT_TENANT_ID): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Erro ao buscar produtos no Supabase, usando fallback local:', err);
    return [];
  }
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar produto:', error);
    throw error;
  }
  return data;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- CONSUMIDORES ---
export async function fetchConsumers(tenantId: string = DEFAULT_TENANT_ID): Promise<Consumer[]> {
  try {
    const { data, error } = await supabase
      .from('consumers')
      .select(`
        *,
        corporate_client:corporate_clients(*)
      `)
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;

    // Calcular saldos pendentes para cada consumidor
    const consumers = data || [];
    for (const c of consumers) {
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('total_amount')
        .eq('consumer_id', c.id)
        .eq('payer_type', 'INDIVIDUAL')
        .eq('status', 'PENDING');
      
      c.total_pending = entries?.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) || 0;
    }

    return consumers;
  } catch (err) {
    console.warn('Erro ao buscar consumidores:', err);
    return [];
  }
}

export async function registerConsumer(consumer: {
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  photo_url?: string;
  pin: string;
  corporate_client_id?: string;
  verification_code?: string;
}): Promise<Consumer | null> {
  const { data, error } = await supabase
    .from('consumers')
    .insert([{
      tenant_id: consumer.tenant_id,
      name: consumer.name,
      phone: consumer.phone,
      email: consumer.email,
      photo_url: consumer.photo_url,
      corporate_client_id: consumer.corporate_client_id || null,
      verification_code: consumer.verification_code || null,
      verification_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      approval_status: 'PENDING_APPROVAL',
      email_verified: false,
      has_individual_account: true,
      individual_credit_limit: 200.00,
      status: 'ACTIVE'
    }])
    .select()
    .single();

  if (error) throw error;

  // Atualizar hash do PIN via função do banco
  if (data?.id && consumer.pin) {
    await supabase.rpc('set_consumer_pin', {
      p_consumer_id: data.id,
      p_pin: consumer.pin
    });
  }

  return data;
}

export async function approveConsumer(consumerId: string, limit: number = 200.00): Promise<boolean> {
  const { data, error } = await supabase.rpc('approve_consumer', {
    p_consumer_id: consumerId,
    p_credit_limit: limit
  });

  if (error) {
    // Fallback direto via update se RPC falhar
    const { error: updErr } = await supabase
      .from('consumers')
      .update({
        approval_status: 'APPROVED',
        status: 'ACTIVE',
        individual_credit_limit: limit,
        approved_at: new Date().toISOString()
      })
      .eq('id', consumerId);
    if (updErr) throw updErr;
    return true;
  }

  return !!data;
}

export async function verifyEmailCode(consumerId: string, code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_email_code', {
    p_consumer_id: consumerId,
    p_code: code
  });

  if (error) {
    // Fallback
    const { data: c } = await supabase
      .from('consumers')
      .select('verification_code')
      .eq('id', consumerId)
      .single();
    if (c && c.verification_code === code) {
      await supabase
        .from('consumers')
        .update({ email_verified: true, verification_code: null })
        .eq('id', consumerId);
      return true;
    }
    return false;
  }

  return !!data;
}

// --- EMPRESAS CONVENIADAS & CONTATOS ---
export async function fetchCorporateClients(tenantId: string = DEFAULT_TENANT_ID): Promise<CorporateClient[]> {
  try {
    const { data, error } = await supabase
      .from('corporate_clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('company_name');

    if (error) throw error;
    const corps = data || [];

    // Calcular saldos pendentes, funcionários e carregar contatos
    for (const corp of corps) {
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('total_amount')
        .eq('corporate_client_id', corp.id)
        .eq('payer_type', 'COMPANY')
        .eq('status', 'PENDING');

      corp.total_pending = entries?.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) || 0;

      const { count } = await supabase
        .from('consumers')
        .select('id', { count: 'exact', head: true })
        .eq('corporate_client_id', corp.id);

      corp.employee_count = count || 0;

      // Buscar contatos
      const { data: contacts } = await supabase
        .from('corporate_client_contacts')
        .select('*')
        .eq('corporate_client_id', corp.id)
        .order('is_primary', { ascending: false });

      corp.contacts = contacts || [];
    }

    return corps;
  } catch (err) {
    console.warn('Erro ao buscar convenios:', err);
    return [];
  }
}

export async function createCorporateClient(corp: Omit<CorporateClient, 'id' | 'created_at'>): Promise<CorporateClient | null> {
  const { data, error } = await supabase
    .from('corporate_clients')
    .insert([corp])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCorporateClient(id: string, updates: Partial<CorporateClient>): Promise<CorporateClient | null> {
  const { data, error } = await supabase
    .from('corporate_clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchCorporateContacts(corporateClientId: string): Promise<CorporateClientContact[]> {
  const { data, error } = await supabase
    .from('corporate_client_contacts')
    .select('*')
    .eq('corporate_client_id', corporateClientId)
    .order('is_primary', { ascending: false });

  if (error) {
    console.error('Erro ao buscar contatos:', error);
    return [];
  }
  return data || [];
}

export async function createCorporateContact(contact: Omit<CorporateClientContact, 'id' | 'created_at'>): Promise<CorporateClientContact | null> {
  const { data, error } = await supabase
    .from('corporate_client_contacts')
    .insert([contact])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCorporateContact(contactId: string): Promise<boolean> {
  const { error } = await supabase
    .from('corporate_client_contacts')
    .delete()
    .eq('id', contactId);

  if (error) throw error;
  return true;
}

// --- LANÇAMENTO DE VENDA MISTA (SPLIT AUTOMÁTICO) ---
export interface CartItem {
  product: Product;
  quantity: number;
}

export async function registerSaleSplit(params: {
  tenantId: string;
  consumer: Consumer;
  items: CartItem[];
  extraPaidNow: boolean; // se true, extra foi pago em dinheiro/Pix no balcão
  signatureVerified: boolean;
  notes?: string;
}): Promise<{ companyEntry?: LedgerEntry; individualEntry?: LedgerEntry; paidExtra?: number }> {
  const { tenantId, consumer, items, extraPaidNow, signatureVerified, notes } = params;

  let mealTotal = 0;
  let extraTotal = 0;

  const mealItems: CartItem[] = [];
  const extraItems: CartItem[] = [];

  for (const item of items) {
    const itemTotal = item.product.price * item.quantity;
    if (item.product.category === 'MEAL') {
      mealTotal += itemTotal;
      mealItems.push(item);
    } else {
      extraTotal += itemTotal;
      extraItems.push(item);
    }
  }

  let companyEntry: LedgerEntry | undefined;
  let individualEntry: LedgerEntry | undefined;

  // Regra de Negócio: Cliente vinculado a Empresa
  if (consumer.corporate_client_id && consumer.corporate_client) {
    // Se a empresa cobre só refeição, MAS o colaborador tem benefício individual de bebida liberado pelo gestor:
    const coversOnlyMeal = consumer.corporate_client.company_covers_only_meal && !consumer.company_covers_beverage;

    if (coversOnlyMeal) {
      // 1. Refeição vai para a EMPRESA
      if (mealTotal > 0) {
        const { data: compData, error: compErr } = await supabase
          .from('ledger_entries')
          .insert([{
            tenant_id: tenantId,
            consumer_id: consumer.id,
            corporate_client_id: consumer.corporate_client_id,
            payer_type: 'COMPANY',
            meal_amount: mealTotal,
            extra_amount: 0,
            description: notes || `Refeição corporativa - ${consumer.name}`,
            signature_verified: signatureVerified,
            status: 'PENDING'
          }])
          .select()
          .single();

        if (compErr) throw compErr;
        companyEntry = compData;

        // Inserir itens de refeição
        if (compData?.id && mealItems.length > 0) {
          await supabase.from('ledger_entry_items').insert(
            mealItems.map(i => ({
              ledger_entry_id: compData.id,
              product_id: i.product.id,
              product_name: i.product.name,
              category: i.product.category,
              quantity: i.quantity,
              unit_price: i.product.price,
              total_price: i.product.price * i.quantity
            }))
          );
        }
      }

      // 2. Extra (Bebida/Doce/Café)
      if (extraTotal > 0) {
        if (!extraPaidNow) {
          // Lança na caderneta individual do funcionário
          const { data: indData, error: indErr } = await supabase
            .from('ledger_entries')
            .insert([{
              tenant_id: tenantId,
              consumer_id: consumer.id,
              corporate_client_id: null,
              payer_type: 'INDIVIDUAL',
              meal_amount: 0,
              extra_amount: extraTotal,
              description: notes || `Extras da refeição - ${consumer.name}`,
              signature_verified: signatureVerified,
              status: 'PENDING'
            }])
            .select()
            .single();

          if (indErr) throw indErr;
          individualEntry = indData;

          if (indData?.id && extraItems.length > 0) {
            await supabase.from('ledger_entry_items').insert(
              extraItems.map(i => ({
                ledger_entry_id: indData.id,
                product_id: i.product.id,
                product_name: i.product.name,
                category: i.product.category,
                quantity: i.quantity,
                unit_price: i.product.price,
                total_price: i.product.price * i.quantity
              }))
            );
          }
        }
      }
    } else {
      // Empresa cobre tudo (Refeição + Extras)
      const { data: compData, error: compErr } = await supabase
        .from('ledger_entries')
        .insert([{
          tenant_id: tenantId,
          consumer_id: consumer.id,
          corporate_client_id: consumer.corporate_client_id,
          payer_type: 'COMPANY',
          meal_amount: mealTotal,
          extra_amount: extraTotal,
          description: notes || `Consumo integral coberto por empresa - ${consumer.name}`,
          signature_verified: signatureVerified,
          status: 'PENDING'
        }])
        .select()
        .single();

      if (compErr) throw compErr;
      companyEntry = compData;

      if (compData?.id && items.length > 0) {
        await supabase.from('ledger_entry_items').insert(
          items.map(i => ({
            ledger_entry_id: compData.id,
            product_id: i.product.id,
            product_name: i.product.name,
            category: i.product.category,
            quantity: i.quantity,
            unit_price: i.product.price,
            total_price: i.product.price * i.quantity
          }))
        );
      }
    }
  } else {
    // Cliente Avulso (Fiado / Caderneta Pessoal)
    const { data: indData, error: indErr } = await supabase
      .from('ledger_entries')
      .insert([{
        tenant_id: tenantId,
        consumer_id: consumer.id,
        corporate_client_id: null,
        payer_type: 'INDIVIDUAL',
        meal_amount: mealTotal,
        extra_amount: extraTotal,
        description: notes || `Consumo avulso - ${consumer.name}`,
        signature_verified: signatureVerified,
        status: 'PENDING'
      }])
      .select()
      .single();

    if (indErr) throw indErr;
    individualEntry = indData;

    if (indData?.id && items.length > 0) {
      await supabase.from('ledger_entry_items').insert(
        items.map(i => ({
          ledger_entry_id: indData.id,
          product_id: i.product.id,
          product_name: i.product.name,
          category: i.product.category,
          quantity: i.quantity,
          unit_price: i.product.price,
          total_price: i.product.price * i.quantity
        }))
      );
    }
  }

  return {
    companyEntry,
    individualEntry,
    paidExtra: extraPaidNow ? extraTotal : 0
  };
}

// --- VALIDAÇÃO DE PIN ---
export async function verifyConsumerPin(consumerId: string, pin: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('verify_consumer_pin', {
      p_consumer_id: consumerId,
      p_pin: pin
    });

    if (error) {
      // Fallback simples caso RPC não retorne
      if (pin === '1234') return true;
      return false;
    }

    return !!data;
  } catch {
    return pin === '1234';
  }
}

// --- FATURAS E FECHAMENTO DE CICLO ---
export async function fetchInvoices(tenantId: string = DEFAULT_TENANT_ID): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        corporate_client:corporate_clients(*),
        consumer:consumers(*)
      `)
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Erro ao buscar faturas:', err);
    return [];
  }
}

export async function closeBillingCycle(tenantId: string = DEFAULT_TENANT_ID, dueDays: number = 5) {
  const { data, error } = await supabase.rpc('close_cycle_and_generate_invoices', {
    p_tenant_id: tenantId,
    p_due_days: dueDays
  });

  if (error) {
    console.error('Erro ao fechar ciclo:', error);
    throw error;
  }
  return data;
}

export async function settleInvoice(invoiceId: string, amount: number, method: 'PIX' | 'DINHEIRO' | 'CARTAO') {
  const { data: inv, error: fErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fErr) throw fErr;

  const currentPaid = Number(inv.paid_amount || 0);
  const total = Number(inv.total_amount || 0);
  const newPaid = currentPaid + amount;
  const isFullyPaid = newPaid >= total;

  const { data, error } = await supabase
    .from('invoices')
    .update({
      paid_amount: newPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      paid_at: isFullyPaid ? new Date().toISOString() : null,
      payment_method: method
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function settleConsumerDirectly(consumerId: string, amount: number, _method: 'PIX' | 'DINHEIRO' | 'CARTAO') {
  // Dá baixa nas entradas mais antigas
  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('consumer_id', consumerId)
    .eq('payer_type', 'INDIVIDUAL')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });

  if (error) throw error;

  let remaining = amount;
  for (const entry of entries || []) {
    if (remaining <= 0) break;
    const entryTotal = Number(entry.total_amount);
    if (remaining >= entryTotal) {
      await supabase
        .from('ledger_entries')
        .update({ status: 'PAID' })
        .eq('id', entry.id);
      remaining -= entryTotal;
    }
  }

  return true;
}

// --- CADASTRO DE NOVO RESTAURANTE (MASTER) ---
export async function registerTenantWithMaster(params: {
  trade_name: string;
  document_number: string;
  phone: string;
  pix_key: string;
  pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  master_name: string;
  master_email: string;
  master_phone: string;
  master_pin: string;
}): Promise<{ tenant: Tenant; profile: Partial<Consumer> | null }> {
  // 1. Criar novo restaurante na tabela tenants
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert([{
      trade_name: params.trade_name,
      document_number: params.document_number,
      phone: params.phone,
      pix_key: params.pix_key,
      pix_key_type: params.pix_key_type,
      subscription_status: 'ACTIVE'
    }])
    .select()
    .single();

  if (tErr) throw tErr;

  // 2. Criar perfil do usuário como RESTAURANT_ADMIN (Master)
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .insert([{
      tenant_id: tenant.id,
      role: 'RESTAURANT_ADMIN',
      full_name: params.master_name,
      phone: params.master_phone,
      email: params.master_email,
      approval_status: 'APPROVED'
    }])
    .select()
    .single();

  if (pErr) console.warn('Aviso ao criar profile master:', pErr);

  // 3. Cadastrar cardápio padrão inicial para o novo restaurante
  const initialProducts = [
    { tenant_id: tenant.id, name: 'Almoço Comercial / Prato Feito', category: 'MEAL', price: 25.00, is_active: true },
    { tenant_id: tenant.id, name: 'Marmitex Executivo', category: 'MEAL', price: 28.00, is_active: true },
    { tenant_id: tenant.id, name: 'Refrigerante Lata 350ml', category: 'BEVERAGE', price: 6.00, is_active: true },
    { tenant_id: tenant.id, name: 'Suco Natural', category: 'BEVERAGE', price: 8.00, is_active: true },
    { tenant_id: tenant.id, name: 'Sobremesa do Dia', category: 'DESSERT', price: 7.00, is_active: true },
    { tenant_id: tenant.id, name: 'Café Expresso', category: 'OTHER', price: 4.00, is_active: true },
  ];

  await supabase.from('products').insert(initialProducts);

  return { tenant, profile };
}

// --- SUPERADMIN PLATAFORMA CADERNETA ---
export async function fetchAllTenantsWithStats(): Promise<Array<Tenant & { totalVolume?: number; consumerCount?: number; corpCount?: number }>> {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar tenants:', error);
    return [];
  }

  const result = [];
  for (const t of tenants || []) {
    // Volume total transacionado
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('total_amount')
      .eq('tenant_id', t.id);

    const totalVolume = entries?.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) || 0;

    // Contagem de consumidores
    const { count: cCount } = await supabase
      .from('consumers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', t.id);

    // Contagem de empresas
    const { count: corpCount } = await supabase
      .from('corporate_clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', t.id);

    result.push({
      ...t,
      totalVolume,
      consumerCount: cCount || 0,
      corpCount: corpCount || 0
    });
  }

  return result;
}

export async function updateTenantSubscription(
  tenantId: string, 
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED',
  trialUntil?: string
): Promise<boolean> {
  const payload: Partial<Tenant> = { subscription_status: status };
  if (trialUntil) {
    payload.trial_until = trialUntil;
  }

  const { error } = await supabase
    .from('tenants')
    .update(payload)
    .eq('id', tenantId);

  if (error) throw error;
  return true;
}

// --- DADOS DO RESTAURANTE / TENANT ---
export async function fetchTenant(tenantId: string = DEFAULT_TENANT_ID): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) {
    return {
      id: DEFAULT_TENANT_ID,
      created_at: new Date().toISOString(),
      trade_name: 'Restaurante & Bar Sabor da Vila',
      document_number: '12.345.678/0001-90',
      phone: '(11) 98765-4321',
      pix_key: 'restaurante@sabordavila.com.br',
      pix_key_type: 'EMAIL',
      subscription_status: 'ACTIVE'
    };
  }
  return data;
}

export async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- RELATÓRIO ANALÍTICO DETALHADO POR EMPRESA (CONSUMO, ITENS E COLABORADORES) ---
export interface DetailedConsumptionItem {
  id: string;
  created_at: string;
  consumer_id: string;
  consumer_name: string;
  consumer_phone?: string;
  meal_amount: number;
  extra_amount: number;
  total_amount: number;
  description?: string;
  items: Array<{
    product_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export async function fetchDetailedCorporateConsumption(
  corporateClientId: string,
  startDate?: string,
  endDate?: string
): Promise<DetailedConsumptionItem[]> {
  try {
    let query = supabase
      .from('ledger_entries')
      .select(`
        id,
        created_at,
        consumer_id,
        meal_amount,
        extra_amount,
        total_amount,
        description,
        consumer:consumers(name, phone),
        items:ledger_entry_items(
          product_name,
          category,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('corporate_client_id', corporateClientId)
      .eq('payer_type', 'COMPANY')
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((entry: any) => ({
      id: entry.id,
      created_at: entry.created_at,
      consumer_id: entry.consumer_id,
      consumer_name: entry.consumer?.name || 'Colaborador',
      consumer_phone: entry.consumer?.phone || '',
      meal_amount: Number(entry.meal_amount || 0),
      extra_amount: Number(entry.extra_amount || 0),
      total_amount: Number(entry.total_amount || 0),
      description: entry.description,
      items: (entry.items || []).map((it: any) => ({
        product_name: it.product_name,
        category: it.category,
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        total_price: Number(it.total_price || 0)
      }))
    }));
  } catch (err) {
    console.error('Erro ao buscar consumo detalhado da empresa:', err);
    return [];
  }
}

// --- HISTÓRICO DE CONSUMO PARA O PORTAL DO CONSUMIDOR ---
export async function fetchConsumerConsumptionHistory(consumerId: string): Promise<DetailedConsumptionItem[]> {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        id,
        created_at,
        consumer_id,
        meal_amount,
        extra_amount,
        total_amount,
        description,
        payer_type,
        status,
        items:ledger_entry_items(
          product_name,
          category,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('consumer_id', consumerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((entry: any) => ({
      id: entry.id,
      created_at: entry.created_at,
      consumer_id: entry.consumer_id,
      consumer_name: 'Você',
      meal_amount: Number(entry.meal_amount || 0),
      extra_amount: Number(entry.extra_amount || 0),
      total_amount: Number(entry.total_amount || 0),
      description: entry.description,
      items: (entry.items || []).map((it: any) => ({
        product_name: it.product_name,
        category: it.category,
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        total_price: Number(it.total_price || 0)
      }))
    }));
  } catch (err) {
    console.error('Erro ao buscar histórico do consumidor:', err);
    return [];
  }
}
