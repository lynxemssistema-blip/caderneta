import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Wine, 
  DollarSign, 
  CheckCircle2, 
  Lock, 
  Search, 
  Plus, 
  Power 
} from 'lucide-react';
import type { CorporateClient, Consumer } from '../types/database';
import { 
  fetchCorporateClients, 
  fetchConsumers, 
  registerConsumer, 
  supabase, 
  DEFAULT_TENANT_ID 
} from '../lib/supabase';
import { sound } from '../lib/sound';

export const GestorEmpresa: React.FC = () => {
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [selectedCorp, setSelectedCorp] = useState<CorporateClient | null>(null);
  const [employees, setEmployees] = useState<Consumer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, []);

  const loadData = async () => {
    const corpList = await fetchCorporateClients();
    setCorps(corpList);
    if (corpList.length > 0 && !selectedCorp) {
      setSelectedCorp(corpList[0]);
    }
  };

  useEffect(() => {
    if (selectedCorp) {
      loadEmployees(selectedCorp.id);
    }
  }, [selectedCorp]);

  const loadEmployees = async (corpId: string) => {
    const all = await fetchConsumers();
    const filtered = all.filter((c) => c.corporate_client_id === corpId);
    setEmployees(filtered);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorp || !empName.trim() || !empPhone.trim()) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    sound.playKeyClick();
    setLoading(true);

    try {
      // 1. Cadastrar o consumidor já vinculado à empresa selecionada
      const newConsumer = await registerConsumer({
        tenant_id: DEFAULT_TENANT_ID,
        name: empName.trim(),
        phone: empPhone.trim(),
        email: empEmail.trim() || undefined,
        pin: empPin,
        corporate_client_id: selectedCorp.id,
      });

      // 2. Definir regras específicas: aprovar automaticamente pela empresa, benefício de bebida e limite
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
      }

      sound.playSuccessChime();
      setFeedback(`Colaborador ${empName} cadastrado com sucesso com PIN ${empPin}!`);
      setIsAdding(false);
      setEmpName('');
      setEmpPhone('');
      setEmpEmail('');
      setEmpPin('1234');
      setCoversBeverage(false);
      setDailyLimit('35.00');

      loadEmployees(selectedCorp.id);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (emp: Consumer) => {
    sound.playKeyClick();
    const newStatus = emp.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await supabase
        .from('consumers')
        .update({ status: newStatus })
        .eq('id', emp.id);

      loadEmployees(selectedCorp!.id);
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

      loadEmployees(selectedCorp!.id);
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
      
      {/* Header do Gestor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Portal da Empresa Conveniada
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center gap-2">
            Gestão de Colaboradores & Benefício de Alimentação
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre os funcionários autorizados a almoçar no restaurante, defina se a empresa cobre bebidas/extras e acompanhe os gastos em tempo real.
          </p>
        </div>

        {/* Seletor de Empresa */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-bold text-slate-400">Empresa:</label>
          <select
            value={selectedCorp?.id || ''}
            onChange={(e) => {
              const c = corps.find((item) => item.id === e.target.value);
              if (c) setSelectedCorp(c);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {corps.map((c) => (
              <option key={c.id} value={c.id}>
                🏢 {c.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

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
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Fechamento</span>
              <span className="font-black text-slate-200">Todo dia {selectedCorp.closing_day}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Prazo de Pagamento</span>
              <span className="font-black text-slate-200">+{selectedCorp.payment_terms_days} dias</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
              <span className="text-slate-500 font-bold block uppercase text-[10px]">Política da Empresa</span>
              <span className="font-black text-blue-400">
                {selectedCorp.company_covers_only_meal ? 'Almoço (Bebida à parte)' : 'Almoço + Bebida Coberta'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Colaboradores da Empresa */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Colaboradores Autorizados ({employees.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
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

            {/* Configuração de Regras de Benefício: Bebida e Limite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              
              {/* Cobertura de Bebida */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                    <Wine className="w-4 h-4 text-amber-400" /> A empresa cobre a bebida/extra?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Se Não, a bebida é cobrada à vista ou cai na caderneta individual dele.
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

              {/* Limite Diário */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Limite de Refeição Diário
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Teto máximo de consumo coberto por dia
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
                {loading ? 'Salvando...' : 'Salvar e Autorizar Almoço'}
              </button>
            </div>
          </form>
        )}

        {/* Grid de Colaboradores */}
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

                {/* Benefícios Definidos para o Colaborador */}
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
                      {emp.company_covers_beverage ? 'Empresa Cobre' : 'À Parte (Pessoal)'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-400" /> PIN no Balcão:
                    </span>
                    <span className="font-mono font-bold text-slate-200">••••</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-500">
                    Consumo no Ciclo: <strong className="text-emerald-400 font-black">R$ {Number(emp.total_pending || 0).toFixed(2)}</strong>
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
                    {isActive ? 'Suspender' : 'Reativar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
