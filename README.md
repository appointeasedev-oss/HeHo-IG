# Heho × Instagram Railway App

This project is a Railway-ready Node.js app that:

- Shows a web UI to login/connect Instagram.
- Polls Instagram DMs via `instagram-private-api`.
- For each incoming text message, sends it to Heho `/api/aichat`.
- Sends Heho reply back to Instagram automatically.
- Adds random **3–5 second** delay before sending each auto-reply.
- Displays all important events/logs in the UI.
- Includes a UI chat box to talk to Heho directly.

## Environment Variables (Railway)

Set these in Railway Variables:

- `HEHO_API_KEY`
- `HEHO_CHATBOT_ID`
- `SESSION_SECRET` (any random secret)
- `PORT` (Railway usually injects this automatically)

Use `.env.example` as reference.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API routes

- `GET /api/status` → current connection status
- `GET /api/logs` → UI logs
- `POST /api/connect` → connect Instagram
  - body: `{ "username": "...", "password": "..." }`
- `POST /api/disconnect` → disconnect bridge
- `POST /api/chat` → chat with Heho from UI
  - body: `{ "message": "Hello" }`

## Deploy to Railway

1. Push this repo to GitHub.
2. Create a new Railway project from the repo.
3. Add environment variables listed above.
4. Deploy (Railway runs `npm start`).

## Notes

- `instagram-private-api` login can challenge/2FA based on account security; complete security steps as needed.
- This app stores runtime state in memory; reconnect after restarts.
