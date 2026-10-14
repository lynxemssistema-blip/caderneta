import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Building2, 
  User, 
  CreditCard, 
  Utensils,
  Coffee,
  IceCream,
  Wine
} from 'lucide-react';
import type { Consumer, Product, ProductCategory } from '../types/database';
import { fetchConsumers, fetchProducts, registerSaleSplit } from '../lib/supabase';
import type { CartItem } from '../lib/supabase';
import { PinModal } from '../components/PinModal';
import { sound } from '../lib/sound';

export const BalcaoPOS: React.FC = () => {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'ALL'>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [extraPaidNow, setExtraPaidNow] = useState(false);
  const [saleNotes, setSaleNotes] = useState('');
  
  // Custom manual entry
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCat, setCustomCat] = useState<ProductCategory>('MEAL');

  // PIN modal & status
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cList, pList] = await Promise.all([
      fetchConsumers(),
      fetchProducts()
    ]);
    setConsumers(cList);
    setProducts(pList);

    // Auto-selecionar o primeiro se houver
    if (cList.length > 0 && !selectedConsumer) {
      setSelectedConsumer(cList[0]);
    }
  };

  // Filtragem de clientes
  const filteredConsumers = consumers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Filtragem de produtos por categoria
  const filteredProducts = products.filter((p) => {
    if (!p.is_active) return false;
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  // Adicionar ao carrinho
  const addToCart = (product: Product) => {
    sound.playKeyClick();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    sound.playKeyClick();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const addCustomItem = () => {
    const price = parseFloat(customPrice.replace(',', '.'));
    if (!customName.trim() || isNaN(price) || price <= 0) return;

    sound.playKeyClick();
    const tempProduct: Product = {
      id: `custom-${Date.now()}`,
      tenant_id: 'a0000000-0000-0000-0000-000000000001',
      name: customName.trim(),
      category: customCat,
      price: price,
      is_active: true
    };

    addToCart(tempProduct);
    setCustomName('');
    setCustomPrice('');
  };

  // Cálculos do Split
  let mealTotal = 0;
  let extraTotal = 0;

  cart.forEach((item) => {
    const total = item.product.price * item.quantity;
    if (item.product.category === 'MEAL') {
      mealTotal += total;
    } else {
      extraTotal += total;
    }
  });

  const grandTotal = mealTotal + extraTotal;
  const isCorporate = !!selectedConsumer?.corporate_client_id;
  const companyCoversOnlyMeal = !!selectedConsumer?.corporate_client?.company_covers_only_meal && !selectedConsumer?.company_covers_beverage;
  const employeeHasBeverageCovered = !!selectedConsumer?.company_covers_beverage;

  // Lógica de finalização após o PIN ser validado
  const handlePinSuccess = async () => {
    if (!selectedConsumer || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await registerSaleSplit({
        tenantId: selectedConsumer.tenant_id,
        consumer: selectedConsumer,
        items: cart,
        extraPaidNow: extraPaidNow,
        signatureVerified: true,
        notes: saleNotes.trim() || undefined
      });

      setIsPinModalOpen(false);
      setCart([]);
      setSaleNotes('');
      setSuccessMessage(`Lançamento realizado com sucesso para ${selectedConsumer.name}! 🚀`);
      
      // Recarregar dados
      loadData();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gravar lançamento';
      alert(`Falha: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-pop shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Grid Principal: Esquerda Produtos, Direita Carrinho/Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: Cardápio e Itens (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Seletor Rápido de Categorias */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'ALL', label: 'Tudo', icon: Utensils },
              { id: 'MEAL', label: 'Refeições 🍲', icon: Utensils },
              { id: 'BEVERAGE', label: 'Bebidas 🥤', icon: Wine },
              { id: 'DESSERT', label: 'Sobremesas 🍮', icon: IceCream },
              { id: 'OTHER', label: 'Outros ☕', icon: Coffee },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as ProductCategory | 'ALL')}
                className={`touch-btn flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 scale-102'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Produtos com Toque Rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((p) => {
              const inCart = cart.find((item) => item.product.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`touch-btn text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[105px] ${
                    inCart
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800'
                  }`}
                >
                  <div>
                    <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                      {p.category === 'MEAL' ? 'Prato' : p.category === 'BEVERAGE' ? 'Bebida' : p.category === 'DESSERT' ? 'Doce' : 'Item'}
                    </span>
                    <h4 className="font-bold text-slate-100 text-sm mt-1.5 line-clamp-2 leading-tight">
                      {p.name}
                    </h4>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-emerald-400 font-extrabold text-base">
                      R$ {Number(p.price).toFixed(2)}
                    </span>
                    {inCart && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Item Livre / Personalizado Rápido */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              + Inserir Item Livre ou Fracionado
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Ex: Marmita Especial, Água"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="sm:col-span-5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <select
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value as ProductCategory)}
                className="sm:col-span-3 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="MEAL">Refeição</option>
                <option value="BEVERAGE">Bebida</option>
                <option value="DESSERT">Sobremesa</option>
                <option value="OTHER">Outro</option>
              </select>
              <input
                type="text"
                placeholder="R$ 0,00"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="sm:col-span-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 text-center"
              />
              <button
                onClick={addCustomItem}
                className="touch-btn sm:col-span-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-emerald-400 font-bold rounded-xl py-2 flex items-center justify-center gap-1 border border-emerald-500/30"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: Cliente Selecionado e Carrinho Split (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Seção 1: Seleção de Cliente */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Cliente / Funcionário
              </label>
              {selectedConsumer && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  PIN Configurado
                </span>
              )}
            </div>

            {/* Campo de Busca Preditiva */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por telefone ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Lista com Sugestões de Clientes */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {filteredConsumers.map((c) => {
                const isSelected = selectedConsumer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      sound.playKeyClick();
                      setSelectedConsumer(c);
                    }}
                    className={`touch-btn w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 text-white shadow'
                        : 'bg-slate-850 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        {c.name}
                        {c.corporate_client && (
                          <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-500/30">
                            {c.corporate_client.company_name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] block font-bold text-slate-400">Pendente</span>
                      <span className="text-xs font-black text-amber-400">
                        R$ {Number(c.total_pending || 0).toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Itens do Consumo / Carrinho */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-extrabold text-sm text-slate-200">Itens do Consumo</h4>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar
                  </button>
                )}
              </div>

              {/* Lista dos Itens Selecionados */}
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  Toque nos itens do cardápio para adicionar ao pedido.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.product.category === 'MEAL' ? 'Almoço' : 'Extra'}
                          </span>
                          <span className="font-bold text-sm text-slate-100">{item.product.name}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          R$ {item.product.price.toFixed(2)} un
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="touch-btn w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-sm text-white w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.product)}
                          className="touch-btn w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-sm text-emerald-400 ml-2 min-w-[60px] text-right">
                          R$ {(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seção 3: Regra de Split Automático (Refeição vs Extras) */}
            {cart.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                
                {/* Exibição do Split se for empresa conveniada */}
                {isCorporate && employeeHasBeverageCovered && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center justify-between">
                    <span>✨ Benefício Especial: Empresa cobre Refeição + Bebidas!</span>
                    <span className="font-black text-sm text-emerald-200">Total: R$ {grandTotal.toFixed(2)}</span>
                  </div>
                )}

                {isCorporate && companyCoversOnlyMeal && (
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Empresa Cobre (Refeição):
                      </span>
                      <span className="font-black text-sm text-blue-200">R$ {mealTotal.toFixed(2)}</span>
                    </div>

                    {extraTotal > 0 && (
                      <div className="pt-2 border-t border-blue-900/40">
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-1.5">
                          <span>Extra Pessoal (Bebida/Doce):</span>
                          <span className="font-black text-sm text-amber-200">R$ {extraTotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setExtraPaidNow(true)}
                            className={`p-2 rounded-lg font-bold border transition-all ${
                              extraPaidNow
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            💵 Pago Agora à Vista
                          </button>
                          <button
                            type="button"
                            onClick={() => setExtraPaidNow(false)}
                            className={`p-2 rounded-lg font-bold border transition-all ${
                              !extraPaidNow
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            📒 Caderneta Pessoal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Geral */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400 font-bold text-sm">TOTAL A LANÇAR:</span>
                  <span className="text-2xl font-black text-emerald-400">
                    R$ {grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Botão de Finalização com 3 Toques / Chamada do PIN */}
                <button
                  disabled={!selectedConsumer || grandTotal <= 0 || isSubmitting}
                  onClick={() => {
                    sound.playKeyClick();
                    setIsPinModalOpen(true);
                  }}
                  className={`touch-btn w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                    !selectedConsumer || grandTotal <= 0 || isSubmitting
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950/40'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  CONFIRMAR COM PIN DO CLIENTE
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal de Assinatura com PIN de 4 Dígitos */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        consumer={selectedConsumer}
        totalAmount={grandTotal}
        breakdown={{ meal: mealTotal, extra: extraTotal }}
        onSuccess={handlePinSuccess}
      />

    </div>
  );
};
