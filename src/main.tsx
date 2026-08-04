import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppLayout } from '@/components/AppLayout'
import { SpeechSettingsProvider } from '@/hooks/useSpeechSettings'
import { IpaExplorerPage } from '@/pages/IpaExplorerPage'
import { IpaComparePage } from '@/pages/IpaComparePage'
import { IpaDetailPage } from '@/pages/IpaDetailPage'
import { ChunkReaderPage } from '@/pages/ChunkReaderPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
// Từ vựng
import { VocabHomePage } from '@/pages/vocab/VocabHomePage'
import { CollectionDetailPage } from '@/pages/vocab/CollectionDetailPage'
import { VocabListPage } from '@/pages/VocabListPage'
import { PracticePage } from '@/pages/PracticePage'
import { ReviewPage } from '@/pages/ReviewPage'
// Bài tập
import { ExerciseHomePage } from '@/pages/exercises/ExerciseHomePage'
import { ExerciseCollectionPage } from '@/pages/exercises/ExerciseCollectionPage'
import { ExerciseListPage } from '@/pages/ExerciseListPage'
import { ExerciseUploadPage } from '@/pages/ExerciseUploadPage'
import { ExerciseEditorPage } from '@/pages/exercises/ExerciseEditorPage'
import { ExerciseDoPage } from '@/pages/ExerciseDoPage'
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

            <Route path="/chunks" element={<ChunkReaderPage />} />

            {/* Từ vựng — duyệt như thư mục, mọi chế độ học nằm bên trong */}
            <Route path="/vocab" element={<VocabHomePage />} />
            <Route path="/vocab/words" element={<VocabListPage />} />
            <Route path="/vocab/practice" element={<PracticePage />} />
            <Route path="/vocab/review" element={<ReviewPage />} />
            {/* splat: slug có thể dạng đường dẫn, vd "thpt-2026/idioms" */}
            <Route path="/vocab/c/*" element={<CollectionDetailPage />} />

            {/* Bài tập — cũng duyệt theo thư mục */}
            <Route path="/exercises" element={<ExerciseHomePage />} />
            <Route path="/exercises/all" element={<ExerciseListPage />} />
            <Route path="/exercises/questions" element={<QuestionBankPage />} />
            <Route path="/exercises/upload" element={<ExerciseUploadPage />} />
            <Route path="/exercises/new" element={<ExerciseEditorPage />} />
            <Route path="/exercises/:id/edit" element={<ExerciseEditorPage />} />
            <Route path="/exercises/c/*" element={<ExerciseCollectionPage />} />
            <Route path="/exercises/:id" element={<ExerciseDoPage />} />

            {/* Đường dẫn cũ */}
            <Route path="/practice" element={<Navigate to="/vocab/practice" replace />} />
            <Route path="/review" element={<Navigate to="/vocab/review" replace />} />
            <Route path="/questions" element={<Navigate to="/exercises/questions" replace />} />

            {/* Không khớp route nào — hiện lối ra thay vì trang trắng */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SpeechSettingsProvider>
  </StrictMode>,
)
