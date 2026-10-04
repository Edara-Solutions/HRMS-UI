# Accessing the Platform portal

Start the UI with `bun run dev` and visit `/platform/login` on its reported local port. Set `VITE_ENABLE_PLATFORM_PORTAL=true` before starting Vite. A disabled portal returns the same limited not-found surface as an unknown route.

Platform credentials call the generated `POST /api/v1/platform/auth/login` contract, followed by Platform `/me` identity validation. Company credentials and storage are independent. There is no legacy namespace alias or redirect.

The shell is branded **Edara Platform — Operations Console**. Current routes include authentication, dashboard recovery, and `/platform/me/profile`, `/platform/me/security`, and `/platform/me/sessions`. Notifications and business workflows are deliberately not mounted until their owning contract migration slices are complete.

Presentation preferences use `hrms-preferences:v2`; sidebar and notification style are scoped by audience and user public ID. Only locale and theme migrate globally from old preferences.

This intermediate split-tier migration is nondeployable until the parent epic's final removal/reachability gate. Frozen business source and explicitly deferred E2E fixtures are retained for their owning slices, not advertised as supported workflows.
