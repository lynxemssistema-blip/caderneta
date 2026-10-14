import { useState, useEffect } from 'react';
import { 
  Receipt, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Building2, 
  User, 
  DollarSign,
  PlayCircle
} from 'lucide-react';
import type { Invoice } from '../types/database';
import { fetchInvoices, closeBillingCycle, settleInvoice } from '../lib/supabase';
import { sound } from '../lib/sound';

export const Faturas: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'PIX' | 'DINHEIRO' | 'CARTAO'>('PIX');
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseCycle = async () => {
    if (!confirm('Deseja agrupar os lançamentos pendentes e gerar as faturas do ciclo agora?')) return;
    
    setIsClosingCycle(true);
    try {
      sound.playKeyClick();
      await closeBillingCycle();
      sound.playSuccessChime();
      setFeedback('Fechamento de ciclo executado com sucesso! Novas faturas geradas.');
      loadInvoices();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fechar ciclo';
      alert(msg);
    } finally {
      setIsClosingCycle(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!selectedInvoice) return;
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    try {
      sound.playKeyClick();
      await settleInvoice(selectedInvoice.id, amount, payMethod);
      sound.playSuccessChime();
      setSelectedInvoice(null);
      setPayAmount('');
      loadInvoices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na baixa';
      alert(msg);
    }
  };

  // Totais
  const totalOpen = invoices
    .filter((i) => i.status === 'OPEN' || i.status === 'PARTIALLY_PAID')
    .reduce((acc, curr) => acc + (Number(curr.total_amount) - Number(curr.paid_amount || 0)), 0);

  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((acc, curr) => acc + Number(curr.paid_amount || curr.total_amount), 0);

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header com Ação de Fechamento de Ciclo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-400" />
            Contas a Receber & Faturas
          </h2>
          <p className="text-xs text-slate-400">
            Faturas fechadas por ciclo semanal, quinzenal ou mensal com baixas totais e parciais.
          </p>
        </div>

        <button
          onClick={handleCloseCycle}
          disabled={isClosingCycle}
          className="touch-btn self-start sm:self-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          <PlayCircle className="w-5 h-5" />
          {isClosingCycle ? 'Processando Fechamento...' : 'Rodar Fechamento de Ciclo'}
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total a Receber em Aberto</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            R$ {totalOpen.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Já Liquidado</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            R$ {totalPaid.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Faturas Emitidas</span>
          <div className="text-2xl font-black text-slate-100 mt-1">
            {invoices.length}
          </div>
        </div>
      </div>

      {/* Tabela / Cards de Faturas */}
      <div className="space-y-3">
        {invoices.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-500">
            Nenhuma fatura fechada ainda. Use o botão <strong>"Rodar Fechamento de Ciclo"</strong> para agrupar os lançamentos pendentes em faturas formais.
          </div>
        ) : (
          invoices.map((inv) => {
            const clientName = inv.corporate_client?.company_name || inv.consumer?.name || 'Cliente';
            const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);

            return (
              <div
                key={inv.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-emerald-400">
                    {inv.type === 'COMPANY_INVOICE' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-100">{clientName}</h4>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                      }`}>
                        {inv.status === 'PAID' ? 'Paga' : inv.status === 'PARTIALLY_PAID' ? 'Parcial' : 'Aberta'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Período: {new Date(inv.cycle_start).toLocaleDateString('pt-BR')} até {new Date(inv.cycle_end).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        Vence: {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Valor Fatura</span>
                    <span className="text-lg font-black text-slate-100">
                      R$ {Number(inv.total_amount).toFixed(2)}
                    </span>
                    {Number(inv.paid_amount || 0) > 0 && (
                      <span className="text-xs block text-emerald-400">
                        Pago: R$ {Number(inv.paid_amount).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {inv.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        sound.playKeyClick();
                        setSelectedInvoice(inv);
                        setPayAmount(remaining.toString());
                      }}
                      className="touch-btn px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                    >
                      Dar Baixa
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Pagamento de Fatura */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-pop">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Liquidar Fatura
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Valor do Pagamento (R$):</label>
              <input
                type="text"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-lg font-black text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Meio de Pagamento:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['PIX', 'DINHEIRO', 'CARTAO'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      payMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
