import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  Lock, 
  Camera, 
  Building2, 
  CheckCircle2, 
  Clock, 
  KeyRound, 
  AlertCircle 
} from 'lucide-react';
import type { CorporateClient } from '../types/database';
import { fetchCorporateClients, registerConsumer, verifyEmailCode, DEFAULT_TENANT_ID } from '../lib/supabase';
import { sendVerificationEmail } from '../lib/emailService';
import { sound } from '../lib/sound';

export const CadastroConsumidor: React.FC = () => {
  const [corps, setCorps] = useState<CorporateClient[]>([]);
  
  // Dados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedCorpId, setSelectedCorpId] = useState<string>('');

  // Status de verificação
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [registeredConsumerId, setRegisteredConsumerId] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    fetchCorporateClients().then(setCorps);
  }, []);

  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || pin.length !== 4) {
      alert('Preencha todos os campos obrigatórios e um PIN de 4 dígitos!');
      return;
    }

    sound.playKeyClick();
    setIsSendingCode(true);

    try {
      // 1. Gerar código OTP de 6 dígitos
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Registrar no banco com status PENDING_APPROVAL e email_verified = false
      const newConsumer = await registerConsumer({
        tenant_id: DEFAULT_TENANT_ID,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        photo_url: photoUrl || undefined,
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
        restaurantName: 'Restaurante & Bar Sabor da Vila'
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
          <h2 className="text-2xl font-black text-slate-100">Cadastro de Cliente & Convênio</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cadastre-se para abrir sua caderneta individual ou vincular-se à sua empresa conveniada no restaurante.
          </p>
        </div>

        {/* Estado 3: Cadastro Concluído e Aguardando Aprovação */}
        {isComplete ? (
          <div className="p-8 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-pop">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-white">E-mail Validado com Sucesso!</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Olá, <strong>{name}</strong>! Seus dados foram validados. Agora o seu cadastro foi enviado para a aprovação do <strong>Dono do Restaurante (Master)</strong>.
            </p>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Status: <strong>Aguardando liberação de limite pelo caixa</strong></span>
            </div>
            <p className="text-xs text-slate-500">
              Assim que o restaurante aprovar, você receberá a confirmação por e-mail e poderá consumir informando seu telefone e PIN no balcão!
            </p>
          </div>
        ) : registeredConsumerId ? (
          
          /* Estado 2: Validação do Código de 6 Dígitos Enviado por E-mail */
          <div className="space-y-4 animate-pop">
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Enviamos um código de verificação para <strong>{email}</strong> via Hostinger SMTP Oficial.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2 text-center">
                Digite o Código de 6 Dígitos recebido por e-mail:
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 text-center text-3xl font-mono font-black text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            {codeError && (
              <p className="text-xs text-rose-400 font-bold text-center flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4" /> Código incorreto ou expirado. Verifique sua caixa de entrada.
              </p>
            )}

            <button
              onClick={handleConfirmCode}
              disabled={isVerifying || inputCode.length < 6}
              className="touch-btn w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <KeyRound className="w-5 h-5" />
              {isVerifying ? 'Validando...' : 'Confirmar Código e Finalizar'}
            </button>
          </div>

        ) : (

          /* Estado 1: Formulário Principal */
          <form onSubmit={handleStartRegister} className="space-y-4">
            
            {/* Foto / Avatar */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                Foto do Usuário (URL ou Avatar):
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden flex-shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </div>
                <input
                  type="text"
                  placeholder="https://exemplo.com/minha-foto.jpg (opcional)"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Nome Completo */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* E-mail Válido e Telefone Válido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">E-mail Válido *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="joao@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Telefone / WhatsApp *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Vínculo Empresarial ou Conta Avulsa */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Vínculo Corporativo (Empresa):</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <select
                  value={selectedCorpId}
                  onChange={(e) => setSelectedCorpId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Nenhum (Cliente Avulso / Fiado Pessoal)</option>
                  {corps.map((corp) => (
                    <option key={corp.id} value={corp.id}>
                      {corp.company_name} (Ciclo: {corp.billing_cycle})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Criação de PIN de 4 dígitos */}
            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                Crie seu PIN Numérico de 4 Dígitos *
              </label>
              <p className="text-[11px] text-slate-400">
                Este PIN será solicitado na tela touch do balcão para você autorizar seus pedidos.
              </p>
              <input
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-36 bg-slate-800 border border-slate-700 rounded-xl py-2.5 text-center text-2xl font-black text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingCode}
              className="touch-btn w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40"
            >
              <Mail className="w-5 h-5" />
              {isSendingCode ? 'Enviando Código por E-mail...' : 'Cadastrar e Validar E-mail'}
            </button>
          </form>

        )}

      </div>
    </div>
  );
};
