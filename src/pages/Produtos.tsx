import { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Check, 
  X 
} from 'lucide-react';
import type { Product, ProductCategory } from '../types/database';
import { fetchProducts, createProduct, updateProduct, DEFAULT_TENANT_ID } from '../lib/supabase';
import { sound } from '../lib/sound';

export const Produtos: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('MEAL');
  const [price, setPrice] = useState('');

  // Edição
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const list = await fetchProducts();
    setProducts(list);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price.replace(',', '.'));
    if (!name.trim() || isNaN(numPrice) || numPrice <= 0) return;

    sound.playKeyClick();
    try {
      await createProduct({
        tenant_id: DEFAULT_TENANT_ID,
        name: name.trim(),
        category,
        price: numPrice,
        is_active: true
      });
      sound.playSuccessChime();
      setName('');
      setPrice('');
      setIsAdding(false);
      loadProducts();
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
      loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      alert(msg);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      sound.playKeyClick();
      await updateProduct(p.id, { is_active: !p.is_active });
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-emerald-400" />
            Cardápio & Produtos do Restaurante
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre os itens servidos no balcão para lançamentos rápidos com 1 toque.
          </p>
        </div>

        <button
          onClick={() => {
            sound.playKeyClick();
            setIsAdding(!isAdding);
          }}
          className="touch-btn self-start sm:self-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {/* Formulário de Novo Produto */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-pop shadow-xl">
          <h3 className="font-extrabold text-base text-slate-100">Adicionar Item ao Cardápio</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Nome do Prato/Bebida:</label>
              <input
                type="text"
                required
                placeholder="Ex: Comercial Completo, Guaraná"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Categoria:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="MEAL">🍲 Refeição (Almoço/Jantar)</option>
                <option value="BEVERAGE">🥤 Bebida</option>
                <option value="DESSERT">🍮 Sobremesa</option>
                <option value="OTHER">☕ Outros / Café</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Preço de Venda (R$):</label>
              <input
                type="text"
                required
                placeholder="25,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-black focus:outline-none focus:border-emerald-500"
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
              Salvar Produto
            </button>
          </div>
        </form>
      )}

      {/* Grid de Itens Cadastrados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((p) => {
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              className={`p-5 rounded-3xl border transition-all ${
                p.is_active
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-slate-850 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                  {p.category === 'MEAL' ? 'Refeição' : p.category === 'BEVERAGE' ? 'Bebida' : p.category === 'DESSERT' ? 'Sobremesa' : 'Outro'}
                </span>
                
                <button
                  onClick={() => handleToggleActive(p)}
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    p.is_active
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {p.is_active ? 'Ativo' : 'Pausado'}
                </button>
              </div>

              <h3 className="font-extrabold text-slate-100 text-base mt-2 line-clamp-1">{p.name}</h3>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm font-black text-white text-center"
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
                    <span className="text-xl font-black text-emerald-400">
                      R$ {Number(p.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditPrice(p.price.toString());
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200"
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

    </div>
  );
};
