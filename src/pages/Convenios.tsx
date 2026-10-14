import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Utensils, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  MessageSquare, 
  Printer, 
  Trash2, 
  Star, 
  X, 
  Eye
} from 'lucide-react';
import type { CorporateClient, BillingCycle, Tenant } from '../types/database';
import type { DetailedConsumptionItem } from '../lib/supabase';
import { 
  fetchCorporateClients, 
  createCorporateClient, 
  createCorporateContact, 
  deleteCorporateContact, 
  fetchTenant, 
  fetchDetailedCorporateConsumption, 
  DEFAULT_TENANT_ID 
} from '../lib/supabase';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

export const Convenios: React.FC = () => {
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [isAdding, setIsAdding] = useState(false);

  // Form de Empresa
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('SEMANAL');
  const [paymentWeekday, setPaymentWeekday] = useState<'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO'>('QUINTA');
  const [closingDay, setClosingDay] = useState(15);
  const [coversOnlyMeal, setCoversOnlyMeal] = useState(true);

  // Modal de Contatos da Empresa
  const [selectedCorpForContacts, setSelectedCorpForContacts] = useState<CorporateClient | null>(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Financeiro');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactIsPrimary, setNewContactIsPrimary] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  // Modal de Relatório de Consumo do Convênio
  const [detailedCorp, setDetailedCorp] = useState<CorporateClient | null>(null);
  const [consumptionList, setConsumptionList] = useState<DetailedConsumptionItem[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cList, tData] = await Promise.all([
      fetchCorporateClients(),
      fetchTenant(DEFAULT_TENANT_ID)
    ]);
    setCorps(cList);
    setTenant(tData);
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
        payment_weekday: paymentWeekday,
        payment_day_type: billingCycle === 'SEMANAL' ? 'WEEKDAY' : 'MONTHDAY',
        closing_day: Number(closingDay),
        payment_terms_days: 5,
        spending_limit_per_user: 0,
        company_covers_only_meal: coversOnlyMeal
      });

      sound.playSuccessChime();
      setIsAdding(false);
      setCompanyName('');
      setCnpj('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar empresa';
      alert(msg);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorpForContacts || !newContactName.trim()) return;

    setAddingContact(true);
    try {
      sound.playKeyClick();
      await createCorporateContact({
        corporate_client_id: selectedCorpForContacts.id,
        name: newContactName.trim(),
        role: newContactRole.trim(),
        phone: newContactPhone.trim(),
        email: newContactEmail.trim(),
        is_primary: newContactIsPrimary
      });

      sound.playSuccessChime();
      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      setNewContactIsPrimary(false);

      // Recarregar
      const updatedCorps = await fetchCorporateClients();
      setCorps(updatedCorps);
      const updatedCurrent = updatedCorps.find(c => c.id === selectedCorpForContacts.id);
      if (updatedCurrent) setSelectedCorpForContacts(updatedCurrent);
    } catch (err: any) {
      alert('Erro ao salvar contato: ' + err.message);
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Deseja remover este contato?')) return;
    try {
      await deleteCorporateContact(contactId);
      sound.playSuccessChime();
      const updatedCorps = await fetchCorporateClients();
      setCorps(updatedCorps);
      if (selectedCorpForContacts) {
        const updatedCurrent = updatedCorps.find(c => c.id === selectedCorpForContacts.id);
        if (updatedCurrent) setSelectedCorpForContacts(updatedCurrent);
      }
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleOpenReport = async (corp: CorporateClient) => {
    setDetailedCorp(corp);
    setLoadingConsumption(true);
    try {
      const list = await fetchDetailedCorporateConsumption(corp.id);
      setConsumptionList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConsumption(false);
    }
  };

  const handleSendWhatsAppBilling = (corp: CorporateClient) => {
    const primaryContact = corp.contacts?.find(c => c.is_primary) || corp.contacts?.[0];
    const phone = primaryContact?.phone || corp.cnpj || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const total = Number(corp.total_pending || 0).toFixed(2);

    const text = encodeURIComponent(
      `Olá, *${corp.company_name}*${primaryContact ? ` (A/C ${primaryContact.name})` : ''}!\n\n` +
      `Aqui é do *${tenant?.trade_name || 'Restaurante'}*.\n` +
      `Conforme combinado para o pagamento semanal (${corp.payment_weekday || 'Quinta-feira'}), estamos adiantando o relatório de consumo dos seus colaboradores.\n\n` +
      `💰 *Saldo Acumulado do Período:* R$ ${total}\n` +
      `👥 *Colaboradores que consumiram:* ${corp.employee_count || 0}\n\n` +
      `🔑 *Chave Pix para Pagamento:* ${tenant?.pix_key || ''} (${tenant?.pix_key_type || 'Chave'})\n` +
      (tenant?.bank_name ? `🏦 *Banco:* ${tenant.bank_name} | Ag: ${tenant.bank_agency || ''} | CC: ${tenant.bank_account || ''}\n` : '') +
      `\nQualquer dúvida sobre os itens consumidos, estamos à disposição!\n` +
      `Obrigado pela parceria!`
    );

    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Helper para verificar se vence amanhã ou hoje
  const getBillingAlert = (corp: CorporateClient) => {
    const today = new Date().getDay(); // 0 = Domingo, 1 = Segunda, 4 = Quinta, etc.
    const dayMap: Record<string, number> = {
      'DOMINGO': 0, 'SEGUNDA': 1, 'TERCA': 2, 'QUARTA': 3, 'QUINTA': 4, 'SEXTA': 5, 'SABADO': 6
    };
    const targetDay = dayMap[corp.payment_weekday || 'QUINTA'] ?? 4;

    const diff = (targetDay - today + 7) % 7;
    if (diff === 1) {
      return { isWarning: true, message: `⚠️ Vence amanhã (${corp.payment_weekday || 'Quinta'}) - Enviar relatório hoje!` };
    } else if (diff === 0) {
      return { isWarning: true, message: `🚨 Vence hoje (${corp.payment_weekday || 'Quinta'})! Cobrança programada.` };
    }
    return { isWarning: false, message: `Paga toda ${corp.payment_weekday || 'Quinta-feira'}` };
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header com Toggle e Botão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Gestão de Convênios & Empresas
          </h2>
          <p className="text-xs text-slate-400">
            Configure ciclos de pagamento (ex: Quinta-feira), múltiplos contatos do financeiro/RH e emita relatórios analíticos de consumo.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap no-print">
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            onPrint={() => window.print()}
            printLabel="Exportar PDF"
          />

          <button
            onClick={() => {
              sound.playKeyClick();
              setIsAdding(!isAdding);
            }}
            className="touch-btn bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            Novo Convênio
          </button>
        </div>
      </div>

      {/* Formulário de Novo Convênio */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-pop shadow-xl no-print">
          <h3 className="font-extrabold text-base text-slate-100">Cadastrar Nova Empresa Conveniada</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Razão Social / Nome Fantasia *</label>
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
              <label className="text-xs font-bold text-slate-400 block mb-1">Ciclo de Pagamento:</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="SEMANAL">Semanal (Dia Fixo da Semana)</option>
                <option value="QUINZENAL">Quinzenal (Dia 15 e 30)</option>
                <option value="MENSAL">Mensal (Fim do Mês / Dia 30)</option>
              </select>
            </div>

            {billingCycle === 'SEMANAL' ? (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Dia da Semana do Pagamento:</label>
                <select
                  value={paymentWeekday}
                  onChange={(e) => setPaymentWeekday(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="SEGUNDA">Toda Segunda-feira</option>
                  <option value="TERCA">Toda Terça-feira</option>
                  <option value="QUARTA">Toda Quarta-feira</option>
                  <option value="QUINTA">Toda Quinta-feira</option>
                  <option value="SEXTA">Toda Sexta-feira</option>
                  <option value="SABADO">Todo Sábado</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Dia do Vencimento:</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={closingDay}
                  onChange={(e) => setClosingDay(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 text-center font-bold"
                />
              </div>
            )}
          </div>

          {/* Regra de Cobertura */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-bold text-slate-200 block">
                  Empresa cobre apenas a refeição (Prato Feito / Almoço)?
                </span>
                <span className="text-xs text-slate-400">
                  Se ativado, bebidas e sobremesas são cobradas à parte na caderneta pessoal do colaborador.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCoversOnlyMeal(!coversOnlyMeal)}
              className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 touch-btn ${
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

      {/* LISTAGEM DE EMPRESAS: MODO CARDS OU TABELA */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {corps.map((corp) => {
            const alertInfo = getBillingAlert(corp);
            return (
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

                {/* Alerta de Vencimento / Fechamento Semanal */}
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  alertInfo.isWarning 
                    ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-slate-850 border border-slate-800 text-slate-300'
                }`}>
                  <Clock className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>{alertInfo.message}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-850 border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Ciclo</span>
                    <span className="text-xs font-black text-slate-200">{corp.billing_cycle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Pagamento</span>
                    <span className="text-xs font-black text-emerald-400">
                      {corp.billing_cycle === 'SEMANAL' ? (corp.payment_weekday || 'QUINTA') : `Dia ${corp.closing_day}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Equipe</span>
                    <span className="text-xs font-black text-slate-200">{corp.employee_count || 0} pessoas</span>
                  </div>
                </div>

                {/* Contatos Cadastrados */}
                <div className="p-3 rounded-2xl bg-slate-850/60 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      Contatos da Empresa ({corp.contacts?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCorpForContacts(corp)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Gerenciar Contatos
                    </button>
                  </div>
                  
                  {corp.contacts && corp.contacts.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      {corp.contacts.slice(0, 2).map(c => (
                        <div key={c.id} className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span className="truncate">
                            {c.is_primary && <span className="text-amber-400 font-bold mr-1">★</span>}
                            {c.name} ({c.role || 'Geral'})
                          </span>
                          {c.phone && (
                            <a
                              href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> {c.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">Nenhum contato cadastrado ainda.</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">SALDO DO CICLO ATUAL:</span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {Number(corp.total_pending || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(corp)}
                      className="touch-btn px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                      title="Ver extrato e imprimir relatório"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      Relatório
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppBilling(corp)}
                      className="touch-btn px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                      title="Cobrar ou enviar prévia no WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Cobrança
                    </button>
                  </div>
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
                  <th className="px-4 py-3.5">Empresa</th>
                  <th className="px-4 py-3.5">CNPJ</th>
                  <th className="px-4 py-3.5">Ciclo & Pagamento</th>
                  <th className="px-4 py-3.5">Colaboradores</th>
                  <th className="px-4 py-3.5">Contatos</th>
                  <th className="px-4 py-3.5 text-right">Saldo Atual</th>
                  <th className="px-4 py-3.5 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {corps.map((corp) => {
                  const alertInfo = getBillingAlert(corp);
                  const primary = corp.contacts?.find(c => c.is_primary) || corp.contacts?.[0];

                  return (
                    <tr key={corp.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {corp.company_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{corp.cnpj || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-200 block">
                          {corp.billing_cycle === 'SEMANAL' ? `Toda ${corp.payment_weekday || 'Quinta'}` : `Mensal (Dia ${corp.closing_day})`}
                        </span>
                        {alertInfo.isWarning && (
                          <span className="text-[10px] text-amber-400 font-bold block">
                            {alertInfo.message}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{corp.employee_count || 0} ativos</td>
                      <td className="px-4 py-3">
                        {primary ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-white">{primary.name} ({primary.role || 'Contato'})</span>
                            {primary.phone && (
                              <span className="block text-emerald-400">{primary.phone}</span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedCorpForContacts(corp)}
                            className="text-[11px] text-slate-500 hover:text-emerald-400 underline"
                          >
                            + Cadastrar
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                        R$ {Number(corp.total_pending || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCorpForContacts(corp)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400"
                            title="Gerenciar Contatos"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReport(corp)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                            title="Ver Relatório Detalhado"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppBilling(corp)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                            title="Cobrar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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
      )}

      {/* MODAL 1: GERENCIAR MÚLTIPLOS CONTATOS DA EMPRESA */}
      {selectedCorpForContacts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-pop">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Contatos: {selectedCorpForContacts.company_name}
                </h3>
                <p className="text-xs text-slate-400">Cadastre os responsáveis pelo Financeiro, RH ou Diretoria para envio das cobranças e notas fiscais.</p>
              </div>
              <button
                onClick={() => setSelectedCorpForContacts(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Contatos Existentes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Contatos Cadastrados:</span>
              {(!selectedCorpForContacts.contacts || selectedCorpForContacts.contacts.length === 0) ? (
                <p className="text-xs text-slate-500 bg-slate-850 p-3 rounded-xl border border-slate-800">
                  Nenhum contato cadastrado ainda. Use o formulário abaixo.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedCorpForContacts.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{contact.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {contact.role || 'Geral'}
                          </span>
                          {contact.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> Principal
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-slate-400 text-xs">
                          {contact.phone && (
                            <a
                              href={`https://wa.me/55${contact.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <Mail className="w-3 h-3 text-slate-500" /> {contact.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800"
                        title="Remover Contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulário para Adicionar Novo Contato */}
            <form onSubmit={handleAddContact} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">Adicionar Novo Contato</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nome do Contato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana Paula"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Cargo / Setor</label>
                  <select
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Financeiro">Financeiro / Contas a Pagar</option>
                    <option value="Recursos Humanos">Recursos Humanos / DP</option>
                    <option value="Diretoria">Diretoria / Gerência</option>
                    <option value="Compras">Compras</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">E-mail (para envio de faturas)</label>
                  <input
                    type="email"
                    placeholder="financeiro@empresa.com.br"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newContactIsPrimary}
                    onChange={(e) => setNewContactIsPrimary(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Definir como contato principal de cobrança</span>
                </label>

                <button
                  type="submit"
                  disabled={addingContact}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md touch-btn disabled:opacity-50"
                >
                  {addingContact ? 'Salvando...' : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RELATÓRIO ANALÍTICO DA EMPRESA (PDF / WHATSAPP) */}
      {detailedCorp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto text-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Relatório Analítico de Consumo Corporativo
              </h3>
              <button
                onClick={() => setDetailedCorp(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabeçalho Oficial do Relatório com dados do restaurante */}
            <ReportHeader
              tenant={tenant}
              title={`Demonstrativo de Alimentação: ${detailedCorp.company_name}`}
              subtitle={`CNPJ: ${detailedCorp.cnpj || 'Não cadastrado'} • Vencimento: Toda ${detailedCorp.payment_weekday || 'Quinta-feira'}`}
              periodText={`Ciclo Ativo Atual`}
            />

            {/* Ações */}
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
                onClick={() => handleSendWhatsAppBilling(detailedCorp)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 touch-btn shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar Prévia no WhatsApp
              </button>
            </div>

            {/* Lista dos Colaboradores e Itens Consumidos */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-200">
                Detalhamento dos Colaboradores no Ciclo:
              </h4>

              {loadingConsumption ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Carregando consumo da empresa...
                </div>
              ) : consumptionList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-850 rounded-2xl border border-slate-800 text-xs">
                  Nenhum lançamento registrado no ciclo atual desta empresa.
                </div>
              ) : (
                <div className="space-y-3">
                  {consumptionList.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          {entry.consumer_name} {entry.consumer_phone && `(${entry.consumer_phone})`}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(entry.created_at).toLocaleDateString('pt-BR')} às {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {entry.items && entry.items.length > 0 && (
                        <div className="pl-4 border-l-2 border-emerald-500/40 space-y-1 my-1">
                          {entry.items.map((sub, idx) => (
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
                          R$ {entry.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totalizador */}
              <div className="p-4 bg-slate-850 border border-slate-700 rounded-2xl flex items-center justify-between text-sm font-bold">
                <span className="text-slate-200">TOTAL ACUMULADO NO PERÍODO:</span>
                <span className="text-xl font-black text-emerald-400">
                  R$ {Number(detailedCorp.total_pending || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end no-print">
              <button
                type="button"
                onClick={() => setDetailedCorp(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
