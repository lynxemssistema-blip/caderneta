import React, { useState, useEffect } from 'react';
import { 
  User, 
  Utensils, 
  Calendar, 
  ShoppingBag, 
  Plus, 
  CheckCircle2, 
  Building2,
  Receipt
} from 'lucide-react';
import type { Consumer, Product } from '../types/database';
import type { DetailedConsumptionItem } from '../lib/supabase';
import { 
  fetchConsumers, 
  fetchProducts, 
  fetchConsumerConsumptionHistory, 
  registerSaleSplit 
} from '../lib/supabase';
import { sound } from '../lib/sound';
import type { Tenant } from '../types/database';

interface PortalConsumidorProps {
  tenantId?: string;
  activeTenant?: Tenant | null;
}

export const PortalConsumidor: React.FC<PortalConsumidorProps> = ({ tenantId, activeTenant }) => {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<DetailedConsumptionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Carrinho de Autoatendimento do Cliente
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [tenantId, activeTenant?.id]);

  const loadData = async () => {
    const targetTenantId = tenantId || activeTenant?.id;
    if (!targetTenantId) {
      setConsumers([]);
      setProducts([]);
      return;
    }
    const [cList, pList] = await Promise.all([
      fetchConsumers(targetTenantId),
      fetchProducts(targetTenantId)
    ]);
    setConsumers(cList);
    setProducts(pList.filter((p) => p.is_active));
    
    // Selecionar o primeiro consumidor por padrão se houver
    if (cList.length > 0 && !selectedConsumer) {
      handleSelectConsumer(cList[0]);
    }
  };

  const handleSelectConsumer = async (consumer: Consumer) => {
    setSelectedConsumer(consumer);
    setLoadingHistory(true);
    setCart([]);
    setOrderSuccess('');
    try {
      const hist = await fetchConsumerConsumptionHistory(consumer.id);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const addToCart = (product: Product) => {
    sound.playKeyClick();
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    sound.playKeyClick();
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleConfirmOrder = async () => {
    if (!selectedConsumer || cart.length === 0) return;
    setOrdering(true);
    setOrderSuccess('');

    const targetTenantId = selectedConsumer.tenant_id || tenantId || activeTenant?.id;
    if (!targetTenantId) {
      alert('Nenhum restaurante ativo identificado para processar o pedido.');
      return;
    }

    try {
      sound.playKeyClick();
      await registerSaleSplit({
        tenantId: targetTenantId,
        consumer: selectedConsumer,
        items: cart,
        extraPaidNow: false,
        signatureVerified: true,
        notes: `Pedido de Autoatendimento via Celular pelo cliente ${selectedConsumer.name}`
      });

      sound.playSuccessChime();
      setOrderSuccess('🎉 Pedido realizado com sucesso! Foi adicionado ao seu consumo.');
      setCart([]);
      
      // Recarregar histórico e dados do consumidor
      const [hist, cList] = await Promise.all([
        fetchConsumerConsumptionHistory(selectedConsumer.id),
        fetchConsumers(targetTenantId)
      ]);
      setHistory(hist);
      setConsumers(cList);
      const updated = cList.find((c) => c.id === selectedConsumer.id);
      if (updated) setSelectedConsumer(updated);

      setTimeout(() => setOrderSuccess(''), 5000);
    } catch (err: any) {
      alert('Falha ao processar pedido: ' + (err.message || 'Erro'));
    } finally {
      setOrdering(false);
    }
  };

  const cartTotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);

  const filteredConsumers = consumers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:px-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <User className="w-7 h-7 text-emerald-400" />
            Portal do Cliente & Autoatendimento
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe seu consumo detalhado (itens, datas e valores) e faça novos pedidos direto pelo celular.
          </p>
        </div>

        {/* Seletor rápido de cliente (para demonstração/login fácil) */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Barra de Seleção de Clientes (se estiver buscando ou trocando) */}
      {searchTerm && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto space-y-1">
          {filteredConsumers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                handleSelectConsumer(c);
                setSearchTerm('');
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-xs"
            >
              <span className="font-bold text-white">{c.name} ({c.phone})</span>
              <span className="text-slate-400">{c.corporate_client?.company_name || 'Particular'}</span>
            </button>
          ))}
        </div>
      )}

      {selectedConsumer ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Perfil, Regras e Extrato */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Cartão de Identificação do Consumidor */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                    {selectedConsumer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedConsumer.name}</h3>
                    <p className="text-xs text-slate-400">{selectedConsumer.phone} • {selectedConsumer.email || 'Sem e-mail'}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  selectedConsumer.status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                }`}>
                  {selectedConsumer.status === 'ACTIVE' ? 'Conta Ativa' : 'Bloqueado'}
                </span>
              </div>

              {/* Informações de Vínculo e Limites */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-850 rounded-2xl border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Modalidade</span>
                  <span className="text-xs font-black text-slate-200">
                    {selectedConsumer.corporate_client ? (
                      <span className="flex items-center justify-center gap-1 text-teal-400">
                        <Building2 className="w-3.5 h-3.5" />
                        {selectedConsumer.corporate_client.company_name}
                      </span>
                    ) : (
                      'Cliente Particular'
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Saldo Pendente</span>
                  <span className="text-sm font-black text-amber-400">
                    R$ {Number(selectedConsumer.total_pending || 0).toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Benefício Bebida</span>
                  <span className="text-xs font-black text-slate-200">
                    {selectedConsumer.corporate_client ? (
                      selectedConsumer.corporate_client.company_covers_only_meal && !selectedConsumer.company_covers_beverage ? (
                        <span className="text-amber-400">Não (Paga à parte)</span>
                      ) : (
                        <span className="text-emerald-400">Sim (Empresa cobre)</span>
                      )
                    ) : (
                      'Fiado Particular'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Extrato Detalhado do que o Consumidor Comprou */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                Histórico Detalhado do Que Você Comprou
              </h3>

              {loadingHistory ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Carregando lançamentos...
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-850 rounded-2xl border border-slate-800">
                  Nenhum consumo registrado recentemente.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div 
                      key={entry.id}
                      className="p-3.5 bg-slate-850/80 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(entry.created_at).toLocaleDateString('pt-BR')} às {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-black text-emerald-400 text-sm">
                          R$ {entry.total_amount.toFixed(2)}
                        </span>
                      </div>

                      {entry.description && (
                        <p className="text-xs text-slate-300 font-semibold">{entry.description}</p>
                      )}

                      {/* Lista de itens consumidos */}
                      {entry.items && entry.items.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1">
                          {entry.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="font-mono text-slate-300">
                                R$ {item.total_price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Cardápio Digital & Comprar Mais Coisas */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-emerald-400" />
                  Comprar / Autoatendimento
                </h3>
                <span className="text-[10px] text-slate-400">Cardápio de Hoje</span>
              </div>

              {orderSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pop">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{orderSuccess}</span>
                </div>
              )}

              {/* Lista de Produtos para pedir */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-2.5 bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{prod.name}</span>
                      <span className="text-[11px] font-mono text-emerald-400">R$ {prod.price.toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 touch-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Pedir
                    </button>
                  </div>
                ))}
              </div>

              {/* Carrinho de Compras */}
              {cart.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      Itens Selecionados ({cart.length})
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      Total: R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between text-xs p-1.5 bg-slate-950 rounded-lg">
                        <span className="text-slate-300 truncate max-w-[150px]">
                          {item.quantity}x {item.product.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200">
                            R$ {(item.product.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-rose-400 hover:text-rose-300 text-xs px-1 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={ordering}
                    onClick={handleConfirmOrder}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 touch-btn disabled:opacity-50"
                  >
                    {ordering ? 'Enviando Pedido...' : 'Confirmar Pedido na Minha Caderneta'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
          Selecione seu nome ou digite seu telefone para acessar seu extrato e pedidos.
        </div>
      )}

    </div>
  );
};
