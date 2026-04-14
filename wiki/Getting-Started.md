# Getting Started

## Prerequisites

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **Azure subscription** with:
  - Azure AD / Entra ID tenant
  - Azure Blob Storage account
  - App Registration with App Roles configured

## Azure Setup

### 1. Create App Registration

Register an application in Azure AD with:
- **Redirect URI**: `http://localhost:5173` (SPA type)
- **App Roles**: Define `SkillAdmin` and `SkillUser` roles
- **API Scope**: `api://{client-id}/Skills.ReadWrite`

### 2. Create Blob Storage

- Create a Storage Account
- Create a container named `skills-container`
- Assign `Storage Blob Data Contributor` role to your identity
- Assign `Storage Blob Delegator` role (needed for SAS URL generation)

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt   # for testing
```

### Configure Environment

Copy the example env file and fill in your Azure values:

```bash
cp .env.example .env
```

Required variables in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `BLOB_ACCOUNT_URL` | Blob Storage account URL | `https://myaccount.blob.core.windows.net` |
| `BLOB_ACCOUNT_NAME` | Storage account name | `myaccount` |
| `BLOB_CONTAINER_NAME` | Container name | `skills-container` |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_AD_CLIENT_ID` | App Registration client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_AD_AUDIENCE` | API audience URI | `api://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:5173"]` |

### Run Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/api/health`

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### Configure Environment

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `VITE_AZURE_AD_TENANT_ID` | Same Azure AD tenant ID |
| `VITE_AZURE_AD_CLIENT_ID` | Same App Registration client ID |
| `VITE_API_BASE_URL` | Backend URL (default: uses Vite proxy) |

### Run Frontend

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

## Verify Setup

1. Open `http://localhost:5173` in your browser
2. You should see the Azure AD login redirect
3. After login, the Skills list page should load
4. If you have the `SkillAdmin` role, you'll see the "New Skill" button
5. Create a test skill to verify Blob Storage connectivity

## Project Scripts

### Backend

```bash
# Run server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# Run tests with coverage
pytest --cov=app
```

### Frontend

```bash
# Development server
npm run dev

# Type checking
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```
