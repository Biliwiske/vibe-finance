<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a7ce0b12-a5ba-409d-a038-07777748e7be

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and anon/public key
3. Run the app:
   `npm run dev`

## Supabase sync setup

1. Create a Supabase project and copy its Project URL and anon/public key from the API settings.
2. In Authentication settings, enable the Email provider.
3. In the Supabase SQL Editor, run the script in [`supabase-setup.sql`](./supabase-setup.sql).
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Restart the Vite dev server. Users can then register or sign in with email and password; guests keep data only in the current browser.
6. For Netlify deployments, add the same two variables in the site's environment-variable settings and trigger a new deploy.

The anon/public key is intended for browser use and is protected by the row-level security policy. Never put a Supabase service-role key in this frontend project.

## Deploy to GitHub Pages

1. Push this project to a GitHub repository named `vibe-finance`.
2. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are available in the shell that runs the deployment build (for local deployment, put them in `.env.local`).
3. Run `npm run deploy`. The `predeploy` script builds the app and `gh-pages` publishes `dist` to the `gh-pages` branch.
4. In GitHub, open **Settings → Pages** and select **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.
5. The site will be available at `https://<your-github-username>.github.io/vibe-finance/`.
