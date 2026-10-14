import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Configuração do Transportador SMTP da Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // SSL na porta 465
  auth: {
    user: process.env.SMTP_USER || 'suporte@lynxems.com.br',
    pass: process.env.SMTP_PASS || '10207297Rdv*',
  },
});

// Teste de conexão SMTP na inicialização
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ [SMTP Hostinger] Erro ao conectar:', error.message);
  } else {
    console.log('✅ [SMTP Hostinger] Servidor pronto para disparar e-mails com sucesso!');
  }
});

// 1. Rota de envio de código de verificação no cadastro
app.post('/api/send-verification', async (req, res) => {
  try {
    const { email, name, code, restaurantName } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #15803d, #16a34a); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; background-color: #dcfce7; color: #166534; font-weight: 600; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 16px; }
        .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; padding: 20px; margin: 24px 0; }
        .code-number { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin: 0; font-family: monospace; }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Caderneta Digital</h1>
          <p>Validação de Acesso & Segurança</p>
        </div>
        <div class="content">
          <div class="badge">Código de Confirmação</div>
          <p>Olá, <strong>${name || 'Cliente'}</strong>!</p>
          <p>Você iniciou seu cadastro para ter conta e convênio no <strong>${restaurantName || 'Restaurante'}</strong>.</p>
          <p>Insira o código numérico abaixo no aplicativo para validar seu e-mail:</p>
          
          <div class="code-box">
            <div class="code-number">${code}</div>
          </div>
          
          <p style="font-size: 13px; color: #64748b;">Esse código expira em 15 minutos. Se você não solicitou este cadastro, pode desconsiderar este e-mail com total segurança.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Caderneta Micro-SaaS • Lynx EMS</p>
          <p>Sistema oficial de convênios e alimentação corporativa</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Caderneta - ${restaurantName || 'Suporte'}" <${process.env.SMTP_USER || 'suporte@lynxems.com.br'}>`,
      to: email,
      subject: `${code} é seu código de verificação na Caderneta`,
      html: htmlContent,
    });

    console.log(`✉️ [E-mail Enviado] Código ${code} enviado para ${email}. MessageId: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Erro no envio de e-mail:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Rota de aviso de aprovação de conta pelo Master do restaurante
app.post('/api/send-approval-status', async (req, res) => {
  try {
    const { email, name, restaurantName, creditLimit, approved } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: ${approved ? 'linear-gradient(135deg, #15803d, #16a34a)' : '#dc2626'}; padding: 32px 24px; text-align: center; color: white; }
        .content { padding: 32px 28px; }
        .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0; font-size: 24px;">${approved ? '🎉 Conta Aprovada!' : 'Atualização de Cadastro'}</h1>
          <p style="margin: 6px 0 0 0;">${restaurantName || 'Restaurante Sabor da Vila'}</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${name || 'Cliente'}</strong>!</p>
          ${
            approved
              ? `
              <p>Ótima notícia! Seu cadastro foi <strong>aprovado pelo restaurante</strong>. Sua caderneta digital está ativa e disponível para consumo.</p>
              <div class="card">
                <p style="margin:0; font-size:13px; color:#166534;"><strong>Limite Individual Liberado:</strong></p>
                <p style="margin:4px 0 0 0; font-size:24px; font-weight:800; color:#15803d;">R$ ${Number(creditLimit || 200).toFixed(2)}</p>
              </div>
              <p>Ao realizar seus pedidos no balcão, informe seu número de telefone e confirme com seu PIN de 4 dígitos.</p>
              `
              : `<p>Seu cadastro foi revisado pelo restaurante. Entre em contato diretamente no balcão para mais informações.</p>`
          }
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Caderneta Micro-SaaS • Lynx EMS</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Caderneta - ${restaurantName || 'Restaurante'}" <${process.env.SMTP_USER || 'suporte@lynxems.com.br'}>`,
      to: email,
      subject: approved ? `Sua conta na Caderneta foi aprovada! 🍽️` : `Atualização sobre seu cadastro na Caderneta`,
      html: htmlContent,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [Email Server] Rodando na porta ${PORT}`);
});
