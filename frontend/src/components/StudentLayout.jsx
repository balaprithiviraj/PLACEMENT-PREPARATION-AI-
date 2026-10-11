import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import AuroraBackground from './AuroraBackground.jsx';

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <AuroraBackground />
      <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <div className="mx-auto flex max-w-7xl items-start">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="page-enter w-full min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
