import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Wine, 
  DollarSign, 
  CheckCircle2, 
  Search, 
  Plus, 
  Power,
  Printer, 
  Receipt, 
  User
} from 'lucide-react';
import type { CorporateClient, Consumer, Tenant } from '../types/database';
import type { DetailedConsumptionItem } from '../lib/supabase';
import { 
  fetchCorporateClients, 
  fetchConsumers, 
  registerConsumer, 
  fetchTenant,
  fetchDetailedCorporateConsumption,
  fetchConsumerConsumptionHistory,
  supabase 
} from '../lib/supabase';
import { sendInviteEmail } from '../lib/emailService';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';


interface GestorEmpresaProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
  userSession?: any;
}

export const GestorEmpresa: React.FC<GestorEmpresaProps> = ({ tenantId, activeTenant, userSession }) => {
  const [activeTab, setActiveTab] = useState<'EMPRESA' | 'MEU_CONSUMO'>('EMPRESA');
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [selectedCorp, setSelectedCorp] = useState<CorporateClient | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [employees, setEmployees] = useState<Consumer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Consumo geral da empresa
  const [consumptionList, setConsumptionList] = useState<DetailedConsumptionItem[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState(false);

  // Consumo pessoal do gestor
  const [myConsumer, setMyConsumer] = useState<Consumer | null>(null);
  const [myHistory, setMyHistory] = useState<DetailedConsumptionItem[]>([]);
  const [loadingMyHistory, setLoadingMyHistory] = useState(false);

  // Formulário de Cadastro de Colaborador
  const [isAdding, setIsAdding] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPin, setEmpPin] = useState('1234');
  const [coversBeverage, setCoversBeverage] = useState(false);
  const [dailyLimit, setDailyLimit] = useState('35.00');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId, activeTenant?.id]);

  const loadData = async () => {
    const targetTenantId = tenantId || activeTenant?.id || userSession?.user?.tenant_id;
    if (!targetTenantId) {
      setCorps([]);
      setTenant(null);
      setEmployees([]);
      return;
    }
    const [corpList, tData, allConsumers] = await Promise.all([
      fetchCorporateClients(targetTenantId),
      fetchTenant(targetTenantId),
      fetchConsumers(targetTenantId)
    ]);

    setCorps(corpList);
    setTenant(tData || activeTenant || null);

    // Identificar a empresa do usuário logado se for COMPANY_MANAGER
    let matchedCorp: CorporateClient | null = null;
    const userEmail = userSession?.user?.email?.toLowerCase().trim();
    const userPhone = userSession?.user?.phone?.replace(/\D/g, '');

    if (userEmail || userPhone) {
      matchedCorp = corpList.find(c => 
        c.contacts?.some(ct => 
          (userEmail && ct.email && ct.email.toLowerCase() === userEmail) ||
          (userPhone && ct.phone && ct.phone.replace(/\D/g, '') === userPhone)
        )
      ) || null;

      // Também identificar o perfil do gestor como consumidor individual
      const me = allConsumers.find(c => 
        (userPhone && c.phone.replace(/\D/g, '') === userPhone) ||
        (userEmail && c.email && c.email.toLowerCase() === userEmail)
      );
      if (me) {
        setMyConsumer(me);
        loadPersonalHistory(me.id);
      }
    }

    if (matchedCorp) {
      setSelectedCorp(matchedCorp);
      loadEmployeesAndConsumption(matchedCorp.id, allConsumers);
    } else if (corpList.length > 0) {
      setSelectedCorp(corpList[0]);
      loadEmployeesAndConsumption(corpList[0].id, allConsumers);
    } else {
      setSelectedCorp(null);
    }
  };

  const loadEmployeesAndConsumption = async (corpId: string, allCons?: Consumer[]) => {
    const targetTenantId = tenantId || activeTenant?.id || userSession?.user?.tenant_id;
    const all = allCons || (targetTenantId ? await fetchConsumers(targetTenantId) : []);
    const filtered = all.filter((c) => c.corporate_client_id === corpId);
    setEmployees(filtered);

    // Carregar consumo detalhado da empresa
    setLoadingConsumption(true);
    try {
      const items = await fetchDetailedCorporateConsumption(corpId);
      setConsumptionList(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConsumption(false);
    }
  };

  const loadPersonalHistory = async (consumerId: string) => {
    setLoadingMyHistory(true);
    try {
      const hist = await fetchConsumerConsumptionHistory(consumerId);
      setMyHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyHistory(false);
    }
  };

  useEffect(() => {
    if (selectedCorp) {
      loadEmployeesAndConsumption(selectedCorp.id);
    }
  }, [selectedCorp]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorp || !empName.trim() || !empPhone.trim()) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    sound.playKeyClick();
    setLoading(true);
    const targetTenantId = tenantId || tenant?.id || activeTenant?.id || userSession?.user?.tenant_id;
    if (!targetTenantId) {
      alert('Nenhum restaurante ativo selecionado para vincular o colaborador.');
      setLoading(false);
      return;
    }

    try {
      // 1. Cadastrar o colaborador vinculado à empresa
      const newConsumer = await registerConsumer({
        tenant_id: targetTenantId,
        name: empName.trim(),
        phone: empPhone.trim(),
        email: empEmail.trim() || undefined,
        pin: empPin,
        corporate_client_id: selectedCorp.id,
      });

      // 2. Definir regras específicas
      if (newConsumer?.id) {
        await supabase
          .from('consumers')
          .update({
            approval_status: 'APPROVED',
            status: 'ACTIVE',
            email_verified: true,
            company_covers_beverage: coversBeverage,
            daily_spending_limit: parseFloat(dailyLimit.replace(',', '.')) || 0,
            has_individual_account: true,
            individual_credit_limit: 200.00
          })
          .eq('id', newConsumer.id);

        // Se informou e-mail, disparar convite oficial
        if (empEmail.trim()) {
          const inviteUrl = `${window.location.origin}/?invite=true&tenant=${targetTenantId}&corp=${selectedCorp.id}&email=${encodeURIComponent(empEmail.trim())}&name=${encodeURIComponent(empName.trim())}`;
          await sendInviteEmail({
            email: empEmail.trim(),
            name: empName.trim(),
            restaurantName: tenant?.trade_name || 'Restaurante Parceiro',
            inviteUrl,
            creditLimit: 200
          });
        }
      }

      sound.playSuccessChime();
      setFeedback(`Colaborador ${empName} autorizado com sucesso com PIN ${empPin}!`);
      setIsAdding(false);
      setEmpName('');
      setEmpPhone('');
      setEmpEmail('');
      setEmpPin('1234');
      setCoversBeverage(false);
      setDailyLimit('35.00');

      loadEmployeesAndConsumption(selectedCorp.id);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // Ativar ou desativar colaborador
  const handleToggleStatus = async (emp: Consumer) => {
    sound.playKeyClick();
    const newStatus = emp.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await supabase
        .from('consumers')
        .update({ status: newStatus })
        .eq('id', emp.id);

      sound.playSuccessChime();
      setFeedback(`Colaborador ${emp.name} agora está ${newStatus === 'ACTIVE' ? 'AUTORIZADO' : 'BLOQUEADO'}.`);
      setTimeout(() => setFeedback(null), 4000);
      loadEmployeesAndConsumption(selectedCorp!.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBeverage = async (emp: Consumer) => {
    sound.playKeyClick();
    const newVal = !emp.company_covers_beverage;
    try {
      await supabase
        .from('consumers')
        .update({ company_covers_beverage: newVal })
        .eq('id', emp.id);

      loadEmployeesAndConsumption(selectedCorp!.id);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.phone.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 py-6 sm:px-6 space-y-6">
      
      {/* Header do Gestor com Alternância de Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Portal do Gestor & Responsável Financeiro
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center gap-2">
            {selectedCorp?.company_name || 'Gestão da Empresa Conveniada'}
          </h2>
          {corps.length > 1 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Alternar Empresa:</span>
              <select
                value={selectedCorp?.id || ''}
                onChange={(e) => {
                  const c = corps.find(item => item.id === e.target.value);
                  if (c) setSelectedCorp(c);
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white"
              >
                {corps.map(c => (
                  <option key={c.id} value={c.id}>🏢 {c.company_name}</option>
                ))}
              </select>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe todos os consumos da equipe, autorize ou bloqueie colaboradores e consulte seu extrato pessoal.
          </p>

        </div>

        {/* Alternador de Abas: Painel Corporativo vs Minha Conta */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('EMPRESA')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'EMPRESA'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Caderneta da Empresa
          </button>

          <button
            onClick={() => setActiveTab('MEU_CONSUMO')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'MEU_CONSUMO'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Meu Consumo Pessoal
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          {feedback}
        </div>
      )}

      {/* ABA 1: CADERNETA GERAL DA EMPRESA */}
      {activeTab === 'EMPRESA' && (
        <div className="space-y-6">
          
          {/* Card da Empresa e Fatura Atual */}
          {selectedCorp && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-400" />
                    {selectedCorp.company_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">CNPJ: {selectedCorp.cnpj || 'Não informado'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 text-right self-start sm:self-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Acumulado no Ciclo</span>
                  <span className="text-2xl font-black text-emerald-400">
                    R$ {Number(selectedCorp.total_pending || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Ciclo</span>
                  <span className="font-black text-slate-200">{selectedCorp.billing_cycle}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Pagamento</span>
                  <span className="font-black text-slate-200">
                    {selectedCorp.billing_cycle === 'SEMANAL' ? `Toda ${selectedCorp.payment_weekday || 'Quinta-feira'}` : `Dia ${selectedCorp.closing_day}`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Equipe Cadastrada</span>
                  <span className="font-black text-slate-200">{employees.length} colaboradores</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Chave Pix do Restaurante</span>
                  <span className="font-mono font-bold text-emerald-400 truncate block">
                    {tenant?.pix_key || 'Cadastrada no balcão'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Seção 1: Gestão de Colaboradores (Ativar / Desativar) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Colaboradores Autorizados ({employees.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap no-print">
                <ViewToggle
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onPrint={() => window.print()}
                  printLabel="Exportar Equipe"
                />

                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => {
                    sound.playKeyClick();
                    setIsAdding(!isAdding);
                  }}
                  className="touch-btn bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Colaborador
                </button>
              </div>
            </div>

            {/* Formulário de Cadastro de Colaborador pelo Gestor */}
            {isAdding && (
              <form onSubmit={handleCreateEmployee} className="p-6 bg-slate-900 border border-blue-500/40 rounded-3xl space-y-4 animate-pop shadow-2xl">
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  Novo Colaborador para {selectedCorp?.company_name}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Nome do Funcionário *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pedro Henrique Silva"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Telefone / Celular *</label>
                    <input
                      type="tel"
                      required
                      placeholder="(11) 98888-7777"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">E-mail do Funcionário</label>
                    <input
                      type="email"
                      placeholder="pedro@empresa.com.br"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">PIN de Assinatura (4 dígitos) *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="1234"
                      value={empPin}
                      onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-black text-center tracking-widest focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                        <Wine className="w-4 h-4 text-amber-400" /> A empresa cobre a bebida/extra?
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Se Não, bebidas ficam registradas na caderneta pessoal dele.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCoversBeverage(!coversBeverage)}
                      className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
                        coversBeverage ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" /> Limite de Refeição Diário
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Teto máximo coberto por dia
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-slate-400">R$</span>
                      <input
                        type="text"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-sm font-black text-white text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md"
                  >
                    {loading ? 'Salvando...' : 'Salvar e Convidar Colaborador'}
                  </button>
                </div>
              </form>
            )}

            {/* Grid / Tabela de Colaboradores */}
            {viewMode === 'CARDS' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((emp) => {
                  const isActive = emp.status === 'ACTIVE';

                  return (
                    <div
                      key={emp.id}
                      className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-base text-slate-100 flex items-center gap-1.5">
                            {emp.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">{emp.phone}</p>
                          {emp.email && <p className="text-[11px] text-slate-500">{emp.email}</p>}
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isActive ? 'Autorizado' : 'Bloqueado'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Wine className="w-3.5 h-3.5 text-amber-400" /> Benefício Bebida:
                          </span>
                          <button
                            onClick={() => handleToggleBeverage(emp)}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                              emp.company_covers_beverage
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {emp.company_covers_beverage ? 'Empresa Cobre' : 'À Parte'}
                          </button>
                        </div>
                      </div>

                      {/* Botão de Ativar / Desativar do Gestor */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-xs text-slate-500">
                          Consumo: <strong className="text-emerald-400 font-black">R$ {Number(emp.total_pending || 0).toFixed(2)}</strong>
                        </span>

                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`touch-btn text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 ${
                            isActive
                              ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {isActive ? 'Desativar / Bloquear' : 'Ativar Acesso'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3.5">Nome do Colaborador</th>
                        <th className="px-4 py-3.5">Telefone</th>
                        <th className="px-4 py-3.5">E-mail</th>
                        <th className="px-4 py-3.5">Regra Bebida</th>
                        <th className="px-4 py-3.5 text-right">Consumo no Ciclo</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                        <th className="px-4 py-3.5 text-center no-print">Ação do Gestor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-medium">
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            {emp.name}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{emp.phone}</td>
                          <td className="px-4 py-3 text-slate-400">{emp.email || '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleBeverage(emp)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                emp.company_covers_beverage ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {emp.company_covers_beverage ? 'Empresa Cobre' : 'À Parte'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                            R$ {Number(emp.total_pending || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              emp.status === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            }`}>
                              {emp.status === 'ACTIVE' ? 'Autorizado' : 'Bloqueado'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center no-print">
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`px-3 py-1 rounded text-xs font-bold ${
                                emp.status === 'ACTIVE'
                                  ? 'bg-rose-950 text-rose-400 hover:bg-rose-900'
                                  : 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900'
                              }`}
                            >
                              {emp.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Caderneta Geral Analítica (Todos os Consumos e Detalhes) */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  Caderneta Geral: Todos os Lançamentos e Detalhes
                </h3>
                <p className="text-xs text-slate-400">
                  Extrato completo com cada almoço, prato, bebida e valor consumido pelos colaboradores no restaurante.
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn no-print"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Imprimir Extrato
              </button>
            </div>

            {loadingConsumption ? (
              <div className="p-8 text-center text-slate-500 text-xs">Carregando extrato analítico...</div>
            ) : consumptionList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-850 rounded-2xl border border-slate-800 text-xs">
                Nenhum lançamento registrado no ciclo atual.
              </div>
            ) : (
              <div className="space-y-3">
                {consumptionList.map((entry) => (
                  <div key={entry.id} className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-white flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        {entry.consumer_name} ({entry.consumer_phone})
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')} às {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {entry.items && entry.items.length > 0 && (
                      <div className="pl-4 border-l-2 border-blue-500/40 space-y-1 my-1">
                        {entry.items.map((sub, idx) => (
                          <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                            <span>{sub.quantity}x {sub.product_name} ({sub.category === 'MEAL' ? 'Almoço' : 'Extra'})</span>
                            <span className="font-mono">R$ {sub.total_price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold">
                      <span className="text-slate-400">Total do Lançamento:</span>
                      <span className="text-emerald-400 font-black text-sm">R$ {entry.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ABA 2: MEU CONSUMO PESSOAL (MINHA CADERNETA) */}
      {activeTab === 'MEU_CONSUMO' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xl">
                  {myConsumer?.name?.charAt(0) || userSession?.user?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {myConsumer?.name || userSession?.user?.full_name || 'Minha Conta de Consumidor'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {myConsumer?.phone || userSession?.user?.phone} • {myConsumer?.email || userSession?.user?.email}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 text-right self-start sm:self-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Meu Saldo Devedor Individual</span>
                <span className="text-2xl font-black text-emerald-400">
                  R$ {Number(myConsumer?.total_pending || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <h4 className="font-bold text-sm text-slate-200">Histórico dos Meus Consumos Pessoais:</h4>

            {loadingMyHistory ? (
              <div className="p-8 text-center text-slate-500 text-xs">Carregando histórico pessoal...</div>
            ) : myHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-850 rounded-2xl border border-slate-800 text-xs">
                Você ainda não possui consumos individuais registrados neste restaurante.
              </div>
            ) : (
              <div className="space-y-3">
                {myHistory.map((item) => (
                  <div key={item.id} className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block">
                        {item.description || 'Almoço / Refeição'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="font-mono font-black text-emerald-400 text-sm">
                      R$ {item.total_amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
