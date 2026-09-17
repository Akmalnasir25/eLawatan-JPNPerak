import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PembekalAuth } from '@/lib/auth'
import { App } from './App'
import { BanerDemo } from '@/komponen/BanerDemo'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
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
