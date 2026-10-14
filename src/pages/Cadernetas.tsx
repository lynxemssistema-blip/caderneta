import { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Search, 
  MessageSquare, 
  CreditCard, 
  FileText,
  DollarSign
} from 'lucide-react';
import type { Consumer, CorporateClient, Tenant } from '../types/database';
import { 
  fetchConsumers, 
  fetchCorporateClients, 
  fetchTenant, 
  settleConsumerDirectly 
} from '../lib/supabase';
import { sound } from '../lib/sound';

interface CadernetasProps {
  onViewStatement: (consumerId: string) => void;
}

export const Cadernetas: React.FC<CadernetasProps> = ({ onViewStatement }) => {
  const [tab, setTab] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
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

  // Determinar cor do status
  // Verde: Em dia / Dentro do limite
  // Amarelo: Vencendo hoje / Fechamento na data
  // Vermelho: Fatura vencida / Bloqueio por limite excedido
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

  // Filtragem
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

  // Enviar cobrança / extrato formatado via WhatsApp
  const handleSendWhatsApp = (name: string, phone: string, amount: number) => {
    sound.playKeyClick();
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    
    const message = `Olá, *${name}*! Tudo bem? 🍽️\n\nAqui é do *${tenant?.trade_name || 'Restaurante Sabor da Vila'}*.\nPassando para enviar o resumo da sua caderneta:\n\n*Saldo Atual:* R$ ${amount.toFixed(2)}\n*Chave Pix:* ${tenant?.pix_key || 'restaurante@sabordavila.com.br'} (${tenant?.pix_key_type || 'EMAIL'})\n\nVocê também pode conferir todos os lançamentos em tempo real no nosso sistema: https://caderneta.lynxems.com.br/extrato\n\nMuito obrigado pela parceria e preferência! 😊`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
  };

  // Confirmar Baixa
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
      
      {/* Cabeçalho e Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            Gestão de Cadernetas & Fiado
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento de saldos devedores, limites e cobranças rápidas via WhatsApp.
          </p>
        </div>

        {/* Abas: Empresas vs Pessoas Físicas */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setTab('INDIVIDUAL')}
            className={`touch-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === 'INDIVIDUAL'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Pessoas Físicas ({consumers.length})
          </button>
          <button
            onClick={() => setTab('CORPORATE')}
            className={`touch-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === 'CORPORATE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" /> Empresas ({corps.length})
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
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
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'GREEN'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-slate-900 text-emerald-400/80 border-slate-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Em Dia (Verde)
          </button>
          <button
            onClick={() => setStatusFilter('YELLOW')}
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'YELLOW'
                ? 'bg-amber-950 text-amber-300 border-amber-500'
                : 'bg-slate-900 text-amber-400/80 border-slate-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Atenção (Amarelo)
          </button>
          <button
            onClick={() => setStatusFilter('RED')}
            className={`touch-btn px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'RED'
                ? 'bg-rose-950 text-rose-300 border-rose-500'
                : 'bg-slate-900 text-rose-400/80 border-slate-850'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Vencido/Bloqueado (Vermelho)
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba: PESSOAS FÍSICAS */}
      {tab === 'INDIVIDUAL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConsumers.map((c) => {
            const st = getConsumerStatus(c);
            const pending = c.total_pending || 0;
            const limit = c.individual_credit_limit || 200;
            const percentage = Math.min(100, Math.round((pending / limit) * 100));

            return (
              <div
                key={c.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-lg"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>
                    {c.corporate_client && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30">
                        {c.corporate_client.company_name}
                      </span>
                    )}
                  </div>

                  {/* Badge de Status */}
                  <span
                    className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                      st.color === 'GREEN'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                        : st.color === 'YELLOW'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        st.color === 'GREEN'
                          ? 'bg-emerald-400'
                          : st.color === 'YELLOW'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    {st.label}
                  </span>
                </div>

                {/* Barra de Limite */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Saldo Devedor:</span>
                    <span className="text-emerald-400 font-extrabold text-sm">
                      R$ {pending.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        st.color === 'GREEN'
                          ? 'bg-emerald-500'
                          : st.color === 'YELLOW'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Limite: R$ {limit.toFixed(2)}</span>
                    <span>{percentage}% utilizado</span>
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      sound.playKeyClick();
                      setSettleConsumer(c);
                      setSettleAmount(pending.toString());
                    }}
                    disabled={pending <= 0}
                    className={`touch-btn py-2 px-1 rounded-xl text-xs font-black flex items-center justify-center gap-1 border ${
                      pending > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Dar Baixa
                  </button>

                  <button
                    onClick={() => onViewStatement(c.id)}
                    className="touch-btn py-2 px-1 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Extrato
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(c.name, c.phone, pending)}
                    className="touch-btn py-2 px-1 rounded-xl text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Whats
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conteúdo da Aba: EMPRESAS CONVENIADAS */}
      {tab === 'CORPORATE' && (
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
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Fechamento</span>
                    <span className="text-xs font-black text-slate-200">Dia {corp.closing_day}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Funcionários</span>
                    <span className="text-xs font-black text-slate-200">{corp.employee_count || 0}</span>
                  </div>
                </div>

                {/* Total da Fatura em Aberto */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-bold">TOTAL ACUMULADO NO CICLO:</span>
                  <span className="text-xl font-black text-emerald-400">
                    R$ {pending.toFixed(2)}
                  </span>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const msg = `Olá, equipe *${corp.company_name}*! Segue o extrato parcial de alimentação do ciclo:\n\n*Total Acumulado:* R$ ${pending.toFixed(2)}\n*Vencimento pós-fechamento:* ${corp.payment_terms_days} dias\n*Chave Pix do Restaurante:* ${tenant?.pix_key}\n\nConferir: https://caderneta.lynxems.com.br/extrato`;
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
