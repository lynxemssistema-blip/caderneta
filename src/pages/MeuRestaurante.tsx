import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Save,
  QrCode,
  Image as ImageIcon,
  Upload,
  Trash2,
  Users,
  ShieldCheck
} from 'lucide-react';
import type { Tenant, Profile } from '../types/database';
import { fetchTenant, updateTenant, fetchTenantProfiles } from '../lib/supabase';

interface MeuRestauranteProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
  onTenantUpdated?: (updatedTenant: Tenant) => void;
}

export const MeuRestaurante: React.FC<MeuRestauranteProps> = ({ 
  tenantId: propTenantId, 
  activeTenant, 
  onTenantUpdated 
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [teamProfiles, setTeamProfiles] = useState<Profile[]>([]);

  const [formData, setFormData] = useState({
    trade_name: '',
    document_number: '',
    phone: '',
    address: '',
    logo_url: '',
    pix_key_type: 'CNPJ' as 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA',
    pix_key: '',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    bank_account_type: 'CORRENTE' as 'CORRENTE' | 'POUPANCA'
  });

  const [tenantId, setTenantId] = useState(propTenantId || activeTenant?.id || '');

  useEffect(() => {
    loadTenant();
  }, [propTenantId, activeTenant?.id]);

  const loadTenant = async () => {
    const targetId = propTenantId || activeTenant?.id;
    if (!targetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, profiles] = await Promise.all([
        fetchTenant(targetId),
        fetchTenantProfiles(targetId)
      ]);

      if (data) {
        setTenantId(data.id);
        setFormData({
          trade_name: data.trade_name || '',
          document_number: data.document_number || '',
          phone: data.phone || '',
          address: data.address || '',
          logo_url: data.logo_url || '',
          pix_key_type: data.pix_key_type || 'CNPJ',
          pix_key: data.pix_key || '',
          bank_name: data.bank_name || '',
          bank_agency: data.bank_agency || '',
          bank_account: data.bank_account || '',
          bank_account_type: data.bank_account_type || 'CORRENTE'
        });
      }
      setTeamProfiles(profiles);
    } catch (err: any) {
      setErrorMsg('Erro ao carregar dados do restaurante.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('A imagem do logo deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({ ...prev, logo_url: base64 }));
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
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
        logo_url: formData.logo_url,
        pix_key_type: formData.pix_key_type,
        pix_key: formData.pix_key,
        bank_name: formData.bank_name,
        bank_agency: formData.bank_agency,
        bank_account: formData.bank_account,
        bank_account_type: formData.bank_account_type
      });

      if (updated) {
        setSuccessMsg('✅ Logotipo, dados do restaurante e conta bancária salvos com sucesso!');
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
          Meu Restaurante & Identidade Visual
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure a logomarca do seu restaurante, informações cadastrais, chave Pix e conta bancária oficial.
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
        {/* Bloco 0: Logotipo Oficial do Restaurante */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
              Logotipo & Marca do Restaurante
            </h2>
            <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
              Visível no Topo, Menus e Relatórios
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Preview do Logo */}
            <div className="relative group flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo do Restaurante"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-500">
                    <Building2 className="w-10 h-10 mx-auto mb-1 text-slate-600" />
                    <span className="text-[10px] block font-medium">Sem Logo</span>
                  </div>
                )}
              </div>

              {formData.logo_url && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logo_url: '' })}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-transform hover:scale-110"
                  title="Remover logotipo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Opções de Upload e URL */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-emerald-950/40 transition-all active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>Escolher Imagem do Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: '' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Ou cole o link direto da imagem:
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://exemplo.com.br/logo.png"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Suporta PNG, JPG, WebP e SVG até 2MB. O logo é exibido automaticamente no cabeçalho do aplicativo.
              </p>
            </div>
          </div>
        </div>

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

      {/* Bloco 4: Equipe & Operadores do Restaurante */}
      <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Equipe & Acessos do Restaurante ({teamProfiles.length})
          </h2>
          <span className="text-xs text-slate-400">
            Perfis vinculados ao estabelecimento
          </span>
        </div>

        {teamProfiles.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            Nenhum operador adicional vinculado. Apenas o perfil administrador está ativo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamProfiles.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-200 truncate">{p.full_name}</div>
                  <div className="text-xs text-slate-400 truncate">{p.email || 'Sem email'} • {p.phone}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20">
                      {p.role === 'RESTAURANT_ADMIN' ? 'Administrador' : p.role === 'CASHIER' ? 'Operador de Caixa' : p.role}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {p.approval_status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                </div>
                {p.pin_hash && (
                  <div className="text-right text-[11px] text-slate-500 flex-shrink-0" title="Possui PIN / Senha configurada">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 ml-auto" />
                    <span className="text-[9px] uppercase font-bold text-emerald-400/80 block mt-0.5">Com Senha</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
