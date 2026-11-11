# BS4 Copy & Print Shop (UK)

An on-demand commercial document printing and courier delivery web application targeting the UK market, designed after leading print-on-demand services like Webcartridge.

---

## Project Structure

```
BS4copyandprintshop/
├── backend/                  # Node.js + Express + TypeScript + TypeORM (MySQL) + Redis
│   ├── src/
│   │   ├── config/           # Database, Redis, Cloudinary, Mailgun & UK Pricing Rules
│   │   ├── entities/         # TypeORM Entities (User, Address, Order, OrderItem, PrintConfig, DocumentFile)
│   │   ├── middlewares/      # JWT auth, upload inspection, error handlers
│   │   ├── modules/          # Auth, Documents, Pricing, Orders, Payments, In-House Admin
│   │   ├── utils/            # pdf-lib inspection & merging
│   │   └── index.ts          # Express API server entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS + pdfjs-dist
    ├── src/
    │   ├── components/       # Modern typographic logo, Navbar, Footer
    │   ├── pages/
    │   │   ├── LandingPage.tsx          # High-converting UK print studio landing page
    │   │   ├── CopyShopPage.tsx         # Interactive Webcartridge-style document configurator
    │   │   ├── CheckoutPage.tsx         # UK delivery address, guest / returning user checkout
    │   │   └── OrderConfirmationPage.tsx# Live in-house production tracker & receipt
    │   ├── lib/              # Formatting & utilities
    │   ├── App.tsx           # Router
    │   └── main.tsx
    └── package.json
```

---

## Features Built

### 1. High-Converting Landing Page (`/`)
- Hero section with clear value proposition: *"Upload your document. We print, bind & deliver straight to your door"*.
- Quick cost pills: *"From 6p / sheet"*, *"A4, A5 & A3 Formats"*, *"Wire & Spiral Binding"*, *"Next-Day UK Courier"*.
- Popular printing categories (Dissertations, Training Manuals, Legal Briefs, A3 Plans).
- Transparent UK price table by paper stock and color mode.
- Material breakdown: 80gsm Navigator, 100gsm Premium Silk, 300gsm Heavy Cardstock.

### 2. Interactive Document Configurator (`/copyshop`)
- **PDF Ingestion & Preflight:** Drag & drop multi-file uploader with instant client-side page counting and inspection powered by `pdfjs-dist`. Includes a 1-click sample button (`+ Load Sample PDF (36 Pgs)`) for rapid testing.
- **Specification Selectors:**
  - **Paper Size:** A4 (210×297mm), A5 (148×210mm), A3 (297×420mm).
  - **Paper Stock:** 80gsm Standard, 100gsm Silk, 300gsm Heavy Card.
  - **Colour Mode:** Black & White vs. Full Colour CMYK.
  - **Sides:** Double-Sided (Duplex) vs. Single-Sided (Simplex).
  - **Layout:** 1, 2, or 4 pages per sheet.
  - **Finishing & Binding:** None (loose sheets), Metal Wire/Spiral Bound, Stapled, 2-Hole & 4-Hole Punch.
  - **Covers:** Clear Acetate 200µ, Frosted Matt PVC, 300gsm Card.
- **Live Sticky Price Sidebar:** Real-time updates with sheet counts, per-copy rates, automatic bulk volume discounts (up to 20%), and UK delivery picker (£3.50 standard, £6.99 express, free delivery progress bar for orders over £30.00).

### 3. Frictionless Checkout (`/checkout`)
- **Returning User Detection:** Queries `/api/auth/check-email` to detect existing customers and attach orders to their account.
- **Guest Checkout:** Allows one-off ordering with an optional password checkbox to instantly create an account.
- **UK Delivery Address:** Postcode validation, delivery notes, and phone number for SMS tracking.
- **Payment Method Selection:** Stripe Credit/Debit Cards, Apple Pay, Google Pay, and PayPal.

### 4. Order Confirmation & Print Ticket (`/order-confirmation/:orderNumber`)
- Generates unique UK order number (`BS4-YYMMDD-XXXX`).
- Live production pipeline tracker (`Paid` $\rightarrow$ `Printing` $\rightarrow$ `Finishing` $\rightarrow$ `Dispatched`).
- Printable customer receipt and in-house print shop job tickets.

---

## How to Run in Development

### 1. Start the Backend API
```bash
cd backend
npm run dev
```
*API will run on `http://localhost:5000` (Health endpoint: `http://localhost:5000/health`).*

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```
*Frontend will run on `http://localhost:5173` (with `/api` proxied to port 5000).*
