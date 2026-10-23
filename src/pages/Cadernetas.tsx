import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  Search, 
  MessageSquare, 
  DollarSign,
  Eye,
  UserPlus,
  Send,
  X,
  CheckCircle2,
  Crown
} from 'lucide-react';
import type { Consumer, CorporateClient, Tenant } from '../types/database';
import { 
  fetchConsumers, 
  fetchCorporateClients, 
  fetchTenant, 
  settleConsumerDirectly,
  registerConsumer,
  toggleConsumerResponsible 
} from '../lib/supabase';
import { sendInviteEmail } from '../lib/emailService';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';


interface CadernetasProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
  onViewStatement: (consumerId: string) => void;
}

export const Cadernetas: React.FC<CadernetasProps> = ({ 
  tenantId, 
  activeTenant, 
  onViewStatement 
}) => {
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

  // Modal de Convidar Cliente
  const [isInviting, setIsInviting] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLimit, setInviteLimit] = useState('200.00');
  const [inviteCorpId, setInviteCorpId] = useState('');
  const [inviteIsResponsible, setInviteIsResponsible] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId, activeTenant?.id]);

  const loadData = async () => {
    const targetTenantId = tenantId || activeTenant?.id;
    if (!targetTenantId) {
      setConsumers([]);
      setCorps([]);
      setTenant(null);
      return;
    }
    const [cData, corpData, tData] = await Promise.all([
      fetchConsumers(targetTenantId),
      fetchCorporateClients(targetTenantId),
      fetchTenant(targetTenantId)
    ]);
    setConsumers(cData);
    setCorps(corpData);
    setTenant(tData || activeTenant || null);
  };

  const showNotification = (msg: string) => {
    sound.playSuccessChime();
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 5000);
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

  const handleOpenSettle = (c: Consumer) => {
    sound.playKeyClick();
    setSettleConsumer(c);
    setSettleAmount((c.total_pending || 0).toFixed(2));
  };

  const handleConfirmSettle = async () => {
    if (!settleConsumer) return;
    const amt = parseFloat(settleAmount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    sound.playKeyClick();
    setIsSettling(true);

    try {
      await settleConsumerDirectly(settleConsumer.id, amt, settleMethod);

      sound.playSuccessChime();

      setSettleConsumer(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na baixa';
      alert(msg);
    } finally {
      setIsSettling(false);
    }
  };

  const handleSendWhatsApp = (c: Consumer) => {
    const phone = c.phone.replace(/\D/g, '');
    const total = Number(c.total_pending || 0).toFixed(2);
    const pix = tenant?.pix_key || '';

    const text = encodeURIComponent(
      `Olá, *${c.name}*!\n\n` +
      `Aqui é do *${tenant?.trade_name || 'Restaurante'}*.\n` +
      `Passando para lembrar do seu saldo em aberto na caderneta:\n` +
      `💰 *Total:* R$ ${total}\n\n` +
      (pix ? `🔑 *Chave Pix:* ${pix} (${tenant?.pix_key_type || 'Chave'})\n\n` : '') +
      `Qualquer dúvida estamos à disposição!`
    );

    const url = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !invitePhone.trim() || !inviteEmail.trim()) {
      alert('Nome, telefone e e-mail são obrigatórios.');
      return;
    }

    sound.playKeyClick();
    setSendingInvite(true);
    const targetTenantId = tenantId || tenant?.id || activeTenant?.id;
    if (!targetTenantId) {
      alert('Nenhum restaurante ativo selecionado para enviar convite.');
      setSendingInvite(false);
      return;
    }

    try {
      // 1. Cadastrar consumidor
      const newConsumer = await registerConsumer({
        tenant_id: targetTenantId,
        name: inviteName.trim(),
        phone: invitePhone.trim(),
        email: inviteEmail.trim(),
        pin: '1234',
        corporate_client_id: inviteCorpId || undefined
      });

      if (!newConsumer?.id) throw new Error('Falha ao cadastrar cliente');

      // 2. Se for de empresa e marcado como responsável
      if (inviteCorpId && inviteIsResponsible) {
        await toggleConsumerResponsible({
          consumer: { ...newConsumer, name: inviteName.trim(), phone: invitePhone.trim(), email: inviteEmail.trim() },
          corpId: inviteCorpId,
          makeResponsible: true,
          tenantId: targetTenantId
        });
      }

      // 3. Disparar e-mail de convite
      const inviteUrl = `${window.location.origin}/?invite=true&tenant=${targetTenantId}&email=${encodeURIComponent(inviteEmail.trim())}&name=${encodeURIComponent(inviteName.trim())}${inviteCorpId ? `&corp=${inviteCorpId}` : ''}`;
      
      await sendInviteEmail({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        restaurantName: tenant?.trade_name || 'Restaurante Parceiro',
        inviteUrl,
        creditLimit: parseFloat(inviteLimit.replace(',', '.')) || 200
      });

      showNotification(`✉️ Convite enviado com sucesso para ${inviteEmail}!`);
      setIsInviting(false);
      setInviteName('');
      setInvitePhone('');
      setInviteEmail('');
      setInviteLimit('200.00');
      setInviteCorpId('');
      setInviteIsResponsible(false);

      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar convite';
      alert(msg);
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          {feedback}
        </div>
      )}

      {/* Topo Oficial com Header e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Cadernetas & Fiado Digital
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe o saldo dos clientes individuais e convênios corporativos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap no-print">
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            onPrint={() => window.print()}
            printLabel="Exportar Relatório"
          />

          {/* Botão de Convidar Cliente */}
          <button
            onClick={() => {
              sound.playKeyClick();
              setIsInviting(true);
            }}
            className="touch-btn px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Cliente
          </button>

          {/* Seletor de Tipo: PF vs Empresas */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                sound.playKeyClick();
                setTab('INDIVIDUAL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                tab === 'INDIVIDUAL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Clientes ({consumers.length})
            </button>
            <button
              onClick={() => {
                sound.playKeyClick();
                setTab('CORPORATE');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
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

        {/* Filtros de Status */}
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
                  className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-base">{consumer.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{consumer.phone}</p>
                      {consumer.corporate_client && (
                        <span className="text-[10px] text-blue-400 font-bold block mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {consumer.corporate_client.company_name}
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      st.color === 'GREEN'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                        : st.color === 'YELLOW'
                        ? 'bg-amber-950 text-amber-400 border-amber-500/30'
                        : 'bg-rose-950 text-rose-400 border-rose-500/30'
                    }`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Barra de Progresso do Limite */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Em Aberto:</span>
                      <span className="text-emerald-400">R$ {pending.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percent > 90 ? 'bg-rose-500' : percent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Limite: R$ {limit.toFixed(2)}</span>
                      <span>{percent}% usado</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onViewStatement(consumer.id)}
                      className="touch-btn flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Extrato
                    </button>

                    <button
                      onClick={() => handleOpenSettle(consumer)}
                      className="touch-btn flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Dar Baixa
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(consumer)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl"
                      title="Enviar Cobrança no WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
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
                    <th className="px-4 py-3.5">Nome do Cliente</th>
                    <th className="px-4 py-3.5">Telefone</th>
                    <th className="px-4 py-3.5">Empresa</th>
                    <th className="px-4 py-3.5 text-right">Saldo Devedor</th>
                    <th className="px-4 py-3.5 text-right">Limite</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {filteredConsumers.map((consumer) => {
                    const st = getConsumerStatus(consumer);
                    return (
                      <tr key={consumer.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-white">{consumer.name}</td>
                        <td className="px-4 py-3 text-slate-400">{consumer.phone}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {consumer.corporate_client?.company_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                          R$ {Number(consumer.total_pending || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          R$ {Number(consumer.individual_credit_limit || 200).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            st.color === 'GREEN'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                              : st.color === 'YELLOW'
                              ? 'bg-amber-950 text-amber-400 border-amber-500/30'
                              : 'bg-rose-950 text-rose-400 border-rose-500/30'
                          }`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onViewStatement(consumer.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Ver Extrato"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenSettle(consumer)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Dar Baixa"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSendWhatsApp(consumer)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
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
        )
      )}

      {/* ABA 2: EMPRESAS CONVENIADAS */}
      {tab === 'CORPORATE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCorps.map((corp) => (
            <div
              key={corp.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    {corp.company_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">CNPJ: {corp.cnpj || 'Não informado'}</p>
                </div>

                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {corp.billing_cycle}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Acumulado:</span>
                <span className="text-lg font-black text-emerald-400">
                  R$ {Number(corp.total_pending || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CONVIDAR CLIENTE / COLABORADOR */}
      {isInviting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-pop">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Convidar Cliente para a Caderneta
              </h3>
              <button
                onClick={() => setIsInviting(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInviteSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">E-mail para Convite *</label>
                  <input
                    type="email"
                    required
                    placeholder="joao@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Limite Individual (R$)</label>
                  <input
                    type="text"
                    value={inviteLimit}
                    onChange={(e) => setInviteLimit(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Empresa (Opcional)</label>
                  <select
                    value={inviteCorpId}
                    onChange={(e) => setInviteCorpId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Nenhuma (Cliente Individual)</option>
                    {corps.map((c) => (
                      <option key={c.id} value={c.id}>🏢 {c.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {inviteCorpId && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-amber-200 block">
                        Marcar como Responsável pelo Pagamento da Empresa?
                      </span>
                      <span className="text-[10px] text-amber-300/80">
                        Recebe faturas, recibos e gerencia os colaboradores.
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={inviteIsResponsible}
                    onChange={(e) => setInviteIsResponsible(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviting(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="touch-btn px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingInvite ? 'Enviando Convite...' : 'Enviar Convite por E-mail'}
                </button>
              </div>
            </form>
          </div>
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
