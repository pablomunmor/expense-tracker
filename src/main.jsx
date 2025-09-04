// src/main.jsx
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// import { registerSW } from 'virtual:pwa-register'
// registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
