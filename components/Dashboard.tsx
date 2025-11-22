
import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { RegulationEntry, NewsItem, DatabaseFilters, ImpactLevel, Region } from '../types';
import { getRegulatoryNews, categorizeNewEntry, getArchivedRegulatoryNews } from '../services/geminiService';
import { COUNTRY_COORDINATES } from '../constants';

interface DashboardProps {
  data: RegulationEntry[];
  onNavigate: (filters: DatabaseFilters) => void;
  onAddEntry: (entry: RegulationEntry) => void;
}

// --- Chart Helpers ---

const processTrendData = (data: RegulationEntry[]) => {
  const counts: Record<string, number> = {};
  data.forEach(d => {
      if (!d.date) return;
      const month = d.date.substring(0, 7); // YYYY-MM
      counts[month] = (counts[month] || 0) + 1;
  });
  
  return Object.keys(counts).sort().map(key => {
      const [y, m] = key.split('-');
      const date = new Date(parseInt(y), parseInt(m)-1);
      return {
          name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          count: counts[key]
      };
  });
};

const processImpactData = (data: RegulationEntry[]) => {
  const counts = {
    'High': 0,
    'Medium': 0,
    'Low': 0,
    'Unknown': 0
  };
  
  data.forEach(d => {
    const impact = d.impact || 'Unknown';
    if (counts[impact as keyof typeof counts] !== undefined) {
        counts[impact as keyof typeof counts]++;
    } else {
        counts['Unknown']++;
    }
  });

  return [
    { name: 'High', value: counts['High'], color: '#ef4444' }, // Red
    { name: 'Medium', value: counts['Medium'], color: '#f59e0b' }, // Amber
    { name: 'Low', value: counts['Low'], color: '#10b981' }, // Emerald
    { name: 'Unknown', value: counts['Unknown'], color: '#94a3b8' } // Slate
  ].filter(i => i.value > 0);
};

const processRegionData = (data: RegulationEntry[]) => {
    const regionMap: Record<string, string> = {
        'United States (FDA)': 'US',
        'European Union (EMA)': 'EU',
        'Asia Pacific': 'APAC',
        'Global (ICH/WHO)': 'Global',
        'United Kingdom (MHRA)': 'UK'
    };

    const counts: Record<string, number> = {};
    data.forEach(d => {
        const rawRegion = d.region;
        const shortName = regionMap[rawRegion] || rawRegion || 'Other';
        counts[shortName] = (counts[shortName] || 0) + 1;
    });
    
    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6
};

const WorldMap: React.FC<{ data: RegulationEntry[] }> = ({ data }) => {
  const [selectedMapCountry, setSelectedMapCountry] = useState<string | null>(null);

  // Group counts by country
  const countryCounts = data.reduce((acc, curr) => {
    acc[curr.country] = (acc[curr.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleMarkerClick = (country: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMapCountry(country);
  };

  const getMapQuery = (country: string) => {
    let query = `${country} Ministry of Health Regulatory Affairs`;
    if (country === 'Global') query = 'World Health Organization Geneva';
    if (country === 'European Union') query = 'European Medicines Agency Amsterdam';
    if (country === 'United States') query = 'FDA White Oak Campus';
    if (country === 'United Kingdom') query = 'MHRA London';
    if (country === 'China') query = 'NMPA Beijing';
    if (country === 'Japan') query = 'PMDA Tokyo';
    if (country === 'India') query = 'CDSCO New Delhi';
    if (country === 'Australia') query = 'TGA Canberra';
    return encodeURIComponent(query);
  }

  return (
    <div className="w-full h-full bg-slate-800 rounded-xl overflow-hidden relative group border border-slate-700 shadow-inner">
      {/* Map Background Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
        
        {/* Cartographic Map SVG */}
        <svg viewBox="0 0 100 50" className="w-full h-full object-cover">
           <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
              </pattern>
              <filter id="map-filter">
                 <feColorMatrix type="matrix" values="0.1 0 0 0 0  0 0.3 0 0 0  0 0 0.4 0 0  0 0 0 1 0" />
              </filter>
           </defs>

           {/* Base Map Image (Equirectangular) */}
           <image 
              href="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg" 
              width="100" 
              height="50" 
              className="opacity-30 invert hue-rotate-180 saturate-50"
           />
           
           {/* Graticule / Grid Lines for Cartographic feel */}
           <g className="stroke-slate-700/40 stroke-[0.1]">
             {/* Longitude Lines (every 30 deg approx) */}
             {[...Array(13)].map((_, i) => (
                <line key={`lon-${i}`} x1={i * 100/12} y1="0" x2={i * 100/12} y2="50" />
             ))}
             {/* Latitude Lines (every 30 deg approx) */}
             {[...Array(7)].map((_, i) => (
                <line key={`lat-${i}`} x1="0" y1={i * 50/6} x2="100" y2={i * 50/6} />
             ))}
           </g>

           {/* Map Labels/Decorations */}
           <text x="2" y="48" className="text-[1px] fill-slate-600 font-mono tracking-widest opacity-50">EQUIRECTANGULAR PROJECTION</text>
           
           {/* Render Interactive Pins/Tags */}
           {Object.entries(countryCounts).map(([country, count]) => {
              const coords = COUNTRY_COORDINATES[country];
              if (!coords) return null;
              
              // Determine size/intensity based on count
              const isHotspot = (count as number) > 2;
              
              return (
                <g 
                    key={country} 
                    transform={`translate(${coords.x}, ${coords.y})`}
                    onClick={(e) => handleMarkerClick(country, e)}
                    className="cursor-pointer hover:opacity-100 transition-all duration-200 group/marker"
                >
                  {/* Ping Animation */}
                  <circle 
                    r={isHotspot ? 1.5 : 1} 
                    className={`animate-ping origin-center ${isHotspot ? 'text-red-500' : 'text-cyan-400'} opacity-75`}
                    fill="currentColor"
                  />
                  
                  {/* Map Pin Icon */}
                  <path
                    d="M0 0 C-0.8 -1.5, -1 -2, -1 -2.5 A 1 1 0 1 1 1 -2.5 C 1 -2, 0.8 -1.5, 0 0 Z" 
                    className={`${isHotspot ? 'fill-red-500' : 'fill-cyan-500'} stroke-white stroke-[0.1] drop-shadow-md transform transition-transform duration-300 group-hover/marker:-translate-y-0.5`}
                    transform="translate(0, -0.5)" 
                  />

                  {/* Interactive Hover Tooltip in SVG */}
                  <g className="opacity-0 group-hover/marker:opacity-100 transition-opacity duration-200 pointer-events-none">
                     {/* Tooltip Background */}
                     <rect x="-12" y="-9" width="24" height="5" rx="0.5" fill="#0f172a" className="stroke-cyan-900 stroke-[0.1]" />
                     {/* Tooltip Text */}
                     <text 
                        y="-6" 
                        className="text-[1px] fill-white font-bold"
                        textAnchor="middle"
                     >
                        {country}
                     </text>
                     <text 
                        y="-4.5" 
                        className="text-[0.8px] fill-cyan-400 font-medium"
                        textAnchor="middle"
                     >
                        {count} Updates
                     </text>
                  </g>
                </g>
              );
           })}
        </svg>

        {/* Compass / Scale Overlay */}
        <div className="absolute top-4 right-4 pointer-events-none opacity-50">
            <div className="w-12 h-12 border-2 border-slate-600 rounded-full flex items-center justify-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[8px] font-bold text-slate-400">N</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-[8px] font-bold text-slate-600">S</div>
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-600">W</div>
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-600">E</div>
                <div className="w-8 h-8 border border-slate-700 rounded-full flex items-center justify-center">
                     <div className="w-1 h-4 bg-slate-600 rounded-full"></div>
                     <div className="w-4 h-1 bg-slate-600 rounded-full absolute"></div>
                </div>
            </div>
        </div>

        {/* Overlay Info */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none">
           <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
              <span className="text-xs text-slate-400">Active Regulation</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              <span className="text-xs text-slate-400">High Impact Area</span>
           </div>
        </div>
      </div>

      {/* Google Maps Overlay */}
      {selectedMapCountry && (
        <div className="absolute inset-0 bg-slate-900 z-50 animate-in fade-in zoom-in duration-300 flex flex-col">
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                     <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     <span className="text-white font-bold">{selectedMapCountry} Regulatory Agency</span>
                </div>
                <button 
                    onClick={() => setSelectedMapCountry(null)} 
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Close Map
                </button>
            </div>
            <div className="flex-1 bg-slate-900 relative">
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                     <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, position: 'relative', zIndex: 10 }}
                  src={`https://maps.google.com/maps?q=${getMapQuery(selectedMapCountry)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
            </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ data, onNavigate, onAddEntry }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  
  // Archive Logic
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archivedNews, setArchivedNews] = useState<NewsItem[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);

  // Calculate Stats & Chart Data
  const totalRegs = data.length;
  const highImpact = data.filter(d => d.impact === 'High').length;
  const drafts = data.filter(d => d.status === 'Draft' || d.status === 'Consultation').length;

  const trendData = useMemo(() => processTrendData(data), [data]);
  const impactData = useMemo(() => processImpactData(data), [data]);
  const regionData = useMemo(() => processRegionData(data), [data]);

  // Filter displayed news to 1 week (7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const displayedNews = newsItems.filter(item => new Date(item.date) >= oneWeekAgo);

  useEffect(() => {
    const fetchNews = async () => {
      const now = Date.now();
      // Cache duration of 30 minutes
      const CACHE_DURATION = 1000 * 60 * 30; 

      const cachedTimestamp = localStorage.getItem('regNewsTime_v6');
      const cachedData = localStorage.getItem('regNewsData_v6');

      if (cachedTimestamp && cachedData) {
        const age = now - parseInt(cachedTimestamp, 10);
        if (age < CACHE_DURATION) {
             const parsedData = JSON.parse(cachedData) as NewsItem[];
             setNewsItems(parsedData.sort((a, b) => b.date.localeCompare(a.date)));
             setIsLoadingNews(false);
             return;
        }
      }

      setIsLoadingNews(true);
      try {
        const result = await getRegulatoryNews();
        const sortedResult = result.sort((a, b) => b.date.localeCompare(a.date));
        setNewsItems(sortedResult);
        
        if(sortedResult.length > 0) {
            localStorage.setItem('regNewsData_v6', JSON.stringify(sortedResult));
            localStorage.setItem('regNewsTime_v6', now.toString());
        }
      } catch (e) {
        console.error("Failed to load news", e);
      } finally {
        setIsLoadingNews(false);
      }
    };

    fetchNews();
  }, []);

  // Archive Fetcher
  useEffect(() => {
    if (isArchiveOpen && archivedNews.length === 0 && !isLoadingArchive) {
        const loadArchive = async () => {
             // Check local cache for archive first
             const cachedArchive = localStorage.getItem('regArchiveData');
             if (cachedArchive) {
                 setArchivedNews(JSON.parse(cachedArchive));
                 return;
             }

             setIsLoadingArchive(true);
             try {
                 const history = await getArchivedRegulatoryNews();
                 // Merge with any "older" news we already fetched in the main list but didn't display
                 const olderRecent = newsItems.filter(item => new Date(item.date) < oneWeekAgo);
                 const combined = [...olderRecent, ...history].sort((a,b) => b.date.localeCompare(a.date));
                 
                 // De-duplicate by title
                 const unique = Array.from(new Map(combined.map(item => [item.title, item])).values());
                 
                 setArchivedNews(unique);
                 localStorage.setItem('regArchiveData', JSON.stringify(unique));
             } catch (e) {
                 console.error("Failed to load archive", e);
             } finally {
                 setIsLoadingArchive(false);
             }
        };
        loadArchive();
    }
  }, [isArchiveOpen, archivedNews.length, isLoadingArchive, newsItems, oneWeekAgo]);

  const handleTriageNews = async () => {
    if (!selectedNews) return;
    setIsTriaging(true);
    try {
        const rawContext = `Title: ${selectedNews.title}\nSource: ${selectedNews.source}\nDate: ${selectedNews.date}\nSummary: ${selectedNews.summary}\nContent: ${selectedNews.content}`;
        const aiData = await categorizeNewEntry(rawContext);
        
        const newEntry: RegulationEntry = {
            id: `news-${Date.now()}`,
            title: aiData.title || selectedNews.title,
            agency: aiData.agency || selectedNews.source,
            region: (aiData.region as any) || 'Global',
            country: aiData.country || 'Global',
            date: aiData.date || selectedNews.date,
            effectiveDate: aiData.effectiveDate || 'TBD',
            category: (aiData.category as any) || 'Clinical Research & Trials',
            summary: aiData.summary || selectedNews.summary,
            impact: (aiData.impact as any) || 'Unknown',
            status: 'Draft', 
            content: selectedNews.content,
            url: selectedNews.url,
            adminApproved: false
        };
        
        onAddEntry(newEntry);
        alert("Successfully added to Regulatory Database for triage.");
        setSelectedNews(null);
        onNavigate({ status: ['Draft'] });
    } catch (error) {
        console.error("Failed to triage", error);
        alert("Failed to process news item.");
    } finally {
        setIsTriaging(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Row 1: Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total */}
        <div 
          onClick={() => onNavigate({})}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-cyan-200 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium group-hover:text-cyan-700 transition-colors">Total Regulations</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{totalRegs}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-600">
            <span className="font-bold">+2</span>
            <span className="ml-1 text-slate-400">this month</span>
            <span className="ml-auto text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-1">
                View Database 
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </span>
          </div>
        </div>

        {/* Card 2: High Impact / Risk */}
        <div 
          onClick={() => onNavigate({ impact: ['High'] })}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-red-200 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium group-hover:text-red-600 transition-colors">Critical Risk & Impact</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{highImpact}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-400">
            <span>Requires immediate attention</span>
            <span className="ml-auto text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-1">
                Filter Critical 
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </span>
          </div>
        </div>

        {/* Card 3: Consultations */}
        <div 
          onClick={() => onNavigate({ status: ['Draft', 'Consultation'] })}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-amber-200 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium group-hover:text-amber-600 transition-colors">Active Consultations</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{drafts}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255 1.949L12 22l-4.745-2.051A9.863 9.863 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"></path></svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-400">
             <span>Response required</span>
             <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-1">
                Filter Active
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
             </span>
          </div>
        </div>
      </div>

      {/* Row 2: World Map and News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: World Map Tracker */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-slate-800">Global Regulatory Tracker</h3>
             <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded font-mono border border-slate-200 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Satellite View
                </span>
             </div>
          </div>
          <div className="flex-1 min-h-[400px]">
             <WorldMap data={data} />
          </div>
        </div>

        {/* Column 3: News Feed */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
             <div className="flex items-center gap-3">
                <div className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-sm flex items-center gap-1 animate-pulse">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                  LIVE
                </div>
                <h3 className="text-sm font-bold text-slate-800">Reg. News</h3>
             </div>
             <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-full">Last 7 Days</span>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px] lg:max-h-[450px]">
            {isLoadingNews ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
                 <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-xs">Scanning global sources...</p>
              </div>
            ) : displayedNews.length > 0 ? (
              displayedNews.map((news, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedNews(news)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100 group-hover:bg-cyan-100 transition-colors">{news.source}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{news.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-cyan-700 transition-colors line-clamp-2">{news.title}</h4>
                  {news.url && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                         Source available
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm flex flex-col gap-2">
                  <p>No news in the last 7 days.</p>
              </div>
            )}
          </div>
          {/* Archive Button Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setIsArchiveOpen(true)}
                className="w-full py-2 text-xs font-bold text-slate-600 hover:text-cyan-700 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-all flex items-center justify-center gap-2"
              >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  View News Archive (Past Year)
              </button>
          </div>
        </div>
      </div>

      {/* Row 3: Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[350px]">
           <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-800">Regulatory Activity Trend</h3>
               <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-slate-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
               </div>
           </div>
           <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} interval="preserveStartEnd" />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                 <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                 <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-[350px]">
            {/* Impact Pie Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
               <h3 className="text-lg font-bold text-slate-800 mb-2">Impact Distribution</h3>
               <div className="flex-1 min-h-0 relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={impactData}
                       innerRadius={50}
                       outerRadius={70}
                       paddingAngle={4}
                       dataKey="value"
                     >
                       {impactData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                       ))}
                     </Pie>
                     <RechartsTooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '11px'}} />
                   </PieChart>
                 </ResponsiveContainer>
                 {/* Center Total */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-8">
                     <div className="text-center">
                         <span className="block text-2xl font-bold text-slate-800">{totalRegs}</span>
                     </div>
                 </div>
               </div>
            </div>
            
            {/* Region Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
               <h3 className="text-lg font-bold text-slate-800 mb-2">Regional Breakdown</h3>
               <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 11, fill: '#64748b'}} interval={0} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                          {regionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : '#94a3b8'} />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
        </div>
      </div>

      {/* News Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white rounded-t-xl">
                <div>
                   <div className="flex gap-2 mb-2">
                      <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        NEWS FLASH
                      </span>
                      <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">{selectedNews.source}</span>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mt-2">{selectedNews.title}</h3>
                   <p className="text-xs text-slate-400 mt-1 font-mono">{selectedNews.date}</p>
                </div>
                <button onClick={() => setSelectedNews(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
             </div>
             <div className="p-6 overflow-y-auto prose prose-sm max-w-none text-slate-600">
                <p className="whitespace-pre-wrap leading-relaxed">{selectedNews.content}</p>
             </div>
             <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center">
                <div className="flex gap-2 items-center">
                    <button 
                        onClick={handleTriageNews}
                        disabled={isTriaging}
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg text-sm font-bold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                    >
                        {isTriaging ? (
                            <>
                               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                               Processing...
                            </>
                        ) : (
                            <>
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                               Triage to DB
                            </>
                        )}
                    </button>
                    {selectedNews.url ? (
                        <a 
                            href={selectedNews.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-bold text-cyan-600 hover:text-cyan-800 hover:underline flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm transition-all hover:shadow"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            Read Full Source
                        </a>
                    ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <svg className="w-3 h-3 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Generated by AIDE Flash
                        </span>
                    )}
                </div>
                <button onClick={() => setSelectedNews(null)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900 transition-colors shadow-sm">Close</button>
             </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Regulatory News Archive</h3>
                            <p className="text-xs text-slate-500">Historical updates from the past 12 months</p>
                        </div>
                    </div>
                    <button onClick={() => setIsArchiveOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {isLoadingArchive && archivedNews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                             <div className="w-10 h-10 border-4 border-slate-300 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                             <p className="font-medium">Retrieving historical records...</p>
                             <p className="text-xs mt-2">Accessing past year's regulatory database</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {archivedNews.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">{item.source}</span>
                                            <span className="text-xs text-slate-400 font-mono">{item.date}</span>
                                        </div>
                                        {item.url && (
                                            <a 
                                                href={item.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1"
                                            >
                                                Read Full Source
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                            </a>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-2">{item.title}</h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
                                </div>
                            ))}
                            {archivedNews.length === 0 && !isLoadingArchive && (
                                <div className="text-center py-12 text-slate-500">
                                    No archived news found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
