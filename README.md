# DataAct Frontend

Frontend dashboard built with **React + TypeScript + TailwindCSS**.

---

## Features

- Secure HTTPS communication with Strapi backend via a local proxy
- API authentication using custom `X-API-KEY` header
- Interactive chart interface (ECharts) displaying country-level initiatives
- Responsive tooltips and mobile fallback for accessibility
- Modular and typed architecture (custom hooks, reusable components, typed API)

---

## Tech Stack

- React (Vite)
- TypeScript
- Tailwind CSS
- ECharts for React
- Node.js (Express proxy server for secure communication)

---

## Environment Configuration

The project uses environment variables for secure configuration:

- Frontend: `.env` at the root of the project
- Backend proxy: `.env` inside `src/server/`

> Example files are provided:
>
> - `.env.example` (frontend)
> - `src/server/.env.example` (backend)

Make sure to **rename and fill in** these files with your actual values.  
The `VITE_API_KEY` (frontend) and `API_KEY` (backend) must match exactly to allow secure communication.

---

## Generate HTTPS Certificates

To enable local HTTPS (required for secure backend communication), generate self-signed certificates:

```bash
cd src/server
mkdir certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/data-act.git
cd data-act
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Create environment files

```bash
cp .env.example .env
cp src/server/.env.example src/server/.env
```

Edit both `.env` files and fill in your actual values.

### 4. Generate HTTPS certificates (if not done yet)

```bash
cd src/server
mkdir certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365
```

### 5. Start the backend proxy server

```bash
cd src/server
npm install
npm start
```

You should see:

```
  Proxy HTTPS launched at https://localhost:4000
```

### 6. Start the frontend app

```bash
cd ../..
npm run dev
```

Access your dashboard at [http://localhost:5173](http://localhost:5173)

---

