import React, { useState } from 'react';
import { 
  Store, 
  BookOpen, 
  Receipt, 
  UtensilsCrossed, 
  UserCheck, 
  Building2, 
  Wallet, 
  UserPlus, 
  Menu, 
  X,
  Server
} from 'lucide-react';
import type { UserRole } from '../types/database';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  pendingApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  onRoleChange,
  pendingApprovalsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'balcao', label: 'Balcão PDV', icon: Store, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER'] },
    { id: 'cadernetas', label: 'Cadernetas', icon: BookOpen, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'COMPANY_MANAGER'] },
    { id: 'faturas', label: 'Faturas', icon: Receipt, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'COMPANY_MANAGER'] },
    { id: 'produtos', label: 'Cardápio', icon: UtensilsCrossed, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'] },
    { 
      id: 'aprovacoes', 
      label: 'Aprovações', 
      icon: UserCheck, 
      roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'],
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined 
    },
    { id: 'convenios', label: 'Convênios', icon: Building2, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'COMPANY_MANAGER'] },
    { id: 'caixa', label: 'Fluxo Caixa', icon: Wallet, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN'] },
    { id: 'cadastro', label: 'Novo Cliente', icon: UserPlus, roles: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'CASHIER', 'CONSUMER'] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo e Nome da Aplicação */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('balcao')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6 text-slate-950 font-black" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Caderneta
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    SaaS
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 leading-none">Restaurante Sabor da Vila</p>
              </div>
            </button>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Role Switcher e Status */}
          <div className="flex items-center gap-2">
            {/* Status VPS */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Server className="w-3.5 h-3.5" />
              <span>VPS 85.31.60.68</span>
            </div>

            {/* Seletor de Papel / Role (Permite simular cada visão) */}
            <select
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="RESTAURANT_ADMIN">👑 Dono Restaurante (Master)</option>
              <option value="CASHIER">🧑‍🍳 Atendente Balcão</option>
              <option value="COMPANY_MANAGER">🏢 Gestor Empresa Conveniada</option>
              <option value="CONSUMER">👤 Consumidor / Cliente</option>
            </select>

            {/* Botão Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menu Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 px-4 py-3 animate-pop">
          <div className="grid grid-cols-2 gap-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
