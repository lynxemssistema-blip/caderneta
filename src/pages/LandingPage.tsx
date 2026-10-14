import React from 'react';
import { 
  Store, 
  Building2, 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  Users, 
  UtensilsCrossed, 
  Lock, 
  UserCheck 
} from 'lucide-react';
import { sound } from '../lib/sound';

interface LandingPageProps {
  onRegisterRestaurant: () => void;
  onRegisterConsumer: () => void;
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onRegisterRestaurant,
  onRegisterConsumer,
  onEnterApp,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* Top Bar da Landing */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Store className="w-6 h-6 text-slate-950 font-black" />
            </div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              Caderneta
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Micro-SaaS
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playKeyClick();
                onEnterApp();
              }}
              className="touch-btn text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl"
            >
              Já tenho conta (Entrar)
            </button>
            <button
              onClick={() => {
                sound.playKeyClick();
                onRegisterRestaurant();
              }}
              className="touch-btn bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40"
            >
              Criar Restaurante
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            A revolução do fiado tradicional e convênios de alimentação
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Digitalize a <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Caderneta de Papel</span> e fature com convênios corporativos.
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Feito para donos de restaurantes, lanchonetes e bares de bairro. Lançamentos em até <strong>3 cliques</strong>, assinatura eletrônica via <strong>PIN de 4 dígitos</strong> e controle automático de empresas conveniadas.
          </p>

          {/* Cards de Escolha de Ação Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-6 text-left">
            
            {/* Opção 1: Dono de Restaurante */}
            <div 
              onClick={() => {
                sound.playKeyClick();
                onRegisterRestaurant();
              }}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/60 rounded-3xl cursor-pointer transition-all shadow-xl group space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  Sou Restaurante <ArrowRight className="w-4 h-4 ml-auto" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cadastre seu estabelecimento, crie o <strong>Usuário Master</strong>, cadastre produtos e convênios com empresas da região.
                </p>
              </div>
              <span className="inline-block text-xs font-black text-emerald-400">
                Criar Restaurante Master →
              </span>
            </div>

            {/* Opção 2: Cliente ou Funcionário */}
            <div 
              onClick={() => {
                sound.playKeyClick();
                onRegisterConsumer();
              }}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/60 rounded-3xl cursor-pointer transition-all shadow-xl group space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  Sou Cliente <ArrowRight className="w-4 h-4 ml-auto" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Abra sua caderneta individual ou vincule-se à sua empresa com validação de e-mail e PIN de segurança.
                </p>
              </div>
              <span className="inline-block text-xs font-black text-blue-400">
                Cadastrar Minha Conta →
              </span>
            </div>

          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                sound.playKeyClick();
                onEnterApp();
              }}
              className="touch-btn text-xs font-extrabold text-slate-400 hover:text-emerald-400 underline underline-offset-4"
            >
              Ou entre diretamente no Balcão de Vendas (Modo Demonstração) →
            </button>
          </div>

        </div>
      </section>

      {/* Grid de Funcionalidades Explicativas */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            Tudo o que seu balcão precisa para nunca mais levar calote
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Desenvolvido com foco em simplicidade extrema para funcionar em qualquer celular de balcão e tela touch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Venda em 3 Toques no Balcão</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Busca preditiva de cliente por nome ou telefone, seleção rápida de itens do cardápio e confirmação instantânea.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Split Automático de Prato e Extras</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Se a empresa parceira cobre apenas o almoço, os refrigerantes e doces são automaticamente separados para cobrança à vista ou caderneta pessoal.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Assinatura Eletrônica via PIN</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O cliente digita seu PIN numérico de 4 dígitos no teclado virtual da tela. O hash criptografado valida a transação sem papel e sem fraude.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Convênios com Empresas Parceiras</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cadastre oficinas, transportadoras e lojas locais. Fechamentos semanais, quinzenais ou mensais com limites de gastos por funcionário.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Cobrança no WhatsApp com Pix</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dispare com um único clique extratos formatados no WhatsApp com a chave Pix do restaurante e link seguro para conferência.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Aprovação Master e E-mail OTP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Validação por código OTP de 6 dígitos via Hostinger SMTP Oficial e liberação de limite pelo dono do restaurante antes do primeiro consumo.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p><strong>Caderneta Micro-SaaS</strong> • Plataforma multi-restaurante • Domínio: caderneta.lynxems.com.br</p>
      </footer>

    </div>
  );
};
