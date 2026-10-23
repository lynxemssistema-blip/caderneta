import React from 'react';
import { 
  Menu, 
  PanelLeft, 
  Store, 
  Server, 
  ShieldAlert, 
  BookOpen, 
  Receipt, 
  UtensilsCrossed, 
  UserCheck, 
  Building2, 
  Wallet, 
  UserPlus, 
  Settings, 
  User, 
  Info,
  PlusCircle,
  Briefcase,
  ShoppingBag,
  Bell,
  LogOut
} from 'lucide-react';
import type { UserRole, Tenant } from '../types/database';
import { ROLE_USER_MAP } from '../lib/userSession';

interface TopHeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTenant?: Tenant | null;
  allTenants?: Tenant[];
  onSelectTenant?: (tenant: Tenant) => void;
  customUserName?: string;
  customUserEmail?: string;
  onLogout?: () => void;
  pendingApprovalsCount?: number;
  onOpenMobileMenu: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
  balcao: {
    title: 'Balcão PDV',
    subtitle: 'Lançamento rápido e registro em caderneta',
    icon: ShoppingBag,
  },
  cadernetas: {
    title: 'Cadernetas de Clientes',
    subtitle: 'Gestão de contas correntes e saldos em aberto',
    icon: BookOpen,
  },
  faturas: {
    title: 'Faturas & Ciclos',
    subtitle: 'Fechamentos de convênios e cobranças',
    icon: Receipt,
  },
  caixa: {
    title: 'Fluxo de Caixa',
    subtitle: 'Entradas, sangrias e controle diário',
    icon: Wallet,
  },
  produtos: {
    title: 'Cardápio & Preços',
    subtitle: 'Gestão de produtos, refeições e bebidas',
    icon: UtensilsCrossed,
  },
  aprovacoes: {
    title: 'Aprovações Pendentes',
    subtitle: 'Solicitações de novos clientes conveniados',
    icon: UserCheck,
  },
  convenios: {
    title: 'Convênios Empresariais',
    subtitle: 'Regras de limites, subsídios e ciclos',
    icon: Building2,
  },
  gestor_empresa: {
    title: 'Portal da Empresa',
    subtitle: 'Visão corporativa de colaboradores e consumo',
    icon: Briefcase,
  },
  meu_restaurante: {
    title: 'Meu Restaurante',
    subtitle: 'Configurações do estabelecimento e chave PIX',
    icon: Settings,
  },
  cadastro: {
    title: 'Novo Cliente',
    subtitle: 'Cadastrar novo consumidor ou colaborador',
    icon: UserPlus,
  },
  portal_consumidor: {
    title: 'Meu Consumo',
    subtitle: 'Extrato pessoal e limites do cliente',
    icon: User,
  },
  superadmin: {
    title: 'Superadmin Plataforma',
    subtitle: 'Métricas globais de todos os restaurantes',
    icon: ShieldAlert,
  },
  novo_restaurante: {
    title: 'Novo Restaurante Master',
    subtitle: 'Inicializar novo estabelecimento na plataforma',
    icon: PlusCircle,
  },
  landing: {
    title: 'Sobre a Plataforma',
    subtitle: 'Apresentação e visão geral do sistema',
    icon: Info,
  },
  extrato: {
    title: 'Extrato Detalhado',
    subtitle: 'Histórico de lançamentos e comprovantes',
    icon: BookOpen,
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  onRoleChange,
  activeTenant,
  customUserName,
  customUserEmail,
  onLogout,
  pendingApprovalsCount = 0,
  onOpenMobileMenu,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const currentInfo = TAB_TITLES[currentTab] || {
    title: 'Caderneta SaaS',
    subtitle: 'Sistema de Alimentação & Convênios',
    icon: Store,
  };
  const Icon = currentInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 h-16 flex items-center justify-between no-print transition-all">
      {/* Lado Esquerdo: Botão Menu + Título da Página / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Botão Mobile para abrir a Sidebar lateral */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Botão Desktop para alternar largura da Sidebar */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Identificação da Tela Atual */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight flex items-center gap-2">
              {currentInfo.title}
              {pendingApprovalsCount > 0 && currentTab === 'aprovacoes' && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 animate-pulse">
                  {pendingApprovalsCount} pendente(s)
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block leading-tight">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito: Restaurante + Nuvem + Usuário Logado & Perfil */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        
        {/* Botão de Atalho Rápido para Balcão PDV quando estiver em outra tela */}
        {currentTab !== 'balcao' && ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER'].includes(userRole) && (
          <button
            onClick={() => onSelectTab('balcao')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Balcão PDV</span>
          </button>
        )}

        {/* Notificação de Aprovações (se houver) */}
        {pendingApprovalsCount > 0 && ['SUPERADMIN', 'RESTAURANT_ADMIN'].includes(userRole) && (
          <button
            onClick={() => onSelectTab('aprovacoes')}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={`${pendingApprovalsCount} solicitações de clientes aguardando aprovação`}
          >
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
          </button>
        )}

        {/* Tag Destacada do Restaurante Ativo (Visível para todos os usuários) */}
        <div 
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-emerald-500/30 text-xs text-slate-200 shadow-sm max-w-[170px] sm:max-w-[260px]"
          title={`Restaurante Ativo: ${activeTenant?.trade_name || 'Nenhum'}`}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeTenant ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${activeTenant ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          {activeTenant?.logo_url ? (
            <img 
              src={activeTenant.logo_url} 
              alt={activeTenant.trade_name} 
              className="w-5 h-5 rounded-md object-contain bg-slate-950 flex-shrink-0 border border-slate-700"
            />
          ) : (
            <Store className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <span className="block text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-emerald-400/90 leading-none truncate">
              Restaurante Ativo
            </span>
            <span className="font-bold text-slate-100 truncate block leading-tight text-[11px] sm:text-xs">
              {activeTenant?.trade_name || 'Nenhum Ativo'}
            </span>
          </div>
        </div>

        {/* Status Lynx EMS Cloud */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Server className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Lynx Cloud</span>
        </div>

        {/* Usuário Logado no Sistema & Seletor de Perfil */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
          {/* Avatar com Iniciais */}
          <div
            className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${ROLE_USER_MAP[userRole]?.avatarColor || 'from-emerald-600 to-teal-500'} flex items-center justify-center font-black text-xs text-white shadow-sm flex-shrink-0`}
            title={`Usuário logado: ${customUserName || ROLE_USER_MAP[userRole]?.name}`}
          >
            {(customUserName || ROLE_USER_MAP[userRole]?.name || 'EM')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()}
          </div>

          {/* Nome e Role Selector */}
          <div className="hidden sm:block text-left">
            <p 
              className="text-xs font-bold text-white leading-tight truncate max-w-[130px]" 
              title={`${customUserName || ROLE_USER_MAP[userRole]?.name}${customUserEmail ? ` (${customUserEmail})` : ''}`}
            >
              {customUserName || ROLE_USER_MAP[userRole]?.name}
            </p>
            <select
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-emerald-400 text-[10px] font-bold p-0 pr-2 border-0 focus:outline-none cursor-pointer truncate max-w-[130px]"
              title="Trocar visão"
            >
              <option value="SUPERADMIN" className="bg-slate-900 text-slate-200">🛡️ Superadmin</option>
              <option value="RESTAURANT_ADMIN" className="bg-slate-900 text-slate-200">👑 Dono (Master)</option>
              <option value="CASHIER" className="bg-slate-900 text-slate-200">🧑‍🍳 Atendente Caixa</option>
              <option value="COMPANY_MANAGER" className="bg-slate-900 text-slate-200">🏢 Gestor Empresa</option>
              <option value="CONSUMER" className="bg-slate-900 text-slate-200">👤 Consumidor</option>
            </select>
          </div>

          {/* Botão Sair */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Sair do Sistema (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
