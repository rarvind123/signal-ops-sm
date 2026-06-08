# SM — Admin Panel
## Cursor Brief

A password-protected admin panel accessible from the home page. Shows per-client usage stats, cost estimates, and credit alerts for Replicate and OpenRouter.

---

## PHASE 1 — ADMIN BUTTON + PASSWORD GATE

### 1A — Add admin button to page.tsx

**File:** `src/app/page.tsx`

Add a small "Admin" link in the header, far right:

```tsx
<header>
  <div className="flex items-center justify-between">
    <img src="/inventious-logo.png" ... />
    <div className="flex items-center gap-4">
      {step !== 'brand' && (
        <button type="button" onClick={handleStartOver} className="text-xs text-zinc-600 hover:text-zinc-400">
          ← Start over
        </button>
      )}
      <button
        type="button"
        onClick={() => setShowAdminPrompt(true)}
        className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
      >
        Admin
      </button>
    </div>
  </div>
</header>
```

Add state:
```tsx
const [showAdminPrompt, setShowAdminPrompt] = useState(false);
const [showAdmin, setShowAdmin] = useState(false);
const [adminPassword, setAdminPassword] = useState('');
const [adminError, setAdminError] = useState(false);
```

### 1B — Password modal

```tsx
{showAdminPrompt && !showAdmin && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80 flex flex-col gap-4">
      <h2 className="text-white text-sm font-medium">Admin access</h2>
      <input
        type="password"
        value={adminPassword}
        onChange={e => setAdminPassword(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            if (adminPassword === 'Mumbai') {
              setShowAdmin(true);
              setShowAdminPrompt(false);
              setAdminPassword('');
              setAdminError(false);
            } else {
              setAdminError(true);
            }
          }
          if (e.key === 'Escape') {
            setShowAdminPrompt(false);
            setAdminPassword('');
          }
        }}
        autoFocus
        placeholder="Password"
        className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
      />
      {adminError && <p className="text-red-400 text-xs">Incorrect password</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setShowAdminPrompt(false); setAdminPassword(''); setAdminError(false); }}
          className="flex-1 border border-zinc-700 rounded py-1.5 text-xs text-zinc-400"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (adminPassword === 'Mumbai') {
              setShowAdmin(true);
              setShowAdminPrompt(false);
              setAdminPassword('');
            } else {
              setAdminError(true);
            }
          }}
          className="flex-1 bg-violet-600 rounded py-1.5 text-xs text-white"
        >
          Enter
        </button>
      </div>
    </div>
  </div>
)}
```

### 1C — Render admin panel as overlay

```tsx
{showAdmin && (
  <AdminPanel onClose={() => setShowAdmin(false)} />
)}
```

---

## PHASE 2 — ADMIN API

### 2A — Stats endpoint

**File:** `src/app/api/admin/stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

// Cost constants
const COST_PER_IMAGE_USD = 0.04;     // Replicate FLUX 1.1 Pro
const COST_PER_SIGNALOPS_USD = 0.02; // OpenRouter Claude Sonnet estimate per run

export async function GET(req: Request) {
  // Simple auth check via header
  const auth = req.headers.get('x-admin-key');
  if (auth !== 'Mumbai') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Total generated assets
  const { data: assets, error: assetsError } = await supabase
    .from('sm_generated_assets')
    .select('id, status, created_at, request_id')
    .eq('status', 'done');

  // Total creative requests (= SignalOps runs)
  const { data: requests } = await supabase
    .from('sm_creative_requests')
    .select('id, client_id, created_at, status');

  // Clients
  const { data: clients } = await supabase
    .from('sm_clients')
    .select('id, name, created_at');

  // Per-client breakdown via join
  const { data: perClientRaw } = await supabase
    .from('sm_generated_assets')
    .select(`
      id,
      status,
      sm_creative_requests!inner(client_id)
    `)
    .eq('status', 'done');

  // Group by client
  const clientMap: Record<string, { name: string; images: number; signalops_runs: number }> = {};
  
  (clients ?? []).forEach(c => {
    clientMap[c.id] = { name: c.name, images: 0, signalops_runs: 0 };
  });

  (perClientRaw ?? []).forEach((a: any) => {
    const clientId = a.sm_creative_requests?.client_id;
    if (clientId && clientMap[clientId]) {
      clientMap[clientId].images += 1;
    }
  });

  (requests ?? []).forEach((r: any) => {
    if (r.client_id && clientMap[r.client_id]) {
      clientMap[r.client_id].signalops_runs += 1;
    }
  });

  const totalImages = (assets ?? []).length;
  const totalRequests = (requests ?? []).length;
  const totalClients = (clients ?? []).length;

  const totalImageCost = totalImages * COST_PER_IMAGE_USD;
  const totalSignalopsCost = totalRequests * COST_PER_SIGNALOPS_USD;
  const totalCost = totalImageCost + totalSignalopsCost;

  const clientStats = Object.entries(clientMap).map(([id, data]) => ({
    client_id: id,
    name: data.name,
    images_generated: data.images,
    signalops_runs: data.signalops_runs,
    estimated_cost_usd: (data.images * COST_PER_IMAGE_USD + data.signalops_runs * COST_PER_SIGNALOPS_USD).toFixed(2),
  })).sort((a, b) => b.images_generated - a.images_generated);

  return NextResponse.json({
    summary: {
      total_clients: totalClients,
      total_images_generated: totalImages,
      total_signalops_runs: totalRequests,
      total_cost_usd: totalCost.toFixed(2),
      image_cost_usd: totalImageCost.toFixed(2),
      signalops_cost_usd: totalSignalopsCost.toFixed(2),
    },
    per_client: clientStats,
  });
}
```

### 2B — Credit check endpoint

**File:** `src/app/api/admin/credits/route.ts`

```typescript
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = req.headers.get('x-admin-key');
  if (auth !== 'Mumbai') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alerts: Array<{ service: string; status: 'ok' | 'low' | 'critical' | 'unknown'; message: string }> = [];

  // Check Replicate
  try {
    const replicateRes = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (replicateRes.ok) {
      // Replicate doesn't expose balance via API — check by making a test call
      alerts.push({
        service: 'Replicate (FLUX)',
        status: 'ok',
        message: 'API key valid. Check billing at replicate.com/account/billing',
      });
    } else {
      alerts.push({
        service: 'Replicate (FLUX)',
        status: 'critical',
        message: `API key invalid or expired (HTTP ${replicateRes.status}). Renew at replicate.com/account/api-tokens`,
      });
    }
  } catch {
    alerts.push({ service: 'Replicate (FLUX)', status: 'unknown', message: 'Could not reach Replicate API' });
  }

  // Check OpenRouter
  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });
    if (orRes.ok) {
      const data = await orRes.json();
      const usage = data?.data?.usage ?? null;
      const limit = data?.data?.limit ?? null;
      const remaining = limit !== null && usage !== null ? limit - usage : null;

      if (remaining !== null && remaining < 2) {
        alerts.push({
          service: 'OpenRouter (SignalOps AI)',
          status: 'critical',
          message: `Credit nearly exhausted: $${remaining.toFixed(2)} remaining. Top up at openrouter.ai/credits`,
        });
      } else if (remaining !== null && remaining < 10) {
        alerts.push({
          service: 'OpenRouter (SignalOps AI)',
          status: 'low',
          message: `Credit running low: $${remaining.toFixed(2)} remaining. Consider topping up at openrouter.ai/credits`,
        });
      } else {
        const msg = remaining !== null
          ? `$${remaining.toFixed(2)} credit remaining`
          : 'API key valid';
        alerts.push({ service: 'OpenRouter (SignalOps AI)', status: 'ok', message: msg });
      }
    } else {
      alerts.push({
        service: 'OpenRouter (SignalOps AI)',
        status: 'critical',
        message: `API key invalid (HTTP ${orRes.status}). Check at openrouter.ai/keys`,
      });
    }
  } catch {
    alerts.push({ service: 'OpenRouter (SignalOps AI)', status: 'unknown', message: 'Could not reach OpenRouter API' });
  }

  // Check Supabase storage (simple health check)
  try {
    const { data: buckets, error } = await (await import('@/lib/supabase')).supabase.storage.listBuckets();
    if (error) throw error;
    const smBucket = buckets?.find(b => b.name === 'sm-assets');
    alerts.push({
      service: 'Supabase Storage',
      status: smBucket ? 'ok' : 'critical',
      message: smBucket ? 'sm-assets bucket active' : 'sm-assets bucket not found',
    });
  } catch {
    alerts.push({ service: 'Supabase Storage', status: 'unknown', message: 'Could not check storage' });
  }

  return NextResponse.json({ alerts });
}
```

---

## PHASE 3 — ADMIN PANEL COMPONENT

**File:** `src/components/sm/AdminPanel.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';

type ClientStat = {
  client_id: string;
  name: string;
  images_generated: number;
  signalops_runs: number;
  estimated_cost_usd: string;
};

type Summary = {
  total_clients: number;
  total_images_generated: number;
  total_signalops_runs: number;
  total_cost_usd: string;
  image_cost_usd: string;
  signalops_cost_usd: string;
};

type Alert = {
  service: string;
  status: 'ok' | 'low' | 'critical' | 'unknown';
  message: string;
};

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [clients, setClients] = useState<ClientStat[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, creditsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'x-admin-key': 'Mumbai' } }),
        fetch('/api/admin/credits', { headers: { 'x-admin-key': 'Mumbai' } }),
      ]);
      const stats = await statsRes.json();
      const credits = await creditsRes.json();
      setSummary(stats.summary);
      setClients(stats.per_client ?? []);
      setAlerts(credits.alerts ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  const statusColor: Record<string, string> = {
    ok:       'text-green-400 bg-green-500/10 border-green-500/20',
    low:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    unknown:  'text-zinc-400 bg-zinc-800 border-zinc-700',
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-10 px-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-semibold">Admin Panel</h1>
            <p className="text-zinc-500 text-sm">SignalOps — Inventious</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white text-sm">
            ✕ Close
          </button>
        </div>

        {loading ? (
          <div className="text-zinc-500 text-sm">Loading...</div>
        ) : (
          <>
            {/* Credit alerts */}
            {alerts.some(a => a.status !== 'ok') && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">⚠ Service Alerts</p>
                {alerts.filter(a => a.status !== 'ok').map(alert => (
                  <div key={alert.service} className={`border rounded-lg px-4 py-3 text-sm ${statusColor[alert.status]}`}>
                    <span className="font-medium">{alert.service}</span>
                    <span className="mx-2">—</span>
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            {/* All service statuses */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Service Status</p>
              <div className="grid grid-cols-3 gap-2">
                {alerts.map(alert => (
                  <div key={alert.service} className={`border rounded-lg px-3 py-2.5 ${statusColor[alert.status]}`}>
                    <p className="text-xs font-medium">{alert.service}</p>
                    <p className="text-xs opacity-70 mt-0.5">{alert.status.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Overview</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Clients', value: summary.total_clients },
                    { label: 'Images generated', value: summary.total_images_generated },
                    { label: 'SignalOps runs', value: summary.total_signalops_runs },
                    { label: 'Image cost', value: `$${summary.image_cost_usd}` },
                    { label: 'AI cost', value: `$${summary.signalops_cost_usd}` },
                    { label: 'Total cost', value: `$${summary.total_cost_usd}`, highlight: true },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className={`border rounded-lg px-4 py-3 ${stat.highlight ? 'border-violet-500/30 bg-violet-500/5' : 'border-zinc-700 bg-zinc-900'}`}
                    >
                      <p className="text-xs text-zinc-500">{stat.label}</p>
                      <p className={`text-lg font-semibold mt-0.5 ${stat.highlight ? 'text-violet-300' : 'text-white'}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-client breakdown */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Per Client</p>
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                      <th className="text-left px-4 py-2">Client</th>
                      <th className="text-right px-4 py-2">Images</th>
                      <th className="text-right px-4 py-2">SignalOps runs</th>
                      <th className="text-right px-4 py-2">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-zinc-600 text-xs text-center">No data yet</td>
                      </tr>
                    ) : clients.map(c => (
                      <tr key={c.client_id} className="border-b border-zinc-800/50 last:border-0">
                        <td className="px-4 py-2.5 text-white">{c.name}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">{c.images_generated}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">{c.signalops_runs}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">${c.estimated_cost_usd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-600">
                Cost estimate: $0.04/image (Replicate FLUX 1.1 Pro) + $0.02/SignalOps run (OpenRouter Claude Sonnet)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## COMMIT

```
feat(admin): password-protected admin panel — password: Mumbai
feat(admin/api): GET /api/admin/stats — per-client usage and cost estimates
feat(admin/api): GET /api/admin/credits — Replicate + OpenRouter + Supabase health checks
feat(admin/ui): AdminPanel component with alerts, summary, and per-client table
feat(admin): admin button in header, password modal gate
```
