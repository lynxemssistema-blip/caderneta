import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Utensils, 
  Clock, 
  Users, 
  Mail, 
  MessageSquare, 
  Printer, 
  X, 
  Eye,
  Crown,
  Power,
  Send,
  CheckCircle2,
  AlertCircle,
  Wine,
  DollarSign
} from 'lucide-react';

import type { CorporateClient, BillingCycle, Tenant, Consumer } from '../types/database';
import type { DetailedConsumptionItem } from '../lib/supabase';
import { 
  fetchCorporateClients, 
  createCorporateClient, 
  fetchTenant, 
  fetchDetailedCorporateConsumption, 
  fetchConsumers,
  registerConsumer,
  toggleConsumerResponsible,
  supabase 
} from '../lib/supabase';
import { 
  sendInviteEmail, 
  sendCorporateReportEmail, 
  sendPaymentReceiptEmail 
} from '../lib/emailService';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

interface ConveniosProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
}

export const Convenios: React.FC<ConveniosProps> = ({ tenantId, activeTenant }) => {
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Form de Empresa
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('SEMANAL');
  const [paymentWeekday, setPaymentWeekday] = useState<'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO'>('QUINTA');
  const [closingDay, setClosingDay] = useState(15);
  const [coversOnlyMeal, setCoversOnlyMeal] = useState(true);

  // Modal de Colaboradores & Responsáveis da Empresa

  const [selectedCorpForEmployees, setSelectedCorpForEmployees] = useState<CorporateClient | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpIsResponsible, setNewEmpIsResponsible] = useState(false);
  const [newEmpCoversBeverage, setNewEmpCoversBeverage] = useState(false);
  const [newEmpDailyLimit, setNewEmpDailyLimit] = useState('35.00');
  const [invitingEmployee, setInvitingEmployee] = useState(false);

  // Modal de Relatório de Consumo do Convênio
  const [detailedCorp, setDetailedCorp] = useState<CorporateClient | null>(null);
  const [consumptionList, setConsumptionList] = useState<DetailedConsumptionItem[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId, activeTenant?.id]);

  const loadData = async () => {
    const targetTenantId = tenantId || activeTenant?.id;
    if (!targetTenantId) {
      setCorps([]);
      setTenant(null);
      setConsumers([]);
      return;
    }
    const [cList, tData, consList] = await Promise.all([
      fetchCorporateClients(targetTenantId),
      fetchTenant(targetTenantId),
      fetchConsumers(targetTenantId)
    ]);
    setCorps(cList);
    setTenant(tData || activeTenant || null);
    setConsumers(consList);
  };

  const showSuccess = (msg: string) => {
    sound.playSuccessChime();
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 5000);
  };

  const showError = (msg: string) => {
    sound.playWarningBuzzer();
    setErrorFeedback(msg);
    setTimeout(() => setErrorFeedback(null), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    const targetTenantId = tenantId || tenant?.id || activeTenant?.id;
    if (!targetTenantId) {
      showError('Nenhum restaurante ativo selecionado.');
      return;
    }

    sound.playKeyClick();
    try {
      await createCorporateClient({
        tenant_id: targetTenantId,
        company_name: companyName.trim(),
        cnpj: cnpj.trim() || undefined,
        billing_cycle: billingCycle,
        payment_weekday: paymentWeekday,
        payment_day_type: billingCycle === 'SEMANAL' ? 'WEEKDAY' : 'MONTHDAY',
        closing_day: Number(closingDay),
        payment_terms_days: 5,
        spending_limit_per_user: 0,
        company_covers_only_meal: coversOnlyMeal
      });

      showSuccess(`Empresa "${companyName}" cadastrada com sucesso!`);
      setIsAdding(false);
      setCompanyName('');
      setCnpj('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar empresa';
      showError(msg);
    }
  };

  // Helper para saber se um consumidor é responsável financeiro da empresa
  const isConsumerResponsible = (emp: Consumer, corp: CorporateClient): boolean => {
    const cleanPhone = emp.phone.replace(/\D/g, '');
    const cleanEmail = (emp.email || '').toLowerCase().trim();

    return !!corp.contacts?.some(ct => {
      const ctPhone = (ct.phone || '').replace(/\D/g, '');
      const ctEmail = (ct.email || '').toLowerCase().trim();
      return (cleanPhone && ctPhone === cleanPhone) || (cleanEmail && ctEmail === cleanEmail);
    });
  };

  // Alternar se o colaborador é ou não Responsável Financeiro
  const handleToggleResponsible = async (emp: Consumer, corp: CorporateClient) => {
    sound.playKeyClick();
    const currentIsResp = isConsumerResponsible(emp, corp);
    const targetTenantId = tenantId || tenant?.id || activeTenant?.id;
    if (!targetTenantId) return;

    try {
      await toggleConsumerResponsible({
        consumer: emp,
        corpId: corp.id,
        makeResponsible: !currentIsResp,
        tenantId: targetTenantId
      });

      showSuccess(
        !currentIsResp 
          ? `👑 ${emp.name} agora é Responsável pelo Pagamento da empresa ${corp.company_name}!`
          : `${emp.name} desmarcado como responsável.`
      );
      await loadData();
      // Atualizar o selectedCorpForEmployees se aberto
      if (selectedCorpForEmployees) {
        const updated = (await fetchCorporateClients(targetTenantId)).find(c => c.id === corp.id);
        if (updated) setSelectedCorpForEmployees(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar responsável';
      showError(msg);
    }
  };

  // Ativar ou desativar (bloquear) colaborador
  const handleToggleEmployeeStatus = async (emp: Consumer) => {
    sound.playKeyClick();
    const newStatus = emp.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await supabase
        .from('consumers')
        .update({ status: newStatus })
        .eq('id', emp.id);

      showSuccess(`Colaborador ${emp.name} foi ${newStatus === 'ACTIVE' ? 'ativado' : 'bloqueado'}.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status';
      showError(msg);
    }
  };

  // Convidar e cadastrar novo colaborador para a empresa
  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorpForEmployees || !newEmpName.trim() || !newEmpPhone.trim()) {
      showError('Nome e telefone são obrigatórios.');
      return;
    }

    sound.playKeyClick();
    setInvitingEmployee(true);
    const targetTenantId = tenantId || tenant?.id || activeTenant?.id;
    if (!targetTenantId) {
      showError('Nenhum restaurante ativo selecionado.');
      setInvitingEmployee(false);
      return;
    }

    try {
      // 1. Cadastrar o consumidor
      const newConsumer = await registerConsumer({
        tenant_id: targetTenantId,
        name: newEmpName.trim(),
        phone: newEmpPhone.trim(),
        email: newEmpEmail.trim() || undefined,
        pin: '1234',
        corporate_client_id: selectedCorpForEmployees.id
      });

      if (!newConsumer?.id) throw new Error('Falha ao cadastrar colaborador');

      // 2. Definir regras do convênio
      await supabase
        .from('consumers')
        .update({
          approval_status: 'APPROVED',
          status: 'ACTIVE',
          email_verified: true,
          company_covers_beverage: newEmpCoversBeverage,
          daily_spending_limit: parseFloat(newEmpDailyLimit.replace(',', '.')) || 0,
          has_individual_account: true,
          individual_credit_limit: 200.00
        })
        .eq('id', newConsumer.id);

      // 3. Se marcado como responsável pelo pagamento, vincular
      if (newEmpIsResponsible) {
        await toggleConsumerResponsible({
          consumer: { ...newConsumer, name: newEmpName.trim(), phone: newEmpPhone.trim(), email: newEmpEmail.trim() },
          corpId: selectedCorpForEmployees.id,
          makeResponsible: true,
          tenantId: targetTenantId
        });
      }

      // 4. Se informou e-mail, enviar o convite oficial
      if (newEmpEmail.trim()) {
        const inviteUrl = `${window.location.origin}/?invite=true&tenant=${targetTenantId}&corp=${selectedCorpForEmployees.id}&email=${encodeURIComponent(newEmpEmail.trim())}&name=${encodeURIComponent(newEmpName.trim())}`;
        await sendInviteEmail({
          email: newEmpEmail.trim(),
          name: newEmpName.trim(),
          restaurantName: tenant?.trade_name || 'Restaurante Parceiro',
          inviteUrl,
          creditLimit: 200
        });
      }

      showSuccess(`Colaborador ${newEmpName} adicionado e convite enviado com sucesso!`);
      setNewEmpName('');
      setNewEmpPhone('');
      setNewEmpEmail('');
      setNewEmpIsResponsible(false);
      setNewEmpCoversBeverage(false);
      setNewEmpDailyLimit('35.00');

      await loadData();
      const updated = (await fetchCorporateClients(targetTenantId)).find(c => c.id === selectedCorpForEmployees.id);
      if (updated) setSelectedCorpForEmployees(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar';
      showError(msg);
    } finally {
      setInvitingEmployee(false);
    }
  };

  // Disparar relatório de faturas pendentes por e-mail para todos os responsáveis da empresa
  const handleSendEmailReport = async (corp: CorporateClient) => {
    sound.playKeyClick();
    const emails = (corp.contacts || [])
      .map(c => c.email?.trim())
      .filter((e): e is string => !!e && e.includes('@'));

    if (emails.length === 0) {
      showError(`A empresa ${corp.company_name} não possui nenhum e-mail de responsável cadastrado. Cadastre um responsável com e-mail primeiro.`);
      return;
    }

    try {
      const res = await sendCorporateReportEmail({
        emails,
        companyName: corp.company_name,
        restaurantName: tenant?.trade_name || 'Restaurante Parceiro',
        totalAmount: corp.total_pending || 0,
        cycleName: corp.billing_cycle === 'SEMANAL' ? `Semanal (${corp.payment_weekday || 'Quinta'})` : `Mensal (Dia ${corp.closing_day})`,
        dueDate: corp.billing_cycle === 'SEMANAL' ? `Toda ${corp.payment_weekday || 'Quinta-feira'}` : `Dia ${corp.closing_day}`,
        pixKey: tenant?.pix_key,
        pixKeyType: tenant?.pix_key_type,
        bankDetails: tenant?.bank_name ? `Banco: ${tenant.bank_name} | Ag: ${tenant.bank_agency} | CC: ${tenant.bank_account}` : undefined,
        employeeCount: corp.employee_count || 0
      });

      if (res.success) {
        showSuccess(`📧 Relatório de pagamentos enviado com sucesso para: ${emails.join(', ')}!`);
      } else {
        showError(`Falha ao disparar e-mail: ${res.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar e-mail';
      showError(msg);
    }
  };

  // Disparar recibo de pagamento confirmado por e-mail para todos os responsáveis
  const handleSendPaymentReceipt = async (corp: CorporateClient) => {
    sound.playKeyClick();
    const emails = (corp.contacts || [])
      .map(c => c.email?.trim())
      .filter((e): e is string => !!e && e.includes('@'));

    if (emails.length === 0) {
      showError(`A empresa ${corp.company_name} não possui nenhum e-mail de responsável cadastrado.`);
      return;
    }

    try {
      const res = await sendPaymentReceiptEmail({
        emails,
        companyName: corp.company_name,
        restaurantName: tenant?.trade_name || 'Restaurante Parceiro',
        paidAmount: corp.total_pending || 0,
        paymentMethod: 'PIX',
        paidAt: new Date().toLocaleDateString('pt-BR'),
        cycleName: corp.billing_cycle === 'SEMANAL' ? `Semanal (${corp.payment_weekday || 'Quinta'})` : 'Geral'
      });

      if (res.success) {
        showSuccess(`🧾 Recibo de quitação confirmado enviado para: ${emails.join(', ')}!`);
      } else {
        showError(`Falha ao enviar recibo: ${res.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao emitir recibo';
      showError(msg);
    }
  };

  const handleOpenReport = async (corp: CorporateClient) => {

    setDetailedCorp(corp);
    setLoadingConsumption(true);
    try {
      const list = await fetchDetailedCorporateConsumption(corp.id);
      setConsumptionList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConsumption(false);
    }
  };

  const handleSendWhatsAppBilling = (corp: CorporateClient) => {
    const primaryContact = corp.contacts?.find(c => c.is_primary) || corp.contacts?.[0];
    const phone = primaryContact?.phone || corp.cnpj || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const total = Number(corp.total_pending || 0).toFixed(2);

    const text = encodeURIComponent(
      `Olá, *${corp.company_name}*${primaryContact ? ` (A/C ${primaryContact.name})` : ''}!\n\n` +
      `Aqui é do *${tenant?.trade_name || 'Restaurante'}*.\n` +
      `Conforme combinado para o pagamento semanal (${corp.payment_weekday || 'Quinta-feira'}), estamos adiantando o relatório de consumo dos seus colaboradores.\n\n` +
      `💰 *Saldo Acumulado do Período:* R$ ${total}\n` +
      `👥 *Colaboradores que consumiram:* ${corp.employee_count || 0}\n\n` +
      `🔑 *Chave Pix para Pagamento:* ${tenant?.pix_key || ''} (${tenant?.pix_key_type || 'Chave'})\n` +
      (tenant?.bank_name ? `🏦 *Banco:* ${tenant.bank_name} | Ag: ${tenant.bank_agency || ''} | CC: ${tenant.bank_account || ''}\n` : '') +
      `\nQualquer dúvida sobre os itens consumidos, estamos à disposição!\n` +
      `Obrigado pela parceria!`
    );

    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const getBillingAlert = (corp: CorporateClient) => {
    const today = new Date().getDay();
    const dayMap: Record<string, number> = {
      'DOMINGO': 0, 'SEGUNDA': 1, 'TERCA': 2, 'QUARTA': 3, 'QUINTA': 4, 'SEXTA': 5, 'SABADO': 6
    };
    const targetDay = dayMap[corp.payment_weekday || 'QUINTA'] ?? 4;

    const diff = (targetDay - today + 7) % 7;
    if (diff === 1) {
      return { isWarning: true, message: `⚠️ Vence amanhã (${corp.payment_weekday || 'Quinta'}) - Enviar relatório hoje!` };
    } else if (diff === 0) {
      return { isWarning: true, message: `🚨 Vence hoje (${corp.payment_weekday || 'Quinta'})! Cobrança programada.` };
    }
    return { isWarning: false, message: `Paga toda ${corp.payment_weekday || 'Quinta-feira'}` };
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Feedbacks */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          {feedback}
        </div>
      )}
      {errorFeedback && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs sm:text-sm flex items-center gap-2 animate-pop">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          {errorFeedback}
        </div>
      )}

      {/* Header com Toggle e Botão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Gestão de Convênios & Empresas
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre empresas parceiras, envie convites para colaboradores, marque responsáveis pelo pagamento e envie faturas e recibos oficiais por e-mail.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap no-print">
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            onPrint={() => window.print()}
            printLabel="Exportar PDF"
          />

          <button
            onClick={() => {
              sound.playKeyClick();
              setIsAdding(!isAdding);
            }}
            className="touch-btn bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            Novo Convênio
          </button>
        </div>
      </div>

      {/* Formulário de Novo Convênio */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-pop shadow-xl no-print">
          <h3 className="font-extrabold text-base text-slate-100">Cadastrar Nova Empresa Conveniada</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Razão Social / Nome Fantasia *</label>
              <input
                type="text"
                required
                placeholder="Ex: Transportadora Rápido Sol"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">CNPJ (Opcional):</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Ciclo de Pagamento:</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="SEMANAL">Semanal (Dia Fixo da Semana)</option>
                <option value="QUINZENAL">Quinzenal (Dia 15 e 30)</option>
                <option value="MENSAL">Mensal (Fim do Mês / Dia 30)</option>
              </select>
            </div>

            {billingCycle === 'SEMANAL' ? (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Dia da Semana do Pagamento:</label>
                <select
                  value={paymentWeekday}
                  onChange={(e) => setPaymentWeekday(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="SEGUNDA">Toda Segunda-feira</option>
                  <option value="TERCA">Toda Terça-feira</option>
                  <option value="QUARTA">Toda Quarta-feira</option>
                  <option value="QUINTA">Toda Quinta-feira</option>
                  <option value="SEXTA">Toda Sexta-feira</option>
                  <option value="SABADO">Todo Sábado</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Dia do Vencimento:</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={closingDay}
                  onChange={(e) => setClosingDay(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
                />
              </div>
            )}
          </div>

          {/* Regra de Cobertura */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  Empresa cobre apenas a refeição (Prato Feito / Almoço)?
                </span>
                <span className="text-xs text-slate-400">
                  Se ativado, bebidas e sobremesas são cobradas à parte na caderneta pessoal do colaborador.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCoversOnlyMeal(!coversOnlyMeal)}
              className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 touch-btn ${
                coversOnlyMeal ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-md" />
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
            >
              Salvar Convênio
            </button>
          </div>
        </form>
      )}

      {/* LISTAGEM DE EMPRESAS: MODO CARDS OU TABELA */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {corps.map((corp) => {
            const alertInfo = getBillingAlert(corp);
            const corpEmployees = consumers.filter(c => c.corporate_client_id === corp.id);
            const responsibles = corp.contacts || [];

            return (
              <div
                key={corp.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      {corp.company_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">CNPJ: {corp.cnpj || 'Não cadastrado'}</p>
                  </div>

                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    Convênio Ativo
                  </span>
                </div>

                {/* Alerta de Vencimento / Fechamento Semanal */}
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  alertInfo.isWarning 
                    ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-slate-850 border border-slate-800 text-slate-300'
                }`}>
                  <Clock className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>{alertInfo.message}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-850 border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Ciclo</span>
                    <span className="text-xs font-black text-slate-200">{corp.billing_cycle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Pagamento</span>
                    <span className="text-xs font-black text-emerald-400">
                      {corp.billing_cycle === 'SEMANAL' ? (corp.payment_weekday || 'QUINTA') : `Dia ${corp.closing_day}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Equipe</span>
                    <span className="text-xs font-black text-slate-200">{corpEmployees.length} pessoas</span>
                  </div>
                </div>

                {/* Responsáveis pelo Pagamento da Empresa */}
                <div className="p-3.5 rounded-2xl bg-slate-850/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Responsáveis de Pagamento ({responsibles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCorpForEmployees(corp)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Gerenciar Equipe
                    </button>
                  </div>
                  
                  {responsibles.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {responsibles.map((r, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-center justify-between bg-slate-900/60 p-2 rounded-xl">
                          <span className="font-bold truncate text-white">
                            👑 {r.name}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            {r.email && <span className="text-slate-300">{r.email}</span>}
                            {r.phone && <span className="text-emerald-400 font-mono">{r.phone}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-300/80 bg-amber-950/30 p-2 rounded-xl border border-amber-500/20 flex items-center justify-between">
                      <span>Nenhum responsável marcado ainda.</span>
                      <button
                        onClick={() => setSelectedCorpForEmployees(corp)}
                        className="text-[10px] font-bold bg-amber-600/30 text-amber-200 px-2 py-0.5 rounded-lg hover:bg-amber-600/50"
                      >
                        Marcar Responsável
                      </button>
                    </div>
                  )}
                </div>

                {/* Saldo e Botões de Cobrança / Relatório / E-mail */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">SALDO DO CICLO ATUAL:</span>
                      <span className="text-xl font-black text-emerald-400">
                        R$ {Number(corp.total_pending || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Botão de Enviar Relatório por E-mail */}
                      <button
                        type="button"
                        onClick={() => handleSendEmailReport(corp)}
                        className="touch-btn px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-blue-500/30"
                        title="Enviar relatório de pagamentos pendentes por e-mail para os responsáveis"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        E-mail Fatura
                      </button>

                      {/* Botão de Enviar Recibo de Pagamento */}
                      <button
                        type="button"
                        onClick={() => handleSendPaymentReceipt(corp)}
                        className="touch-btn px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-500/30"
                        title="Enviar comprovante/recibo de quitação por e-mail para os responsáveis"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        Recibo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCorpForEmployees(corp)}
                      className="touch-btn px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      Colaboradores
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReport(corp)}
                      className="touch-btn px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      Extrato
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppBilling(corp)}
                      className="touch-btn px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Cobrança
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO TABELA */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Empresa</th>
                  <th className="px-4 py-3.5">CNPJ</th>
                  <th className="px-4 py-3.5">Ciclo & Pagamento</th>
                  <th className="px-4 py-3.5">Equipe</th>
                  <th className="px-4 py-3.5">Responsáveis Financeiros</th>
                  <th className="px-4 py-3.5 text-right">Saldo Atual</th>
                  <th className="px-4 py-3.5 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {corps.map((corp) => {
                  const alertInfo = getBillingAlert(corp);
                  const corpEmployees = consumers.filter(c => c.corporate_client_id === corp.id);
                  const responsibles = corp.contacts || [];

                  return (
                    <tr key={corp.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {corp.company_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{corp.cnpj || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-200 block">
                          {corp.billing_cycle === 'SEMANAL' ? `Toda ${corp.payment_weekday || 'Quinta'}` : `Mensal (Dia ${corp.closing_day})`}
                        </span>
                        {alertInfo.isWarning && (
                          <span className="text-[10px] text-amber-400 font-bold block">
                            {alertInfo.message}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{corpEmployees.length} colaboradores</td>
                      <td className="px-4 py-3">
                        {responsibles.length > 0 ? (
                          <div className="space-y-0.5">
                            {responsibles.map((r, i) => (
                              <div key={i} className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                👑 {r.name} {r.email && <span className="text-slate-400 font-normal">({r.email})</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Nenhum</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                        R$ {Number(corp.total_pending || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCorpForEmployees(corp)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400"
                            title="Gerenciar Colaboradores & Responsáveis"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendEmailReport(corp)}
                            className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-300"
                            title="Enviar Fatura por E-mail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReport(corp)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                            title="Ver Relatório Detalhado"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppBilling(corp)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                            title="Cobrar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PRINCIPAL: GERENCIAR COLABORADORES & RESPONSÁVEIS DE PAGAMENTO */}
      {selectedCorpForEmployees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-pop">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-left">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-emerald-400" />
                  Equipe & Responsáveis: {selectedCorpForEmployees.company_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Cadastre ou convide os funcionários da empresa, defina quem são os <strong>responsáveis pelo pagamento</strong> e controle permissões de consumo.
                </p>
              </div>
              <button
                onClick={() => setSelectedCorpForEmployees(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário: Convidar / Adicionar Novo Colaborador */}
            <form onSubmit={handleInviteEmployee} className="p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Convidar / Cadastrar Novo Colaborador para esta Empresa
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome do Colaborador *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">E-mail (para envio do convite/relatório)</label>
                  <input
                    type="email"
                    placeholder="carlos@empresa.com.br"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Opção Destacada: Marcar como Responsável pelo Pagamento */}
              <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">
                      Marcar este usuário como Responsável de Pagamento / Gestor da Empresa?
                    </span>
                    <span className="text-[11px] text-amber-300/80">
                      Receberá os relatórios de cobrança pendentes e recibos confirmados por e-mail, e poderá ativar/desativar funcionários no portal.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNewEmpIsResponsible(!newEmpIsResponsible)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    newEmpIsResponsible ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Regras de Benefício */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Wine className="w-4 h-4 text-amber-400" /> Cobrir Bebida/Extra?
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewEmpCoversBeverage(!newEmpCoversBeverage)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                      newEmpCoversBeverage ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {newEmpCoversBeverage ? 'Sim, Cobrir' : 'Não (À parte)'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Teto Diário
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold">R$</span>
                    <input
                      type="text"
                      value={newEmpDailyLimit}
                      onChange={(e) => setNewEmpDailyLimit(e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={invitingEmployee}
                  className="touch-btn px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {invitingEmployee ? 'Enviando Convite...' : 'Enviar Convite & Salvar Colaborador'}
                </button>
              </div>
            </form>

            {/* Lista dos Colaboradores Cadastrados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-300">
                  Colaboradores Associados à {selectedCorpForEmployees.company_name} ({
                    consumers.filter(c => c.corporate_client_id === selectedCorpForEmployees.id).length
                  })
                </h4>
              </div>

              {consumers.filter(c => c.corporate_client_id === selectedCorpForEmployees.id).length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                  Nenhum colaborador associado a esta empresa ainda. Preencha o formulário acima para convidar o primeiro!
                </div>
              ) : (
                <div className="space-y-2">
                  {consumers
                    .filter(c => c.corporate_client_id === selectedCorpForEmployees.id)
                    .map((emp) => {
                      const isResp = isConsumerResponsible(emp, selectedCorpForEmployees);
                      const isActive = emp.status === 'ACTIVE';

                      return (
                        <div
                          key={emp.id}
                          className="p-3.5 bg-slate-850 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{emp.name}</span>
                              
                              {/* Badge de Responsável */}
                              {isResp ? (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Crown className="w-3 h-3 fill-current" /> Responsável Pagamento
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                  Colaborador
                                </span>
                              )}

                              {/* Status Autorizado/Bloqueado */}
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                              }`}>
                                {isActive ? 'Autorizado' : 'Bloqueado'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 mt-1 text-slate-400 text-xs flex-wrap">
                              <span className="font-mono text-emerald-400">{emp.phone}</span>
                              {emp.email && <span>{emp.email}</span>}
                              <span>Consumo no Ciclo: <strong className="text-white">R$ {Number(emp.total_pending || 0).toFixed(2)}</strong></span>
                            </div>
                          </div>

                          {/* Ações para o Colaborador */}
                          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                            {/* Alternar se é Responsável Financeiro */}
                            <button
                              type="button"
                              onClick={() => handleToggleResponsible(emp, selectedCorpForEmployees)}
                              className={`touch-btn px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                                isResp 
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-300'
                              }`}
                              title={isResp ? 'Desmarcar como responsável de pagamento' : 'Marcar como responsável de pagamento'}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              {isResp ? 'É Responsável' : 'Tornar Responsável'}
                            </button>

                            {/* Alternar Status (Bloquear / Ativar) */}
                            <button
                              type="button"
                              onClick={() => handleToggleEmployeeStatus(emp)}
                              className={`touch-btn px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                                isActive
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/30 hover:bg-rose-900/60'
                                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60'
                              }`}
                              title={isActive ? 'Bloquear lançamento de refeições deste funcionário' : 'Reativar funcionário'}
                            >
                              <Power className="w-3.5 h-3.5" />
                              {isActive ? 'Bloquear' : 'Ativar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCorpForEmployees(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RELATÓRIO ANALÍTICO DA EMPRESA (PDF / WHATSAPP) */}
      {detailedCorp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto text-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Relatório Analítico de Consumo Corporativo
              </h3>
              <button
                onClick={() => setDetailedCorp(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabeçalho Oficial do Relatório com dados do restaurante */}
            <ReportHeader
              tenant={tenant}
              title={`Demonstrativo de Alimentação: ${detailedCorp.company_name}`}
              subtitle={`CNPJ: ${detailedCorp.cnpj || 'Não cadastrado'} • Vencimento: Toda ${detailedCorp.payment_weekday || 'Quinta-feira'}`}
              periodText={`Ciclo Ativo Atual`}
            />

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 no-print flex-wrap">
              <button
                type="button"
                onClick={() => handleSendEmailReport(detailedCorp)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn shadow-md"
              >
                <Mail className="w-4 h-4" />
                Enviar aos Responsáveis por E-mail
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Exportar PDF / Imprimir
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsAppBilling(detailedCorp)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar no WhatsApp
              </button>
            </div>

            {/* Lista dos Colaboradores e Itens Consumidos */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-200">
                Detalhamento dos Colaboradores no Ciclo:
              </h4>

              {loadingConsumption ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Carregando consumo da empresa...
                </div>
              ) : consumptionList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-850 rounded-2xl border border-slate-800 text-xs">
                  Nenhum lançamento registrado no ciclo atual desta empresa.
                </div>
              ) : (
                <div className="space-y-3">
                  {consumptionList.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          {entry.consumer_name} {entry.consumer_phone && `(${entry.consumer_phone})`}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(entry.created_at).toLocaleDateString('pt-BR')} às {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {entry.items && entry.items.length > 0 && (
                        <div className="pl-4 border-l-2 border-emerald-500/40 space-y-1 my-1">
                          {entry.items.map((sub, idx) => (
                            <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                              <span>{sub.quantity}x {sub.product_name}</span>
                              <span className="font-mono">R$ {sub.total_price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-bold">
                        <span className="text-slate-400">Total do Lançamento:</span>
                        <span className="text-emerald-400 font-black">
                          R$ {entry.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totalizador */}
              <div className="p-4 bg-slate-850 border border-slate-700 rounded-2xl flex items-center justify-between text-sm font-bold">
                <span className="text-slate-200">TOTAL ACUMULADO NO PERÍODO:</span>
                <span className="text-xl font-black text-emerald-400">
                  R$ {Number(detailedCorp.total_pending || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end no-print">
              <button
                type="button"
                onClick={() => setDetailedCorp(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
