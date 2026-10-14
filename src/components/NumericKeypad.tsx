import React from 'react';
import { Delete, Check } from 'lucide-react';
import { sound } from '../lib/sound';

interface NumericKeypadProps {
  onNumberClick: (num: string) => void;
  onDeleteClick: () => void;
  onConfirmClick?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onNumberClick,
  onDeleteClick,
  onConfirmClick,
  confirmLabel = 'Confirmar',
  confirmDisabled = false,
}) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

  const handleKey = (key: string) => {
    sound.playKeyClick();
    if (key === 'C') {
      onDeleteClick();
    } else if (key === 'DEL') {
      onDeleteClick();
    } else {
      onNumberClick(key);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKey(k)}
            className="touch-btn h-16 rounded-2xl bg-slate-850 hover:bg-slate-800 active:bg-slate-700 border border-slate-700/60 shadow-lg text-2xl font-bold text-slate-100 flex items-center justify-center transition-all"
          >
            {k === 'DEL' ? <Delete className="w-6 h-6 text-rose-400" /> : k}
          </button>
        ))}
      </div>

      {onConfirmClick && (
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={() => {
            sound.playKeyClick();
            onConfirmClick();
          }}
          className={`touch-btn mt-3 w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
            confirmDisabled
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-900/30'
          }`}
        >
          <Check className="w-6 h-6" />
          {confirmLabel}
        </button>
      )}
    </div>
  );
};
