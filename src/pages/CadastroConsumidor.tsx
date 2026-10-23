import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  CheckCircle2, 
  KeyRound, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

import type { CorporateClient, Tenant } from '../types/database';
import { 
  fetchCorporateClients, 
  registerConsumer, 
  verifyEmailCode, 
  supabase 
} from '../lib/supabase';
import { sendVerificationEmail } from '../lib/emailService';
import { sound } from '../lib/sound';

interface CadastroConsumidorProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
  onFinish?: () => void;
}

export const CadastroConsumidor: React.FC<CadastroConsumidorProps> = ({
  tenantId,
  activeTenant,
  onFinish
}) => {
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  
  // Dados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [selectedCorpId, setSelectedCorpId] = useState<string>('');
  const [isFromInvite, setIsFromInvite] = useState(false);


  // Status de verificação
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [registeredConsumerId, setRegisteredConsumerId] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Ler parâmetros do link de convite na URL
  const params = new URLSearchParams(window.location.search);
  const tenantFromUrl = params.get('tenant');
  const targetTenantId = tenantFromUrl || tenantId || activeTenant?.id;

  useEffect(() => {
    if (targetTenantId) {
      fetchCorporateClients(targetTenantId).then(setCorps);
    } else {
      setCorps([]);
    }

    const emailParam = params.get('email');
    const nameParam = params.get('name');
    const corpParam = params.get('corp');
    const isInviteParam = params.get('invite') === 'true';

    if (emailParam) setEmail(emailParam);
    if (nameParam) setName(nameParam);
    if (corpParam) setSelectedCorpId(corpParam);
    if (isInviteParam || emailParam) setIsFromInvite(true);
  }, [targetTenantId]);

  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || pin.length !== 4) {
      alert('Preencha todos os campos obrigatórios e um PIN de 4 dígitos!');
      return;
    }

    if (!targetTenantId) {
      alert('Nenhum restaurante ativo identificado para processar o cadastro.');
      return;
    }

    sound.playKeyClick();
    setIsSendingCode(true);

    try {
      // 1. Gerar código OTP de 6 dígitos
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Registrar no banco com email_verified = false
      const newConsumer = await registerConsumer({
        tenant_id: targetTenantId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        pin: pin,
        corporate_client_id: selectedCorpId || undefined,
        verification_code: otp

      });

      if (!newConsumer?.id) throw new Error('Falha ao registrar cliente.');
      setRegisteredConsumerId(newConsumer.id);

      // 3. Disparar e-mail com Hostinger SMTP Oficial
      const emailRes = await sendVerificationEmail({
        email: email.trim(),
        name: name.trim(),
        code: otp,
        restaurantName: activeTenant?.trade_name || 'Restaurante Parceiro'
      });

      sound.playSuccessChime();
      if (!emailRes.success) {
        console.warn('Aviso do envio de e-mail:', emailRes.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no cadastro';
      alert(msg);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!registeredConsumerId || !inputCode.trim()) return;

    setIsVerifying(true);
    setCodeError(false);

    try {
      const isValid = await verifyEmailCode(registeredConsumerId, inputCode.trim());
      if (isValid) {
        // Ativar a conta
        await supabase
          .from('consumers')
          .update({
            status: 'ACTIVE',
            approval_status: 'APPROVED',
            email_verified: true
          })
          .eq('id', registeredConsumerId);

        sound.playSuccessChime();
        setIsComplete(true);
      } else {
        sound.playWarningBuzzer();
        setCodeError(true);
      }
    } catch {
      sound.playWarningBuzzer();
      setCodeError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-6 sm:px-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">
            {isFromInvite ? 'Ativação do seu Acesso na Caderneta' : 'Cadastro de Cliente'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isFromInvite
              ? `Você foi convidado pelo ${activeTenant?.trade_name || 'Restaurante'}. Crie seu PIN de 4 dígitos para autorizar seus almoços com segurança.`
              : `Cadastre-se na Caderneta Digital do ${activeTenant?.trade_name || 'Restaurante'} para consumir sem dinheiro físico.`
            }
          </p>
        </div>

        {/* TELA DE SUCESSO COMPLETO */}
        {isComplete ? (
          <div className="p-8 text-center space-y-5 animate-pop">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">🎉 Caderneta Ativada com Sucesso!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Seu e-mail foi validado e sua conta está 100% pronta. No balcão do restaurante, informe seu telefone e confirme seu pedido digitando seu <strong>PIN de 4 dígitos</strong>.
              </p>
            </div>

            <button
              onClick={() => {
                if (onFinish) onFinish();
                else window.location.href = '/';
              }}
              className="touch-btn px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/40 inline-flex items-center gap-2"
            >
              Começar a Usar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : registeredConsumerId ? (
          /* PASSO 2: CONFIRMAÇÃO DO CÓDIGO OTP */
          <div className="space-y-6 animate-pop">
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-3">
              <Mail className="w-6 h-6 flex-shrink-0 text-blue-400" />
              <div>
                <p className="font-bold">Código enviado para seu e-mail!</p>
                <p className="text-slate-400">Verifique sua caixa de entrada em <strong>{email}</strong> e insira o código de 6 dígitos.</p>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <label className="text-xs font-bold text-slate-400 block uppercase">Código de Verificação (6 dígitos)</label>
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-48 mx-auto bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-center text-3xl font-black tracking-widest font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              {codeError && (
                <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Código incorreto ou expirado. Verifique e tente novamente.
                </p>
              )}
            </div>

            <button
              onClick={handleConfirmCode}
              disabled={isVerifying || inputCode.length !== 6}
              className="touch-btn w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/40 disabled:opacity-50"
            >
              {isVerifying ? 'Validando...' : 'Confirmar e Ativar Minha Caderneta'}
            </button>
          </div>
        ) : (
          /* PASSO 1: FORMULÁRIO DE DADOS & DEFINIÇÃO DO PIN */
          <form onSubmit={handleStartRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Ex: Maria Fernandes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Telefone / Celular *</label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Seu E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="maria@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* PIN de 4 dígitos */}
            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                Defina seu PIN de Assinatura (4 dígitos numéricos) *
              </label>
              <p className="text-[11px] text-slate-400">
                Você digitará esse PIN no balcão para confirmar seus pedidos na hora do almoço.
              </p>
              <input
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-32 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center text-xl font-mono font-black text-white tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Empresa Conveniada */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Empresa Conveniada (Se aplicável)</label>
              <select
                value={selectedCorpId}
                onChange={(e) => setSelectedCorpId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Nenhuma (Consumidor Individual)</option>
                {corps.map((corp) => (
                  <option key={corp.id} value={corp.id}>
                    🏢 {corp.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSendingCode}
                className="touch-btn w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {isSendingCode ? 'Enviando código de verificação...' : 'Continuar & Validar por E-mail'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
