# hello-world
This repository is for practicing the github flow
Hi, I'm a senior at FAU studying computer science. I am excited to learn about mobile apps in this course. I also play on the hockey team here.

## Weather app

A static weather app (`index.html`, `style.css`, `app.js`) powered by the free [Open-Meteo](https://open-meteo.com/) API (no API key needed). It defaults to **Boca Raton, FL** and includes:

- Current conditions, feels-like, humidity, wind, rain chance, UV index, sunrise/sunset
- 24-hour and 7-day forecasts
- City search (Open-Meteo geocoding), "use my location", and a °F/°C toggle (remembered in the browser)

### Run locally

Open `index.html` in a browser, or serve the folder: `npx serve .`.

### Deploy to Netlify

`netlify.toml` publishes the repo root with no build step. Either:

- **Git:** in Netlify, "Add new site → Import an existing project", pick this repo and the `main` branch. The settings in `netlify.toml` are picked up automatically.
- **Drag & drop:** drag this whole folder onto https://app.netlify.com/drop.
