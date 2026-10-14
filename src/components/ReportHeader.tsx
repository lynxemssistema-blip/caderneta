import React from 'react';
import type { Tenant } from '../types/database';

interface ReportHeaderProps {
  tenant: Tenant | null;
  title: string;
  subtitle?: string;
  periodText?: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  tenant,
  title,
  subtitle,
  periodText
}) => {
  const now = new Date().toLocaleString('pt-BR');

  return (
    <div className="border-b border-slate-700/50 pb-4 mb-6 text-slate-900 bg-white p-4 rounded-xl shadow-sm printable-area">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              📒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {tenant?.trade_name || 'Restaurante & Bar Sabor da Vila'}
              </h2>
              <p className="text-xs text-slate-600">
                CNPJ/CPF: {tenant?.document_number || '12.345.678/0001-90'} • Tel/WhatsApp: {tenant?.phone || '(11) 98765-4321'}
              </p>
              {tenant?.address && (
                <p className="text-xs text-slate-600">
                  📍 Endereço: {tenant.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-left md:text-right text-xs text-slate-600 border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto">
          <p className="font-semibold text-slate-800">Lynx EMS • Caderneta</p>
          <p>Emissão: {now}</p>
          <p className="text-[10px] text-slate-600">caderneta.lynxems.com.br</p>
        </div>
      </div>

      {/* Dados Bancários & Pix para Pagamento */}
      {(tenant?.pix_key || tenant?.bank_name) && (
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
          {tenant.pix_key && (
            <div>
              <span className="font-semibold text-slate-800">Chave Pix ({tenant.pix_key_type || 'Chave'}): </span>
              <span className="font-mono text-emerald-800 font-bold select-all">{tenant.pix_key}</span>
            </div>
          )}
          {tenant.bank_name && (
            <div>
              <span className="font-semibold text-slate-800">Banco: </span>
              <span>{tenant.bank_name}</span>
              {tenant.bank_agency && <span> • Ag: {tenant.bank_agency}</span>}
              {tenant.bank_account && <span> • CC: {tenant.bank_account} ({tenant.bank_account_type || 'Corrente'})</span>}
            </div>
          )}
        </div>
      )}

      {/* Título do Relatório */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
        </div>
        {periodText && (
          <span className="mt-1 md:mt-0 inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium">
            📅 {periodText}
          </span>
        )}
      </div>
    </div>
  );
};
