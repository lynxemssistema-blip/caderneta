import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Check, 
  X,
  Coffee,
  Beer,
  Cake,
  Utensils
} from 'lucide-react';
import type { Product, ProductCategory, Tenant } from '../types/database';
import { fetchProducts, createProduct, updateProduct, fetchTenant } from '../lib/supabase';
import { sound } from '../lib/sound';
import { ViewToggle } from '../components/ViewToggle';
import { ReportHeader } from '../components/ReportHeader';

interface ProdutosProps {
  tenantId?: string;
}

export const Produtos: React.FC<ProdutosProps> = ({ tenantId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('MEAL');
  const [price, setPrice] = useState('');

  // Edição
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    const [pList, tData] = await Promise.all([
      fetchProducts(tenantId),
      fetchTenant(tenantId)
    ]);
    setProducts(pList);
    setTenant(tData);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price.replace(',', '.'));
    if (!name.trim() || isNaN(numPrice) || numPrice <= 0) return;

    const targetTenantId = tenantId || tenant?.id;
    if (!targetTenantId) {
      alert('Nenhum restaurante ativo selecionado para cadastrar produtos.');
      return;
    }

    sound.playKeyClick();
    try {
      await createProduct({
        tenant_id: targetTenantId,
        name: name.trim(),
        category,
        price: numPrice,
        is_active: true
      });
      sound.playSuccessChime();
      setName('');
      setPrice('');
      setIsAdding(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar';
      alert(msg);
    }
  };

  const handleSavePrice = async (p: Product) => {
    const num = parseFloat(editPrice.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;

    try {
      sound.playKeyClick();
      await updateProduct(p.id, { price: num });
      setEditingId(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      alert(msg);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      sound.playKeyClick();
      await updateProduct(p.id, { is_active: !p.is_active });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryIcon = (cat: ProductCategory) => {
    switch (cat) {
      case 'MEAL':
        return <Utensils className="w-4 h-4 text-emerald-400" />;
      case 'BEVERAGE':
        return <Beer className="w-4 h-4 text-blue-400" />;
      case 'DESSERT':
        return <Cake className="w-4 h-4 text-pink-400" />;
      default:
        return <Coffee className="w-4 h-4 text-amber-400" />;
    }
  };

  const getCategoryLabel = (cat: ProductCategory) => {
    switch (cat) {
      case 'MEAL': return 'Refeição (Cobre Convênio)';
      case 'BEVERAGE': return 'Bebida (Extra)';
      case 'DESSERT': return 'Sobremesa (Extra)';
      default: return 'Outros';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Cabeçalho de Impressão PDF */}
      <div className="print-only">
        <ReportHeader
          tenant={tenant}
          title="Cardápio Oficial & Tabela de Preços"
          subtitle="Itens e refeições disponíveis para consumo no restaurante e convênios"
        />
      </div>

      {/* Header na Tela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-emerald-400" />
            Cardápio & Produtos do Restaurante
          </h2>
          <p className="text-xs text-slate-400">
            Itens servidos no balcão e disponíveis para autoatendimento pelo celular do cliente.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <ViewToggle 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPrint={() => window.print()}
            printLabel="Exportar Cardápio (PDF)"
          />

          <button
            onClick={() => {
              sound.playKeyClick();
              setIsAdding(!isAdding);
            }}
            className="touch-btn bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Formulário de Criação */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-pop shadow-xl no-print">
          <h3 className="font-extrabold text-base text-slate-100">Adicionar Novo Produto ao Cardápio</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Nome do Item *</label>
              <input
                type="text"
                required
                placeholder="Ex: Prato Feito Especial"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Categoria:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="MEAL">Refeição (Cobre Convênio)</option>
                <option value="BEVERAGE">Bebida (Extra)</option>
                <option value="DESSERT">Sobremesa (Extra)</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Preço Unitário (R$) *</label>
              <input
                type="text"
                required
                placeholder="25,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
            >
              Salvar Item
            </button>
          </div>
        </form>
      )}

      {/* MODO CARDS OU TABELA */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => {
            const isEditing = editingId === p.id;

            return (
              <div
                key={p.id}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                  p.is_active
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                    : 'bg-slate-950 border-slate-850 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      {getCategoryIcon(p.category)}
                      {getCategoryLabel(p.category)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full no-print ${
                        p.is_active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {p.is_active ? 'Disponível' : 'Pausado'}
                    </button>
                  </div>

                  <h3 className="font-extrabold text-slate-100 text-base">{p.name}</h3>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm font-black text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePrice(p)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Preço</span>
                        <span className="text-lg font-black text-emerald-400">
                          R$ {Number(p.price).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditPrice(p.price.toString());
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 no-print"
                        title="Editar Preço"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO TABELA */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-slate-400 uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Nome do Item</th>
                  <th className="px-4 py-3.5">Categoria</th>
                  <th className="px-4 py-3.5">Tipo no Convênio</th>
                  <th className="px-4 py-3.5 text-right">Preço (R$)</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                      {getCategoryIcon(p.category)}
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{getCategoryLabel(p.category)}</td>
                    <td className="px-4 py-3">
                      {p.category === 'MEAL' ? (
                        <span className="text-emerald-400 font-bold">Coberto pela Empresa</span>
                      ) : (
                        <span className="text-amber-400 font-bold">Cobrado à parte (Extra)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                      R$ {Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        p.is_active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {p.is_active ? 'Disponível' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center no-print">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPrice(p.price.toString());
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Editar Preço"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-400"
                        >
                          {p.is_active ? 'Pausar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
