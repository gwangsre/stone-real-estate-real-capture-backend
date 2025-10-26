import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

function logToFile(entry) {
  try {
    if (process.env.NODE_ENV !== 'development') return;
    const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
    const p = path.resolve(process.cwd(), 'mailer.debug.log');
    fs.appendFileSync(p, line, 'utf8');
  } catch (_) {
    // ignore file logging errors
  }
}

function buildSmtpTransports() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  // Sanitize credentials: trim quotes/whitespace and remove spaces in app-password (Gmail shows spaces for readability)
  const rawUser = process.env.SMTP_USER || '';
  const rawPass = process.env.SMTP_PASS || '';
  const user = rawUser.trim().replace(/^['"]|['"]$/g, '');
  const pass = rawPass.trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, ''); // Gmail App Password
  if (!user || !pass) return [];

  const portEnv = Number(process.env.SMTP_PORT || 0);
  const secureEnv = String(process.env.SMTP_SECURE || '').toLowerCase();
  const secureExplicit = secureEnv === 'true' || secureEnv === '1' || secureEnv === 'yes';

  // If explicit port is provided, use it as the only attempt
  if (portEnv > 0) {
    // If user specified secure, respect it; otherwise infer: 465 => secure, else STARTTLS
    const secure = secureEnv ? secureExplicit : portEnv === 465;
    const requireTLS = !secure; // STARTTLS for 587
    return [{ host, port: portEnv, secure, requireTLS, auth: { user, pass } }];
  }

  // Default: Try STARTTLS (587) first, then SSL (465)
  return [
    { host, port: 587, secure: false, requireTLS: true, auth: { user, pass } },
    { host, port: 465, secure: true, auth: { user, pass } },
  ];
}

export async function sendMail({ to, subject, text, html, from, replyTo }) {
  // Allow disabling emails entirely via env (useful in preview)
  const emailEnabled = String(process.env.EMAIL_ENABLED || 'true').toLowerCase();
  if (emailEnabled === 'false' || emailEnabled === '0' || emailEnabled === 'no') {
    const skip = { to, subject, reason: 'EMAIL_ENABLED=false' };
    console.log('Mailer: skipped by EMAIL_ENABLED', skip);
    logToFile({ level: 'info', event: 'skip_email', ...skip });
    return null;
  }

  // 1) Prefer Resend HTTP API (free developer tier; works well on serverless) if configured
  const resendKey = process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim();
  if (resendKey) {
    try {
      const sender = from || process.env.SENDER_EMAIL || process.env.SMTP_USER;
      const payload = {
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        ...(text ? { text } : {}),
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      };
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const bodyText = await res.text().catch(() => '');
      if (res.ok) {
        console.log('Mailer(Resend): message accepted', { to, subject, status: res.status });
        logToFile({ level: 'info', event: 'resend_sent', to, subject, status: res.status, body: bodyText });
        return { provider: 'resend', status: res.status };
      } else {
        console.error('Mailer(Resend): send error', { status: res.status, statusText: res.statusText, body: bodyText });
        logToFile({ level: 'error', event: 'resend_error', status: res.status, statusText: res.statusText, body: bodyText });
        // fall through to next provider
      }
    } catch (e) {
      console.error('Mailer(Resend): exception', e?.message || e);
      logToFile({ level: 'error', event: 'resend_exception', error: e && (e.stack || e.message) });
      // fallback to next provider
    }
  }

  // Prefer HTTPS provider if configured (more reliable on serverless)
  const sgKey = process.env.SENDGRID_API_KEY && String(process.env.SENDGRID_API_KEY).trim();
  if (sgKey) {
    try {
      const sender = from || process.env.SENDER_EMAIL || process.env.SMTP_USER;
      const payload = {
        personalizations: [{ to: Array.isArray(to) ? to.map((x) => ({ email: x })) : [{ email: to }] }],
        from: { email: sender },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ],
        ...(replyTo ? { reply_to: { email: replyTo } } : {}),
      };
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sgKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const errInfo = { status: res.status, statusText: res.statusText, body };
        console.error('Mailer(SendGrid): send error', errInfo);
        logToFile({ level: 'error', event: 'sendgrid_error', ...errInfo });
      } else {
        console.log('Mailer(SendGrid): message accepted', { to, subject, status: res.status });
        logToFile({ level: 'info', event: 'sendgrid_sent', to, subject, status: res.status });
        return { provider: 'sendgrid', status: res.status };
      }
      // fall through to SMTP if SendGrid failed
    } catch (e) {
      console.error('Mailer(SendGrid): exception', e?.message || e);
      logToFile({ level: 'error', event: 'sendgrid_exception', error: e && (e.stack || e.message) });
      // fallback to SMTP
    }
  }

  const sender = from || process.env.SENDER_EMAIL || process.env.SMTP_USER;
  const transports = buildSmtpTransports();

  if (!transports.length) {
    console.warn('Mailer: SMTP_USER or SMTP_PASS missing — no SMTP transport available');
    return null;
  }

  const msg = { from: sender, to, subject, text, html, ...(replyTo ? { replyTo } : {}) };

  let lastErr = null;
  for (const conf of transports) {
    console.log('Mailer(SMTP): trying transport', { host: conf.host, port: conf.port, secure: !!conf.secure, user: (process.env.SMTP_USER || '').trim() });
    const transporter = nodemailer.createTransport({
      host: conf.host,
      port: conf.port,
      secure: conf.secure,
      requireTLS: conf.requireTLS || false,
      auth: conf.auth,
      // tune timeouts to be slightly more lenient on serverless platforms
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: true },
    });

    try {
      const info = await transporter.sendMail(msg);
      const success = { to, subject, messageId: info.messageId, response: info.response, port: conf.port };
      console.log('Mailer(SMTP): message sent', success);
      logToFile({ level: 'info', event: 'smtp_sent', ...success });
      return info;
    } catch (err) {
      lastErr = err;
      const fail = { port: conf.port, message: err && err.message };
      console.error('Mailer(SMTP): send error', fail);
      logToFile({ level: 'error', event: 'smtp_error', ...fail });
      // continue to next transport attempt
    }
  }

  // All attempts failed — throw the last error so caller can log/handle.
  console.error('Mailer: all SMTP transports failed', lastErr && lastErr.stack ? lastErr.stack : lastErr);
  logToFile({ level: 'error', event: 'smtp_all_failed', error: lastErr && (lastErr.stack || lastErr.message || String(lastErr)) });
  throw lastErr;
}
