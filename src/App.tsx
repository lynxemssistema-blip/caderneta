import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
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
import type { UserRole, Tenant } from './types/database';
import { fetchConsumers } from './lib/supabase';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [userRole, setUserRole] = useState<UserRole>('RESTAURANT_ADMIN');
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    fetchConsumers().then((list) => {
      const pending = list.filter((c) => c.approval_status === 'PENDING_APPROVAL');
      setPendingCount(pending.length);
    });
  }, [currentTab]);

  const handleViewStatement = (consumerId: string) => {
    setSelectedConsumerId(consumerId);
    setCurrentTab('extrato');
  };

  const handleCreatedTenant = (newTenant: Tenant) => {
    setActiveTenant(newTenant);
    setUserRole('RESTAURANT_ADMIN');
    setCurrentTab('balcao');
  };

  const isPublicPage = currentTab === 'landing' || currentTab === 'novo_restaurante';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Barra de Navegação Superior (NÃO aparece na Landing Page e no cadastro de restaurante) */}
      {!isPublicPage && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'extrato') {
              setSelectedConsumerId(null);
            }
          }}
          userRole={userRole}
          onRoleChange={(role) => {
            setUserRole(role);
            if (role === 'SUPERADMIN') {
              setCurrentTab('superadmin');
            } else if (role === 'COMPANY_MANAGER') {
              setCurrentTab('gestor_empresa');
            } else if (role === 'CONSUMER') {
              setCurrentTab('cadastro');
            } else if (currentTab === 'superadmin' || currentTab === 'gestor_empresa') {
              setCurrentTab('balcao');
            }
          }}
          pendingApprovalsCount={pendingCount}
        />
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 pb-16">
        {/* Landing Page Inicial Explicativa */}
        {currentTab === 'landing' && (
          <LandingPage
            onRegisterRestaurant={() => setCurrentTab('novo_restaurante')}
            onRegisterConsumer={() => setCurrentTab('cadastro')}
            onEnterApp={() => setCurrentTab('balcao')}
          />
        )}

        {/* Cadastro de Novo Restaurante (Master) */}
        {currentTab === 'novo_restaurante' && (
          <CadastroRestaurante
            onSuccess={handleCreatedTenant}
            onCancel={() => setCurrentTab('landing')}
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
          />
        )}

        {/* Telas Operacionais do Restaurante */}
        {currentTab === 'balcao' && <BalcaoPOS />}
        {currentTab === 'cadernetas' && <Cadernetas onViewStatement={handleViewStatement} />}
        {currentTab === 'faturas' && <Faturas />}
        {currentTab === 'produtos' && <Produtos />}
        {currentTab === 'aprovacoes' && <Aprovacoes />}
        {currentTab === 'convenios' && <Convenios />}
        {currentTab === 'gestor_empresa' && <GestorEmpresa />}
        {currentTab === 'caixa' && <FluxoCaixa />}
        {currentTab === 'cadastro' && <CadastroConsumidor />}
        
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
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
          <p>
            <strong>Caderneta Micro-SaaS</strong> • Lynx EMS • caderneta.lynxems.com.br
            {activeTenant && ` • ${activeTenant.trade_name}`}
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;
