# Harmonic Heartbeats WhatsApp Bot — Setup & Deploy

Goal: a free, two-way WhatsApp trivia bot. Your girlfriend texts **PLAY** and plays
today's quiz; the whole exchange runs inside WhatsApp's free 24-hour "service
conversation" window, so there is no per-message cost.

There are two things to do: **(1) get free Meta WhatsApp credentials**, and
**(2) deploy the bot to a free host and connect the webhook.**

---

## Part 1 — Get free Meta WhatsApp Cloud API credentials (~15 min)

1. Go to **developers.facebook.com** and log in with a Facebook account.
2. **My Apps → Create App**. Choose use case **Other**, app type **Business**,
   give it a name (e.g. "Harmonic Heartbeats"). Create it.
3. In the app dashboard, find **WhatsApp** and click **Set up**. Meta creates a
   free **test phone number** (the bot's number) and a test business account.
4. On the **WhatsApp → API Setup** page, copy these two values:
   - **Temporary access token** (valid 24h — fine for first tests) → `WHATSAPP_TOKEN`
   - **Phone number ID** (a long number under the From field; NOT the phone
     number) → `WHATSAPP_PHONE_NUMBER_ID`
5. Under **To**, click **Manage phone number list** and add **her** WhatsApp
   number as a recipient (the free test number can message up to 5 recipients).
   She confirms with the code WhatsApp sends. This is what keeps it free & private.
6. (Optional now) Use the "Send message" button on that page to confirm a test
   message reaches her phone.

### Make the token permanent (do this once it works)
The temporary token expires in 24h. For a token that lasts:
- **business.facebook.com → Business Settings → Users → System Users →** add a
  system user (Admin). **Add Assets →** your app. **Generate new token →** select
  the app, choose permissions **whatsapp_business_messaging** and
  **whatsapp_business_management**, set expiration to **Never**. Copy it →
  `WHATSAPP_TOKEN`.
- Also copy your **App Secret** (App dashboard → Settings → Basic → Show) →
  `WHATSAPP_APP_SECRET` (enables webhook signature verification).

---

## Part 2 — Deploy the bot to a free host (Render)

The bot is a standard Node service (`Working/bot/`) with **zero dependencies**.
Render's free tier runs it at no cost.

1. Push the bot code to a GitHub repo (I can do this step with you).
2. On **render.com → New → Web Service**, connect the repo.
   - **Root Directory:** `Working/bot`
   - **Build Command:** *(leave empty — no dependencies)*
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. Add **Environment Variables** (from Part 1):
   | Key | Value |
   |-----|-------|
   | `WHATSAPP_TOKEN` | your access token |
   | `WHATSAPP_PHONE_NUMBER_ID` | your phone number ID |
   | `WHATSAPP_VERIFY_TOKEN` | any random string you invent |
   | `WHATSAPP_APP_SECRET` | your app secret (optional but recommended) |
   | `ALLOWED_RECIPIENTS` | her number in E.164 without `+` (e.g. `15551234567`) |
4. Deploy. Render gives you a URL like `https://harmonic-heartbeats.onrender.com`.
   Confirm it loads and shows the "bot is running" message.

### Connect the webhook
1. Back in Meta: **WhatsApp → Configuration → Edit** webhook.
   - **Callback URL:** `https://<your-render-url>/webhook`
   - **Verify token:** the exact `WHATSAPP_VERIFY_TOKEN` you set on Render.
   - Click **Verify and save** (Meta calls your server's GET /webhook).
2. Under **Webhook fields**, subscribe to **messages**.
3. Done. Have her text **PLAY** to the bot number.

> Note on the free tier: Render's free service sleeps after ~15 min idle, so the
> first message after a quiet period may take ~30–60s while it wakes (Meta
> retries the webhook, so it still arrives). A free uptime pinger (e.g.
> UptimeRobot hitting the URL every 10 min) keeps it awake if you want instant
> replies.

---

## How to play (what she can text)
- `PLAY` / `daily` — today's featured artist
- `RANDOM` — a surprise artist
- an artist name, e.g. `Queen` or `Billie Eilish`
- `1`–`4` — answer the current question (or type the answer text)
- `STOP` — end the current quiz

## Local development
```bash
cd "Working/bot"
export WHATSAPP_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_VERIFY_TOKEN=...
npm start
```
Run the tests from the project root:
```bash
node --test "Unit Tests/"*.test.js
```
