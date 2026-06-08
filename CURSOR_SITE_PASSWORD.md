# SM — Site-Wide Password Gate
## Cursor Brief

All pages require password "arvind123" before access. Uses Next.js middleware + a cookie. The admin password "Mumbai" is separate and still required after site login.

---

## STEP 1 — MIDDLEWARE

**File:** `src/middleware.ts` (new file at project root, same level as `src/`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SITE_PASSWORD = 'arvind123';
const COOKIE_NAME = 'sm_site_auth';
const LOGIN_PATH = '/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip: login page itself, API routes, static files
  if (
    pathname === LOGIN_PATH ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/inventious-logo')
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const auth = request.cookies.get(COOKIE_NAME);
  if (auth?.value === SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## STEP 2 — LOGIN PAGE

**File:** `src/app/login/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = searchParams.get('from') ?? '/';
      router.push(from);
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Logo */}
        <Image
          src="/inventious-logo.png"
          alt="inventious"
          width={200}
          height={60}
          className="h-10 w-auto object-contain"
          priority
        />

        {/* Password form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          {error && (
            <p className="text-red-400 text-xs text-center">Incorrect password</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-white hover:bg-zinc-100 disabled:opacity-40 text-black rounded-xl py-3 text-sm font-medium transition-colors"
          >
            {loading ? 'Entering...' : 'Enter →'}
          </button>
        </form>

        <p className="text-zinc-700 text-xs">
          ✦ SignalOps Creative Engine
        </p>
      </div>
    </div>
  );
}
```

---

## STEP 3 — LOGIN API ROUTE

**File:** `src/app/api/auth/login/route.ts`

```typescript
import { NextResponse } from 'next/server';

const SITE_PASSWORD = 'arvind123';
const COOKIE_NAME = 'sm_site_auth';

export async function POST(req: Request) {
  const body = await req.json();
  
  if (body.password !== SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  
  response.cookies.set(COOKIE_NAME, SITE_PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
```

---

## STEP 4 — LOGOUT (optional, add to admin panel)

**File:** `src/app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('sm_site_auth');
  return response;
}
```

In the admin panel, add a logout button:
```tsx
<button
  type="button"
  onClick={async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }}
  className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
>
  Log out
</button>
```

---

## HOW IT WORKS

1. User visits `signal-ops-sm.vercel.app`
2. Middleware checks for `sm_site_auth` cookie
3. If missing/wrong → redirected to `/login`
4. User types "arvind123" → POST to `/api/auth/login`
5. API sets httpOnly cookie for 30 days
6. User redirected back to original page
7. All future requests pass through middleware with valid cookie

The admin panel still requires "Mumbai" separately after site login.

---

## COMMIT

```
feat(auth): site-wide password gate — password: arvind123
feat(auth): Next.js middleware checks sm_site_auth cookie on every request
feat(auth): /login page with inventious branding
feat(auth/api): POST /api/auth/login — sets httpOnly cookie on correct password
feat(auth/api): POST /api/auth/logout — clears cookie
feat(admin): add logout button to admin panel
```
