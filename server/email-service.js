import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Configuração do Transportador SMTP da Hostinger Oficial
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // SSL obrigatório na porta 465
  auth: {
    user: process.env.SMTP_USER || 'suporte@lynxems.com.br',
    pass: process.env.SMTP_PASS || '10207597Rdv*',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Teste de conexão SMTP na inicialização
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ [SMTP Hostinger] Erro ao conectar:', error.message);
  } else {
    console.log('✅ [SMTP Hostinger] Servidor pronto para disparar e-mails com sucesso!');
  }
});

// 1. Rota de envio de código OTP de 6 dígitos para verificação de e-mail
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
          <p>Você iniciou sua ativação para consumir na caderneta do <strong>${restaurantName || 'Restaurante'}</strong>.</p>
          <p>Insira o código numérico abaixo no aplicativo para validar seu e-mail:</p>
          
          <div class="code-box">
            <div class="code-number">${code}</div>
          </div>
          
          <p style="font-size: 13px; color: #64748b;">Esse código expira em 15 minutos. Se você não solicitou este cadastro, desconsidere este e-mail.</p>
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

    console.log(`✉️ [OTP Enviado] Para ${email}. MessageId: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Erro no envio de OTP:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Rota de envio de convite do Restaurante para o Cliente/Consumidor
app.post('/api/send-invite', async (req, res) => {
  try {
    const { email, name, restaurantName, inviteUrl, creditLimit } = req.body;

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
        .header { background: linear-gradient(135deg, #15803d, #16a34a); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; }
        .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center; }
        .btn { display: inline-block; background-color: #16a34a; color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin-top: 16px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3); }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Convite Especial</h1>
          <p>${restaurantName || 'Restaurante Parceiro'}</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${name || 'Cliente'}</strong>!</p>
          <p>Você recebeu um convite oficial do <strong>${restaurantName || 'Restaurante'}</strong> para ativar sua conta na <strong>Caderneta Digital</strong>.</p>
          
          <div class="card">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">Limite Inicial Liberado:</p>
            <p style="margin: 6px 0 0 0; font-size: 28px; font-weight: 900; color: #15803d;">
              R$ ${Number(creditLimit || 200).toFixed(2)}
            </p>
          </div>

          <p>Com a Caderneta Digital, você consome no balcão sem precisar de dinheiro na hora, autorizando seus pedidos com total segurança via <strong>PIN de 4 dígitos</strong> e acompanhando seus extratos direto pelo celular.</p>

          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${inviteUrl}" class="btn" target="_blank">
              Ativar Minha Caderneta Agora
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
            Link direto para ativação:<br>
            <a href="${inviteUrl}" style="color: #16a34a; word-break: break-all;">${inviteUrl}</a>
          </p>
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
      from: `"Caderneta - ${restaurantName || 'Restaurante'}" <${process.env.SMTP_USER || 'suporte@lynxems.com.br'}>`,
      to: email,
      subject: `Convite: Ative sua Caderneta no ${restaurantName || 'Restaurante'} 🍽️`,
      html: htmlContent,
    });

    console.log(`✉️ [Convite Enviado] Para ${email}. MessageId: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Erro no envio de convite:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Rota de aviso de aprovação de conta pelo Master do restaurante
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
          <p style="margin: 6px 0 0 0;">${restaurantName || 'Restaurante Parceiro'}</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${name || 'Cliente'}</strong>!</p>
          ${
            approved
              ? `
              <p>Ótima notícia! Sua caderneta foi <strong>aprovada pelo restaurante</strong> e está ativa para consumo.</p>
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

// 4. Rota de envio de relatório de faturas/pagamentos pendentes para os Responsáveis da Empresa
app.post('/api/send-corporate-report', async (req, res) => {
  try {
    const { 
      emails, 
      companyName, 
      restaurantName, 
      totalAmount, 
      cycleName, 
      dueDate, 
      pixKey, 
      pixKeyType, 
      bankDetails, 
      employeeCount, 
      itemsSummary 
    } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Lista de e-mails dos responsáveis é obrigatória.' });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; background-color: #dbeafe; color: #1e40af; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 16px; }
        .amount-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; text-align: center; padding: 20px; margin: 20px 0; }
        .amount-val { font-size: 32px; font-weight: 900; color: #1e3a8a; margin: 4px 0 0 0; }
        .pix-box { background: #f0fdf4; border: 1px dashed #16a34a; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Relatório de Consumo & Fatura</h1>
          <p>${restaurantName || 'Restaurante Parceiro'}</p>
        </div>
        <div class="content">
          <div class="badge">A/C Gestor Financeiro • ${companyName}</div>
          <p>Prezado(a) responsável financeiro da <strong>${companyName}</strong>,</p>
          <p>Segue o fechamento dos consumos de alimentação dos seus colaboradores no <strong>${restaurantName || 'nosso estabelecimento'}</strong> referente ao ciclo <strong>${cycleName || 'Atual'}</strong>.</p>
          
          <div class="amount-box">
            <span style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Acumulado a Pagar</span>
            <div class="amount-val">R$ ${Number(totalAmount || 0).toFixed(2)}</div>
            <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Vencimento: <strong>${dueDate || 'Conforme combinado'}</strong> • ${employeeCount || 0} colaboradores</span>
          </div>

          ${itemsSummary ? `<div style="background:#f1f5f9; border-radius:10px; padding:14px; font-size:13px; margin:16px 0;"><strong>Resumo do Período:</strong><br/>${itemsSummary}</div>` : ''}

          <div class="pix-box">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 700;">Dados para Pagamento via Pix:</p>
            <p style="margin: 6px 0; font-size: 15px; font-family: monospace; font-weight: 800; color: #0f172a; word-break: break-all;">
              ${pixKey || 'Chave Pix cadastrada no balcão'}
            </p>
            <p style="margin: 0; font-size: 11px; color: #15803d;">Tipo de Chave: ${pixKeyType || 'PIX'}</p>
            ${bankDetails ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;">${bankDetails}</p>` : ''}
          </div>

          <p style="font-size: 13px; color: #475569;">
            Após o pagamento, o recibo oficial com quitação é emitido automaticamente pelo sistema. Você também pode acessar a caderneta geral com todos os lançamentos individuais no <strong>Portal da Empresa Caderneta</strong>.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Caderneta Micro-SaaS • Lynx EMS</p>
          <p>Relatório gerado automaticamente para o gestor financeiro conveniado</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Caderneta - ${restaurantName || 'Financeiro'}" <${process.env.SMTP_USER || 'suporte@lynxems.com.br'}>`,
      to: emails.join(', '),
      subject: `Relatório de Fatura de Alimentação - ${companyName} (${restaurantName || 'Restaurante'})`,
      html: htmlContent,
    });

    console.log(`✉️ [Relatório Enviado] Para ${emails.join(', ')}. MessageId: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Erro no envio de relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Rota de envio de Recibo de Pagamento Confirmado para os Responsáveis
app.post('/api/send-payment-receipt', async (req, res) => {
  try {
    const { 
      emails, 
      companyName, 
      restaurantName, 
      invoiceId, 
      paidAmount, 
      paymentMethod, 
      paidAt, 
      cycleName 
    } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Lista de e-mails dos responsáveis é obrigatória.' });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #15803d, #16a34a); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; }
        .badge { display: inline-block; background-color: #dcfce7; color: #166534; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 16px; }
        .receipt-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 14px; padding: 20px; margin: 20px 0; }
        .paid-val { font-size: 32px; font-weight: 900; color: #15803d; margin: 4px 0; }
        .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧾 Recibo de Quitação Confirmada</h1>
          <p>${restaurantName || 'Restaurante Parceiro'}</p>
        </div>
        <div class="content">
          <div class="badge">PAGAMENTO CONFIRMADO • ${companyName}</div>
          <p>Prezado(a) responsável financeiro da <strong>${companyName}</strong>,</p>
          <p>Confirmamos o recebimento e a quitação integral do pagamento referente ao convênio de refeições dos seus colaboradores.</p>
          
          <div class="receipt-box">
            <span style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 800; letter-spacing: 0.5px;">Valor Total Pago</span>
            <div class="paid-val">R$ ${Number(paidAmount || 0).toFixed(2)}</div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #334155;">
              <strong>Forma de Pagamento:</strong> ${paymentMethod || 'PIX'}<br/>
              <strong>Data de Liquidação:</strong> ${paidAt || new Date().toLocaleDateString('pt-BR')}<br/>
              <strong>Ciclo de Referência:</strong> ${cycleName || 'Geral'}<br/>
              ${invoiceId ? `<strong>Autenticação / Fatura:</strong> <span style="font-family: monospace;">#${invoiceId.slice(0, 8)}</span>` : ''}
            </p>
          </div>

          <p style="font-size: 13px; color: #475569;">
            Os lançamentos dos colaboradores foram baixados com sucesso. O extrato completo e o histórico de consumos continuam arquivados e disponíveis para consulta no <strong>Portal Caderneta</strong>.
          </p>
          <p style="font-size: 14px; font-weight: 700; color: #15803d; margin-top: 20px;">
            Agradecemos pela parceria e preferência!
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Caderneta Micro-SaaS • Lynx EMS</p>
          <p>Comprovante oficial emitido pelo sistema Caderneta</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Caderneta - ${restaurantName || 'Financeiro'}" <${process.env.SMTP_USER || 'suporte@lynxems.com.br'}>`,
      to: emails.join(', '),
      subject: `Comprovante: Pagamento Confirmado - ${companyName} (${restaurantName || 'Restaurante'})`,
      html: htmlContent,
    });

    console.log(`✉️ [Recibo de Pagamento Enviado] Para ${emails.join(', ')}. MessageId: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Erro no envio de recibo:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [Email Server] Rodando na porta ${PORT}`);
});

