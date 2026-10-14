import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Store, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { Tenant } from '../types/database';
import { fetchAllTenantsWithStats, updateTenantSubscription, fetchTenant, DEFAULT_TENANT_ID } from '../lib/supabase';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

interface SuperAdminProps {
  onSelectTenant: (tenant: Tenant) => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onSelectTenant }) => {
  const [tenants, setTenants] = useState<Array<Tenant & { totalVolume?: number; consumerCount?: number; corpCount?: number }>>([]);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const [data, tData] = await Promise.all([
        fetchAllTenantsWithStats(),
        fetchTenant(DEFAULT_TENANT_ID)
      ]);
      setTenants(data);
      setCurrentTenant(tData);
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
  const estimatedMRR = activeTenants * 97.00;

  return (
    <div className="max-w-7xl mx-auto px-3 py-6 sm:px-6 space-y-6">
      
      {/* Impressão PDF */}
      <div className="print-only">
        <ReportHeader
          tenant={currentTenant}
          title="Relatório Executivo Global da Plataforma Caderneta SaaS"
          subtitle="Posição de restaurantes assinantes, faturamento consolidado e volume transacionado"
        />
      </div>

      {/* Header Superadmin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
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

        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPrint={() => window.print()}
          printLabel="Exportar Relatório SaaS"
        />
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Cards de Métricas do SaaS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Restaurantes Assinantes</span>
          <div className="text-3xl font-black text-white">{totalTenants}</div>
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <span className="text-emerald-400 font-bold">{activeTenants} Ativos</span> • 
            <span className="text-blue-400 font-bold">{trialTenants} em Teste</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Receita Recorrente Mensal (MRR)</span>
          <div className="text-3xl font-black text-emerald-400">R$ {estimatedMRR.toFixed(2)}</div>
          <p className="text-xs text-slate-400 pt-1">Base de cálculo: R$ 97/mês por restaurante ativo</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Volume Transacionado no Fiado</span>
          <div className="text-3xl font-black text-teal-400">R$ {totalVolume.toFixed(2)}</div>
          <p className="text-xs text-slate-400 pt-1">Total acumulado em vendas registradas</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-3xl space-y-2 shadow-xl">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Plataforma Lynx EMS
          </span>
          <div className="text-lg font-black text-white">caderneta.lynxems.com.br</div>
          <p className="text-xs text-slate-400 pt-1">Infraestrutura VPS dedicada com PostgreSQL 15</p>
        </div>
      </div>

      {/* Lista de Restaurantes: CARDS OU TABELA */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 md:p-6 backdrop-blur shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-400" />
          Restaurantes Cadastrados na Plataforma ({tenants.length})
        </h3>

        {tenants.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhum restaurante cadastrado no momento.
          </div>
        ) : viewMode === 'CARDS' ? (
          /* MODO CARDS */
          <div className="space-y-3">
            {tenants.map((t) => {
              const trialDate = t.trial_until ? new Date(t.trial_until) : null;
              const isActive = t.subscription_status === 'ACTIVE';
              const isTrial = t.subscription_status === 'TRIAL';
              const isPastDue = t.subscription_status === 'PAST_DUE';

              return (
                <div
                  key={t.id}
                  className="p-5 bg-slate-850 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-lg text-slate-100">{t.trade_name}</h4>
                      
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

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>{t.consumerCount} Clientes Cadastrados</span> • 
                      <span>{t.corpCount} Convênios Ativos</span> • 
                      <span>Volume: <strong className="text-emerald-400 font-bold">R$ {(t.totalVolume || 0).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Ações de Superadmin para o Restaurante */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 no-print">
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 30)}
                      className="touch-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativar (+30 dias)
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(t.id, 'TRIAL', 15)}
                      className="touch-btn px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" /> Trial (+15 dias)
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(t.id, 'CANCELLED', 0)}
                      className="touch-btn px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold text-xs"
                    >
                      Bloquear
                    </button>

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
        ) : (
          /* MODO TABELA */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Restaurante</th>
                    <th className="px-4 py-3.5">CNPJ / CPF</th>
                    <th className="px-4 py-3.5">Telefone</th>
                    <th className="px-4 py-3.5">Clientes</th>
                    <th className="px-4 py-3.5">Convênios</th>
                    <th className="px-4 py-3.5 text-right">Volume (R$)</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {t.trade_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{t.document_number || '-'}</td>
                      <td className="px-4 py-3 text-slate-300">{t.phone}</td>
                      <td className="px-4 py-3 text-slate-300">{t.consumerCount || 0}</td>
                      <td className="px-4 py-3 text-slate-300">{t.corpCount || 0}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                        R$ {(t.totalVolume || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          t.subscription_status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                        }`}>
                          {t.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 30)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                            title="Ativar +30 dias"
                          >
                            +30d
                          </button>
                          <button
                            onClick={() => onSelectTenant(t)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold"
                            title="Acessar Restaurante"
                          >
                            Entrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
