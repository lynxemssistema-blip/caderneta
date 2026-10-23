import React from 'react';
import { 
  Store, 
  BookOpen, 
  Receipt, 
  UtensilsCrossed, 
  UserCheck, 
  Building2, 
  Wallet, 
  UserPlus, 
  X,
  Server,
  ShieldAlert,
  ShoppingBag,
  Settings,
  User,
  Info,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Briefcase,
  LogOut
} from 'lucide-react';
import type { UserRole, Tenant } from '../types/database';
import { sound } from '../lib/sound';
import { ROLE_USER_MAP } from '../lib/userSession';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  pendingApprovalsCount?: number;
  activeTenant?: Tenant | null;
  allTenants?: Tenant[];
  onSelectTenant?: (tenant: Tenant) => void;
  customUserName?: string;
  customUserEmail?: string;
  onLogout?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number | string;
  badgeColor?: string;
  isHighlight?: boolean;
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  onRoleChange,
  pendingApprovalsCount = 0,
  activeTenant,
  allTenants = [],
  onSelectTenant,
  customUserName,
  customUserEmail,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}) => {
  const defaultUserInfo = ROLE_USER_MAP[userRole] || ROLE_USER_MAP.RESTAURANT_ADMIN;
  const userName = customUserName || defaultUserInfo.name;
  const userEmail = customUserEmail || defaultUserInfo.email;
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'EM';

  const groups: NavGroupDef[] = [
    {
      title: 'Operação',
      items: [
        {
          id: 'balcao',
          label: 'Balcão PDV',
          icon: ShoppingBag,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER'],
          isHighlight: true,
        },
        {
          id: 'cadernetas',
          label: 'Cadernetas',
          icon: BookOpen,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'COMPANY_MANAGER'],
        },
        {
          id: 'faturas',
          label: 'Faturas & Ciclos',
          icon: Receipt,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'COMPANY_MANAGER'],
        },
        {
          id: 'caixa',
          label: 'Fluxo de Caixa',
          icon: Wallet,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'],
        },
      ],
    },
    {
      title: 'Cardápio & Convênios',
      items: [
        {
          id: 'produtos',
          label: 'Cardápio / Produtos',
          icon: UtensilsCrossed,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'],
        },
        {
          id: 'convenios',
          label: 'Convênios Empresas',
          icon: Building2,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'],
        },
        {
          id: 'gestor_empresa',
          label: 'Portal Empresa',
          icon: Briefcase,
          roles: ['SUPERADMIN', 'COMPANY_MANAGER', 'RESTAURANT_ADMIN'],
        },
        {
          id: 'meu_restaurante',
          label: 'Meu Restaurante',
          icon: Settings,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'],
        },
      ],
    },
    {
      title: 'Pessoas & Acessos',
      items: [
        {
          id: 'aprovacoes',
          label: 'Aprovações',
          icon: UserCheck,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'],
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          badgeColor: 'bg-amber-500 text-slate-950 animate-pulse',
        },
        {
          id: 'cadastro',
          label: 'Novo Cliente',
          icon: UserPlus,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'CONSUMER'],
        },
        {
          id: 'portal_consumidor',
          label: 'Meu Consumo',
          icon: User,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CONSUMER'],
        },
      ],
    },
    {
      title: 'Sistema & Plataforma',
      items: [
        {
          id: 'superadmin',
          label: 'Superadmin Plataforma',
          icon: ShieldAlert,
          roles: ['SUPERADMIN'],
          badge: 'SaaS',
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        },
        {
          id: 'novo_restaurante',
          label: '+ Novo Restaurante',
          icon: PlusCircle,
          roles: ['SUPERADMIN'],
        },
        {
          id: 'landing',
          label: 'Sobre o App (Início)',
          icon: Info,
          roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'COMPANY_MANAGER', 'CONSUMER'],
        },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    sound.playKeyClick();
    onSelectTab(id);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Backdrop overlay para dispositivos móveis */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in no-print"
        />
      )}

      {/* Barra Lateral Vertical (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out no-print ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-72 lg:static ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Cabeçalho da Sidebar / Identidade da Aplicação */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80 bg-slate-900/50">
          <button
            onClick={() => handleItemClick('balcao')}
            className={`flex items-center gap-2.5 text-left group overflow-hidden ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
            title="Ir para Balcão PDV"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              {activeTenant?.logo_url ? (
                <img
                  src={activeTenant.logo_url}
                  alt={activeTenant.trade_name}
                  className="w-full h-full object-contain p-1 bg-slate-950"
                />
              ) : (
                <Store className="w-5 h-5 text-slate-950 font-black" />
              )}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white truncate">
                    Caderneta
                  </span>
                  <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    SaaS
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 truncate leading-tight font-semibold flex items-center gap-1" title={activeTenant?.trade_name || 'Nenhum restaurante ativo'}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${activeTenant ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="truncate">{activeTenant?.trade_name || 'Nenhum restaurante ativo'}</span>
                </p>
              </div>
            )}
          </button>

          {/* Botão Fechar em Mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Navegação Vertical com Scrollbar */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin">
          {groups.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {/* Título do Grupo */}
                {!isCollapsed ? (
                  <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
                    {group.title}
                  </div>
                ) : (
                  <div className="my-1 border-t border-slate-800/60" />
                )}

                {/* Itens do Grupo */}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group ${
                        isCollapsed
                          ? 'justify-center p-2.5'
                          : 'gap-3 px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                          : item.isHighlight
                          ? 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 border border-emerald-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon
                        className={`flex-shrink-0 transition-transform ${
                          isCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                        } ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110'}`}
                      />

                      {!isCollapsed && (
                        <>
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                                item.badgeColor || 'bg-slate-700 text-slate-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Notificação compacta quando a sidebar estiver colapsada */}
                      {isCollapsed && item.badge !== undefined && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar: Usuário Logado + Troca de Perfil + Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2.5">
          {/* Card do Usuário Logado no Sistema */}
          <div
            className={`rounded-xl bg-slate-800/60 border border-slate-750 p-2.5 transition-all ${
              isCollapsed ? 'flex justify-center p-2' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar com Gradiente e Iniciais */}
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${defaultUserInfo.avatarColor} flex items-center justify-center font-black text-xs text-white shadow-md flex-shrink-0`}
                title={`${userName} (${defaultUserInfo.roleLabel})`}
              >
                {userInitials}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-white truncate leading-tight" title={userName}>
                      {userName}
                    </p>
                    {onLogout && (
                      <button
                        onClick={() => {
                          sound.playKeyClick();
                          onLogout();
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Sair do Sistema (Logout)"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold truncate leading-tight">
                    {defaultUserInfo.roleLabel}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate leading-tight" title={userEmail}>
                    {userEmail}
                  </p>
                </div>
              )}
            </div>

            {/* Restaurante Ativo & Seletor de Restaurante */}
            {!isCollapsed && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                  <Store className="w-3 h-3" /> Restaurante Ativo
                </label>
                {allTenants.length > 1 ? (
                  <select
                    value={activeTenant?.id || ''}
                    onChange={(e) => {
                      const t = allTenants.find((item) => item.id === e.target.value);
                      if (t && onSelectTenant) onSelectTenant(t);
                    }}
                    className="w-full bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1.5 border border-emerald-500/40 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {allTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        🏬 {t.trade_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-bold text-white flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeTenant ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className="truncate">{activeTenant?.trade_name || 'Nenhum Restaurante Ativo'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Seletor de Perfil / Role Simulator */}
            {!isCollapsed && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Alternar Visão
                </label>
                <select
                  value={userRole}
                  onChange={(e) => onRoleChange(e.target.value as UserRole)}
                  className="w-full bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="SUPERADMIN">🛡️ Superadmin (Visão Global)</option>
                  <option value="RESTAURANT_ADMIN">👑 Dono Restaurante (Master)</option>
                  <option value="CASHIER">🧑‍🍳 Atendente Balcão</option>
                  <option value="COMPANY_MANAGER">🏢 Gestor Empresa Conveniada</option>
                  <option value="CONSUMER">👤 Consumidor / Cliente</option>
                </select>
              </div>
            )}
          </div>

          {/* Status Lynx EMS Cloud & Botão de Recolher */}
          <div
            className={`flex items-center justify-between text-xs ${
              isCollapsed ? 'flex-col gap-2' : ''
            }`}
          >
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium ${
                isCollapsed ? 'w-full justify-center px-1' : ''
              }`}
              title="Conectado à nuvem Lynx EMS Cloud"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
              <Server className="w-3 h-3 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">Lynx Cloud Online</span>}
            </div>

            {/* Botão Desktop para Recolher / Expandir Menu Lateral */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
