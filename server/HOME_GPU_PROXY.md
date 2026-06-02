# Host the tutor on your GPU at home (deployed site → your PC)

Your **deployed** Next.js app never runs Ollama. It only calls **`/api/chat`**, which proxies to **`FASTAPI_URL`**. Point that URL at a **tunnel** to the machine where Ollama + FastAPI run.

---

## If you are the GPU host (you push to GitHub, others use your PC)

1. **Do not commit** `.env.local`, `TUTOR_API_KEY`, or any tunnel URL that includes secrets. The repo should stay safe to make **public** if you want.
2. **Do** commit **`.env.example`** (already in `server/.env.example`) so cloners know which variables exist.
3. On your PC: run Ollama, uvicorn, and a tunnel (below). Set **`TUTOR_API_KEY`** to a long random string on the PC when starting uvicorn.
4. Share **out of band** (email, Slack, password manager—not in Git):
   - Your **`FASTAPI_URL`** (e.g. `https://something.trycloudflare.com` — you can paste this in a private team doc or pinned message).
   - Your **`TUTOR_API_KEY`** (same value they put in their `.env.local` and you put in Vercel).
5. When you **change** the tunnel URL (common with free quick tunnels), tell everyone to update **`FASTAPI_URL`**.

---

## If you cloned the repo and want to use someone else's GPU

You do **not** run Ollama unless you want a fully local setup.

1. Copy **`.env.example`** → **`.env.local`** in the project root.
2. Fill in **Supabase** keys (from your own Supabase project, or the team's).
3. Set **`FASTAPI_URL`** to the URL the host gave you (HTTPS, no trailing slash).
4. Set **`TUTOR_API_KEY`** to the secret the host gave you (must match their PC).
5. Run **`npm install`** / **`pnpm install`**, then **`npm run dev`**. Chat requests go: your browser → your local Next.js → host's **`FASTAPI_URL`** → their GPU.

If the host has **not** set `TUTOR_API_KEY` on their server (insecure), leave **`TUTOR_API_KEY`** empty in `.env.local`.

---

## After you deploy (Vercel, etc.)

In the host dashboard, set **environment variables** (same as `.env.local` for production):

- `FASTAPI_URL`
- `TUTOR_API_KEY` (same as on the GPU PC)
- All `NEXT_PUBLIC_*` and server Supabase vars you already use

Redeploy after changing env vars.

---

## Flow

1. User (anywhere) → **Vercel / hosted Next.js** → `POST /api/chat` (Supabase auth + thread load).
2. Next.js server → **`FASTAPI_URL`** (HTTPS tunnel to your PC) → **FastAPI** → **Ollama (GPU)**.
3. Response returns through the same path.

## On your gaming PC (must stay on and reachable)

1. **Ollama** running with your model, e.g. `qwen2.5:14b-instruct`.
2. **FastAPI** listening on all interfaces:

   ```bash
   cd server
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Tunnel** so the internet can reach `localhost:8000` (pick one):

   - **Cloudflare Tunnel** (`cloudflared`) — stable if you use a named tunnel + domain.
   - **Cloudflare quick tunnel** — `cloudflared tunnel --url http://127.0.0.1:8000` (URL changes each run unless configured).
   - **Windows:** if `cloudflared` is "not recognized", the MSI often installs to `C:\Program Files (x86)\cloudflared\cloudflared.exe` without adding it to PATH. Run that full path, or add that folder to your user **Path** and open a new terminal.
   - **ngrok** — `ngrok http 8000` (paid plans get fixed subdomains).

4. **Lock the API** — set the same secret in two places:

   - PC (env before uvicorn): `TUTOR_API_KEY=<long random string>`
   - Hosted app (Vercel env): `TUTOR_API_KEY=<same string>`

   If `TUTOR_API_KEY` is **unset** on the PC, FastAPI accepts requests **without** a key (fine for localhost only; **do not** expose publicly without a key).

5. **Hosted env vars** (Vercel / etc.):

   - `FASTAPI_URL` = tunnel base, e.g. `https://your-tunnel.example.com` (no trailing slash).
   - `TUTOR_API_KEY` = same as on the PC.

## Health check

`GET {FASTAPI_URL}/health` — no key required. Response includes `tutor_auth_enabled: true` when `TUTOR_API_KEY` is set on the server.

## Limits

- PC must be **awake**; sleep breaks the tunnel.
- Home **upload bandwidth** caps concurrent users.
- **Latency** = RTT to your house + inference time.
- For production scale, move inference to a **cloud GPU** or a dedicated host; this pattern is best for **personal / small team** GPU use.
