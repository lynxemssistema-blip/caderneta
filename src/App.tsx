import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { LoginModal, type AuthSession } from './components/LoginModal';
import { LandingPage } from './pages/LandingPage';
import { CadastroRestaurante } from './pages/CadastroRestaurante';
import { SuperAdmin } from './pages/SuperAdmin';
import { BalcaoPOS } from './pages/BalcaoPOS';
import { Cadernetas } from './pages/Cadernetas';
import { Faturas } from './pages/Faturas';
import { Produtos } from './pages/Produtos';
import { Aprovacoes } from './pages/Aprovacoes';
import { Convenios } from './pages/Convenios';
import { GestorEmpresa } from './pages/GestorEmpresa';
import { FluxoCaixa } from './pages/FluxoCaixa';
import { CadastroConsumidor } from './pages/CadastroConsumidor';
import { ExtratoPublico } from './pages/ExtratoPublico';
import { MeuRestaurante } from './pages/MeuRestaurante';
import { PortalConsumidor } from './pages/PortalConsumidor';
import type { UserRole, Tenant } from './types/database';
import { fetchConsumers, fetchTenant } from './lib/supabase';

export function App() {
  // Sessão persistida em localStorage
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('caderneta_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('invite') === 'true') return 'cadastro';
    const saved = localStorage.getItem('caderneta_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.user?.role === 'SUPERADMIN') return 'superadmin';
        if (s.user?.role === 'COMPANY_MANAGER') return 'gestor_empresa';
        if (s.user?.role === 'CONSUMER') return 'portal_consumidor';
        return 'balcao';
      } catch {
        return 'landing';
      }
    }
    return 'landing';
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    return session?.user?.role || 'RESTAURANT_ADMIN';
  });
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(() => {
    return session?.tenant || null;
  });
  const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Controle de estado da Sidebar Lateral (Recolhida / Aberta em Mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    fetchTenant(activeTenant?.id).then((t) => {
      setActiveTenant(t);
    });
    if (activeTenant?.id) {
      fetchConsumers(activeTenant.id).then((list) => {
        const pending = list.filter((c) => c.approval_status === 'PENDING_APPROVAL');
        setPendingCount(pending.length);
      });
    } else {
      setPendingCount(0);
    }
  }, [currentTab, activeTenant?.id]);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem('caderneta_session', JSON.stringify(newSession));
    setUserRole(newSession.user.role);
    if (newSession.tenant) {
      setActiveTenant(newSession.tenant);
    }

    if (newSession.user.role === 'SUPERADMIN') {
      setCurrentTab('superadmin');
    } else if (newSession.user.role === 'COMPANY_MANAGER') {
      setCurrentTab('gestor_empresa');
    } else if (newSession.user.role === 'CONSUMER') {
      setCurrentTab('portal_consumidor');
    } else {
      setCurrentTab('balcao');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('caderneta_session');
    setUserRole('RESTAURANT_ADMIN');
    setCurrentTab('landing');
  };

  const handleViewStatement = (consumerId: string) => {
    setSelectedConsumerId(consumerId);
    setCurrentTab('extrato');
  };

  const handleCreatedTenant = (newTenant: Tenant) => {
    setActiveTenant(newTenant);
    if (userRole === 'SUPERADMIN') {
      setCurrentTab('superadmin');
    } else {
      setUserRole('RESTAURANT_ADMIN');
      setCurrentTab('balcao');
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    if (role === 'SUPERADMIN') {
      setCurrentTab('superadmin');
    } else if (role === 'COMPANY_MANAGER') {
      setCurrentTab('gestor_empresa');
    } else if (role === 'CONSUMER') {
      setCurrentTab('portal_consumidor');
    } else if (currentTab === 'superadmin' || currentTab === 'gestor_empresa') {
      setCurrentTab('balcao');
    }
  };

  const isPublicPage = currentTab === 'landing' || currentTab === 'novo_restaurante';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row selection:bg-emerald-500 selection:text-white">
      
      {/* Menu Vertical Lateral (Sidebar) */}
      {!isPublicPage && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'extrato') {
              setSelectedConsumerId(null);
            }
          }}
          userRole={userRole}
          onRoleChange={handleRoleChange}
          pendingApprovalsCount={pendingCount}
          activeTenant={activeTenant}
          customUserName={session?.user?.full_name}
          customUserEmail={session?.user?.email}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Coluna Principal de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Barra Superior Minimalista (TopHeader) */}
        {!isPublicPage && (
          <TopHeader
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              if (tab !== 'extrato') {
                setSelectedConsumerId(null);
              }
            }}
            userRole={userRole}
            onRoleChange={handleRoleChange}
            activeTenant={activeTenant}
            customUserName={session?.user?.full_name}
            customUserEmail={session?.user?.email}
            onLogout={handleLogout}
            pendingApprovalsCount={pendingCount}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebarCollapse}
          />
        )}

      {/* Conteúdo Principal */}
      <main className="flex-1 pb-20 md:pb-16">
        {/* Landing Page Inicial Explicativa */}
        {currentTab === 'landing' && (
          <LandingPage
            onRegisterRestaurant={() => setCurrentTab('novo_restaurante')}
            onEnterApp={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* Cadastro de Novo Restaurante (Master) */}
        {currentTab === 'novo_restaurante' && (
          <CadastroRestaurante
            onSuccess={handleCreatedTenant}
            onCancel={() => setCurrentTab(userRole === 'SUPERADMIN' ? 'superadmin' : 'landing')}
          />
        )}

        {/* Painel do Superadmin */}
        {currentTab === 'superadmin' && (
          <SuperAdmin
            onSelectTenant={(tenant) => {
              setActiveTenant(tenant);
              setUserRole('RESTAURANT_ADMIN');
              setCurrentTab('balcao');
            }}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* Telas Operacionais do Restaurante */}
        {currentTab === 'balcao' && <BalcaoPOS tenantId={activeTenant?.id} />}
        {currentTab === 'cadernetas' && (
          <Cadernetas 
            tenantId={activeTenant?.id} 
            activeTenant={activeTenant} 
            onViewStatement={handleViewStatement} 
          />
        )}
        {currentTab === 'faturas' && <Faturas tenantId={activeTenant?.id} activeTenant={activeTenant} />}
        {currentTab === 'produtos' && <Produtos tenantId={activeTenant?.id} />}
        {currentTab === 'aprovacoes' && <Aprovacoes tenantId={activeTenant?.id} activeTenant={activeTenant} />}
        {currentTab === 'convenios' && <Convenios tenantId={activeTenant?.id} activeTenant={activeTenant} />}
        {currentTab === 'gestor_empresa' && (
          <GestorEmpresa 
            tenantId={activeTenant?.id} 
            activeTenant={activeTenant} 
            userSession={session} 
          />
        )}
        {currentTab === 'caixa' && <FluxoCaixa tenantId={activeTenant?.id} activeTenant={activeTenant} />}
        {currentTab === 'cadastro' && (
          <CadastroConsumidor 
            tenantId={activeTenant?.id} 
            activeTenant={activeTenant} 
            onFinish={() => setCurrentTab('landing')} 
          />
        )}
        {currentTab === 'meu_restaurante' && (
          <MeuRestaurante 
            tenantId={activeTenant?.id} 
            activeTenant={activeTenant} 
            onTenantUpdated={(t) => setActiveTenant(t)} 
          />
        )}
        {currentTab === 'portal_consumidor' && (
          <PortalConsumidor 
            tenantId={activeTenant?.id} 
            activeTenant={activeTenant} 
          />
        )}
        
        {/* Extrato Público */}
        {currentTab === 'extrato' && selectedConsumerId && (
          <ExtratoPublico
            consumerId={selectedConsumerId}
            onBack={() => setCurrentTab('cadernetas')}
          />
        )}
      </main>

      {/* Rodapé único e não redundante (Apenas quando não for a Landing Page) */}
      {!isPublicPage && (
        <footer className="hidden md:block border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500 no-print">
          <p>
            <strong>Caderneta Micro-SaaS</strong> • Lynx EMS • caderneta.lynxems.com.br
            {activeTenant && ` • ${activeTenant.trade_name}`}
          </p>
        </footer>
      )}
      </div>

      {/* Barra de Navegação Inferior Fixa Mobile (Celulares & Tablets) */}
      {!isPublicPage && (
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'extrato') {
              setSelectedConsumerId(null);
            }
          }}
          userRole={userRole}
          pendingApprovalsCount={pendingCount}
        />
      )}

      {/* Modal de Login Real com E-mail / Telefone e Senha / PIN */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegisterClick={() => {
          setIsLoginModalOpen(false);
          setCurrentTab('novo_restaurante');
        }}
      />
    </div>
  );
}

export default App;
