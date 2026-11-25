import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import {
  buildSignedContractEmailContent,
  validateSignedContractEmailPayload,
} from './src/utils/signedContractEmail.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

function getEmailProviderConfig() {
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure =
    (process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || smtpPort === 465;
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpFrom = (process.env.SMTP_FROM || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();

  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);
  const resendConfigured = Boolean(resendKey);

  return {
    smtpConfigured,
    smtpHost,
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : 587,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom: smtpFrom || smtpUser || 'Viajes Mar de Hielo <onboarding@resend.dev>',
    resendConfigured,
    resendKey,
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '16mb' }));

  app.get('/api/email-status', (_req, res) => {
    const cfg = getEmailProviderConfig();
    const provider = cfg.smtpConfigured ? 'smtp' : cfg.resendConfigured ? 'resend' : 'none';
    res.json({
      configured: provider !== 'none',
      provider,
    });
  });

  app.post('/api/send-signed-contract', async (req, res) => {
    const validation = validateSignedContractEmailPayload(req.body);
    if (!validation.ok) {
      res.status(400).json({ sent: false, error: validation.error });
      return;
    }

    const payload = validation.data;
    const cfg = getEmailProviderConfig();

    if (!cfg.smtpConfigured && !cfg.resendConfigured) {
      res.status(200).json({
        sent: false,
        provider: 'none',
        reason: 'not_configured',
      });
      return;
    }

    const sigBase64 = payload.clientSignatureDataUrl.replace(/^data:image\/png;base64,/, '');

    if (cfg.smtpConfigured) {
      try {
        const transporter = nodemailer.createTransport({
          host: cfg.smtpHost,
          port: cfg.smtpPort,
          secure: cfg.smtpSecure,
          auth: {
            user: cfg.smtpUser,
            pass: cfg.smtpPass,
          },
        });

        const emailContent = buildSignedContractEmailContent(payload, {
          inlineSignatureCid: 'client-signature',
        });

        const attachments: Array<{
          filename: string;
          content: Buffer;
          contentType: string;
          cid?: string;
        }> = [
          {
            filename: 'firma-contratante.png',
            content: Buffer.from(sigBase64, 'base64'),
            contentType: 'image/png',
            cid: 'client-signature',
          },
        ];

        if (payload.pdfBase64) {
          attachments.push({
            filename: emailContent.pdfFileName,
            content: Buffer.from(payload.pdfBase64, 'base64'),
            contentType: 'application/pdf',
          });
        }

        await transporter.sendMail({
          from: cfg.smtpFrom,
          to: payload.agencyEmail,
          subject: emailContent.subject,
          text: emailContent.textBody,
          html: emailContent.htmlBody,
          attachments,
        });

        res.json({
          sent: true,
          provider: 'smtp',
          recipient: payload.agencyEmail,
        });
        return;
      } catch (err) {
        console.error('Error sending signed contract via SMTP:', err);
        res.status(502).json({
          sent: false,
          provider: 'smtp',
          error: 'No se pudo enviar el correo mediante SMTP.',
        });
        return;
      }
    }

    // Resend API delivery
    try {
      const emailContent = buildSignedContractEmailContent(payload);
      const attachments: Array<{ filename: string; content: string }> = [
        {
          filename: 'firma-contratante.png',
          content: sigBase64,
        },
      ];
      if (payload.pdfBase64) {
        attachments.push({
          filename: emailContent.pdfFileName,
          content: payload.pdfBase64,
        });
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: cfg.smtpFrom,
          to: [payload.agencyEmail],
          subject: emailContent.subject,
          text: emailContent.textBody,
          html: emailContent.htmlBody,
          attachments,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Resend API failed:', response.status, errBody);
        res.status(502).json({
          sent: false,
          provider: 'resend',
          error: 'El servicio de correo rechazó el envío.',
        });
        return;
      }

      res.json({
        sent: true,
        provider: 'resend',
        recipient: payload.agencyEmail,
      });
    } catch (err) {
      console.error('Error sending signed contract via Resend:', err);
      res.status(502).json({
        sent: false,
        provider: 'resend',
        error: 'No se pudo conectar con el proveedor de correo.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return app;
}

createApp()
  .then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
