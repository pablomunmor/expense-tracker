# Expense & Paycheck Planner

A comprehensive **React + Vite + Tailwind PWA** for managing bi-weekly paychecks, tracking expenses, and planning debt payoff strategies.

---

## Features

- Bi-weekly paycheck planning with A/B templates
- Income and expense management with categories
- **Partial payment support** for expenses
- **Undo functionality** for accidental moves or payments
- **Sortable expense lists** (by due date or amount)
- **Responsive mobile UI** with a hamburger menu
- Debt payoff calculator (Avalanche & Snowball strategies)
- Analytics dashboard for category breakdowns & monthly trends
- Persistence: localStorage + optional JSON sync (desktop browsers)
- CSV export for reports/backups
- Installable PWA (works offline once loaded)
- **Comprehensive onboarding tour** for new users

---

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/pablomunmor/expense-tracker.git

# 2. Navigate to the project directory
cd expense-tracker

# 3. Install dependencies
npm install

# 4. Start the development server (http://localhost:5173)
npm run dev

# 5. Production build
npm run build

# 6. Preview production build (http://localhost:4173)
npm run preview
```

---

## Project Structure

```
public/                 # Static assets (PWA icons, favicon, manifest)
src/
  App.jsx               # Main wrapper component
  ExpenseForm.jsx       # Add/edit expense form
  ExpenseTrackingApp.jsx# Core application (state, logic, UI)
  PaycheckCalculator.jsx# Standalone tool for estimating take-home pay
  main.jsx              # React entry point, registers service worker
  index.css             # Tailwind base styles
vite.config.js          # Vite + PWA configuration
tailwind.config.js      # Tailwind CSS configuration
```

---

## Data Persistence

* **localStorage** → saves automatically per device/browser.
* **JSON file sync**:

  * On desktop Chrome/Edge: use **Connect Sync** to link a file inside a cloud-synced folder (like iCloud Drive, Dropbox, or Google Drive). The app will auto-save changes.
  * On iOS/Safari/Other Browsers: use **Sync** → **Download Data** and **Upload Data** to manually transfer your financial plan.

> Your financial data never leaves your device or your chosen cloud drive. It is not stored on any third-party server.

---

## Deployment

The application is deployed to GitHub Pages.

---

## Install as App

### iOS (Safari)

1. Open the site in Safari.
2. Tap **Share** → **Add to Home Screen**.

### Android (Chrome/Edge)

1. Open the site.
2. Tap the **Install App** banner, or go to menu → **Add to Home Screen**.

### Desktop (Chrome/Edge)

1. Open the site.
2. Click the **Install** icon in the address bar.

---

## Key Dependencies

* React 19 – UI framework
* Vite 7 – Dev server + bundler
* vite-plugin-pwa – PWA service worker + manifest
* Tailwind CSS 3 – Styling
* lucide-react – Icons

---

## Created By

This application was created by **Pablo Munoz**.
[www.pablocmunoz.com](https://www.pablocmunoz.com)

---

## License

MIT — feel free to fork and adapt.
