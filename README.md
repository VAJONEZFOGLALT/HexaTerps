# HexaTerps

Cannabis product catalog and order API with a React storefront.

## Stack

- **Backend:** NestJS, Prisma, MySQL (TiDB Cloud)
- **Frontend:** React + Vite

## Security

- Helmet, CORS locked to `FRONTEND_ORIGIN`, request body size limits
- Global validation (`whitelist` / `forbidNonWhitelisted`)
- Rate limiting (120 req / 60s per IP)
- Admin routes protected by `ADMIN_TOKEN` (timing-safe compare)
- `.env` is gitignored — never commit credentials

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, FRONTEND_ORIGIN, ADMIN_TOKEN (16+ random chars)

npm install
npx prisma db push
npx prisma db seed
npm run start:dev
```

Place import HTML at `backend/data/hexaterps.html` (or your file path), then:

```bash
npm run import:hexaterps -- --file ./data/hexaterps.html --yes
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

API base URL defaults to same host; set `VITE_API_BASE_URL` if needed.

## API (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List categories |
| GET | `/api/categories/:id` | Category detail |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/cannabinoids` | List cannabinoids |
| POST | `/api/orders` | Create order |

Admin mutations live under `/api/admin/*` and require `Authorization: Bearer <ADMIN_TOKEN>` or `X-Admin-Token`.

## Deploy on Vercel

- Frontend: https://hexa-terps.vercel.app (`frontend/`)
- Backend: https://hexa-terps-backend.vercel.app (`backend/`)

Step-by-step: see [VERCEL.md](./VERCEL.md).
