import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { ToastContainer } from '@/components/common';
import { Dashboard, Editor, Execution, Results, History, Settings } from '@/pages';

function App() {
  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <ToastContainer position="top-right" />
      
      <Routes>
        {/* All routes wrapped in MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/execution" element={<Execution />} />
          <Route path="/execution/:id" element={<Execution />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
