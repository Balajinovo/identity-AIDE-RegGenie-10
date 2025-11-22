
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RegulatoryDatabase from './components/RegulatoryDatabase';
import ChatAssistant from './components/ChatAssistant';
import DocumentChecklist from './components/DocumentChecklist';
import { RegulationEntry, DatabaseFilters } from './types';
import { getAllRegulations, saveRegulation, updateRegulationInDb } from './services/dbService';

const LoginScreen = ({ onLogin }: { onLogin: (isOwner: boolean) => void }) => {
  const [activeTab, setActiveTab] = useState<'guest' | 'admin'>('guest');
  const [accessCode, setAccessCode] = useState('');
  const [confirmCode, setConfirmCode] = useState(''); // For registration
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Check if admin code is already set in local storage
    const storedCode = localStorage.getItem('aide_admin_code');
    if (storedCode) {
      setIsRegistered(true);
    }
  }, []);

  const handleAdminLogin = () => {
     const storedCode = localStorage.getItem('aide_admin_code');
     
     // If valid code exists in storage, check against it
     if (storedCode && accessCode.trim() === storedCode) {
         onLogin(true);
     } 
     // Fallback: If not registered yet (shouldn't happen due to UI logic, but for safety), allow 'admin'
     else if (!storedCode && accessCode.trim() === 'admin') {
         // Auto-register 'admin' if they use the fallback
         localStorage.setItem('aide_admin_code', 'admin');
         onLogin(true);
     }
     else {
         setError('Invalid Access Code');
     }
  };

  const handleRegistration = () => {
     if (accessCode.trim().length < 4) {
         setError('Code must be at least 4 characters');
         return;
     }
     if (accessCode !== confirmCode) {
         setError('Codes do not match');
         return;
     }
     
     localStorage.setItem('aide_admin_code', accessCode.trim());
     setIsRegistered(true);
     onLogin(true);
  };

  const handleReset = () => {
      if (window.confirm("Are you sure you want to reset the Admin Access Code? You will need to create a new one to access system settings.")) {
          localStorage.removeItem('aide_admin_code');
          setIsRegistered(false);
          setAccessCode('');
          setConfirmCode('');
          setError('');
      }
  };

  const handleGuestAccess = () => {
      onLogin(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === 'admin') {
          if (isRegistered) handleAdminLogin();
          else handleRegistration();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
         <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-cyan-600 blur-3xl filter"></div>
         <div className="absolute top-40 right-20 w-72 h-72 rounded-full bg-teal-600 blur-3xl filter"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        
        <div className="p-8 pb-6 text-center border-b border-slate-100 bg-slate-50/50">
           <div className="flex justify-center mb-4">
             {/* Custom SVG Logo (Teal Beaker) */}
             <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 transition-transform hover:scale-105">
               <svg viewBox="0 0 512 512" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="logo-grad-login" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#2dd4bf" />
                      <stop offset="1" stopColor="#0891b2" />
                    </linearGradient>
                  </defs>
                  <rect width="512" height="512" rx="0" fill="url(#logo-grad-login)" />
                  <path d="M160 416h192c17.67 0 32-14.33 32-32s-6.5-24.6-16.8-36.5L288 256V128h32V96H192v32h32v128L144.8 347.5C134.5 359.4 128 366.3 128 384s14.33 32 32 32z" fill="white" stroke="white" strokeWidth="20" strokeLinejoin="round"/>
                  <path d="M168 368h176" stroke="#0891b2" strokeWidth="20" strokeLinecap="round" strokeOpacity="0.3" />
               </svg>
             </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">AIDE-RegGenie</h2>
          <p className="text-slate-500 text-sm">Regulatory Intelligence Platform</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('guest')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'guest' ? 'bg-white text-cyan-600 border-b-2 border-cyan-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                Guest Access
            </button>
            <button 
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'admin' ? 'bg-white text-slate-800 border-b-2 border-slate-800' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
                Admin Panel
            </button>
        </div>

        <div className="p-8 bg-white flex-1">
            {activeTab === 'guest' ? (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-slate-600 text-center mb-8 leading-relaxed">
                        Access the public regulatory dashboard, latest news, and compliance tools directly. No registration required for individual use.
                    </p>
                    <button 
                        onClick={handleGuestAccess}
                        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold py-4 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all shadow-lg shadow-cyan-200 flex items-center justify-center gap-3 group"
                    >
                        <span>Enter Public Portal</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </button>
                    <p className="text-xs text-slate-400 mt-6 text-center">
                        Limited to read-only access for system settings.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                    {!isRegistered ? (
                        <>
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 items-start">
                                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800">Setup Admin Access</h4>
                                    <p className="text-xs text-amber-700 mt-1">No admin configured. Please create a secure access code.</p>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Create Access Code</label>
                                <input 
                                    type="password" 
                                    placeholder="Enter new code" 
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm bg-slate-50 focus:bg-white"
                                    value={accessCode}
                                    onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Confirm Access Code</label>
                                <input 
                                    type="password" 
                                    placeholder="Re-enter code" 
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm bg-slate-50 focus:bg-white"
                                    value={confirmCode}
                                    onChange={(e) => { setConfirmCode(e.target.value); setError(''); }}
                                    onKeyDown={handleKeyDown}
                                />
                                {error && <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</p>}
                            </div>
                            <button 
                                onClick={handleRegistration}
                                className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                <span>Register & Login</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-600 text-sm mb-6">
                                Enter your access code to manage system configuration and cloud database connections.
                            </p>
                            
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Access Code</label>
                                <input 
                                    type="password" 
                                    placeholder="Enter Admin Code" 
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm bg-slate-50 focus:bg-white"
                                    value={accessCode}
                                    onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                                    onKeyDown={handleKeyDown}
                                />
                                {error && <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</p>}
                            </div>

                            <button 
                                onClick={handleAdminLogin}
                                className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                <span>Login to Admin Panel</span>
                            </button>

                            <button 
                                onClick={handleReset}
                                className="w-full mt-4 text-xs text-slate-400 hover:text-red-600 underline transition-colors"
                            >
                                Forgot Access Code? Reset Configuration
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
           &copy; 2024 Regulatory Intelligence Systems.
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  currentOpenAIKey, 
  currentFirebaseConfig,
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  currentOpenAIKey: string, 
  currentFirebaseConfig: string,
  onSave: (apiKey: string, dbConfig: string) => void 
}) => {
  const [key, setKey] = useState(currentOpenAIKey);
  const [dbConfig, setDbConfig] = useState(currentFirebaseConfig);

  useEffect(() => {
    if (isOpen) {
        setKey(currentOpenAIKey);
        setDbConfig(currentFirebaseConfig);
    }
  }, [isOpen, currentOpenAIKey, currentFirebaseConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
             <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             System Configuration
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-6 space-y-6">
           {/* OpenAI Section */}
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0843 7.6148-4.2632a.67.67 0 0 0 .3924-.4765.7008.7008 0 0 0-.055-.552l-3.155-6.9065-3.324 5.7937a.64.64 0 0 1-.5533.3227h-6.612a4.494 4.494 0 0 1 .558-5.2441 4.4545 4.4545 0 0 1 4.8645-.858l-.1258.071L5.184 7.25a.667.667 0 0 0-.2512.8694l2.5108 5.506 4.008-2.244a.6413.6413 0 0 1 .6335.0036l6.0273 3.3753a4.4972 4.4972 0 0 1-4.8525 7.67z"/></svg>
                  OpenAI API Key (Standby)
              </label>
              <input 
                type="password" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
                placeholder="sk-..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Enables GPT-4o as a fallback model. Stored locally in your browser.
              </p>
           </div>

           {/* Firebase Database Section */}
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M3.89 15.672L6.465 2.856C6.587 2.25 7.363 2.043 7.775 2.503L11.55 6.715L3.89 15.672ZM14.288 9.77L18.845 2.523C19.172 2.004 19.944 2.164 20.03 2.773L21.615 13.983L14.288 9.77ZM12.85 8.165L8.93 3.793C8.773 3.619 8.52 3.58 8.32 3.69L2.015 7.313C1.473 7.624 1.407 8.375 1.896 8.777L12.85 8.165ZM13.305 10.916L20.74 15.19L13.194 22.368C12.822 22.723 12.222 22.723 11.85 22.368L3.11 16.577L13.305 10.916Z" /></svg>
                  Google Cloud Firestore Config
              </label>
              <textarea 
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono text-xs focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow min-h-[120px]"
                placeholder='{
  "apiKey": "AIzaSy...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}'
                value={dbConfig}
                onChange={(e) => setDbConfig(e.target.value)}
              />
              
              <details className="mt-3" open>
                 <summary className="text-xs font-bold text-cyan-600 cursor-pointer hover:text-cyan-800 flex items-center gap-1 select-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Configuration Instructions
                 </summary>
                 <div className="mt-2 p-3 bg-white rounded border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                    <ol className="list-decimal ml-4 space-y-1.5">
                        <li>In Firebase Console, go to <strong>Project settings</strong> > <strong>General</strong> > <strong>Your apps</strong>.</li>
                        <li>Select the <strong>"Config"</strong> radio button (as shown in your screenshot).</li>
                        <li>Look for the code: <code>const firebaseConfig = &#123; ... &#125;;</code></li>
                        <li>Copy <strong>ONLY</strong> the object inside the curly braces. Start highlighting at the first <code>&#123;</code> and end at the last <code>&#125;</code>.</li>
                        <li><strong>Do not</strong> copy the text <code>const firebaseConfig =</code>.</li>
                        <li>Paste the result into the box above. It should look like a JSON object.</li>
                    </ol>
                 </div>
              </details>
              
              <p className="text-[10px] text-slate-400 mt-2">
                <span className="text-amber-600 font-semibold">Note:</span> If left empty, the app runs in Local Mode (data is saved only to this browser).
              </p>
           </div>

           <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button 
                 onClick={() => onSave(key, dbConfig)}
                 className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-md"
              >
                 Save & Reload
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'chat' | 'checklist'>('dashboard');
  const [data, setData] = useState<RegulationEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dbFilters, setDbFilters] = useState<DatabaseFilters>({});
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userOpenAIKey, setUserOpenAIKey] = useState('');
  const [firebaseConfig, setFirebaseConfig] = useState('');

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
        setIsLoadingData(true);
        const regs = await getAllRegulations();
        setData(regs);
        setIsLoadingData(false);
    };
    loadData();
  }, []);

  useEffect(() => {
     const storedKey = localStorage.getItem('openai_api_key');
     if (storedKey) setUserOpenAIKey(storedKey);
     
     const storedConfig = localStorage.getItem('firebase_settings');
     if (storedConfig) setFirebaseConfig(storedConfig);
  }, []);

  const handleSaveSettings = (apiKey: string, dbConfig: string) => {
     localStorage.setItem('openai_api_key', apiKey);
     localStorage.setItem('firebase_settings', dbConfig);
     
     setUserOpenAIKey(apiKey);
     setFirebaseConfig(dbConfig);
     setIsSettingsOpen(false);
     
     // Force reload to re-init database connection if config changed
     if (dbConfig) {
        window.location.reload();
     }
  };

  const handleNavigateToDatabase = (filters: DatabaseFilters) => {
    setDbFilters(filters);
    setActiveTab('database');
  };

  // Centralized handler to add entries to both DB and State
  const handleAddEntry = async (newEntry: RegulationEntry) => {
    // 1. Optimistic update
    setData(prev => [newEntry, ...prev]);
    // 2. Persist
    await saveRegulation(newEntry);
  };

  // Centralized handler to update entries in both DB and State
  const handleUpdateEntry = async (updatedEntry: RegulationEntry) => {
    // 1. Optimistic update
    setData(prev => prev.map(item => item.id === updatedEntry.id ? updatedEntry : item));
    // 2. Persist
    await updateRegulationInDb(updatedEntry);
  };

  const handleSidebarNav = (tab: 'dashboard' | 'database' | 'chat' | 'checklist') => {
    if (tab === 'database') {
      // Clear filters when navigating manually via sidebar
      setDbFilters({});
    }
    setActiveTab(tab);
  };

  const handleLogin = (ownerStatus: boolean) => {
      setIsOwner(ownerStatus);
      setIsLoggedIn(true);
  };
  
  // Determine connection status
  const hasDbConnection = Boolean(process.env.firebase_config || firebaseConfig);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleSidebarNav}
        onOpenSettings={() => setIsSettingsOpen(true)} 
        isOwner={isOwner}
      />
      
      <main className="flex-1 ml-64 p-8 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'database' && 'Regulatory Intelligence Database'}
                {activeTab === 'chat' && 'AI Regulatory Assistant'}
                {activeTab === 'checklist' && 'DIA TMF Reference Model Country Requirements'}
              </h2>
              <p className="text-sm text-slate-500">
                {activeTab === 'dashboard' && 'Real-time overview of global regulatory landscape'}
                {activeTab === 'database' && 'Search, analyze and manage regulatory documents'}
                {activeTab === 'chat' && 'Conversational AI for regulatory queries'}
                {activeTab === 'checklist' && 'Generate country-specific Trial Master File (TMF) requirements based on the DIA Reference Model'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Only show Local Mode / DB Status to Owner */}
              {isOwner && (
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border shadow-sm transition-colors cursor-pointer hover:bg-slate-50 ${hasDbConnection ? 'border-cyan-200' : 'border-slate-200'}`}
                  title="Click to configure database connection"
                >
                   <div className={`w-2 h-2 rounded-full ${hasDbConnection ? 'bg-cyan-500 animate-pulse' : 'bg-green-500'}`}></div>
                   <span className="text-xs font-medium text-slate-600">
                      {hasDbConnection ? 'Cloud DB Connected' : 'Local Mode'}
                   </span>
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                 <span className="text-slate-500 font-bold">{isOwner ? 'AD' : 'US'}</span>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0">
            {isLoadingData ? (
                <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm font-medium">Loading Database...</p>
                    </div>
                </div>
            ) : (
                <>
                    {activeTab === 'dashboard' && (
                      <Dashboard 
                        data={data} 
                        onNavigate={handleNavigateToDatabase}
                        onAddEntry={handleAddEntry}
                      />
                    )}
                    {activeTab === 'database' && (
                      <RegulatoryDatabase 
                        data={data} 
                        initialFilters={dbFilters}
                        onAddEntry={handleAddEntry}
                        onUpdateEntry={handleUpdateEntry}
                      />
                    )}
                    {activeTab === 'chat' && (
                        <ChatAssistant openaiKey={userOpenAIKey} />
                    )}
                    {activeTab === 'checklist' && (
                        <DocumentChecklist />
                    )}
                </>
            )}
          </div>
        </div>
      </main>
      
      {/* Settings Modal - Should only be triggerable by Owner, but double check open state logic */}
      {isOwner && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          currentOpenAIKey={userOpenAIKey}
          currentFirebaseConfig={firebaseConfig}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
};

export default App;
    