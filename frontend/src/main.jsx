import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { preloadAllChunks } from './lib/lazyRoutes'

// Kick off route-chunk preloading immediately so no navigation ever waits on
// a dynamic import. Cost (~40 KB gzipped across both roles) is absorbed while
// the login/bootstrap path renders.
void preloadAllChunks()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
