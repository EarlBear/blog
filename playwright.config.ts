import { defineConfig, devices } from '@playwright/test';

// E2E for the internal comment layer. We serve the INTERNAL build via `astro preview` so the
// CommentLayer + the dev-auth-token integration are live and the audience is 'internal'. The
// comment UI's Supabase calls are route-intercepted per-test (the anchoring/allowlist claims are
// pure DOM; a seeded-comments fixture is served for the marker/thread assertions), so the suite
// is hermetic and never touches the real prod table.
const PORT = 4345;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Internal build + preview so CommentLayer renders and data-audience='internal'.
    command: `PUBLIC_AUDIENCE=internal npm run build && npx astro preview --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PUBLIC_AUDIENCE: 'internal',
      // Dummy Supabase values so getSupabase() is non-null and the layer wires up; every Supabase
      // request is route-intercepted per-test, so these never reach a real backend.
      PUBLIC_SUPABASE_URL: 'https://pw.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_pw_dummy',
    },
  },
});
