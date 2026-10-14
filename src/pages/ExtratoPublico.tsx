import { useState, useEffect } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Calendar, 
  QrCode, 
  ArrowLeft 
} from 'lucide-react';
import { supabase, fetchTenant, DEFAULT_TENANT_ID } from '../lib/supabase';
import type { Consumer, LedgerEntry, Tenant } from '../types/database';
import { sound } from '../lib/sound';

interface ExtratoPublicoProps {
  consumerId: string;
  onBack?: () => void;
}

export const ExtratoPublico: React.FC<ExtratoPublicoProps> = ({ consumerId, onBack }) => {
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [consumerId]);

  const loadData = async () => {
    // 1. Consumer
    const { data: cData } = await supabase
      .from('consumers')
      .select('*, corporate_client:corporate_clients(*)')
      .eq('id', consumerId)
      .single();
    if (cData) setConsumer(cData);

    // 2. Entries
    const { data: eData } = await supabase
      .from('ledger_entries')
      .select('*, items:ledger_entry_items(*)')
      .eq('consumer_id', consumerId)
      .order('created_at', { ascending: false });
    if (eData) setEntries(eData);

    // 3. Tenant
    const tData = await fetchTenant(DEFAULT_TENANT_ID);
    setTenant(tData);
  };

  const totalPending = entries
    .filter((e) => e.status === 'PENDING')
    .reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

  const pixKey = tenant?.pix_key || 'restaurante@sabordavila.com.br';
  const pixCopyCode = `00020126580014BR.GOV.BCB.PIX0136${pixKey}5204000053039865405${totalPending.toFixed(2)}5802BR5925${tenant?.trade_name || 'Restaurante'}6009SAO PAULO62070503***6304ABCD`;

  const handleCopyPix = () => {
    sound.playSuccessChime();
    navigator.clipboard.writeText(pixCopyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 py-6 sm:px-6 space-y-6">
      
      {/* Botão Voltar se fornecido */}
      {onBack && (
        <button
          onClick={onBack}
          className="touch-btn flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </button>
      )}

      {/* Cartão de Resumo do Extrato */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Extrato Oficial da Caderneta
            </span>
            <h2 className="text-2xl font-black text-slate-100 mt-1">{consumer?.name || 'Cliente'}</h2>
            <p className="text-xs text-slate-400">{consumer?.phone}</p>
            {consumer?.corporate_client && (
              <p className="text-xs text-blue-400 font-semibold mt-1">
                Empresa Conveniada: {consumer.corporate_client.company_name}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 text-right self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-400 block uppercase">Total a Pagar</span>
            <span className="text-3xl font-black text-emerald-400">
              R$ {totalPending.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bloco de Pagamento Pix Copia e Cola */}
        {totalPending > 0 && (
          <div className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-400" /> Pague via Pix sem filas
              </span>
              <span className="text-xs text-slate-400">Chave: <strong>{pixKey}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pixCopyCode}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 truncate focus:outline-none"
              />
              <button
                onClick={handleCopyPix}
                className="touch-btn px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Pix'}
              </button>
            </div>
          </div>
        )}

        {/* Histórico Detalhado dos Lançamentos */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Histórico de Consumo
          </h3>

          {entries.length === 0 ? (
            <div className="p-8 text-center bg-slate-850 rounded-2xl text-slate-500 text-xs">
              Nenhum lançamento registrado nesta conta.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div key={entry.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-200">
                      {entry.description || 'Consumo no Balcão'}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')} às {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {entry.payer_type === 'COMPANY' && (
                        <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.2 rounded font-bold">
                          Cobrado da Empresa
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-base text-slate-100 block">
                      R$ {Number(entry.total_amount).toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      entry.status === 'PAID'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : 'text-amber-400 bg-amber-950/60'
                    }`}>
                      {entry.status === 'PAID' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
