import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Store, 
  User, 
  CreditCard, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  ArrowLeft 
} from 'lucide-react';
import { registerTenantWithMaster } from '../lib/supabase';
import { sound } from '../lib/sound';
import type { Tenant } from '../types/database';

interface CadastroRestauranteProps {
  onSuccess: (newTenant: Tenant) => void;
  onCancel: () => void;
}

export const CadastroRestaurante: React.FC<CadastroRestauranteProps> = ({ onSuccess, onCancel }) => {
  // Dados do Restaurante
  const [tradeName, setTradeName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA'>('EMAIL');

  // Dados do Usuário Master
  const [masterName, setMasterName] = useState('');
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPhone, setMasterPhone] = useState('');
  const [masterPin, setMasterPin] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim() || !restaurantPhone.trim() || !pixKey.trim() || !masterName.trim() || masterPin.length !== 4) {
      alert('Por favor, preencha todos os campos obrigatórios e um PIN de 4 dígitos para o Master.');
      return;
    }

    sound.playKeyClick();
    setLoading(true);

    try {
      const { tenant } = await registerTenantWithMaster({
        trade_name: tradeName.trim(),
        document_number: documentNumber.trim() || 'Não informado',
        phone: restaurantPhone.trim(),
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType,
        master_name: masterName.trim(),
        master_email: masterEmail.trim() || 'master@restaurante.com.br',
        master_phone: masterPhone.trim() || restaurantPhone.trim(),
        master_pin: masterPin
      });

      sound.playSuccessChime();
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#3b82f6']
      });

      setTimeout(() => {
        onSuccess(tenant);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar restaurante';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 py-6 sm:px-6">
      
      <button
        onClick={onCancel}
        className="touch-btn mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar à Página Inicial
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
            Cadastrar Novo Restaurante
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Ao cadastrar seu restaurante, você se torna o <strong>Usuário MASTER</strong> com acesso total ao balcão, convênios, fechamento de faturas e aprovação de clientes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Seção 1: Dados do Estabelecimento */}
          <div className="p-5 bg-slate-850 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-emerald-400 flex items-center gap-2">
              <Store className="w-4 h-4" /> 1. Dados do Estabelecimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nome Fantasia do Restaurante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Restaurante & Petiscaria Bom Sabor"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">CNPJ ou CPF (Opcional)</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">WhatsApp / Telefone do Balcão *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Chave Pix para Recebimento */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tipo da Chave Pix *</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="EMAIL">E-mail</option>
                  <option value="TELEFONE">Telefone</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="ALEATORIA">Chave Aleatória</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">Chave Pix para Recebimentos *</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="pix@restaurante.com.br ou chave aleatória"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Esta chave Pix será impressa nas faturas e enviada automaticamente via WhatsApp para os clientes.
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Dados do Dono / Usuário Master */}
          <div className="p-5 bg-slate-850 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
              <User className="w-4 h-4" /> 2. Dados do Proprietário (Usuário Master)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Seu Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Souza"
                  value={masterName}
                  onChange={(e) => setMasterName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">E-mail do Proprietário *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="carlos@gmail.com"
                    value={masterEmail}
                    onChange={(e) => setMasterEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Seu WhatsApp Pessoal</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="(11) 97777-8888"
                    value={masterPhone}
                    onChange={(e) => setMasterPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Crie seu PIN Master (4 dígitos) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-mono font-black text-center tracking-widest focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="touch-btn w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40"
          >
            <CheckCircle2 className="w-5 h-5" />
            {loading ? 'Cadastrando Restaurante...' : 'Criar Restaurante & Ativar Acesso Master'}
          </button>
        </form>

      </div>
    </div>
  );
};
