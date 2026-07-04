# Accessing the Admin Login Page

The admin login is a separate entry point from the company user login. It targets the platform's internal console (`/auth/admin/login`) and is gated behind a feature flag.

## URL

```
http://localhost:5173/admin/login
```

The route is defined in `src/app/admin_.login.tsx:5`. The trailing underscore in the file name (`admin_.login.tsx`) is TanStack Router's convention for opting out of a parent layout — the URL has no `/admin` parent segment.

## Steps

1. **Start the dev server** from the project root:
   ```bash
   bun run dev
   ```
   Wait for the `VITE ready` line, then open the URL above in your browser.

2. **Open the URL directly** in your browser:
   ```
   http://localhost:5173/admin/login
   ```

   Or, from the regular login screen, click the admin entry link rendered at `src/app/-login.page.tsx:180` (`to="/admin/login"`).

3. **Confirm the flag is enabled.** The route runs `requireAdminConsoleEnabled()` in `beforeLoad` (`src/app/admin_.login.tsx:6`). If the `adminConsole` feature flag is off, you will be redirected away. Check the flag source for your environment and enable it if needed.

4. **Submit credentials.** The page calls `useAdminLogin()` from `@/auth/api`, which posts to `/auth/admin/login` on the backend. Use the admin credentials issued for the platform console — not a company user account.

## Troubleshooting

- **Redirected away from `/admin/login`** — the `adminConsole` feature flag is disabled for this build. Enable it in your environment config and reload.
- **404 on the URL** — make sure the dev server is running on port `5173` (configured in `vite.config.ts:40`). Other ports will not serve the route.
- **Build vs. dev** — in production (`bun run build` + static host), the same path is served by the SPA fallback. Configure your host to rewrite unknown paths to `/index.html`.

## Related Files

- `src/app/admin_.login.tsx` — route definition + guard
- `src/app/admin-login.page.tsx` — page component, form, and submit handler
- `src/app/-login.page.tsx:180` — link from the company login page
