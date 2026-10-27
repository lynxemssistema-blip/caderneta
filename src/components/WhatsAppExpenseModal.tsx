import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  Receipt,
  QrCode
} from 'lucide-react';
import type { Consumer, Tenant } from '../types/database';
import { fetchConsumerConsumptionHistory, type DetailedConsumptionItem } from '../lib/supabase';
import { 
  sendWhatsAppDirect, 
  openWhatsAppWebFallback, 
  buildPersonalizedExpenseReport, 
  checkEvolutionStatus,
  type WhatsAppStatus 
} from '../lib/whatsappService';
import { sound } from '../lib/sound';

interface WhatsAppExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumer: Consumer | null;
  tenant: Tenant | null;
  onSuccess?: (message: string) => void;
}

export const WhatsAppExpenseModal: React.FC<WhatsAppExpenseModalProps> = ({
  isOpen,
  onClose,
  consumer,
  tenant,
  onSuccess,
}) => {
  const [entries, setEntries] = useState<DetailedConsumptionItem[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [includePix, setIncludePix] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [apiStatus, setApiStatus] = useState<WhatsAppStatus | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSent, setSuccessSent] = useState(false);

  useEffect(() => {
    if (isOpen && consumer) {
      loadData();
      verifyStatus();
      setSuccessSent(false);
      setErrorMessage(null);
    }
  }, [isOpen, consumer?.id]);

  const verifyStatus = async () => {
    setCheckingApi(true);
    const status = await checkEvolutionStatus();
    setApiStatus(status);
    setCheckingApi(false);
  };

  const loadData = async () => {
    if (!consumer) return;
    setLoadingEntries(true);
    try {
      const history = await fetchConsumerConsumptionHistory(consumer.id);
      setEntries(history);

      // Gerar mensagem inicial personalizada
      const initialMsg = buildPersonalizedExpenseReport({
        consumer,
        tenant,
        entries: history,
        customNote: '',
        includePix: true,
        includeHistory: true
      });
      setMessageText(initialMsg);
    } catch (err) {
      console.error('Erro ao carregar despesas do cliente:', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  // Atualiza o texto da mensagem quando filtros ou nota mudam
  const handleRegenerateMessage = (
    newNote = customNote,
    newIncludePix = includePix,
    newIncludeHistory = includeHistory
  ) => {
    if (!consumer) return;
    const newMsg = buildPersonalizedExpenseReport({
      consumer,
      tenant,
      entries,
      customNote: newNote,
      includePix: newIncludePix,
      includeHistory: newIncludeHistory
    });
    setMessageText(newMsg);
  };

  const handleSendViaEvolution = async () => {
    if (!consumer || !messageText.trim()) return;

    setSending(true);
    setErrorMessage(null);
    sound.playKeyClick();

    const result = await sendWhatsAppDirect({
      phone: consumer.phone,
      message: messageText,
      clientName: consumer.name
    });

    setSending(false);

    if (result.success) {
      sound.playSuccessChime();
      setSuccessSent(true);
      if (onSuccess) {
        onSuccess(`Relatório de despesas enviado com sucesso via WhatsApp para ${consumer.name}!`);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      sound.playWarningBuzzer();
      setErrorMessage(result.error || 'Falha ao enviar via Evolution API. Você pode usar o WhatsApp Web.');
    }
  };

  const handleOpenWhatsAppWeb = () => {
    if (!consumer || !messageText.trim()) return;
    sound.playKeyClick();
    openWhatsAppWebFallback(consumer.phone, messageText);
  };

  if (!isOpen || !consumer) return null;

  const totalPending = Number(consumer.total_pending || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">
                  Relatório de Despesas via WhatsApp
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3 h-3" /> Individual
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Personalizado para o cliente <strong className="text-slate-700">{consumer.name}</strong> ({consumer.phone})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Status Evolution API Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${apiStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700">Evolution API WhatsApp:</span>
              <span className={apiStatus?.connected ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                {checkingApi 
                  ? 'Verificando status...' 
                  : apiStatus?.connected 
                    ? `Online (Instância: ${apiStatus.instance})` 
                    : 'Instância desconectada ou em checagem'}
              </span>
            </div>
            <button
              type="button"
              onClick={verifyStatus}
              disabled={checkingApi}
              className="text-slate-500 hover:text-emerald-600 transition flex items-center gap-1 font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingApi ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Privacy & Recipient Guarantee Card */}
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong>Envio Privado e Direto:</strong> As despesas listadas abaixo pertencem unicamente a <strong>{consumer.name}</strong> e serão enviadas somente para o WhatsApp registrado: <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono font-bold text-emerald-800">{consumer.phone}</code>.
            </div>
          </div>

          {/* Resumo Rápido das Despesas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Total em Aberto</span>
              <span className="text-base font-extrabold text-slate-900">
                R$ {totalPending.toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Limite Concedido</span>
              <span className="text-base font-extrabold text-emerald-700">
                R$ {Number(consumer.individual_credit_limit || 200).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Lançamentos</span>
              <span className="text-base font-extrabold text-blue-700">
                {loadingEntries ? '...' : entries.length} registro(s)
              </span>
            </div>
          </div>

          {/* Opções de Personalização do Restaurante */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Personalização da Mensagem
            </h4>

            {/* Checkboxes de Controle */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeHistory} 
                  onChange={(e) => {
                    setIncludeHistory(e.target.checked);
                    handleRegenerateMessage(customNote, includePix, e.target.checked);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  Incluir extrato das despesas recentes
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includePix} 
                  onChange={(e) => {
                    setIncludePix(e.target.checked);
                    handleRegenerateMessage(customNote, e.target.checked, includeHistory);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                  Incluir dados do Pix para quitação
                </span>
              </label>
            </div>

            {/* Recado ou Nota Adicional do Restaurante */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recado Adicional do Restaurante (Opcional):
              </label>
              <input 
                type="text"
                placeholder="Ex: Lembrando que o fechamento é toda sexta-feira! Bom almoço!"
                value={customNote}
                onChange={(e) => {
                  setCustomNote(e.target.value);
                  handleRegenerateMessage(e.target.value, includePix, includeHistory);
                }}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Preview da Mensagem Formatada */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Texto Final da Mensagem (Você pode editar diretamente):
              </label>
              <span className="text-[11px] text-slate-400">
                {messageText.length} caracteres
              </span>
            </div>
            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition leading-relaxed resize-y"
              placeholder="O texto da mensagem aparecerá aqui..."
            />
          </div>

          {/* Feedback de Erro ou Sucesso */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successSent && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>Mensagem e relatório de despesas enviados com sucesso pelo WhatsApp!</span>
            </div>
          )}

        </div>

        {/* Modal Footer com Ações */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenWhatsAppWeb}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Abrir WhatsApp Web
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSendViaEvolution}
              disabled={sending || successSent || !messageText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-200 active:scale-95"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Enviando pelo WhatsApp...
                </>
              ) : successSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  Enviado com Sucesso!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar via Evolution API
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
