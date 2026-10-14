import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Store, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink 
} from 'lucide-react';
import type { Tenant } from '../types/database';
import { fetchAllTenantsWithStats, updateTenantSubscription } from '../lib/supabase';
import { sound } from '../lib/sound';

interface SuperAdminProps {
  onSelectTenant: (tenant: Tenant) => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onSelectTenant }) => {
  const [tenants, setTenants] = useState<Array<Tenant & { totalVolume?: number; consumerCount?: number; corpCount?: number }>>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await fetchAllTenantsWithStats();
      setTenants(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (
    tenantId: string, 
    newStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED',
    daysToAdd: number = 30
  ) => {
    sound.playKeyClick();
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + daysToAdd);

      await updateTenantSubscription(tenantId, newStatus, newDate.toISOString());
      sound.playSuccessChime();
      setFeedback(`Status atualizado para ${newStatus} com sucesso!`);
      loadTenants();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar plano';
      alert(msg);
    }
  };

  // Métricas do SaaS Caderneta
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.subscription_status === 'ACTIVE').length;
  const trialTenants = tenants.filter((t) => t.subscription_status === 'TRIAL').length;
  const totalVolume = tenants.reduce((acc, curr) => acc + (curr.totalVolume || 0), 0);
  const estimatedMRR = activeTenants * 97.00; // Simulação de mensalidade de R$ 97/mês por restaurante

  return (
    <div className="max-w-7xl mx-auto px-3 py-6 sm:px-6 space-y-6">
      
      {/* Header Superadmin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Painel Superadmin da Plataforma
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center gap-2">
            Gestão Global de Restaurantes & Assinaturas
          </h2>
          <p className="text-xs text-slate-400">
            Controle de planos, pagamentos de assinaturas, períodos de teste (Trial) e faturamento dos restaurantes assinantes.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Cards de Métricas do SaaS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Restaurantes Assinantes</span>
          <div className="text-3xl font-black text-white">{totalTenants}</div>
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <span className="text-emerald-400 font-bold">{activeTenants} Ativos</span> • 
            <span className="text-blue-400 font-bold">{trialTenants} em Teste</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Receita Recorrente (MRR)</span>
          <div className="text-3xl font-black text-emerald-400">R$ {estimatedMRR.toFixed(2)}</div>
          <p className="text-[11px] text-slate-500">Estimado em R$ 97/mês por restaurante ativo</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Volume Transacionado no SaaS</span>
          <div className="text-3xl font-black text-amber-400">R$ {totalVolume.toFixed(2)}</div>
          <p className="text-[11px] text-slate-500">Total somado de fiado e convênios processados</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Infraestrutura Supabase</span>
          <div className="text-lg font-black text-purple-400 flex items-center gap-1.5 mt-1">
            <Sparkles className="w-5 h-5 text-amber-400" /> PostgreSQL 15+
          </div>
          <p className="text-[11px] text-slate-400">Lynx EMS Cloud • Self-Hosted</p>
        </div>

      </div>

      {/* Lista de Restaurantes (Tenants) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            Restaurantes Cadastrados na Plataforma
          </h3>
          <span className="text-xs text-slate-400">
            {tenants.length} estabelecimentos
          </span>
        </div>

        {tenants.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Nenhum restaurante encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {tenants.map((t) => {
              const trialDate = t.trial_until ? new Date(t.trial_until) : null;
              const isPastDue = t.subscription_status === 'PAST_DUE';
              const isActive = t.subscription_status === 'ACTIVE';
              const isTrial = t.subscription_status === 'TRIAL';

              return (
                <div
                  key={t.id}
                  className="p-5 bg-slate-850 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-lg text-slate-100">{t.trade_name}</h4>
                      
                      {/* Badge de Assinatura */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : isTrial
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                          : isPastDue
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                      }`}>
                        Plano: {t.subscription_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 pt-1">
                      <span>Doc: <strong className="text-slate-200">{t.document_number || 'N/A'}</strong></span>
                      <span>Whats: <strong className="text-slate-200">{t.phone}</strong></span>
                      <span>Chave Pix: <strong className="text-slate-200">{t.pix_key || 'N/A'}</strong></span>
                      <span>
                        Validade: <strong className="text-emerald-400">
                          {trialDate ? trialDate.toLocaleDateString('pt-BR') : 'Sem prazo'}
                        </strong>
                      </span>
                    </div>

                    {/* Estatísticas do Restaurante */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>{t.consumerCount} Clientes Cadastrados</span> • 
                      <span>{t.corpCount} Convênios Ativos</span> • 
                      <span>Volume: <strong className="text-emerald-400 font-bold">R$ {(t.totalVolume || 0).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Ações de Superadmin para o Restaurante */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    
                    {/* Botão Ativar / Renovar Plano */}
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 30)}
                      className="touch-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativar (+30 dias)
                    </button>

                    {/* Botão Estender Trial */}
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'TRIAL', 15)}
                      className="touch-btn px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" /> Trial (+15 dias)
                    </button>

                    {/* Botão Atraso */}
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'PAST_DUE', 0)}
                      className="touch-btn px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold text-xs"
                    >
                      Atrasado
                    </button>

                    {/* Botão Cancelar */}
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'CANCELLED', 0)}
                      className="touch-btn px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold text-xs"
                    >
                      Bloquear
                    </button>

                    {/* Acessar como Restaurante */}
                    <button
                      onClick={() => onSelectTenant(t)}
                      className="touch-btn px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Acessar Balcão
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
