import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppLayout } from '@/components/AppLayout'
import { SpeechSettingsProvider } from '@/hooks/useSpeechSettings'
import { IpaExplorerPage } from '@/pages/IpaExplorerPage'
import { IpaComparePage } from '@/pages/IpaComparePage'
import { IpaDetailPage } from '@/pages/IpaDetailPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpeechSettingsProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<App />} />
            <Route path="/ipa" element={<IpaExplorerPage />} />
            <Route path="/ipa/compare" element={<IpaComparePage />} />
            <Route path="/ipa/:id" element={<IpaDetailPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SpeechSettingsProvider>
  </StrictMode>,
)
