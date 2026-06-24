$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendRoot = Join-Path $ProjectRoot "frontend"
$FrontendSrc = Join-Path $FrontendRoot "src"

Write-Host ""
Write-Host "==============================="
Write-Host " blog_ink frontend setup"
Write-Host "==============================="
Write-Host ""

Write-Host "Step 1: Creating frontend folders..."
New-Item -ItemType Directory -Force $FrontendRoot | Out-Null
New-Item -ItemType Directory -Force $FrontendSrc | Out-Null

Write-Host "Step 2: Creating package.json..."
@'
{
  "name": "blog-ink-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0"
  },
  "dependencies": {
    "@stellar/stellar-sdk": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "typescript": "latest",
    "vite": "latest"
  }
}
'@ | Set-Content (Join-Path $FrontendRoot "package.json") -Encoding UTF8

Write-Host "Step 3: Creating index.html..."
@'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>blog_ink | Stellar Blog Tipping</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@ | Set-Content (Join-Path $FrontendRoot "index.html") -Encoding UTF8

Write-Host "Step 4: Creating tsconfig.json..."
@'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
'@ | Set-Content (Join-Path $FrontendRoot "tsconfig.json") -Encoding UTF8

Write-Host "Step 5: Creating vite.config.ts..."
@'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
'@ | Set-Content (Join-Path $FrontendRoot "vite.config.ts") -Encoding UTF8

Write-Host "Step 6: Creating src/main.tsx..."
@'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@ | Set-Content (Join-Path $FrontendSrc "main.tsx") -Encoding UTF8

Write-Host "Step 7: Creating temporary App.tsx..."
@'
import {
  CONTRACT_ID,
  NETWORK,
  STELLAR_EXPERT_CONTRACT_URL,
} from "./contractConfig";

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Stellar Testnet dApp</p>
        <h1>blog_ink</h1>
        <p>
          A paid blog-tipping ledger for authors and readers on Stellar.
        </p>

        <div className="contract-card">
          <span>Network</span>
          <strong>{NETWORK}</strong>
        </div>

        <div className="contract-card">
          <span>Contract ID</span>
          <code>{CONTRACT_ID}</code>
        </div>

        <a href={STELLAR_EXPERT_CONTRACT_URL} target="_blank">
          View contract on Stellar Expert
        </a>
      </section>
    </main>
  );
}
'@ | Set-Content (Join-Path $FrontendSrc "App.tsx") -Encoding UTF8

Write-Host "Step 8: Creating temporary App.css..."
@'
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #080b14;
  color: #f7f2e8;
}

a {
  color: #f6b44b;
}

.app-shell {
  min-height: 100vh;
  padding: 48px;
  display: grid;
  place-items: center;
}

.hero-card {
  width: min(920px, 100%);
  padding: 40px;
  border: 1px solid rgba(246, 180, 75, 0.25);
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(246, 180, 75, 0.16), rgba(255, 255, 255, 0.04));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}

.eyebrow {
  color: #f6b44b;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 13px;
  font-weight: 700;
}

h1 {
  margin: 8px 0 12px;
  font-size: clamp(44px, 8vw, 84px);
}

p {
  max-width: 680px;
  color: #d9d1c3;
  line-height: 1.7;
}

.contract-card {
  margin-top: 18px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 8px;
}

.contract-card span {
  color: #a9a191;
  font-size: 13px;
}

.contract-card code {
  overflow-wrap: anywhere;
  color: #f6b44b;
}

@media (max-width: 720px) {
  .app-shell {
    padding: 24px;
  }

  .hero-card {
    padding: 28px;
  }
}
'@ | Set-Content (Join-Path $FrontendSrc "App.css") -Encoding UTF8

$ContractConfigPath = Join-Path $FrontendSrc "contractConfig.ts"

if (-not (Test-Path $ContractConfigPath)) {
  Write-Host "Step 9: contractConfig.ts not found. Creating placeholder..."
@'
export const CONTRACT_ID = "PASTE_DEPLOYED_CONTRACT_ID_HERE";

export const NETWORK = "testnet";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const RPC_URL = "https://soroban-testnet.stellar.org";

export const STELLAR_EXPERT_CONTRACT_URL =
  "https://stellar.expert/explorer/testnet/contract/" + CONTRACT_ID;
'@ | Set-Content $ContractConfigPath -Encoding UTF8
} else {
  Write-Host "Step 9: contractConfig.ts already exists. Keeping deployed Contract ID."
}

Write-Host ""
Write-Host "Step 10: Installing npm dependencies..."
Set-Location $FrontendRoot
npm install

Write-Host ""
Write-Host "Step 11: Installing StellarWalletsKit..."
npx -y jsr add "@creit-tech/stellar-wallets-kit"

Write-Host ""
Write-Host "Step 12: Testing frontend build..."
npm run build

Write-Host ""
Write-Host "Frontend setup completed."
Write-Host "Important: Do not run this setup script again after App.tsx/App.css are manually upgraded."