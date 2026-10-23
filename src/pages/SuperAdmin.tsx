import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Store, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink,
  PlusCircle,
  Users,
  Search,
  X,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import type { Tenant, Profile, Consumer, CorporateClient } from '../types/database';
import { 
  fetchAllTenantsWithStats, 
  updateTenantSubscription, 
  fetchTenant, 
  fetchTenantProfiles, 
  fetchConsumers, 
  fetchCorporateClients 
} from '../lib/supabase';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

interface SuperAdminProps {
  onSelectTenant: (tenant: Tenant) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onSelectTenant, onNavigateTab }) => {
  const [tenants, setTenants] = useState<Array<Tenant & { totalVolume?: number; consumerCount?: number; corpCount?: number; profileCount?: number }>>([]);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Estados do Modal de Usuários do Restaurante
  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<Tenant | null>(null);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [modalProfiles, setModalProfiles] = useState<Profile[]>([]);
  const [modalConsumers, setModalConsumers] = useState<Consumer[]>([]);
  const [modalCorps, setModalCorps] = useState<CorporateClient[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'EQUIPE' | 'CLIENTES' | 'CONVENIOS'>('EQUIPE');
  const [modalSearch, setModalSearch] = useState('');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const [data, tData] = await Promise.all([
        fetchAllTenantsWithStats(),
        fetchTenant()
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

  const handleOpenUsersModal = async (t: Tenant) => {
    sound.playKeyClick();
    setSelectedTenantForUsers(t);
    setLoadingModalData(true);
    setActiveModalTab('EQUIPE');
    setModalSearch('');
    setShowPins({});

    try {
      const [profs, cons, corps] = await Promise.all([
        fetchTenantProfiles(t.id),
        fetchConsumers(t.id),
        fetchCorporateClients(t.id)
      ]);
      setModalProfiles(profs);
      setModalConsumers(cons);
      setModalCorps(corps);
    } catch (err) {
      console.error('Erro ao carregar detalhes dos usuários do restaurante:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleCloseUsersModal = () => {
    sound.playKeyClick();
    setSelectedTenantForUsers(null);
    setModalProfiles([]);
    setModalConsumers([]);
    setModalCorps([]);
  };

  const togglePinVisibility = (id: string) => {
    sound.playKeyClick();
    setShowPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Métricas do SaaS Caderneta
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.subscription_status === 'ACTIVE').length;
  const trialTenants = tenants.filter((t) => t.subscription_status === 'TRIAL').length;
  const totalVolume = tenants.reduce((acc, curr) => acc + (curr.totalVolume || 0), 0);
  const estimatedMRR = activeTenants * 97.00;

  // Filtros de busca no Modal
  const cleanSearch = modalSearch.trim().toLowerCase();

  const filteredProfiles = modalProfiles.filter((p) => {
    if (!cleanSearch) return true;
    return (
      p.full_name?.toLowerCase().includes(cleanSearch) ||
      p.email?.toLowerCase().includes(cleanSearch) ||
      p.phone?.toLowerCase().includes(cleanSearch) ||
      p.role?.toLowerCase().includes(cleanSearch)
    );
  });

  const filteredConsumers = modalConsumers.filter((c) => {
    if (!cleanSearch) return true;
    return (
      c.name?.toLowerCase().includes(cleanSearch) ||
      c.email?.toLowerCase().includes(cleanSearch) ||
      c.phone?.toLowerCase().includes(cleanSearch)
    );
  });

  const filteredCorps = modalCorps.filter((corp) => {
    if (!cleanSearch) return true;
    return (
      corp.company_name?.toLowerCase().includes(cleanSearch) ||
      corp.cnpj?.toLowerCase().includes(cleanSearch)
    );
  });

  const totalCreditGranted = modalConsumers.reduce((acc, c) => acc + Number(c.individual_credit_limit || 0), 0);

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
            Controle de planos, pagamentos de assinaturas, equipe de operadores e clientes cadastrados por estabelecimento.
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
          <div className="p-10 text-center bg-slate-850/40 border border-dashed border-slate-800 rounded-3xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              <Store className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-200">Nenhum restaurante cadastrado no momento</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                A base de dados da plataforma está limpa. Como Superadmin, você pode cadastrar o primeiro restaurante agora.
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('novo_restaurante')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" /> Cadastrar Restaurante
              </button>
            )}
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
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.logo_url ? (
                        <img 
                          src={t.logo_url} 
                          alt={t.trade_name} 
                          className="w-7 h-7 rounded-lg object-contain bg-slate-950 border border-slate-700 p-0.5" 
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                          <Store className="w-4 h-4" />
                        </div>
                      )}

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

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400 pt-1">
                      <span>Doc: <strong className="text-slate-200">{t.document_number || 'N/A'}</strong></span>
                      <span>Whats: <strong className="text-slate-200">{t.phone}</strong></span>
                      <span className="truncate max-w-xs" title={t.pix_key || ''}>
                        Chave Pix: <strong className="text-slate-200">{t.pix_key || 'N/A'}</strong>
                      </span>
                      <span>
                        Validade: <strong className="text-emerald-400">
                          {trialDate ? trialDate.toLocaleDateString('pt-BR') : 'Sem prazo'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="text-purple-300 font-semibold">{t.profileCount || 0} Usuários na Equipe</span> • 
                      <span>{t.consumerCount || 0} Clientes Cadastrados</span> • 
                      <span>{t.corpCount || 0} Convênios Ativos</span> • 
                      <span>Volume: <strong className="text-emerald-400 font-bold">R$ {(t.totalVolume || 0).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Ações de Superadmin para o Restaurante */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 no-print">
                    <button
                      onClick={() => handleOpenUsersModal(t)}
                      className="touch-btn px-3.5 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-950/40 transition-all active:scale-95"
                      title="Ver todos os detalhes dos usuários e equipe deste restaurante"
                    >
                      <Users className="w-3.5 h-3.5" /> Ver Usuários ({t.profileCount || 0})
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(t.id, 'ACTIVE', 30)}
                      className="touch-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativar (+30d)
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(t.id, 'TRIAL', 15)}
                      className="touch-btn px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" /> Trial (+15d)
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
                    <th className="px-4 py-3.5 text-center">Equipe</th>
                    <th className="px-4 py-3.5 text-center">Clientes</th>
                    <th className="px-4 py-3.5 text-center">Convênios</th>
                    <th className="px-4 py-3.5 text-right">Volume (R$)</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        {t.logo_url ? (
                          <img 
                            src={t.logo_url} 
                            alt={t.trade_name} 
                            className="w-5 h-5 rounded object-contain bg-slate-950 border border-slate-700 p-0.5 flex-shrink-0" 
                          />
                        ) : (
                          <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        <span>{t.trade_name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{t.document_number || '-'}</td>
                      <td className="px-4 py-3 text-slate-300">{t.phone}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/20 font-bold">
                          {t.profileCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{t.consumerCount || 0}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{t.corpCount || 0}</td>
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
                            onClick={() => handleOpenUsersModal(t)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm"
                            title="Ver detalhes de todos os usuários do restaurante"
                          >
                            <Users className="w-3 h-3" /> Usuários
                          </button>
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

      {/* MODAL DETALHADO DE USUÁRIOS DO RESTAURANTE */}
      {selectedTenantForUsers && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in no-print">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <div className="p-5 sm:p-6 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                {selectedTenantForUsers.logo_url ? (
                  <img
                    src={selectedTenantForUsers.logo_url}
                    alt={selectedTenantForUsers.trade_name}
                    className="w-12 h-12 rounded-2xl object-contain bg-slate-950 border border-slate-700 p-1 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-white truncate">
                      {selectedTenantForUsers.trade_name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 uppercase">
                      {selectedTenantForUsers.subscription_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Doc: {selectedTenantForUsers.document_number || 'N/A'} • WhatsApp: {selectedTenantForUsers.phone} • Pix: {selectedTenantForUsers.pix_key || 'N/A'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseUsersModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                title="Fechar detalhes"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Métricas Rápidas do Restaurante Selecionado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/60 border-b border-slate-800 flex-shrink-0 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Equipe & Acessos</span>
                <span className="text-lg font-black text-purple-300">{modalProfiles.length} operadores</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Clientes Cadastrados</span>
                <span className="text-lg font-black text-emerald-400">{modalConsumers.length} pessoas</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Convênios Empresas</span>
                <span className="text-lg font-black text-blue-400">{modalCorps.length} empresas</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Crédito Liberado</span>
                <span className="text-lg font-black text-teal-400">R$ {totalCreditGranted.toFixed(2)}</span>
              </div>
            </div>

            {/* Barra de Busca & Navegação de Abas do Modal */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              {/* Abas */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setActiveModalTab('EQUIPE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    activeModalTab === 'EQUIPE'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Equipe & Operadores ({modalProfiles.length})
                </button>

                <button
                  onClick={() => setActiveModalTab('CLIENTES')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    activeModalTab === 'CLIENTES'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Clientes & Cadernetas ({modalConsumers.length})
                </button>

                <button
                  onClick={() => setActiveModalTab('CONVENIOS')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    activeModalTab === 'CONVENIOS'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Convênios ({modalCorps.length})
                </button>
              </div>

              {/* Campo de Busca Rápida */}
              <div className="relative w-full sm:w-64 flex-shrink-0">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Buscar por nome, email ou fone..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {loadingModalData ? (
                <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
                  Carregando lista completa de usuários e detalhes...
                </div>
              ) : activeModalTab === 'EQUIPE' ? (
                /* TAB 1: EQUIPE & OPERADORES */
                <div className="space-y-3">
                  {filteredProfiles.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                      Nenhum operador ou perfil encontrado para este estabelecimento.
                    </div>
                  ) : (
                    filteredProfiles.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {p.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'OP'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-100">{p.full_name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 uppercase">
                                {p.role === 'RESTAURANT_ADMIN' ? 'Administrador' : p.role === 'CASHIER' ? 'Operador de Caixa' : p.role}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.approval_status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              }`}>
                                {p.approval_status === 'APPROVED' ? 'Acesso Ativo' : 'Aguardando Aprovação'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                {p.email ? (
                                  <a href={`mailto:${p.email}`} className="text-slate-300 hover:underline">
                                    {p.email}
                                  </a>
                                ) : (
                                  <span className="text-slate-600">Sem e-mail cadastrado</span>
                                )}
                              </span>

                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <a 
                                  href={`https://wa.me/55${p.phone.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  {p.phone}
                                </a>
                              </span>

                              <span className="text-slate-500">
                                Cadastro: {new Date(p.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Credencial PIN / Senha do Operador */}
                        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex-shrink-0">
                          {p.pin_hash ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="text-slate-400 text-[11px]">PIN:</span>
                              <span className="font-mono text-emerald-400 font-bold text-xs">
                                {showPins[p.id] ? p.pin_hash : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinVisibility(p.id)}
                                className="p-1 rounded text-slate-400 hover:text-white"
                                title={showPins[p.id] ? 'Ocultar PIN' : 'Visualizar PIN de Acesso'}
                              >
                                {showPins[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Sem PIN configurado</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeModalTab === 'CLIENTES' ? (
                /* TAB 2: CLIENTES & CADERNETAS */
                <div className="space-y-3">
                  {filteredConsumers.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                      Nenhum cliente ou caderneta encontrada para este restaurante.
                    </div>
                  ) : (
                    filteredConsumers.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {c.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'CL'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-100">{c.name}</h4>
                              
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.approval_status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              }`}>
                                {c.approval_status === 'APPROVED' ? 'Aprovado' : 'Aguardando Aprovação'}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.status === 'ACTIVE' ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-400'
                              }`}>
                                {c.status === 'ACTIVE' ? 'Caderneta Ativa' : 'Bloqueada'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                {c.email ? (
                                  <span className="text-slate-300 flex items-center gap-1">
                                    {c.email}
                                    {c.email_verified ? (
                                      <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold" title="E-mail verificado">
                                        Verificado ✓
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded" title="E-mail não verificado">
                                        Não verificado
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">Sem e-mail</span>
                                )}
                              </span>

                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <a 
                                  href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  {c.phone}
                                </a>
                              </span>

                              <span className="text-slate-500">
                                Ciclo: <strong className="text-slate-300">{c.individual_billing_cycle || 'SEMANAL'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Limite de Crédito da Caderneta */}
                        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex-shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Limite Liberado</span>
                          <span className="text-base font-black text-emerald-400">
                            R$ {Number(c.individual_credit_limit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* TAB 3: CONVÊNIOS CORPORATIVOS */
                <div className="space-y-3">
                  {filteredCorps.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                      Nenhum convênio corporativo cadastrado para este estabelecimento.
                    </div>
                  ) : (
                    filteredCorps.map((corp) => (
                      <div
                        key={corp.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-400" />
                            <h4 className="font-bold text-sm text-slate-100">{corp.company_name}</h4>
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap gap-4 pt-1">
                            <span>CNPJ: <strong className="text-slate-200">{corp.cnpj || 'Não informado'}</strong></span>
                            <span>Ciclo: <strong className="text-slate-200">{corp.billing_cycle}</strong></span>
                            <span>Fechamento dia: <strong className="text-blue-400">{corp.closing_day}</strong></span>
                            <span>Prazo pagamento: <strong className="text-emerald-400">{corp.payment_terms_days} dias</strong></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Limite por Funcionário</span>
                          <span className="text-base font-black text-blue-400">
                            {Number(corp.spending_limit_per_user) > 0 ? `R$ ${Number(corp.spending_limit_per_user).toFixed(2)}` : 'Ilimitado'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between flex-shrink-0 text-xs text-slate-400">
              <span>Restaurante ID: <code className="text-slate-300 font-mono text-[11px]">{selectedTenantForUsers.id}</code></span>
              <button
                onClick={handleCloseUsersModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
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
