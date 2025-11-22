
import React from 'react';

interface SidebarProps {
  activeTab: 'dashboard' | 'database' | 'chat' | 'checklist';
  setActiveTab: (tab: 'dashboard' | 'database' | 'chat' | 'checklist') => void;
  onOpenSettings: () => void;
  isOwner: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenSettings, isOwner }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
    ) },
    { id: 'database', label: 'Reg. Database', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
    ) },
    { id: 'checklist', label: 'DIA TMF Reference Model Country Requirements', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
    ) },
    { id: 'chat', label: 'AI Assistant', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
    ) },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-20">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="AIDE Logo" 
            className="h-10 w-auto object-contain rounded-lg" 
            onError={(e) => {
              // Fallback if image fails
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          {/* Custom SVG Fallback Logo (Teal Beaker) */}
          <div className="hidden w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
             <svg viewBox="0 0 512 512" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad-sidebar" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#2dd4bf" />
                    <stop offset="1" stopColor="#0891b2" />
                  </linearGradient>
                </defs>
                <rect width="512" height="512" rx="0" fill="url(#logo-grad-sidebar)" />
                <path d="M160 416h192c17.67 0 32-14.33 32-32s-6.5-24.6-16.8-36.5L288 256V128h32V96H192v32h32v128L144.8 347.5C134.5 359.4 128 366.3 128 384s14.33 32 32 32z" fill="white" stroke="white" strokeWidth="20" strokeLinejoin="round"/>
                <path d="M168 368h176" stroke="#0891b2" strokeWidth="20" strokeLinecap="round" strokeOpacity="0.3" />
             </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">AIDE-RegGenie</h1>
        </div>
        <p className="text-xs text-slate-400 mt-2">Healthcare Regulatory Intelligence</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 flex flex-col overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
              activeTab === item.id
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
            <span className="font-medium text-sm leading-tight flex-1 whitespace-normal break-words">{item.label}</span>
          </button>
        ))}

        {/* Spacer to push Settings to bottom of nav list */}
        <div className="flex-1"></div>

        {/* Settings Button - Only visible to Owner */}
        {isOwner && (
          <div className="pt-2 border-t border-slate-800 mt-auto">
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white group"
            >
              <svg className="w-5 h-5 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span className="font-medium">Settings</span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-green-400 font-semibold">System Operational</span>
          </div>
          <div className="text-xs text-slate-500">
            v2.1.0 • Database Online
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
