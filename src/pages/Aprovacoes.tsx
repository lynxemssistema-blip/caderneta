import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Building2,
  Check,
  User
} from 'lucide-react';
import type { Consumer, Tenant } from '../types/database';
import { fetchConsumers, approveConsumer, fetchTenant } from '../lib/supabase';
import { sendApprovalNotification } from '../lib/emailService';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

interface AprovacoesProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
}

export const Aprovacoes: React.FC<AprovacoesProps> = ({ tenantId, activeTenant }) => {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId, activeTenant?.id]);

  const loadData = async () => {
    const targetTenantId = tenantId || activeTenant?.id;
    if (!targetTenantId) {
      setConsumers([]);
      setTenant(null);
      return;
    }
    const [list, tData] = await Promise.all([
      fetchConsumers(targetTenantId),
      fetchTenant(targetTenantId)
    ]);
    const pendingList = list.filter((c) => c.approval_status === 'PENDING_APPROVAL');
    setConsumers(pendingList);
    setTenant(tData || activeTenant || null);


    // Inicializar limites padrão
    const initLimits: Record<string, string> = {};
    pendingList.forEach((c) => {
      initLimits[c.id] = '200.00';
    });
    setLimits(initLimits);
  };

  const handleApprove = async (consumer: Consumer) => {
    sound.playKeyClick();
    setProcessingId(consumer.id);

    try {
      const creditLimit = parseFloat(limits[consumer.id]?.replace(',', '.') || '200.00');
      await approveConsumer(consumer.id, creditLimit);
      sound.playSuccessChime();

      if (consumer.email) {
        await sendApprovalNotification({
          email: consumer.email,
          name: consumer.name,
          restaurantName: tenant?.trade_name || 'Restaurante & Bar Sabor da Vila',
          creditLimit: creditLimit,
          approved: true
        });
      }

      setFeedback(`Cadastro de ${consumer.name} aprovado com sucesso! E-mail de confirmação enviado.`);
      loadData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na aprovação';
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Impressão PDF */}
      <div className="print-only">
        <ReportHeader
          tenant={tenant}
          title="Relatório de Cadastros Pendentes de Aprovação"
          subtitle="Lista de consumidores e colaboradores aguardando liberação do restaurante"
        />
      </div>

      {/* Header na Tela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-400" />
            Aprovações de Novos Usuários (Master)
          </h2>
          <p className="text-xs text-slate-400">
            Apenas usuários aprovados pelo dono do restaurante têm permissão para consumir no fiado ou convênio corporativo.
          </p>
        </div>

        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPrint={() => window.print()}
          printLabel="Exportar PDF"
        />
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Lista de Cadastros Pendentes */}
      {consumers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-500/60 mx-auto" />
          <h3 className="font-extrabold text-base text-slate-200">Nenhum cadastro pendente de aprovação!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Todos os clientes e colaboradores cadastrados já foram aprovados e estão liberados para consumir no balcão.
          </p>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* MODO CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consumers.map((c) => (
            <div
              key={c.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-base">{c.name}</h3>
                      <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Aguardando Liberação
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{c.phone}</span>
                  </div>

                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold">
                      {c.corporate_client?.company_name || 'Cliente Particular (Fiado Individual)'}
                    </span>
                  </div>
                </div>

                {/* Definição do Limite Inicial */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Limite Inicial de Crédito (R$):
                  </label>
                  <input
                    type="text"
                    value={limits[c.id] || '200.00'}
                    onChange={(e) => setLimits({ ...limits, [c.id]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Botão de Aprovação */}
              <div className="pt-2 no-print">
                <button
                  onClick={() => handleApprove(c)}
                  disabled={processingId === c.id}
                  className="touch-btn w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {processingId === c.id ? 'Aprovando...' : 'Aprovar e Liberar no Balcão'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* MODO TABELA */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Nome do Solicitante</th>
                  <th className="px-4 py-3.5">WhatsApp</th>
                  <th className="px-4 py-3.5">E-mail</th>
                  <th className="px-4 py-3.5">Tipo de Vínculo</th>
                  <th className="px-4 py-3.5 text-center">Limite Inicial (R$)</th>
                  <th className="px-4 py-3.5 text-center no-print">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {consumers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-400">{c.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-200">
                        {c.corporate_client?.company_name || 'Cliente Particular'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        value={limits[c.id] || '200.00'}
                        onChange={(e) => setLimits({ ...limits, [c.id]: e.target.value })}
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-white"
                      />
                    </td>
                    <td className="px-4 py-3 text-center no-print">
                      <button
                        onClick={() => handleApprove(c)}
                        disabled={processingId === c.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md disabled:opacity-50"
                      >
                        {processingId === c.id ? 'Aprovando...' : 'Aprovar'}
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
  );
};
