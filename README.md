# Expense & Paycheck Planner

A comprehensive **React + Vite + Tailwind PWA** for managing bi-weekly paychecks, tracking expenses, and planning debt payoff strategies.

---

## Features

- Bi-weekly paycheck planning with A/B templates  
- Income and expense management with categories  
- Drag & drop expense management between pay periods  
- Debt payoff calculator (Avalanche & Snowball strategies)  
- Analytics dashboard for category breakdowns & monthly trends  
- Persistence: localStorage + optional JSON sync (desktop browsers)  
- CSV export for reports/backups  
- Installable PWA (works offline once loaded)  

---

## Quick Start (Local Development)

```bash
# install dependencies
npm install

# start dev server (http://localhost:5173)
npm run dev

# production build
npm run build

# preview production build (http://localhost:4173)
npm run preview
````

---

## Project Structure

```
public/                 # static assets (PWA icons, favicon, manifest)
src/
  App.jsx               # wrapper component
  ExpenseForm.jsx       # add/edit expense form
  ExpenseTrackingApp.jsx# main app (state, logic, UI)
  main.jsx              # React entry, registers service worker
  index.css             # Tailwind base styles
vite.config.js          # Vite + PWA config
tailwind.config.js      # Tailwind config
```

---

## Data Persistence

* **localStorage** → saves automatically per device/browser.
* **JSON file sync**:

  * On desktop Chrome/Edge: use **Connect JSON** to link a file inside iCloud Drive, Dropbox, Google Drive, or OneDrive. The app will auto-save changes there.
  * On iOS/Safari: use **Import/Export JSON** manually via the Files app.

> Your financial data never leaves your device or cloud drive. It is not stored on GitHub or any server.

---

## Deployment

Every push to `main` triggers GitHub Actions to build and deploy the site to GitHub Pages:

[https://pablomunmor.github.io/expense-tracker/](https://pablomunmor.github.io/expense-tracker/)

---

## Install as App

### iOS (Safari)

1. Open the site in Safari.
2. Tap **Share** → **Add to Home Screen**.

### Android (Chrome/Edge)

1. Open the site.
2. Tap **Install App** banner, or menu → **Add to Home Screen**.

### Desktop (Chrome/Edge)

1. Open the site.
2. Click the **Install** icon in the address bar.

---

## Key Dependencies

* React 19 – UI framework
* Vite 7 – dev server + bundler
* vite-plugin-pwa – PWA service worker + manifest
* Tailwind CSS 3 – styling
* lucide-react – icons

---

## License

MIT — feel free to fork and adapt.


---
