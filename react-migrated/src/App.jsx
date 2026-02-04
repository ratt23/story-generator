import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoryProvider } from './context/StoryContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Workspace } from './components/Preview/Workspace';
import { BrochureGenerator } from './components/Brochure/BrochureGenerator';
import { TarifApp } from './components/Tarif/TarifApp';
import { WelcomeBoard } from './components/WelcomeBoard/WelcomeBoard';
import { AdminLayout } from './components/Layout/AdminLayout';

// Layout for Story Generator (has internal Sidebar)
const StoryLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <StoryProvider>
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-[#dfe3e7] overflow-hidden">
        {/* Adjusted height and margins to fit in MainContent */}
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="flex-1 relative overflow-hidden bg-slate-50">
            {/* Add a toggle for the INTERNAL sidebar somewhere? 
                 Maybe top right of workspace or specialized header? 
                 For now, let's assume Sidebar is always visible on Desktop or toggled via internal controls.
                 The main AdminLayout TopBar doesn't control this sidebar. 
             */}
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
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<StoryLayout />} />
          <Route path="/brochure" element={<BrochureGenerator />} />
          <Route path="/welcome" element={<WelcomeBoard />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}

export default App;
