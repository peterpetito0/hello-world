# hello-world
This repository is for practicing the github flow
Hi, I'm a senior at FAU studying computer science. I am excited to learn about mobile apps in this course. I also play on the hockey team here.

## Weather app

A static weather app (`index.html`, `style.css`, `app.js`) powered by the free [Open-Meteo](https://open-meteo.com/) API (no API key needed). It defaults to **Boca Raton, FL** and includes:

- Current conditions, feels-like, humidity, wind, rain chance, UV index, sunrise/sunset
- 24-hour and 7-day forecasts
- City search (Open-Meteo geocoding), "use my location", and a °F/°C toggle (remembered in the browser)

### Login

The forecast is only shown after signing in with an email and password. Accounts are handled by [Supabase Auth](https://supabase.com/docs/guides/auth/passwords); the project URL and publishable key are the two `SUPABASE_` constants in `app.js`.

New accounts get a confirmation email. For its link to come back to the app, set **Authentication → URL Configuration → Site URL** in the Supabase dashboard to the address the app is served from.

### Run locally

Open `index.html` in a browser, or serve the folder: `npx serve .`.

### Deploy to Netlify

`netlify.toml` publishes the repo root with no build step. Either:

- **Git:** in Netlify, "Add new site → Import an existing project", pick this repo and the `main` branch. The settings in `netlify.toml` are picked up automatically.
- **Drag & drop:** drag this whole folder onto https://app.netlify.com/drop.
