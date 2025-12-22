import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoryProvider } from './context/StoryContext';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Workspace } from './components/Preview/Workspace';
import { BrochureGenerator } from './components/Brochure/BrochureGenerator';
import { TarifApp } from './components/Tarif/TarifApp';

// Layout for Story Generator (has Sidebar)
const StoryLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <StoryProvider>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="flex-1 relative overflow-hidden bg-slate-200">
            <Workspace />
          </main>
        </div>
        {/* Mobile Menu Trigger Logic is inside Header, but Header is outside. 
                     We need to pass the toggle state up? 
                     Actually simpler: Keep Header inside specific layouts if buttons depend on it, 
                     OR use a global context for UI state.
                     For now, I'll render Header in App and pass a setter. 
                     Wait, Header is outside Routes. It needs to communicate with StoryLayout. 
                     
                     Solution: Lift sidebar state to App? No, Sidebar is only for Story.
                     Let's use a "Outlet" approach or just simple composition.
                 */}
      </div>
      {/* We need a way to open sidebar from Header if on mobile. 
                I will pass a custom context or just hack it by using an Outlet context or simple prop passing 
                if I restructure. 
                
                Simpler: Just render Header inside StoryLayout?
                But then navigating between apps feels disconnected.
                
                I will make Header accept `onMenuClick` but it only works if current route is /.
            */}
    </StoryProvider>
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        <Routes>
          <Route path="/" element={
            <StoryProvider>
              <div className="flex flex-1 h-[calc(100vh-64px)] overflow-hidden relative">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="flex-1 relative overflow-hidden bg-slate-200">
                  <Workspace />
                </main>
              </div>
            </StoryProvider>
          } />
          <Route path="/brochure" element={<BrochureGenerator />} />
          <Route path="/tarif" element={<TarifApp />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
