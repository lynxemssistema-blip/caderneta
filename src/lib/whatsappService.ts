// Serviço de Integração com WhatsApp & Evolution API Oficial
import type { Consumer, Tenant } from '../types/database';
import type { DetailedConsumptionItem } from './supabase';

const API_BASE_URL = import.meta.env.VITE_EMAIL_API_URL !== undefined && import.meta.env.VITE_EMAIL_API_URL !== ''
  ? import.meta.env.VITE_EMAIL_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:3001');

export interface WhatsAppStatus {
  connected: boolean;
  status: string;
  instance: string;
  profileName?: string;
  number?: string;
  error?: string;
}

/**
 * Consulta o status da conexão da Evolution API
 */
export async function checkEvolutionStatus(): Promise<WhatsAppStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/evolution-status`);
    if (!res.ok) {
      return { connected: false, status: 'offline', instance: 'Suporte Lynx' };
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na conexão';
    return { connected: false, status: 'offline', instance: 'Suporte Lynx', error: msg };
  }
}

/**
 * Dispara mensagem pelo WhatsApp via Evolution API do backend
 */
export async function sendWhatsAppDirect(params: {
  phone: string;
  message: string;
  clientName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Falha ao enviar mensagem pelo WhatsApp'
      };
    }

    return {
      success: true,
      messageId: data.messageId
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao comunicar com servidor de WhatsApp';
    return { success: false, error: errorMsg };
  }
}

/**
 * Abre o WhatsApp Web / App diretamente como contingência
 */
export function openWhatsAppWebFallback(phone: string, message: string) {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }
  const text = encodeURIComponent(message);
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
}

/**
 * Monta o texto de mensagem personalizada com relatório de despesas individual do cliente
 */
export function buildPersonalizedExpenseReport(options: {
  consumer: Consumer;
  tenant: Tenant | null;
  entries?: DetailedConsumptionItem[];
  customNote?: string;
  includePix?: boolean;
  includeHistory?: boolean;
}): string {
  const { consumer, tenant, entries = [], customNote, includePix = true, includeHistory = true } = options;
  const restaurantName = tenant?.trade_name || 'Restaurante';
  const totalPending = Number(consumer.total_pending || 0);
  const creditLimit = Number(consumer.individual_credit_limit || 200);
  const availableLimit = Math.max(0, creditLimit - totalPending);
  const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');

  // Saudação inicial chamando o cliente pelo nome
  let msg = `Olá, *${consumer.name}*! Tudo bem?\n\n`;
  msg += `Aqui é do *${restaurantName}*. Segue o seu relatório individual atualizado de consumo na nossa caderneta:\n\n`;

  // Resumo financeiro
  msg += `📊 *RESUMO DA SUA CADERNETA*\n`;
  msg += `💰 *Total em Aberto:* R$ ${totalPending.toFixed(2)}\n`;
  msg += `💳 *Limite de Crédito:* R$ ${creditLimit.toFixed(2)}\n`;
  msg += `🟢 *Saldo Disponível:* R$ ${availableLimit.toFixed(2)}\n\n`;

  // Histórico de Despesas Recentes (apenas dele mesmo)
  if (includeHistory && entries.length > 0) {
    msg += `🧾 *ÚLTIMOS LANÇAMENTOS / DESPESAS:*\n`;
    // Pega até os últimos 5 lançamentos mais recentes
    const recent = entries.slice(0, 5);
    recent.forEach((item) => {
      const dateFormatted = new Date(item.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const desc = item.description || (item.items && item.items.length > 0 ? item.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ') : 'Consumo no balcão');
      msg += `• ${dateFormatted} - ${desc}: *R$ ${Number(item.total_amount).toFixed(2)}*\n`;
    });

    if (entries.length > 5) {
      msg += `_(+ ${entries.length - 5} lançamentos anteriores disponíveis no extrato)_\n`;
    }
    msg += `\n`;
  }

  // Chave Pix do Restaurante se houver
  if (includePix && tenant?.pix_key && totalPending > 0) {
    msg += `🔑 *DADOS PARA PAGAMENTO / PIX:*\n`;
    msg += `• Chave: \`${tenant.pix_key}\` (${tenant.pix_key_type || 'Chave'})\n`;
    if (tenant.trade_name) {
      msg += `• Favorecido: ${tenant.trade_name}\n`;
    }
    msg += `• Valor para quitação: *R$ ${totalPending.toFixed(2)}*\n\n`;
  }

  // Link para o extrato individual do cliente
  msg += `📱 *EXTRATO DIGITAL COMPLETO:*\n`;
  msg += `Você pode acompanhar todas as suas despesas em tempo real pelo link:\n`;
  msg += `${appUrl}/extrato/${consumer.id}\n\n`;

  // Nota personalizada adicionada pelo restaurante
  if (customNote && customNote.trim()) {
    msg += `💬 *Recado do Restaurante:*\n${customNote.trim()}\n\n`;
  }

  msg += `Agradecemos pela sua preferência! Qualquer dúvida, estamos sempre à disposição. 👍`;

  return msg;
}
