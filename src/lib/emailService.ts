// Cliente para envio de e-mails via API Hostinger SMTP
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001';

export async function sendVerificationEmail(params: {
  email: string;
  name: string;
  code: string;
  restaurantName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${EMAIL_API_URL}/api/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Falha ao enviar e-mail' };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro de conexão com o servidor de e-mail';
    console.warn('Falha no envio de e-mail via API local:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function sendApprovalNotification(params: {
  email: string;
  name: string;
  restaurantName?: string;
  creditLimit?: number;
  approved: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${EMAIL_API_URL}/api/send-approval-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Falha ao enviar notificação' };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro de conexão';
    return { success: false, error: errorMsg };
  }
}
