import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Building2 
} from 'lucide-react';
import type { Consumer } from '../types/database';
import { fetchConsumers, approveConsumer } from '../lib/supabase';
import { sendApprovalNotification } from '../lib/emailService';
import { sound } from '../lib/sound';

export const Aprovacoes: React.FC = () => {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const list = await fetchConsumers();
    const pendingList = list.filter((c) => c.approval_status === 'PENDING_APPROVAL');
    setConsumers(pendingList);

    // Inicializar limites padrão
    const initLimits: Record<string, string> = {};
    pendingList.forEach((c) => {
      initLimits[c.id] = '200.00';
    });
    setLimits(initLimits);
  };

  const handleApprove = async (consumer: Consumer) => {
    sound.playKeyClick();
    setProcessingId(consumer.id);

    try {
      const creditLimit = parseFloat(limits[consumer.id]?.replace(',', '.') || '200.00');
      await approveConsumer(consumer.id, creditLimit);
      sound.playSuccessChime();

      // Disparar e-mail de notificação para o usuário se houver e-mail cadastrado
      if (consumer.email) {
        await sendApprovalNotification({
          email: consumer.email,
          name: consumer.name,
          restaurantName: 'Restaurante & Bar Sabor da Vila',
          creditLimit: creditLimit,
          approved: true
        });
      }

      setFeedback(`Cadastro de ${consumer.name} aprovado com sucesso! E-mail de confirmação enviado.`);
      loadPending();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na aprovação';
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <UserCheck className="w-7 h-7 text-emerald-400" />
          Aprovações de Novos Usuários (Master)
        </h2>
        <p className="text-xs text-slate-400">
          Apenas usuários aprovados pelo dono do restaurante têm permissão para consumir no fiado ou convênio corporativo.
        </p>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2 animate-pop">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Lista de Cadastros Pendentes */}
      {consumers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-500/60 mx-auto" />
          <h3 className="font-extrabold text-base text-slate-200">Nenhum cadastro pendente de aprovação!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Todos os clientes e funcionários cadastrados já foram aprovados e estão liberados para consumir no balcão.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consumers.map((c) => (
            <div
              key={c.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-all shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center font-black text-xl text-emerald-400 overflow-hidden">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      c.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-100 text-base">{c.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-500" /> {c.phone}
                    </p>
                    {c.email && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" /> {c.email}
                        {c.email_verified && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 rounded">
                            Verificado
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Aguardando
                </span>
              </div>

              {c.corporate_client && (
                <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Vinculado à empresa: <strong>{c.corporate_client.company_name}</strong></span>
                </div>
              )}

              {/* Definição de Limite de Crédito Individual */}
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Limite Inicial de Crédito
                  </span>
                  <span className="text-xs text-slate-500">Valor máximo de fiado pessoal</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-emerald-400">R$</span>
                  <input
                    type="text"
                    value={limits[c.id] || '200.00'}
                    onChange={(e) => setLimits({ ...limits, [c.id]: e.target.value })}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-sm font-black text-white text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Botão de Aprovação com 1 Toque */}
              <button
                disabled={processingId === c.id}
                onClick={() => handleApprove(c)}
                className="touch-btn w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <CheckCircle2 className="w-5 h-5" />
                {processingId === c.id ? 'Aprovando...' : 'Aprovar e Liberar Conta'}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
