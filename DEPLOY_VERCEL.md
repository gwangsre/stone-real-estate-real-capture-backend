# Deploy to Vercel

Steps to deploy this Express + Firestore app to Vercel as a Serverless Function:

1. Connect the GitHub repository to Vercel (import project).

2. Build settings: the default should work. Vercel will use the `api/index.js` serverless function.

3. Add the following Environment Variables in your Vercel project settings (Production and Preview):

  - FIREBASE_PROJECT_ID
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_PRIVATE_KEY (the full private key; replace actual newlines with `\n` when setting in Vercel)
  - PORT (optional; default 8080)
  - CORS_ORIGIN (optional)
  - SENDER_EMAIL / AGENT_EMAIL / SENDGRID_API_KEY if you enable email sending

  If you choose to use Nodemailer + Gmail App Password (server-side), add these env vars instead of SendGrid:

    - SMTP_USER (your Gmail address)
    - SMTP_PASS (Gmail App Password — create this in your Google account security settings)
    - SENDER_EMAIL (optional, defaults to SMTP_USER)
    - AGENT_EMAIL (where new-lead notifications should be sent)

  Note: The repository contains a local service account JSON referenced by `FIREBASE_KEY_FILE` in `.env`. Do NOT commit service account JSON to the repo for production; instead provide the three Firebase environment variables above.

4. After setting env vars, click Deploy. Vercel will build the function and expose endpoints under `https://<your-deployment>/api/v1/...`.

5. Health check: GET /healthz

6. Testing: POST /api/v1/leads/public with a JSON body matching the validator (first_name, last_name, email, phone, suburb, timeframe, interested, preferred_contact).

If you prefer to keep using a service account JSON file, you can set `FIREBASE_KEY_FILE` to the uploaded file path, but using env vars for the cert is recommended for serverless platforms.
