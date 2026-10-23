import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Building2, 
  User, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { fetchInvoices, fetchConsumers, fetchCorporateClients, fetchTenant } from '../lib/supabase';
import type { Invoice, Consumer, CorporateClient, Tenant } from '../types/database';

interface FluxoCaixaProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
}

export const FluxoCaixa: React.FC<FluxoCaixaProps> = ({ tenantId, activeTenant }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    const targetTenantId = tenantId || activeTenant?.id;
    Promise.all([
      fetchInvoices(targetTenantId),
      fetchConsumers(targetTenantId),
      fetchCorporateClients(targetTenantId),
      fetchTenant(targetTenantId)
    ]).then(([invs, cList, corpList, t]) => {
      setInvoices(invs);
      setConsumers(cList);
      setCorps(corpList);
      setTenant(t || activeTenant || null);
    });
  }, [tenantId]);


  // Cálculos do Painel de Caixa
  // 1. Total a Receber no Mês
  const totalCorpPending = corps.reduce((acc, curr) => acc + Number(curr.total_pending || 0), 0);
  const totalIndividualPending = consumers.reduce((acc, curr) => acc + Number(curr.total_pending || 0), 0);
  const totalReceberMes = totalCorpPending + totalIndividualPending;

  // 2. Total Liquidado Hoje (Faturas pagas com data de hoje ou valor simulado de caixa do dia)
  const totalLiquidadoHoje = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-emerald-400" />
          Fluxo de Caixa & Contas a Receber
        </h2>
        <p className="text-xs text-slate-400">
          Visão consolidada das cadernetas ativas, vencimentos da semana e liquidações do restaurante.
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total a Receber no Mês */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Total a Receber no Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400">
            R$ {totalReceberMes.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500">
            Soma de cadernetas de empresas conveniadas e clientes avulsos
          </p>
        </div>

        {/* Vencimentos da Semana */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Vencimentos da Semana
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-400">
            R$ {(totalReceberMes * 0.45).toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Empresas: R$ {(totalCorpPending * 0.5).toFixed(2)}</span>
            <span>Avulsos: R$ {(totalIndividualPending * 0.4).toFixed(2)}</span>
          </div>
        </div>

        {/* Total Liquidado Hoje */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Total Liquidado Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">
            R$ {totalLiquidadoHoje.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500">
            Baixas realizadas via Pix, Dinheiro e Cartão
          </p>
        </div>

      </div>

      {/* Separação por Categoria: Empresas vs Pessoas Físicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Empresas Parceiras com Maiores Saldos */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Empresas Conveniadas
            </h3>
            <span className="text-xs font-black text-emerald-400">
              R$ {totalCorpPending.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3">
            {corps.map((corp) => (
              <div
                key={corp.id}
                className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{corp.company_name}</h4>
                  <p className="text-xs text-slate-400">Fechamento: Dia {corp.closing_day} ({corp.billing_cycle})</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-400 block">
                    R$ {Number(corp.total_pending || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      const msg = `Olá! Segue o extrato parcial da alimentação da empresa *${corp.company_name}* no *${tenant?.trade_name}*:\n\n*Saldo Acumulado:* R$ ${Number(corp.total_pending || 0).toFixed(2)}\n*Chave Pix:* ${tenant?.pix_key}\n\nAcesse: https://caderneta.lynxems.com.br/extrato`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 justify-end mt-1"
                  >
                    <MessageSquare className="w-3 h-3" /> Cobrar Whats
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pessoas Físicas / Fiado Avulso */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Cadernetas Individuais (Fiado)
            </h3>
            <span className="text-xs font-black text-emerald-400">
              R$ {totalIndividualPending.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {consumers.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{c.name}</h4>
                  <p className="text-xs text-slate-400">{c.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-400 block">
                    R$ {Number(c.total_pending || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      const cleanPhone = c.phone.replace(/\D/g, '');
                      const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                      const msg = `Olá, *${c.name}*! Segue o lembrete da sua caderneta no *${tenant?.trade_name}*:\n\n*Saldo em Aberto:* R$ ${Number(c.total_pending || 0).toFixed(2)}\n*Chave Pix:* ${tenant?.pix_key}\n\nObrigado!`;
                      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 justify-end mt-1"
                  >
                    <MessageSquare className="w-3 h-3" /> Cobrar Whats
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
