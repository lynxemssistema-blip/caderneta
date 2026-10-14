import React from 'react';
import { LayoutGrid, Table, Printer } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'CARDS' | 'TABLE';
  onViewModeChange: (mode: 'CARDS' | 'TABLE') => void;
  onPrint?: () => void;
  printLabel?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
  onPrint,
  printLabel = 'Exportar PDF / Imprimir'
}) => {
  return (
    <div className="flex items-center gap-2 no-print">
      {/* Alternador Cards vs Tabela */}
      <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => onViewModeChange('CARDS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-btn ${
            viewMode === 'CARDS'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Visualizar em Cartões"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cards</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('TABLE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-btn ${
            viewMode === 'TABLE'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Visualizar em Tabela"
        >
          <Table className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tabela</span>
        </button>
      </div>

      {/* Botão de Exportar PDF / Imprimir */}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all touch-btn shadow-sm"
          title="Exportar como PDF ou Imprimir"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">{printLabel}</span>
        </button>
      )}
    </div>
  );
};
