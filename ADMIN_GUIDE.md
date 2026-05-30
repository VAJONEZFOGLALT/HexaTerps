# HexaTerps Admin Setup Guide

## Database Reset

To reset the database while keeping all tables intact:

```bash
cd backend
npx tsx scripts/reset-db.ts
```

This will:
- Delete all orders and order items
- Delete all products and their cannabinoid relations
- Delete all categories
- Delete all cannabinoids
- Keep the table structure intact

**Note:** The tables and indices remain, only the data is cleared.

---

## Admin Panel Access

### 1. Set Admin Token

First, set your `ADMIN_TOKEN` in `backend/.env`:

```env
ADMIN_TOKEN=your_secret_token_here
```

### 2. Access Admin Panel

- Open the frontend at `http://localhost:5173` (or your deployment URL)
- Click the 🛡️ shield icon in the top-right header
- Enter your admin token and login
- You'll be redirected to the admin dashboard

### 3. Add Products Manually

The admin panel allows you to:

#### Category Management
- **Dropdown Mode**: Select from existing categories in a dropdown
- **Custom Mode**: Type a new category name (will be created on product creation)
  - Click the "Dropdown" / "Custom" toggle buttons to switch modes

#### Product Fields
- **Name**: Product name (required)
- **Category**: Choose or create (required)
- **Strain**: Sativa, Indica, or Hybrid
- **Price**: Product price in CZK (required)
- **Stock**: Quantity available
- **Image**: Image URL (optional)
- **Featured**: Mark as featured product
- **Cannabinoids**: Add multiple cannabinoids with percentages

#### Cannabinoid Management
- Click **+ Add** to add a cannabinoid entry
- Select cannabinoid from dropdown (e.g., HHC, Δ⁹-THC, CBD)
- Enter percentage (0-100)
- Click **✕** to remove

---

## Backend Admin API (for direct requests)

All requests require the `x-admin-token` header.

### Create Product

```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your_secret_token_here" \
  -d '{
    "name": "Purple Punch D9",
    "categoryId": 2,
    "strain": "INDICA",
    "price": "349.00",
    "stock": 15,
    "image": "https://...",
    "featured": false,
    "cannabinoids": [
      {
        "cannabinoidId": 1,
        "percentage": "75.5"
      },
      {
        "cannabinoidId": 3,
        "percentage": "10.0"
      }
    ]
  }'
```

### Update Product

```bash
curl -X PATCH http://localhost:3000/api/admin/products/1 \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your_secret_token_here" \
  -d '{
    "name": "Updated Product Name",
    "price": "399.00",
    "stock": 20
  }'
```

### Delete Product

```bash
curl -X DELETE http://localhost:3000/api/admin/products/1 \
  -H "x-admin-token: your_secret_token_here"
```

### Get All Cannabinoids

```bash
curl http://localhost:3000/api/cannabinoids
```

### Get All Categories

```bash
curl http://localhost:3000/api/categories
```

---

## Available Cannabinoids

The system comes with these base cannabinoids pre-seeded (if needed):
- HHC
- Δ⁹-THC (D9)
- CBD
- CBG
- CBC
- CBN
- THCv
- THCa
- HHCP
- H4CBD
- PPB
- HP
- Terpenes

---

## Workflow

1. **Reset Database**: `npx tsx scripts/reset-db.ts`
2. **Start Backend**: `npm run start:dev`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Access Admin**: Click 🛡️ in header
5. **Add Products**: Fill form and submit
6. **View Shop**: Click "HexaTerps" brand or go to `/`

---

## API Response Example

When you create a product, you'll get back:

```json
{
  "id": 1,
  "name": "Purple Punch D9",
  "categoryId": 2,
  "category": {
    "id": 2,
    "name": "D9/D9+Other cannabinoids blends"
  },
  "strain": "INDICA",
  "price": "349.00",
  "stock": 15,
  "image": "https://...",
  "featured": false,
  "description": null,
  "flavour": null,
  "createdAt": "2025-05-30T...",
  "updatedAt": "2025-05-30T...",
  "cannabinoids": [
    {
      "productId": 1,
      "cannabinoidId": 1,
      "percentage": "75.50",
      "cannabinoid": {
        "id": 1,
        "name": "Δ⁹-THC"
      }
    }
  ]
}
```

---

## Troubleshooting

**"Admin access not configured"**
- Make sure `ADMIN_TOKEN` is set in `backend/.env`
- Restart the backend server

**"Invalid admin token"**
- Token in header doesn't match env variable
- Check for typos and whitespace
- Token is case-sensitive

**Category not found**
- When using custom category mode, category is created automatically on product submission
- If creation fails, check the network response for errors

**Products not showing on shop page**
- Make sure they have `stock > 0`
- Clear browser cache/localStorage if needed
- Check that the category exists

---

## Next Steps

Once you have products added:
1. You can edit stock/price via PATCH endpoints
2. Featured products appear first in the shop
3. Frontend will display cannabinoids in order: base → terpenes → minors → other
4. Stock is managed per-product (can set to 0 to hide)
