import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Building2, 
  User, 
  DollarSign,
  PlayCircle,
  FileText,
  Printer,
  MessageSquare,
  Paperclip,
  Eye,
  X
} from 'lucide-react';
import type { Invoice, Tenant } from '../types/database';
import type { DetailedConsumptionItem } from '../lib/supabase';
import { 
  fetchInvoices, 
  closeBillingCycle, 
  settleInvoice, 
  updateInvoice, 
  fetchTenant, 
  fetchDetailedCorporateConsumption,
  DEFAULT_TENANT_ID 
} from '../lib/supabase';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

export const Faturas: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modal de Baixa de Pagamento
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'PIX' | 'DINHEIRO' | 'CARTAO'>('PIX');

  // Modal de Relatório Analítico Detalhado da Fatura (Consumo por Colaborador & Itens)
  const [detailedInvoice, setDetailedInvoice] = useState<Invoice | null>(null);
  const [consumptionItems, setConsumptionItems] = useState<DetailedConsumptionItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modal de Anexo de Comprovante e Nota Fiscal
  const [attachModalInvoice, setAttachModalInvoice] = useState<Invoice | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [invoiceFileUrl, setInvoiceFileUrl] = useState('');
  const [savingAttachment, setSavingAttachment] = useState(false);

  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invList, tData] = await Promise.all([
        fetchInvoices(),
        fetchTenant(DEFAULT_TENANT_ID)
      ]);
      setInvoices(invList);
      setTenant(tData);
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
      loadData();
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
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na baixa';
      alert(msg);
    }
  };

  // Abrir Modal de Relatório Analítico Detalhado
  const handleOpenDetailedReport = async (inv: Invoice) => {
    setDetailedInvoice(inv);
    setLoadingDetails(true);
    try {
      if (inv.corporate_client_id) {
        const details = await fetchDetailedCorporateConsumption(
          inv.corporate_client_id,
          inv.cycle_start,
          inv.cycle_end
        );
        setConsumptionItems(details);
      } else {
        setConsumptionItems([]);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da fatura:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Abrir modal de anexos
  const handleOpenAttachModal = (inv: Invoice) => {
    setAttachModalInvoice(inv);
    setReceiptUrl(inv.payment_receipt_url || '');
    setInvoiceFileUrl(inv.invoice_file_url || '');
  };

  const handleSaveAttachments = async () => {
    if (!attachModalInvoice) return;
    setSavingAttachment(true);
    try {
      await updateInvoice(attachModalInvoice.id, {
        payment_receipt_url: receiptUrl.trim() || undefined,
        invoice_file_url: invoiceFileUrl.trim() || undefined
      });
      sound.playSuccessChime();
      setFeedback('Comprovante / Nota Fiscal atualizados com sucesso!');
      setAttachModalInvoice(null);
      loadData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert('Erro ao salvar anexos: ' + err.message);
    } finally {
      setSavingAttachment(false);
    }
  };

  // Envio de WhatsApp com Cobrança Detalhada
  const handleSendWhatsApp = (inv: Invoice) => {
    const clientName = inv.corporate_client?.company_name || inv.consumer?.name || 'Cliente';
    const total = Number(inv.total_amount).toFixed(2);
    const dueDate = new Date(inv.due_date).toLocaleDateString('pt-BR');
    const cycleStart = new Date(inv.cycle_start).toLocaleDateString('pt-BR');
    const cycleEnd = new Date(inv.cycle_end).toLocaleDateString('pt-BR');

    // Resumo dos colaboradores
    const employeeSummary = consumptionItems.length > 0 
      ? `\n\n*Demonstrativo dos Colaboradores:*\n` +
        consumptionItems.map(item => `• ${item.consumer_name}: R$ ${item.total_amount.toFixed(2)}`).join('\n')
      : '';

    const text = encodeURIComponent(
      `Olá, *${clientName}*! Tudo bem?\n\n` +
      `Aqui é do *${tenant?.trade_name || 'Restaurante'}*.\n` +
      `Estamos enviando a fatura de alimentação do período de *${cycleStart}* a *${cycleEnd}*.\n\n` +
      `📄 *Valor Total da Fatura:* R$ ${total}\n` +
      `📅 *Vencimento:* ${dueDate}\n` +
      `${employeeSummary}\n\n` +
      `🔑 *Chave Pix para Pagamento:* ${tenant?.pix_key || ''} (${tenant?.pix_key_type || 'Chave'})\n` +
      (tenant?.bank_name ? `🏦 *Banco:* ${tenant.bank_name} | Ag: ${tenant.bank_agency || ''} | CC: ${tenant.bank_account || ''}\n` : '') +
      `\nAssim que efetuar o pagamento, por favor nos envie o comprovante para emissão da sua Nota Fiscal.\n` +
      `Obrigado pela parceria!`
    );

    const phone = inv.corporate_client?.cnpj || inv.consumer?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
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
      
      {/* Header com Ação de Fechamento de Ciclo e Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-400" />
            Contas a Receber, Faturas & Cobranças
          </h2>
          <p className="text-xs text-slate-400">
            Relatórios detalhados de consumo por colaborador, cobrança via WhatsApp/E-mail, comprovantes e notas fiscais.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            onPrint={() => window.print()}
            printLabel="Exportar PDF"
          />

          <button
            onClick={handleCloseCycle}
            disabled={isClosingCycle}
            className="touch-btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40 no-print"
          >
            <PlayCircle className="w-4 h-4" />
            {isClosingCycle ? 'Processando Fechamento...' : 'Rodar Fechamento de Ciclo'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
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

      {/* LISTAGEM DE FATURAS: CARDS OU TABELA */}
      {invoices.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-500">
          Nenhuma fatura fechada ainda. Use o botão <strong>"Rodar Fechamento de Ciclo"</strong> para agrupar os lançamentos pendentes em faturas formais.
        </div>
      ) : viewMode === 'CARDS' ? (
        /* Modo CARDS */
        <div className="space-y-3">
          {invoices.map((inv) => {
            const clientName = inv.corporate_client?.company_name || inv.consumer?.name || 'Cliente';
            const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);

            return (
              <div
                key={inv.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-emerald-400">
                    {inv.type === 'COMPANY_INVOICE' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {/* Badges de Anexos */}
                      {inv.payment_receipt_url && (
                        <span className="text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> Comprovante OK
                        </span>
                      )}
                      {inv.invoice_file_url && (
                        <span className="text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Nota Fiscal OK
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
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

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 flex-wrap">
                  <div className="text-right mr-2">
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

                  {/* Botão Ver Relatório Detalhado */}
                  <button
                    type="button"
                    onClick={() => handleOpenDetailedReport(inv)}
                    className="touch-btn px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                    title="Ver detalhes de consumo por colaborador e itens"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    Relatório
                  </button>

                  {/* Botão Anexar Comprovante / NF */}
                  <button
                    type="button"
                    onClick={() => handleOpenAttachModal(inv)}
                    className="touch-btn px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                    title="Anexar Comprovante ou Nota Fiscal"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    Anexos
                  </button>

                  {inv.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        sound.playKeyClick();
                        setSelectedInvoice(inv);
                        setPayAmount(remaining.toString());
                      }}
                      className="touch-btn px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                    >
                      Dar Baixa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Modo TABELA */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Cliente / Empresa</th>
                  <th className="px-4 py-3.5">Período</th>
                  <th className="px-4 py-3.5">Vencimento</th>
                  <th className="px-4 py-3.5 text-right">Valor Total</th>
                  <th className="px-4 py-3.5 text-right">Pago</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Anexos</th>
                  <th className="px-4 py-3.5 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {invoices.map((inv) => {
                  const clientName = inv.corporate_client?.company_name || inv.consumer?.name || 'Cliente';
                  const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        {inv.type === 'COMPANY_INVOICE' ? (
                          <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <User className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        )}
                        {clientName}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(inv.cycle_start).toLocaleDateString('pt-BR')} - {new Date(inv.cycle_end).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-400">
                        {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-white">
                        R$ {Number(inv.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        R$ {Number(inv.paid_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}>
                          {inv.status === 'PAID' ? 'Paga' : inv.status === 'PARTIALLY_PAID' ? 'Parcial' : 'Aberta'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {inv.payment_receipt_url && (
                            <span title="Comprovante Anexado" className="text-blue-400">📎</span>
                          )}
                          {inv.invoice_file_url && (
                            <span title="Nota Fiscal Emitida" className="text-purple-400">📑</span>
                          )}
                          {!inv.payment_receipt_url && !inv.invoice_file_url && (
                            <span className="text-slate-600">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center no-print">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailedReport(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Ver Relatório Detalhado"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAttachModal(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300"
                            title="Anexos de Comprovante e Nota Fiscal"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                          {inv.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPayAmount(remaining.toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              Baixa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: RELATÓRIO ANALÍTICO DETALHADO (CONVÊNIO, COLABORADORES, ITENS & COBRANÇA WHATSAPP) */}
      {detailedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto text-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                Demonstrativo Analítico de Consumo
              </h3>
              <button
                onClick={() => setDetailedInvoice(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabeçalho Oficial do Relatório com dados do restaurante */}
            <ReportHeader
              tenant={tenant}
              title={`Fatura & Prestação de Contas: ${detailedInvoice.corporate_client?.company_name || detailedInvoice.consumer?.name || 'Cliente'}`}
              subtitle={`CNPJ/CPF: ${detailedInvoice.corporate_client?.cnpj || 'Não informado'} • Fatura #${detailedInvoice.id.slice(0, 8)}`}
              periodText={`${new Date(detailedInvoice.cycle_start).toLocaleDateString('pt-BR')} até ${new Date(detailedInvoice.cycle_end).toLocaleDateString('pt-BR')}`}
            />

            {/* Ações de Cobrança: Imprimir PDF, WhatsApp, E-mail */}
            <div className="flex items-center justify-end gap-2 no-print flex-wrap">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Exportar PDF / Imprimir
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(detailedInvoice)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Cobrar no WhatsApp
              </button>
            </div>

            {/* Lista Discriminada de Colaboradores e Itens Consumidos */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-200">
                Lançamentos por Colaborador & Itens Consumidos:
              </h4>

              {loadingDetails ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Carregando itens discriminados...
                </div>
              ) : consumptionItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-850 rounded-2xl border border-slate-800 text-xs">
                  Nenhum lançamento individual detalhado encontrado para este período.
                </div>
              ) : (
                <div className="space-y-3">
                  {consumptionItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          {item.consumer_name} {item.consumer_phone && `(${item.consumer_phone})`}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {item.items && item.items.length > 0 && (
                        <div className="pl-4 border-l-2 border-emerald-500/40 space-y-1 my-1">
                          {item.items.map((sub, idx) => (
                            <div key={idx} className="flex justify-between text-slate-300 text-[11px]">
                              <span>{sub.quantity}x {sub.product_name}</span>
                              <span className="font-mono">R$ {sub.total_price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-bold">
                        <span className="text-slate-400">Total do Lançamento:</span>
                        <span className="text-emerald-400 font-black">
                          R$ {item.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totalizador da Fatura */}
              <div className="p-4 bg-slate-850 border border-slate-700 rounded-2xl flex items-center justify-between text-sm font-bold">
                <span className="text-slate-200">TOTAL GERAL DA FATURA:</span>
                <span className="text-xl font-black text-emerald-400">
                  R$ {Number(detailedInvoice.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end no-print">
              <button
                type="button"
                onClick={() => setDetailedInvoice(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ANEXAR COMPROVANTE DE PAGAMENTO & NOTA FISCAL */}
      {attachModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-pop">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-400" />
                Anexos da Fatura
              </h3>
              <button
                onClick={() => setAttachModalInvoice(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Anexe o comprovante de pagamento enviado pelo cliente e a Nota Fiscal (NF-e/NFS-e) emitida pelo restaurante.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  📎 Link / Arquivo do Comprovante de Pagamento:
                </label>
                <input
                  type="text"
                  placeholder="https://... ou anexo do Pix/TED"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Visualizar comprovante atual
                  </a>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  📑 Link / Arquivo da Nota Fiscal (NF-e/NFS-e):
                </label>
                <input
                  type="text"
                  placeholder="https://... ou link da nota fiscal eletrônica"
                  value={invoiceFileUrl}
                  onChange={(e) => setInvoiceFileUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {invoiceFileUrl && (
                  <a
                    href={invoiceFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Visualizar nota fiscal emitida
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAttachModalInvoice(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingAttachment}
                onClick={handleSaveAttachments}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-950/40"
              >
                {savingAttachment ? 'Salvando...' : 'Salvar Anexos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BAIXA DE PAGAMENTO DE FATURA */}
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
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
