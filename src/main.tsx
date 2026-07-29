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
import { ExerciseListPage } from '@/pages/ExerciseListPage'
import { ExerciseUploadPage } from '@/pages/ExerciseUploadPage'
import { ExerciseDoPage } from '@/pages/ExerciseDoPage'
import { VocabListPage } from '@/pages/VocabListPage'
import { PracticePage } from '@/pages/PracticePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { QuestionBankPage } from '@/pages/QuestionBankPage'

// Áp theme trước khi render để tránh nháy màu. Mặc định: tối.
document.documentElement.classList.toggle(
  'dark',
  window.localStorage.getItem('ui:theme') !== 'light'
)

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
          <Route path="/vocab" element={<VocabListPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/exercises" element={<ExerciseListPage />} />
          <Route path="/questions" element={<QuestionBankPage />} />
          <Route path="/exercises/upload" element={<ExerciseUploadPage />} />
          <Route path="/exercises/:id" element={<ExerciseDoPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SpeechSettingsProvider>
  </StrictMode>,
)
