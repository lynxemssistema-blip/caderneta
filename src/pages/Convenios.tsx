import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Utensils 
} from 'lucide-react';
import type { CorporateClient, BillingCycle } from '../types/database';
import { fetchCorporateClients, createCorporateClient, DEFAULT_TENANT_ID } from '../lib/supabase';
import { sound } from '../lib/sound';

export const Convenios: React.FC = () => {
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('QUINZENAL');
  const [closingDay] = useState(15);
  const [paymentTermsDays, setPaymentTermsDays] = useState(5);
  const [spendingLimit] = useState('0.00');
  const [coversOnlyMeal, setCoversOnlyMeal] = useState(true);

  useEffect(() => {
    loadCorps();
  }, []);

  const loadCorps = async () => {
    const list = await fetchCorporateClients();
    setCorps(list);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    sound.playKeyClick();
    try {
      await createCorporateClient({
        tenant_id: DEFAULT_TENANT_ID,
        company_name: companyName.trim(),
        cnpj: cnpj.trim() || undefined,
        billing_cycle: billingCycle,
        closing_day: Number(closingDay),
        payment_terms_days: Number(paymentTermsDays),
        spending_limit_per_user: parseFloat(spendingLimit.replace(',', '.')) || 0,
        company_covers_only_meal: coversOnlyMeal
      });

      sound.playSuccessChime();
      setIsAdding(false);
      setCompanyName('');
      setCnpj('');
      loadCorps();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar empresa';
      alert(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Gestão de Convênios Corporativos
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre empresas parceiras (oficinas, transportadoras, fábricas) e configure regras de fechamento e cobertura de refeição.
          </p>
        </div>

        <button
          onClick={() => {
            sound.playKeyClick();
            setIsAdding(!isAdding);
          }}
          className="touch-btn self-start sm:self-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-5 h-5" />
          Novo Convênio
        </button>
      </div>

      {/* Formulário de Novo Convênio */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-pop shadow-xl">
          <h3 className="font-extrabold text-base text-slate-100">Cadastrar Nova Empresa Conveniada</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Razão Social / Nome Fantasia:</label>
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
              <label className="text-xs font-bold text-slate-400 block mb-1">Ciclo de Fechamento:</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="SEMANAL">Semanal (Toda Sexta)</option>
                <option value="QUINZENAL">Quinzenal (Dia 15 e 30)</option>
                <option value="MENSAL">Mensal (Fim do Mês)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Prazo para Pagamento (Dias):</label>
              <input
                type="number"
                min={1}
                max={30}
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(parseInt(e.target.value, 10))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
              />
            </div>
          </div>

          {/* Regra de Cobertura */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  Empresa cobre apenas a refeição (Prato Feito / Almoço)?
                </span>
                <span className="text-xs text-slate-400">
                  Se ativado, bebidas e sobremesas são cobradas à vista ou caem no fiado pessoal do funcionário.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCoversOnlyMeal(!coversOnlyMeal)}
              className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${
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

      {/* Lista de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {corps.map((corp) => (
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

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-850 border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Fechamento</span>
                <span className="text-xs font-black text-slate-200">{corp.billing_cycle}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Vencimento</span>
                <span className="text-xs font-black text-slate-200">+{corp.payment_terms_days} dias</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Equipe</span>
                <span className="text-xs font-black text-slate-200">{corp.employee_count || 0} pessoas</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                {corp.company_covers_only_meal
                  ? 'Política: Empresa cobre apenas refeições (extras vão para a conta pessoal).'
                  : 'Política: Empresa cobre consumo integral (refeições + bebidas e extras).'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-bold">SALDO DO CICLO ATUAL:</span>
              <span className="text-xl font-black text-emerald-400">
                R$ {Number(corp.total_pending || 0).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
