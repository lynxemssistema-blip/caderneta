import React, { useState } from 'react';
import { 
  ShoppingBag, 
  BookOpen, 
  Receipt, 
  UtensilsCrossed, 
  User, 
  MoreHorizontal,
  Building2,
  Users,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  X
} from 'lucide-react';
import type { UserRole } from '../types/database';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  pendingApprovalsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  pendingApprovalsCount = 0
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navItems = [
    { id: 'balcao', label: 'Balcão', icon: ShoppingBag },
    { id: 'cadernetas', label: 'Caderneta', icon: BookOpen },
    { id: 'faturas', label: 'Faturas', icon: Receipt },
    { id: 'produtos', label: 'Cardápio', icon: UtensilsCrossed },
    { id: 'portal_consumidor', label: 'Meu Consumo', icon: User },
  ];

  const handleSelect = (tab: string) => {
    onSelectTab(tab);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Menu Modal Gaveta "Mais Opções" */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm md:hidden animate-fade-in no-print">
          <div 
            className="flex-1" 
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-extrabold text-base text-white">Menu de Acesso Rápido</span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleSelect('meu_restaurante')}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all ${
                  currentTab === 'meu_restaurante'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <Building2 className="w-6 h-6 text-emerald-400" />
                <span className="text-xs font-bold">Meu Restaurante & Pix</span>
              </button>

              <button
                onClick={() => handleSelect('aprovacoes')}
                className={`relative p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all ${
                  currentTab === 'aprovacoes'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                {pendingApprovalsCount > 0 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                    {pendingApprovalsCount}
                  </span>
                )}
                <CheckCircle className="w-6 h-6 text-amber-400" />
                <span className="text-xs font-bold">Aprovações</span>
              </button>

              <button
                onClick={() => handleSelect('convenios')}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all ${
                  currentTab === 'convenios'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-6 h-6 text-teal-400" />
                <span className="text-xs font-bold">Convênios Empresas</span>
              </button>

              <button
                onClick={() => handleSelect('caixa')}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all ${
                  currentTab === 'caixa'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <DollarSign className="w-6 h-6 text-emerald-400" />
                <span className="text-xs font-bold">Fluxo de Caixa</span>
              </button>

              <button
                onClick={() => handleSelect('gestor_empresa')}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all ${
                  currentTab === 'gestor_empresa'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <Building2 className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-bold">Portal RH da Empresa</span>
              </button>

              {userRole === 'SUPERADMIN' && (
                <button
                  onClick={() => handleSelect('superadmin')}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all ${
                    currentTab === 'superadmin'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-slate-850 border-slate-800 text-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-bold">SuperAdmin Lynx</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra Inferior Fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-md px-2 py-1.5 md:hidden bottom-nav no-print shadow-2xl">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[54px] min-h-[48px] touch-manipulation transition-all ${
                  isActive
                    ? 'text-emerald-400 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}

          {/* Botão Mais */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[54px] min-h-[48px] touch-manipulation transition-all ${
              showMoreMenu || ['meu_restaurante', 'aprovacoes', 'convenios', 'caixa', 'gestor_empresa', 'superadmin'].includes(currentTab)
                ? 'text-emerald-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
          </button>
        </div>
      </div>
    </>
  );
};
