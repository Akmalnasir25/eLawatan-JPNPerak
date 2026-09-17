import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PembekalAuth } from '@/lib/auth'
import { App } from './App'
import { BanerDemo } from '@/komponen/BanerDemo'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PembekalAuth>
        <App />
        <BanerDemo />
      </PembekalAuth>
    </BrowserRouter>
  </React.StrictMode>,
)
