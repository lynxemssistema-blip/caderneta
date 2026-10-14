import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Save,
  QrCode
} from 'lucide-react';
import type { Tenant } from '../types/database';
import { fetchTenant, updateTenant, DEFAULT_TENANT_ID } from '../lib/supabase';

interface MeuRestauranteProps {
  onTenantUpdated?: (updatedTenant: Tenant) => void;
}

export const MeuRestaurante: React.FC<MeuRestauranteProps> = ({ onTenantUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    trade_name: '',
    document_number: '',
    phone: '',
    address: '',
    pix_key_type: 'CNPJ' as 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA',
    pix_key: '',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    bank_account_type: 'CORRENTE' as 'CORRENTE' | 'POUPANCA'
  });

  const [tenantId, setTenantId] = useState(DEFAULT_TENANT_ID);

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    setLoading(true);
    try {
      const data = await fetchTenant(DEFAULT_TENANT_ID);
      if (data) {
        setTenantId(data.id);
        setFormData({
          trade_name: data.trade_name || '',
          document_number: data.document_number || '',
          phone: data.phone || '',
          address: data.address || '',
          pix_key_type: data.pix_key_type || 'CNPJ',
          pix_key: data.pix_key || '',
          bank_name: data.bank_name || '',
          bank_agency: data.bank_agency || '',
          bank_account: data.bank_account || '',
          bank_account_type: data.bank_account_type || 'CORRENTE'
        });
      }
    } catch (err: any) {
      setErrorMsg('Erro ao carregar dados do restaurante.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updated = await updateTenant(tenantId, {
        trade_name: formData.trade_name,
        document_number: formData.document_number,
        phone: formData.phone,
        address: formData.address,
        pix_key_type: formData.pix_key_type,
        pix_key: formData.pix_key,
        bank_name: formData.bank_name,
        bank_agency: formData.bank_agency,
        bank_account: formData.bank_account,
        bank_account_type: formData.bank_account_type
      });

      if (updated) {
        setSuccessMsg('✅ Dados do restaurante e conta bancária salvos com sucesso!');
        if (onTenantUpdated) onTenantUpdated(updated);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg('Falha ao salvar alterações: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />
        Carregando informações do restaurante...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
          <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Building2 className="w-7 h-7" />
          </span>
          Meu Restaurante & Dados Bancários
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure as informações oficiais do seu estabelecimento, chave Pix e conta bancária para emissão de faturas e relatórios em PDF.
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco 1: Identificação do Estabelecimento */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Dados Cadastrais & Contato
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome Fantasia do Restaurante *
              </label>
              <input
                type="text"
                required
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Ex: Restaurante & Bar Sabor da Vila"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                CNPJ ou CPF do Estabelecimento *
              </label>
              <input
                type="text"
                required
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp Comercial *
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Endereço Completo (Rua, Nº, Bairro, Cidade/UF)
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo/SP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Chave Pix para Recebimentos */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <QrCode className="w-5 h-5 text-emerald-400" />
            Recebimento via PIX
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipo da Chave Pix
              </label>
              <select
                value={formData.pix_key_type}
                onChange={(e) => setFormData({ ...formData, pix_key_type: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
                <option value="EMAIL">E-mail</option>
                <option value="TELEFONE">Celular / WhatsApp</option>
                <option value="ALEATORIA">Chave Aleatória (EVP)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Chave PIX Oficial *
              </label>
              <input
                type="text"
                required
                value={formData.pix_key}
                onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                placeholder="Insira sua chave Pix (aparecerá nos envios de cobrança e PDFs)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-sm transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Bloco 3: Dados da Conta Bancária */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Dados da Conta Bancária (TED / DOC / Depósito)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome do Banco / Instituição
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Ex: Banco Itaú, Bradesco, Nubank..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Agência
              </label>
              <input
                type="text"
                value={formData.bank_agency}
                onChange={(e) => setFormData({ ...formData, bank_agency: e.target.value })}
                placeholder="Ex: 0001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Número da Conta com Dígito
              </label>
              <input
                type="text"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                placeholder="Ex: 123456-7"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipo da Conta
              </label>
              <select
                value={formData.bank_account_type}
                onChange={(e) => setFormData({ ...formData, bank_account_type: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="CORRENTE">Conta Corrente</option>
                <option value="POUPANCA">Conta Poupança</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 touch-btn disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando alterações...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
