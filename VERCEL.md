# Deploy HexaTerps on Vercel

Two separate Vercel projects from the same GitHub repo.

| App | Root directory | Production URL |
|-----|----------------|----------------|
| Frontend | `frontend` | https://hexa-terps.vercel.app |
| Backend | `backend` | https://hexa-terps-backend.vercel.app |

## 1. Backend project

1. [vercel.com/new](https://vercel.com/new) → Import **HexaTerps** repo.
2. **Root Directory:** `backend`
3. Framework: **Other** (uses `backend/vercel.json`).
4. **Environment variables** (copy from `backend/.env.vercel.example`):

   | Variable | Value |
   |----------|--------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Your TiDB connection string |
   | `FRONTEND_ORIGIN` | `https://hexa-terps.vercel.app` |
   | `ADMIN_TOKEN` | Long random secret (16+ chars) |

5. Deploy. Smoke test: `https://hexa-terps-backend.vercel.app/api/categories`

### Custom domain later

In Vercel → backend project → Domains, add e.g. `api.hexaterps.yourtld`.

Update **frontend** `VITE_API_BASE_URL` and redeploy frontend.

Update **backend** `FRONTEND_ORIGIN` (comma-separated):

```env
FRONTEND_ORIGIN=https://hexa-terps.vercel.app,https://hexaterps.yourtld
```

## 2. Frontend project

1. New Vercel project → same repo.
2. **Root Directory:** `frontend`
3. Framework: **Vite** (uses `frontend/vercel.json`).
4. Production API URL is already in `frontend/.env.production`:

   ```env
   VITE_API_BASE_URL=https://hexa-terps-backend.vercel.app
   ```

5. Deploy. Open https://hexa-terps.vercel.app

### Custom domain later

Add `hexaterps.yourtld` in the frontend Vercel project, then add that URL to backend `FRONTEND_ORIGIN` (see above).

## TiDB Cloud

Allow Vercel outbound traffic: either disable IP allowlist or add Vercel’s IP ranges for your plan.

## Notes

- Database is already populated locally; production uses the same `DATABASE_URL` — no re-import unless you use a new DB.
- Do not set `ADMIN_TOKEN` on the frontend project.
- `frontend/.env.production` is safe to commit (public API URL only).
