# Deploying UAMS to Vercel

The UAMS Frontend is built with **Next.js 14 App Router** and functions as a full-stack serverless deployment on Vercel with direct Supabase connectivity and NVIDIA NIM AI integration.

---

## 1. Import Repository into Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your repository (`harlyndigitalpartners` or `UAMS`).
3. If importing the full monorepo, configure the **Root Directory**:
   - Set **Root Directory** to: `UAMS/frontend` (or `frontend` if the repository root is `UAMS`).

---

## 2. Environment Variables in Vercel

In your Vercel Project Settings under **Environment Variables**, add the following keys:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_NAME` | `University Administration Management System` | Application Title |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cfoytcugkwgdxvjehplk.supabase.co` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Public Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Admin / Server Service Role Key |
| `JWT_SECRET` | `7f3a9c2e8b1d6f405a7e3c9b2d8f6140c5e9a3b7d1f8264e9b0c3a5d7f2e8146` | Cryptographic JWT signing key |
| `ENABLE_DEMO_AUTH` | `true` | Allows instant demo logins for all 7 RBAC roles |
| `NVIDIA_API_KEY` | `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` | NVIDIA NIM AI API Key |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` | NVIDIA NIM API Endpoint |
| `NVIDIA_MODEL` | `meta/llama-3.2-11b-vision-instruct` | Active Llama 3.2 NIM Model |

---

## 3. Build & Output Settings

Vercel will automatically detect:
- **Framework Preset**: Next.js
- **Build Command**: `next build` (or `npm run build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`

---

## 4. Verification Check

Once deployed, visit your Vercel URL:
- Access `/login` to log in with any role (Super Admin, Registrar, Lecturer, Finance Officer, Student).
- Open `/dashboard/ai` to interact with the **UAMS AI Academic Advisor**.
- Test M-Pesa statements, course catalogs, student grade records, and exam clearance cards.
