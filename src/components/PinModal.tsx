import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { NumericKeypad } from './NumericKeypad';
import { sound } from '../lib/sound';
import { verifyConsumerPin } from '../lib/supabase';
import type { Consumer } from '../types/database';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumer: Consumer | null;
  totalAmount: number;
  breakdown?: { meal: number; extra: number };
  onSuccess: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  consumer,
  totalAmount,
  breakdown,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !consumer) return null;

  const handleNumber = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    // Quando atinge 4 dígitos, valida automaticamente
    if (newPin.length === 4) {
      setLoading(true);
      try {
        const isValid = await verifyConsumerPin(consumer.id, newPin);
        if (isValid) {
          sound.playSuccessChime();
          // Efeito de confetes de celebração
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#10b981', '#34d399', '#059669', '#f59e0b']
          });
          setTimeout(() => {
            setLoading(false);
            setPin('');
            onSuccess();
          }, 350);
        } else {
          sound.playWarningBuzzer();
          setError(true);
          setLoading(false);
          setTimeout(() => setPin(''), 600);
        }
      } catch {
        sound.playWarningBuzzer();
        setError(true);
        setLoading(false);
        setTimeout(() => setPin(''), 600);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-pop">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone e Título */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-100">Assinatura Eletrônica</h3>
        <p className="text-xs text-slate-400 mt-1">
          Cliente: <span className="font-semibold text-emerald-400">{consumer.name}</span>
        </p>

        {/* Resumo do Valor */}
        <div className="my-4 p-3 bg-slate-850 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">VALOR TOTAL DO LANÇAMENTO</div>
          <div className="text-3xl font-black text-emerald-400 mt-0.5">
            R$ {totalAmount.toFixed(2)}
          </div>
          {breakdown && (breakdown.meal > 0 || breakdown.extra > 0) && (
            <div className="flex justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
              <span>Refeição: R$ {breakdown.meal.toFixed(2)}</span>
              <span>Extras: R$ {breakdown.extra.toFixed(2)}</span>
            </div>
          )}
        </div>

        <p className="text-sm font-medium text-slate-300 mb-3 flex items-center justify-center gap-1.5">
          <Lock className="w-4 h-4 text-emerald-400" />
          Digite seu PIN de 4 dígitos:
        </p>

        {/* Indicadores de 4 dígitos */}
        <div className="flex justify-center gap-4 my-4">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  error
                    ? 'border-rose-500 bg-rose-500/30 scale-110'
                    : filled
                    ? 'border-emerald-400 bg-emerald-400 scale-105 shadow-glow'
                    : 'border-slate-700 bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-semibold text-rose-400 flex items-center justify-center gap-1 mb-2 animate-bounce">
            <AlertCircle className="w-3.5 h-3.5" />
            PIN incorreto! Tente novamente (padrão: 1234).
          </p>
        )}

        {/* Teclado Numérico */}
        <div className="mt-2">
          <NumericKeypad
            onNumberClick={handleNumber}
            onDeleteClick={handleDelete}
            confirmDisabled={loading}
          />
        </div>
      </div>
    </div>
  );
};
