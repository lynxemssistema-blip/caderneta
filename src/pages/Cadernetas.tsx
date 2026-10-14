import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Search, 
  MessageSquare, 
  DollarSign,
  Eye
} from 'lucide-react';
import type { Consumer, CorporateClient, Tenant } from '../types/database';
import { 
  fetchConsumers, 
  fetchCorporateClients, 
  fetchTenant, 
  settleConsumerDirectly 
} from '../lib/supabase';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

interface CadernetasProps {
  onViewStatement: (consumerId: string) => void;
}

export const Cadernetas: React.FC<CadernetasProps> = ({ onViewStatement }) => {
  const [tab, setTab] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');

  // Modal de Baixa Rápida
  const [settleConsumer, setSettleConsumer] = useState<Consumer | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleMethod, setSettleMethod] = useState<'PIX' | 'DINHEIRO' | 'CARTAO'>('PIX');
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cData, corpData, tData] = await Promise.all([
      fetchConsumers(),
      fetchCorporateClients(),
      fetchTenant()
    ]);
    setConsumers(cData);
    setCorps(corpData);
    setTenant(tData);
  };

  const getConsumerStatus = (c: Consumer): { color: 'GREEN' | 'YELLOW' | 'RED'; label: string } => {
    const pending = c.total_pending || 0;
    const limit = c.individual_credit_limit || 200;

    if (c.status === 'BLOCKED' || pending > limit) {
      return { color: 'RED', label: 'Limite Excedido' };
    }
    if (pending > limit * 0.8) {
      return { color: 'YELLOW', label: 'Próximo do Limite' };
    }
    return { color: 'GREEN', label: 'Em Dia' };
  };

  const getCorpStatus = (corp: CorporateClient): { color: 'GREEN' | 'YELLOW' | 'RED'; label: string } => {
    const pending = corp.total_pending || 0;
    if (pending > 1500) {
      return { color: 'RED', label: 'Volume Alto' };
    }
    if (pending > 800) {
      return { color: 'YELLOW', label: 'Fechamento Próximo' };
    }
    return { color: 'GREEN', label: 'Em Aberto' };
  };

  const filteredConsumers = consumers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL') {
      const st = getConsumerStatus(c).color;
      return st === statusFilter;
    }
    return true;
  });

  const filteredCorps = corps.filter((corp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || corp.company_name.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL') {
      const st = getCorpStatus(corp).color;
      return st === statusFilter;
    }
    return true;
  });

  const handleSendWhatsApp = (name: string, phone: string, amount: number) => {
    sound.playKeyClick();
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    
    const message = `Olá, *${name}*! Tudo bem? 🍽️\n\nAqui é do *${tenant?.trade_name || 'Restaurante Sabor da Vila'}*.\nPassando para enviar o resumo da sua caderneta:\n\n*Saldo Atual:* R$ ${amount.toFixed(2)}\n*Chave Pix:* ${tenant?.pix_key || 'restaurante@sabordavila.com.br'} (${tenant?.pix_key_type || 'EMAIL'})\n\nMuito obrigado pela parceria e preferência! 😊`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
  };

  const handleConfirmSettle = async () => {
    if (!settleConsumer) return;
    const amount = parseFloat(settleAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    setIsSettling(true);
    try {
      await settleConsumerDirectly(settleConsumer.id, amount, settleMethod);
      sound.playSuccessChime();
      setSettleConsumer(null);
      setSettleAmount('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na baixa';
      alert(msg);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Cabeçalho da Impressão (Exclusivo para PDF / Papel A4) */}
      <div className="print-only">
        <ReportHeader
          tenant={tenant}
          title={tab === 'INDIVIDUAL' ? "Relatório Geral de Cadernetas (Pessoas Físicas)" : "Relatório Geral de Convênios Empresariais"}
          subtitle="Posição financeira consolidada de contas fiado em aberto"
        />
      </div>

      {/* Cabeçalho na Tela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            Gestão de Cadernetas & Fiado
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento de saldos devedores, limites e cobranças rápidas via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPrint={() => window.print()}
            printLabel="Exportar PDF"
          />

          {/* Abas: Empresas vs Pessoas Físicas */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTab('INDIVIDUAL')}
              className={`touch-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'INDIVIDUAL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Pessoas Físicas ({consumers.length})
            </button>
            <button
              onClick={() => setTab('CORPORATE')}
              className={`touch-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'CORPORATE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Empresas ({corps.length})
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder={tab === 'INDIVIDUAL' ? "Buscar por nome ou telefone..." : "Buscar por razão social..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filtros de Status (Cores) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-850'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('GREEN')}
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 ${
              statusFilter === 'GREEN'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 text-emerald-400 border-slate-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Em Dia
          </button>
          <button
            onClick={() => setStatusFilter('YELLOW')}
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 ${
              statusFilter === 'YELLOW'
                ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-amber-400 border-slate-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Atenção
          </button>
          <button
            onClick={() => setStatusFilter('RED')}
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 ${
              statusFilter === 'RED'
                ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                : 'bg-slate-900 text-rose-400 border-slate-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Vencidos
          </button>
        </div>
      </div>

      {/* ABA 1: PESSOAS FÍSICAS */}
      {tab === 'INDIVIDUAL' && (
        viewMode === 'CARDS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConsumers.map((consumer) => {
              const st = getConsumerStatus(consumer);
              const pending = consumer.total_pending || 0;
              const limit = consumer.individual_credit_limit || 200;
              const percent = Math.min(100, Math.round((pending / limit) * 100));

              return (
                <div
                  key={consumer.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-white text-base">
                          {consumer.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-100 text-base">{consumer.name}</h3>
                          <p className="text-xs text-slate-400">{consumer.phone}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                          st.color === 'GREEN'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                            : st.color === 'YELLOW'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {st.label}
                      </span>
                    </div>

                    {/* Barra de Progresso do Limite */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-400">Saldo Devedor:</span>
                        <span className={pending > limit ? 'text-rose-400' : 'text-slate-200'}>
                          R$ {pending.toFixed(2)} / R$ {limit.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            st.color === 'GREEN'
                              ? 'bg-emerald-500'
                              : st.color === 'YELLOW'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-3 border-t border-slate-800 no-print">
                    <button
                      onClick={() => handleSendWhatsApp(consumer.name, consumer.phone, pending)}
                      className="touch-btn flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Cobrar
                    </button>

                    <button
                      onClick={() => onViewStatement(consumer.id)}
                      className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700"
                      title="Ver Extrato"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        sound.playKeyClick();
                        setSettleConsumer(consumer);
                        setSettleAmount(pending.toString());
                      }}
                      className="touch-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                    >
                      Baixa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO TABELA PESSOAS FÍSICAS */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Nome do Cliente</th>
                    <th className="px-4 py-3.5">WhatsApp / Telefone</th>
                    <th className="px-4 py-3.5">Empresa Vinculada</th>
                    <th className="px-4 py-3.5 text-right">Saldo Devedor</th>
                    <th className="px-4 py-3.5 text-right">Limite de Crédito</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {filteredConsumers.map((c) => {
                    const st = getConsumerStatus(c);
                    const pending = c.total_pending || 0;
                    const limit = c.individual_credit_limit || 200;

                    return (
                      <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{c.phone}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {c.corporate_client?.company_name || 'Particular (Avulso)'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-400 text-sm">
                          R$ {pending.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 font-bold">
                          R$ {limit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            st.color === 'GREEN'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : st.color === 'YELLOW'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(c.name, c.phone, pending)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                              title="Cobrar via WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onViewStatement(c.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Ver Extrato"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sound.playKeyClick();
                                setSettleConsumer(c);
                                setSettleAmount(pending.toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              Baixa
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
        )
      )}

      {/* ABA 2: EMPRESAS CONVENIADAS */}
      {tab === 'CORPORATE' && (
        viewMode === 'CARDS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCorps.map((corp) => {
              const st = getCorpStatus(corp);
              const pending = corp.total_pending || 0;

              return (
                <div
                  key={corp.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                        {corp.company_name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">CNPJ: {corp.cnpj || 'Não informado'}</p>
                    </div>

                    <span
                      className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                        st.color === 'GREEN'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : st.color === 'YELLOW'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {st.label}
                    </span>
                  </div>

                  {/* Métricas do Convênio */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-850 border border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Ciclo</span>
                      <span className="text-xs font-black text-slate-200">{corp.billing_cycle}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Pagamento</span>
                      <span className="text-xs font-black text-slate-200">{corp.payment_weekday || `Dia ${corp.closing_day}`}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Funcionários</span>
                      <span className="text-xs font-black text-slate-200">{corp.employee_count || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400 font-bold">TOTAL ACUMULADO NO CICLO:</span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {pending.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 no-print">
                    <button
                      onClick={() => {
                        const msg = `Olá, equipe *${corp.company_name}*! Segue o extrato parcial de alimentação do ciclo:\n\n*Total Acumulado:* R$ ${pending.toFixed(2)}\n*Chave Pix do Restaurante:* ${tenant?.pix_key}\n\nConferir: https://caderneta.lynxems.com.br`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="touch-btn flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <MessageSquare className="w-4 h-4" /> Cobrança WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO TABELA EMPRESAS CONVENIADAS */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Empresa</th>
                    <th className="px-4 py-3.5">CNPJ</th>
                    <th className="px-4 py-3.5">Ciclo</th>
                    <th className="px-4 py-3.5">Vencimento Semanal/Mensal</th>
                    <th className="px-4 py-3.5">Colaboradores</th>
                    <th className="px-4 py-3.5 text-right">Saldo do Ciclo</th>
                    <th className="px-4 py-3.5 text-center no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {filteredCorps.map((corp) => {
                    const pending = corp.total_pending || 0;
                    return (
                      <tr key={corp.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          {corp.company_name}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{corp.cnpj || '-'}</td>
                        <td className="px-4 py-3 font-bold text-slate-300">{corp.billing_cycle}</td>
                        <td className="px-4 py-3 text-amber-400 font-bold">
                          {corp.payment_weekday || `Dia ${corp.closing_day}`}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{corp.employee_count || 0}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                          R$ {pending.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center no-print">
                          <button
                            type="button"
                            onClick={() => {
                              const msg = `Olá, equipe *${corp.company_name}*! Segue o extrato parcial de alimentação do ciclo: Total R$ ${pending.toFixed(2)}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                            title="Cobrar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal de Baixa de Saldo */}
      {settleConsumer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-pop">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Dar Baixa no Saldo
            </h3>

            <p className="text-xs text-slate-400">
              Cliente: <strong className="text-emerald-400">{settleConsumer.name}</strong>
            </p>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Valor a Liquidar (R$):</label>
              <input
                type="text"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-lg font-black text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Forma de Pagamento:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['PIX', 'DINHEIRO', 'CARTAO'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettleMethod(m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      settleMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {m === 'PIX' ? 'Pix' : m === 'DINHEIRO' ? 'Dinheiro' : 'Cartão'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleConsumer(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-750"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSettling}
                onClick={handleConfirmSettle}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40"
              >
                {isSettling ? 'Gravando...' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
