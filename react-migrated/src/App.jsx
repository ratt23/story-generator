import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { StoryProvider } from './context/StoryContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Workspace } from './components/Preview/Workspace';
import { BrochureGenerator } from './components/Brochure/BrochureGenerator';
import { ExecutiveBrochureGenerator } from './components/Brochure/ExecutiveBrochureGenerator';
import { TarifApp } from './components/Tarif/TarifApp';
import { WelcomeBoard } from './components/WelcomeBoard/WelcomeBoard';
import { ExecutiveStoryGenerator } from './components/ExecutiveStory/ExecutiveStoryGenerator';
import { ExecutiveDailyStoryGenerator } from './components/ExecutiveDailyStory/ExecutiveDailyStoryGenerator';
import { AdminLayout } from './components/Layout/AdminLayout';
import { ChangelogPage } from './components/Changelog/ChangelogPage';

// Layout for Story Generator (has internal Sidebar)
const StoryLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <StoryProvider>
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-[#dfe3e7] overflow-hidden">
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="flex-1 relative overflow-hidden bg-slate-50">
            <Workspace />
            {/* Floating Toggle for Story Sidebar on Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute bottom-4 right-4 md:hidden z-30 p-3 bg-[#1e3a8a] text-white rounded-full shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
            </button>
          </main>
        </div>
      </div>
    </StoryProvider>
  );
};

function App() {
  return (
    <HashRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<StoryLayout />} />
          <Route path="/executive-schedule" element={<ExecutiveDailyStoryGenerator />} />
          <Route path="/executive-card" element={<ExecutiveStoryGenerator />} />
          <Route path="/executive-story" element={<ExecutiveStoryGenerator />} />
          <Route path="/brochure" element={<BrochureGenerator />} />
          <Route path="/executive-brochure" element={<ExecutiveBrochureGenerator />} />
          <Route path="/welcome" element={<WelcomeBoard />} />
          <Route path="/changelog" element={<ChangelogPage />} />
        </Routes>
      </AdminLayout>
    </HashRouter>
  );
}

export default App;
