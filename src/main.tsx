import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PembekalAuth } from '@/lib/auth'
import { App } from './App'
import { BanerDemo } from '@/komponen/BanerDemo'
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
