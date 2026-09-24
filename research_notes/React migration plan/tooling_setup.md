# React Migration Tooling Setup

## Key Question 1: Minimal Vite + React Scaffold (package.json scripts, vite.config.js with proxy)

### Takeaway
Use `npm create vite@latest` with the `react` template (no TypeScript). The `vite.config.js` proxy option forwards `/api/*` requests to `http://localhost:3001` during development, eliminating CORS issues without any backend changes.

### Cited Findings
- Scaffold command for plain JavaScript React: `npm create vite@latest my-app -- --template react` (then select "JavaScript" when prompted, or the `--template react` flag picks it automatically without the TypeScript variant) — [Vite Getting Started](https://vite.dev/guide/)
- Default `package.json` scripts after scaffolding: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"` — [Vite Getting Started](https://vite.dev/guide/)
- Proxy is configured in `vite.config.js` under `server.proxy`. Type is `Record<string, string | ProxyOptions>`. Requests whose path starts with the key are forwarded to the target — [Vite Server Options](https://vite.dev/config/server-options.html)
- Key proxy sub-options: `target` (destination URL), `changeOrigin` (rewrites the Host header to match target), `rewrite` (path transform function), `ws` (WebSocket proxying), `secure` (certificate validation) — [Vite Server Options](https://vite.dev/config/server-options.html)
- String shorthand is valid: `'/api': 'http://localhost:3001'` proxies all `/api/*` calls to the backend without a `changeOrigin` or `rewrite` option needed when paths are identical — [Vite Server Options](https://vite.dev/config/server-options.html)
- Proxy only works during development (`vite` dev server). In production the built files are served by Express directly, so proxy config has no production effect — [GeeksforGeeks Vite Proxy Guide](https://www.geeksforgeeks.org/reactjs/how-to-configure-proxy-in-vite/)

**Minimal `vite.config.js` for this project:**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
})
```

(The `build` section is covered in Key Question 4 below.)

**Minimal `client/package.json` scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Inferences
- Because the backend already runs on port 3001 and all API routes are prefixed `/api/`, the simplest proxy config is the one-line string form `'/api': 'http://localhost:3001'` — no `changeOrigin` or `rewrite` required since paths are identical.
- `vite preview` is only for previewing the production build locally; it should not be used as the production server.

### Gaps
- None. All information sourced from the official Vite documentation.

---

## Key Question 2: Where Should the React Source Live — `frontend/` or `client/`?

### Takeaway
Convention is `client/` or `frontend/` alongside `backend/`; both are common. Given this project already has `backend/`, using `client/` keeps the symmetry and is the most widely seen pattern in full-stack Express + React repos.

### Cited Findings
- Common folder structure in documented full-stack Vite + Express examples uses `frontend/` alongside `backend/`: [Joel Spriggs Full-Stack Guide](https://www.joelspriggs.com/kickstarting-your-full-stack-journey-with-react-vite-and-express/)
- The `client/` name is also widely used as the symmetric counterpart to `server/` or `backend/` in MERN stack repos — [Medium Full-Stack Guide](https://medium.com/@saadamir1/full-stack-web-development-connecting-react-frontend-to-express-backend-8b7c699a7ebf)
- npm workspaces monorepos often put packages under `apps/frontend` and `apps/backend`, but that level of indirection is unnecessary here — [Setting up npm Workspaces](https://johnh.co/blog/setting-up-npm-workspaces-for-a-monorepo)

**Recommended folder structure for this project:**

```
habbit-tracker/
├── backend/                  # existing Express + MongoDB server
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── client/                   # NEW — Vite + React source
│   ├── src/
│   │   ├── main.jsx          # React entry point
│   │   ├── App.jsx
│   │   └── components/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── public/                   # built output (or rename to dist/ — see Q5)
├── docs/
└── research_notes/
```

### Inferences
- Placing the Vite project root at `client/` means `vite.config.js` lives at `client/vite.config.js` and all relative `outDir` paths are relative to that root.
- The `index.html` stays at the project root of the Vite project (`client/`), which is standard Vite behavior (Vite treats `index.html` as front-and-center at the project root, not in `public/`).

### Gaps
- No authoritative style guide mandates `client/` over `frontend/`; both are valid. The choice is purely conventional.

---

## Key Question 3: Build Output Path and Express Static Serving

### Takeaway
Set `build.outDir` in `vite.config.js` to point at the directory Express already serves as static files. The default is `dist`; it can be changed to any path, including `../public` (relative to the `client/` project root), so Express needs no changes.

### Cited Findings
- `build.outDir` type is `string`, default `'dist'`. The path is relative to the project root (i.e. relative to where `vite.config.js` lives) — [Vite Build Options](https://vite.dev/config/build-options.html)
- `build.emptyOutDir` controls whether Vite clears the output folder before building. It is enabled by default when `outDir` is inside the project root, but **must be explicitly set `true`** when `outDir` is outside the project root (which is the case when outputting to `../public`) — [Vite Build Options](https://vite.dev/config/build-options.html)
- The built output contains an `index.html`, hashed `.js` and `.css` files, and an `assets/` subdirectory — [Hands on React Build & Deploy](https://handsonreact.com/docs/build-deploy)
- `build.assetsDir` defaults to `'assets'`; assets are nested under this subdirectory inside `outDir` — [Vite Build Options](https://vite.dev/config/build-options.html)

**In `client/vite.config.js`:**

```js
build: {
  outDir: '../public',   // relative to client/ → outputs to habbit-tracker/public/
  emptyOutDir: true      // required because outDir is outside the Vite project root
}
```

After `npm run build` from `client/`, Express's existing line:

```js
app.use(express.static(path.join(__dirname, '../public')));
```

continues to work with zero changes. The `index.html` and hashed assets are served exactly as the old vanilla files were.

### Inferences
- Pointing `outDir` at `../public` means `npm run build` replaces the old vanilla JS files. Keep the old `public/` files in a git branch or backup before the first React build.
- `emptyOutDir: true` is important so stale vanilla JS files from the old `public/` don't remain alongside the new React build artifacts.

### Gaps
- None on this point.

---

## Key Question 4: Changes Needed in `backend/server.js`

### Takeaway
Two changes are needed in production: (1) the `express.static()` path may need updating if the output dir is renamed, and (2) a SPA catch-all fallback route must be added after all API routes to serve `index.html` for any path that doesn't match a file or API endpoint — this is required for React Router to work on page reload or deep links.

### Cited Findings
- Without a catch-all, a user who reloads at `/habits/123` gets a 404 from Express because that path has no matching file — the route only exists in React Router client-side code — [DhiWise React Router 404 Guide](https://www.dhiwise.com/post/a-comprehensive-guide-to-fixing-react-router-refresh-404)
- The canonical Express 4 pattern: place `app.use(express.static(...))` first, then API routes, then a `app.get('*', ...)` catch-all that sends `index.html` — [SPA Server Gist](https://gist.github.com/ryanoglesby08/1e1f49d87ae8ab2cabf45623fc36a7fe)
- Express 5 broke the bare `'*'` wildcard — it requires named-wildcard syntax `'/*splat'`. The current project uses **Express 4.x** (`"express": "^4.22.2"` in `backend/package.json`), so `app.get('*', ...)` is valid — [GitHub PR noting Express 5 change](https://github.com/zackwag/iptv-catalog/pull/63)
- The catch-all **must** be placed after all API routes and after `express.static()` middleware so that actual API 404s (unknown `/api/` paths) are not swallowed and returned as `index.html` — [DEV Community SPA 404 guide](https://dev.to/buildandcodewithraman/how-to-fix-cannot-get-route-errors-in-single-page-applications-spas-with-static-servers-3460)

**Updated `backend/server.js` additions (minimal diff):**

```js
// existing static middleware stays as-is:
app.use(express.static(path.join(__dirname, '../public')));

// ADD this catch-all AFTER all API routes and the static middleware:
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
```

Important ordering in `server.js`:
1. `app.use(express.json())` — body parser
2. `app.use('/api/auth', authRouter)` — API routes (all `/api/*`)
3. `app.use('/api/habits', ...)`, `app.use('/api/categories', ...)`, `app.use('/api/dashboard', ...)`
4. `app.use(express.static(...))` — serve built React assets
5. `app.get('*', ...)` — SPA fallback (last, after everything)

### Inferences
- Since the project uses Express 4.x, `app.get('*', ...)` syntax is safe. If Express is ever upgraded to v5, this must be changed to `app.get('/*splat', ...)`.
- The catch-all should check that the request path does not start with `/api/` before sending `index.html`, as a safety measure to avoid masking backend 404s from broken API calls. A simple guard: `if (req.path.startsWith('/api/')) { return res.status(404).json({ error: 'Not found' }); }` before `sendFile`.

### Gaps
- None on the Express 4 pattern. The Express 5 named-wildcard change is documented but not yet relevant since the project pins ^4.22.2.

---

## Key Question 5: Keep `public/` or Rename to `dist/`?

### Takeaway
Rename the output directory to `dist/` and update `server.js` accordingly. This is Vite's convention (`dist` is the default `outDir`), it prevents confusion between source assets and build output, and it avoids having to fight Vite's `emptyOutDir` guard. Only a one-line change in `server.js` is needed.

### Cited Findings
- Vite's default `build.outDir` is `'dist'` — [Vite Build Options](https://vite.dev/config/build-options.html)
- `build.emptyOutDir` defaults to `true` only when `outDir` is inside the Vite project root; it must be explicitly set when `outDir` is outside (as with `../public`) — [Vite Build Options](https://vite.dev/config/build-options.html)
- The output directory contains hashed, production-optimized bundles that should not be committed to git or edited manually, making a distinct `dist/` name (gitignored) cleaner than reusing `public/` — [Vite Static Deploy Guide](https://vite.dev/guide/static-deploy)
- Express `express.static()` accepts any path, so changing from `'../public'` to `'../dist'` in `server.js` is a one-line update — [Express Static File Serving](https://gist.github.com/ryanoglesby08/1e1f49d87ae8ab2cabf45623fc36a7fe)

**Recommendation: use `dist/` at the project root.**

In `client/vite.config.js`:
```js
build: {
  outDir: '../dist',
  emptyOutDir: true
}
```

In `backend/server.js` change:
```js
// before:
app.use(express.static(path.join(__dirname, '../public')));
// after:
app.use(express.static(path.join(__dirname, '../dist')));
// and in catch-all:
res.sendFile(path.join(__dirname, '../dist', 'index.html'));
```

Add to `.gitignore` at project root:
```
/dist/
```

The old `public/` directory (containing the original vanilla JS files) should be removed once the React migration is complete, or kept under a different name as a reference.

### Inferences
- Using `dist/` with the default `outDir` value means `emptyOutDir` defaults to `true` naturally when `dist/` is inside the `client/` folder. However, since we want `dist/` at the project root (not inside `client/`), `emptyOutDir: true` still needs to be set explicitly.
- An alternative: keep `outDir: 'dist'` (relative, no `../`) and place the Vite project root at the project root level. This is simpler but mixes frontend source with the project root. Given that `backend/` already exists there, keeping `client/` as a subdirectory is cleaner.

### Gaps
- None material.

---

## Key Question 6: Root `package.json` — Workspaces or Just Scripts?

### Takeaway
For this project's size (one backend, one frontend), a lightweight root `package.json` with plain npm scripts using `concurrently` is the pragmatic choice. npm workspaces add little benefit here and would require restructuring the existing `backend/` package.

### Cited Findings
- npm workspaces require a single root `package-lock.json` and `workspaces` array in root `package.json`; all sub-packages must be under declared paths — [Setting up npm Workspaces](https://johnh.co/blog/setting-up-npm-workspaces-for-a-monorepo)
- `concurrently` is a widely-used dev dependency for running multiple npm scripts simultaneously from a single root command — [Monorepo with concurrently](https://medium.com/@sushanshakya77/monorepo-setup-using-yarn-workspaces-lerna-and-concurrently-dc055b970eea)
- Root-level scripts can use `cd <dir> && npm run <script>` or `npm run --workspace=<pkg> <script>` format — [DEV Community Monorepo](https://dev.to/yeasiin/unleash-the-power-of-the-monorepo-frontend-backend-living-together-o01)
- `concurrently` is a dev dependency only; it is not needed in production and does not violate the "no new backend dependencies" rule if installed at the root level (not inside `backend/`) — sourced from conventions.md + project constraints

**Recommended root `package.json`:**

```json
{
  "name": "habit-tracker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:client\"",
    "dev:backend": "cd backend && npm start",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "start": "cd backend && npm start"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

- `npm run dev` — starts Express on port 3001 and Vite dev server concurrently (Vite proxies `/api/*` to 3001)
- `npm run build` — runs `vite build`, outputs to `../dist`
- `npm start` — production: Express serves the pre-built `dist/` directory

**Note:** This root `package.json` is separate from `backend/package.json`. The `concurrently` dev dependency lives only at the root and is never required by the Express server code.

### Inferences
- npm workspaces would be appropriate if there were shared utility packages between frontend and backend. For this project there are none, so the simpler `concurrently` approach is preferable.
- A `client/package.json` will need `"dependencies": { "react": "^18.x", "react-dom": "^18.x" }` and `"devDependencies": { "vite": "^5.x", "@vitejs/plugin-react": "^4.x" }`. These live entirely inside `client/` and do not touch `backend/package.json`.

### Gaps
- Exact version numbers for React 18 / Vite 5 / @vitejs/plugin-react are current as of mid-2025; verify with `npm create vite@latest` output at migration time as minor versions will have advanced.
