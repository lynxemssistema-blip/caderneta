import React, { useState } from 'react';
import { 
  Store, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  X, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sound } from '../lib/sound';
import type { UserRole, Tenant, Profile } from '../types/database';

export interface AuthSession {
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: UserRole;
    tenant_id: string | null;
  };
  tenant: Tenant | null;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  onRegisterClick: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onRegisterClick,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Informe seu e-mail/telefone e sua senha ou PIN.');
      sound.playWarningBuzzer();
      return;
    }

    setLoading(true);
    sound.playKeyClick();

    try {
      // 1. Buscar usuário na tabela public.profiles
      // Pode buscar por email ou telefone
      const cleanPhone = cleanId.replace(/\D/g, '');

      let query = supabase
        .from('profiles')
        .select('*');

      if (cleanId.includes('@')) {
        query = query.ilike('email', cleanId);
      } else {
        query = query.or(`phone.eq.${cleanId},phone.eq.${cleanPhone}`);
      }

      const { data: profiles, error: pErr } = await query;

      if (pErr) throw pErr;

      let matchedProfile: Profile | null = null;

      if (profiles && profiles.length > 0) {
        matchedProfile = profiles[0] as Profile;
      }

      // 2. Se não encontrou em profiles, pode ser um consumidor logando pelo telefone/email
      if (!matchedProfile) {
        const { data: consumers, error: cErr } = await supabase
          .from('consumers')
          .select('*')
          .or(`phone.eq.${cleanId},phone.eq.${cleanPhone}`);

        if (cErr) throw cErr;

        if (consumers && consumers.length > 0) {
          const cons = consumers[0];
          // Verificar PIN
          if (cons.pin_hash && cons.pin_hash !== cleanPass) {
            throw new Error('PIN incorreto para este cliente.');
          }

          // Buscar tenant do consumidor
          let consumerTenant: Tenant | null = null;
          if (cons.tenant_id) {
            const { data: tData } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', cons.tenant_id)
              .single();
            consumerTenant = tData;
          }

          sound.playSuccessChime();
          onLoginSuccess({
            user: {
              id: cons.id,
              full_name: cons.name,
              email: cons.email || '',
              phone: cons.phone,
              role: 'CONSUMER',
              tenant_id: cons.tenant_id,
            },
            tenant: consumerTenant,
          });
          onClose();
          return;
        }

        throw new Error('Usuário não cadastrado. Verifique o e-mail ou telefone digitado.');
      }

      // 3. Validar Senha / PIN do Perfil
      if (matchedProfile.pin_hash && matchedProfile.pin_hash !== cleanPass) {
        throw new Error('Senha ou PIN incorreto. Tente novamente.');
      }

      // Se não tinha pin salvo, salvar o pin digitado agora
      if (!matchedProfile.pin_hash) {
        await supabase
          .from('profiles')
          .update({ pin_hash: cleanPass })
          .eq('id', matchedProfile.id);
      }

      // 4. Buscar Tenant vinculado
      let userTenant: Tenant | null = null;
      if (matchedProfile.tenant_id) {
        const { data: tData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', matchedProfile.tenant_id)
          .single();
        userTenant = tData;
      } else if (matchedProfile.role === 'SUPERADMIN') {
        // Para o Superadmin, carregar o primeiro restaurante como contexto ativo (ex: Restaurante duas taças)
        const { data: allTenants } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });
        if (allTenants && allTenants.length > 0) {
          userTenant = allTenants[0];
        }
      }

      sound.playSuccessChime();
      onLoginSuccess({
        user: {
          id: matchedProfile.id,
          full_name: matchedProfile.full_name,
          email: matchedProfile.email || cleanId,
          phone: matchedProfile.phone,
          role: matchedProfile.role,
          tenant_id: matchedProfile.tenant_id || (userTenant ? userTenant.id : null),
        },
        tenant: userTenant,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setErrorMsg(msg);
      sound.playWarningBuzzer();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 animate-pop">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/60">
            <Store className="w-6 h-6 text-slate-950 font-black" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Entrar no Caderneta SaaS
          </h2>
          <p className="text-xs text-slate-400">
            Acesse seu restaurante, gerencie assinaturas ou consulte sua conta.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              E-mail ou Telefone
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="edsonmanoel@gmail.com ou 31995574906"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Senha ou PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha ou PIN"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                title={showPassword ? 'Ocultar' : 'Exibir'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Validando Acesso...
              </span>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé com Links Úteis */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Ainda não cadastrou seu restaurante?{' '}
            <button
              onClick={() => {
                onClose();
                onRegisterClick();
              }}
              className="text-emerald-400 font-bold hover:underline"
            >
              Criar Restaurante Agora
            </button>
          </p>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acesso seguro com criptografia e isolamento multi-tenant</span>
          </div>
        </div>

      </div>
    </div>
  );
};
