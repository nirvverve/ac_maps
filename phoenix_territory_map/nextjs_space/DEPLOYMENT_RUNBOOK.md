# Deployment Runbook

> Phoenix Territory Map — Next.js 14 / PostgreSQL / NextAuth

## Quick start

```bash
cd phoenix_territory_map/nextjs_space
touch .env.local                    # fill in values (see §2)
bun install
bunx prisma generate
bunx prisma migrate deploy
bunx prisma db seed
bun run build
bun run start                       # http://localhost:3000
```

---

## 1. Prerequisites

| Requirement | Minimum version |
|-------------|----------------|
| Node.js / Bun | Node 20+ or Bun 1.x |
| PostgreSQL | 14+ |
| Google Maps API key | Maps JavaScript + Geocoding APIs enabled |
| Resend account | For email verification codes |

---

## 2. Environment variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pw@host:5432/db` |
| `NEXTAUTH_URL` | Canonical app URL (no trailing slash) | `https://maps.example.com` |
| `NEXTAUTH_SECRET` | JWT signing key — generate with `openssl rand -base64 32` | (random) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key (sent to browser) | `AIzaSy…` |
| `RESEND_API_KEY` | Resend API key for verification emails | `re_…` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_GEOCODING_API_KEY` | (falls back to public key) | Server-side geocoding key |
| `GOOGLE_MAPS_API_KEY` | (falls back to public key) | Secondary server-side key |
| `DATASTORE_BACKEND` | `local` | Storage backend: `local`, `vercel-blob`, `s3`, `memory` |
| `LOCAL_STORAGE_DIR` | `./data` | Path when using local backend |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob token (when backend = `vercel-blob`) |
| `BLOB_FOLDER` | `territory-data` | Blob prefix |
| `AWS_REGION` | `us-east-1` | S3 region (when backend = `s3`) |
| `AWS_ACCESS_KEY_ID` | — | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | — | S3 credentials |
| `S3_BUCKET` | — | S3 bucket name |
| `S3_PREFIX` | `territory-data` | S3 key prefix |
| `NEXT_DIST_DIR` | `.next` | Build output directory |
| `NEXT_OUTPUT_MODE` | — | Set to `standalone` for Docker |

### Template

```bash
# .env.local
NODE_ENV=production
NEXTAUTH_URL=https://maps.example.com
NEXTAUTH_SECRET=           # openssl rand -base64 32
DATABASE_URL=postgresql://user:pw@host:5432/territory_map
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
RESEND_API_KEY=re_...
DATASTORE_BACKEND=local
```

---

## 3. Database setup

### Schema

The Prisma schema defines a single `User` model with role-based access
(`ADMIN`, `LEVEL2`, `LEVEL1`). See `prisma/schema.prisma`.

### Migrate and seed

```bash
bunx prisma migrate deploy      # apply migrations
bunx prisma db seed              # create pre-provisioned users
```

The seed script (`scripts/seed.ts`) creates one admin and 15 staff
accounts (email only, no password). Users self-register via the
`/register` page after email verification.

---

## 4. Build and run

### With Bun (recommended)

```bash
bun install
bun run build
bun run start          # port 3000
```

> Note: This project uses **Bun** for dependency management and scripts.

---

## 5. Vercel deployment

```bash
vercel link
# Set env vars in Vercel Dashboard → Settings → Environment Variables
vercel deploy --prod
```

Post-deploy:
```bash
vercel env pull
bunx prisma migrate deploy
bunx prisma db seed
```

Notes:
- Set `DATASTORE_BACKEND=vercel-blob` and provide `BLOB_READ_WRITE_TOKEN`.
- Serverless function timeout is 60 s; large uploads may need Vercel Pro.
- Upload max file size is 10 MB (enforced in `app/api/admin/upload/route.ts`).

---

## 6. Docker deployment

```dockerfile
FROM oven/bun:1.1.27
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
ENV NEXT_OUTPUT_MODE=standalone
RUN bunx prisma generate && bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

```bash
docker build -t territory-map .
docker run -p 3000:3000 --env-file .env.local territory-map
```

---

## 7. Authentication flow

1. **Admin provisions user** — POST `/api/admin/users` (admin-only).
2. **User visits `/register`** — enters email, requests verification code.
3. **Verification email sent** — 6-digit code via Resend, 15-min expiry.
4. **User verifies** — POST `/api/auth/verify-code`.
5. **User sets password** — POST `/api/auth/register` (min 9 chars, 1 uppercase, 1 special).
6. **Login** — `/login` page → NextAuth credentials provider → JWT session.

Password hashing: bcryptjs, 10 salt rounds.

---

## 8. API endpoints

### Auth (public)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth sign-in, session |
| `/api/auth/send-verification` | POST | Send email code |
| `/api/auth/verify-code` | POST | Verify email code |
| `/api/auth/register` | POST | Set password |

### Data (authenticated)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/data/[location]/[dataType]` | GET | Serve territory/density/route JSON |
| `/api/scenarios` | GET | List scenarios |
| `/api/scenarios` | POST | Create scenario (admin only) |
| `/api/scenarios/[id]` | GET/PUT | Read or update a scenario |

### Admin (admin role only)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/users` | GET/POST | List or create users |
| `/api/admin/upload` | POST | Upload CSV/XLSX data |

### Other

| Route | Method | Rate limit |
|-------|--------|------------|
| `/api/zip-boundaries` | POST | 30 req / 60 s |

Supported locations: `arizona`, `miami`, `dallas`, `jacksonville`,
`orlando`, `portcharlotte`.

---

## 9. Rate limiting

| Category | Limit | Window |
|----------|-------|--------|
| Auth routes | 10 requests | 15 min |
| Admin upload | 5 requests | 60 s |
| ZIP boundaries | 30 requests | 60 s |

Implementation: in-memory sliding window per IP (`lib/rate-limit.ts`).
Resets on server restart.

---

## 10. Data refresh

After running the Python pipeline (see `pipeline/README.md`), copy
outputs into the app:

```bash
# From project root
cp Phoenix_Zip_Code_Map_Data.json \
   phoenix_territory_map/nextjs_space/public/

cp Tucson_Zip_Code_Map_Data.json \
   phoenix_territory_map/nextjs_space/public/

# Or upload via the admin UI at /admin → Upload Data
```

Alternatively, use the admin upload endpoint directly:
```bash
curl -X POST https://maps.example.com/api/admin/upload \
  -H "Cookie: next-auth.session-token=..." \
  -F "file=@territory-data.csv" \
  -F "location=arizona" \
  -F "dataType=territory"
```

---

## 11. Domain and TLS

- Set `NEXTAUTH_URL` to the production domain (with `https://`).
- Vercel handles TLS automatically.
- For self-hosted, use a reverse proxy (nginx, Caddy) to terminate TLS
  and proxy to port 3000.

Example nginx:
```nginx
server {
    listen 443 ssl;
    server_name maps.example.com;

    ssl_certificate     /etc/letsencrypt/live/maps.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maps.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 12. Pre-deployment checklist

- [ ] `NEXTAUTH_SECRET` generated fresh (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` reachable from deploy target
- [ ] Google Maps API key valid with Maps JS + Geocoding enabled
- [ ] Resend API key valid; sender domain verified
- [ ] `bun run build` passes with zero TypeScript errors
- [ ] `bunx prisma migrate deploy` succeeds
- [ ] Seed users created
- [ ] Login flow works end-to-end
- [ ] Admin upload accepts a test CSV
- [ ] Rate limiting returns 429 after limit exceeded

---

## 13. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `NEXTAUTH_SECRET` error on startup | Generate and export: `export NEXTAUTH_SECRET=$(openssl rand -base64 32)` |
| DB connection refused | Verify `DATABASE_URL` format and network access; test with `psql "$DATABASE_URL" -c "SELECT 1"` |
| Google Maps shows "For development purposes only" | Check API key restrictions and billing in Google Cloud Console |
| Verification email not arriving | Check Resend dashboard for failures; confirm sender domain is verified |
| 429 Too Many Requests | Wait for window to expire; rate limits reset on server restart |
| Port Charlotte routes return 400 | Use lowercase `portcharlotte` in API calls (matches normalization) |
