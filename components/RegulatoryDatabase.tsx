
import React, { useState, useRef, useEffect } from 'react';
import { Category, Region, RegulationEntry, AnalysisResult, ImpactLevel, DatabaseFilters } from '../types';
import { analyzeRegulation, categorizeNewEntry, searchWebForRegulations, parseWebSearchResults } from '../services/geminiService';
import { REGION_COUNTRY_MAP, ALL_COUNTRIES } from '../constants';

interface DatabaseProps {
  data: RegulationEntry[];
  initialFilters?: DatabaseFilters;
  onAddEntry: (entry: RegulationEntry) => void;
  onUpdateEntry: (entry: RegulationEntry) => void;
}

// Include Global in search options
const SEARCH_JURISDICTIONS = ['Global', ...ALL_COUNTRIES];


// --- Reusable Multi-Select Component ---
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggle = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full md:w-auto min-w-[160px] px-3 py-2.5 text-sm bg-white border rounded-lg transition-all duration-200 group ${
          isOpen || selected.length > 0 
            ? 'border-cyan-500 ring-1 ring-cyan-500/20 shadow-sm' 
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 truncate mr-2">
          <span className={`text-sm truncate ${selected.length > 0 ? 'text-cyan-700 font-semibold' : 'text-slate-500'}`}>
            {selected.length > 0 ? `${label} (${selected.length})` : label}
          </span>
        </div>
        <div className="flex items-center gap-1">
            {selected.length > 0 && (
                <div 
                    role="button"
                    onClick={handleClear}
                    className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 mr-1"
                    title="Clear selection"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
            )}
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 mt-2 bg-white border border-slate-100 rounded-lg shadow-xl max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 space-y-0.5">
            {options.map((option) => (
              <div
                key={option}
                onClick={() => handleToggle(option)}
                className={`flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selected.includes(option) ? 'bg-cyan-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  selected.includes(option) ? 'bg-cyan-600 border-cyan-600' : 'border-slate-300 bg-white'
                }`}>
                  {selected.includes(option) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </div>
                <span className={`text-sm leading-tight ${selected.includes(option) ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                  {option}
                </span>
              </div>
            ))}
             {options.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No options available</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const RegulatoryDatabase: React.FC<DatabaseProps> = ({ data, initialFilters, onAddEntry, onUpdateEntry }) => {
  // Filter States (Arrays for Multi-Select)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialFilters?.status || []);
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>(initialFilters?.impact || []);
  
  // Sort State
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // UI States
  const [selectedItem, setSelectedItem] = useState<RegulationEntry | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEntryText, setNewEntryText] = useState('');
  const [isProcessingNewEntry, setIsProcessingNewEntry] = useState(false);

  // Web Search States
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webSearchJurisdiction, setWebSearchJurisdiction] = useState('Global');
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<RegulationEntry[]>([]);
  const [importedWebIds, setImportedWebIds] = useState<Set<string>>(new Set());
  
  // Approval Workflow & Edit State
  const [approvalFormValue, setApprovalFormValue] = useState(false);
  const [impactFormValue, setImpactFormValue] = useState<ImpactLevel>(ImpactLevel.Unknown);
  const [riskLevelFormValue, setRiskLevelFormValue] = useState<string>('');

  // Derived Data for Filter Options
  const uniqueAgencies = Array.from(new Set(data.map(item => item.agency))).sort();
  const uniqueCountries = ALL_COUNTRIES; 
  const uniqueCategories = Object.values(Category);
  const uniqueStatuses = ['Final', 'Draft', 'Consultation'];
  const uniqueImpacts = Object.values(ImpactLevel);

  // Sync filters if initialFilters prop changes (e.g. navigation from dashboard)
  useEffect(() => {
    if (initialFilters) {
        if (initialFilters.status) setSelectedStatuses(initialFilters.status);
        else setSelectedStatuses([]);

        if (initialFilters.impact) setSelectedImpacts(initialFilters.impact);
        else setSelectedImpacts([]);
        
        // Reset others when navigating fresh
        setSelectedCategories([]);
        setSelectedCountries([]);
        setSelectedAgencies([]);
        setSearchTerm('');
    }
  }, [initialFilters]);

  // Sync approval state and manual overrides when item opens or analysis completes
  useEffect(() => {
    if (selectedItem) {
      setApprovalFormValue(selectedItem.adminApproved || false);
      setImpactFormValue(selectedItem.impact || ImpactLevel.Unknown);
      // Prefer existing risk level on item, fallback to analysis, fallback to empty
      setRiskLevelFormValue(selectedItem.riskLevel || analysis?.riskLevel || '');
    }
  }, [selectedItem, analysis]);

  // Filter & Sort Logic
  const filteredData = data.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
    const matchesCountry = selectedCountries.length === 0 || selectedCountries.some(selection => {
        if (selection === item.country) return true;
        const countriesInRegion = REGION_COUNTRY_MAP[item.region] || [];
        return countriesInRegion.includes(selection);
    });
    const matchesAgency = selectedAgencies.length === 0 || selectedAgencies.includes(item.agency);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
    const matchesImpact = selectedImpacts.length === 0 || selectedImpacts.includes(item.impact);

    return matchesSearch && matchesCategory && matchesCountry && matchesAgency && matchesStatus && matchesImpact;
  }).sort((a, b) => {
      return sortDirection === 'desc' 
        ? b.date.localeCompare(a.date) 
        : a.date.localeCompare(b.date);
  });

  // Actions
  const handleAnalyze = async (item: RegulationEntry) => {
    setSelectedItem(item);
    setAnalysis(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeRegulation(item);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateStatus = () => {
    if (!selectedItem) return;

    const updatedItem = {
      ...selectedItem,
      adminApproved: approvalFormValue,
      impact: impactFormValue, // Save manual impact
      riskLevel: riskLevelFormValue || selectedItem.riskLevel, // Save manual or existing risk
      // Preserve rationale from analysis if available, else keep existing
      riskRationale: analysis?.riskRationale || selectedItem.riskRationale, 
    };

    onUpdateEntry(updatedItem);
    setSelectedItem(updatedItem);
    alert(`Status updated: ${approvalFormValue ? 'ANALYSIS COMPLETED' : 'PENDING REVIEW'}\nDatabase updated with overrides.`);
  };

  const handleDownloadPDF = () => {
    if (!selectedItem || !analysis) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to download the PDF report.");
        return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AIDE-RegGenie Report - ${selectedItem.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #0891b2; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 24px; }
            .header .subtitle { color: #64748b; font-size: 14px; }
            
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
            .meta-item label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
            .meta-item span { font-size: 14px; color: #334155; font-weight: 500; }
            
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .badge-approved { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .badge-pending { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
            .badge-risk-high { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
            .badge-risk-med { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
            .badge-risk-low { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }

            .section { margin-bottom: 35px; page-break-inside: avoid; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0891b2; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
            .content p { margin-bottom: 10px; font-size: 13px; text-align: justify; }
            
            ul { padding-left: 20px; margin: 0; }
            li { margin-bottom: 6px; font-size: 13px; }
            
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
            
            @media print {
                body { padding: 20px; }
                .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Regulatory Impact Assessment</h1>
            <div class="subtitle">AIDE-RegGenie Intelligent Report</div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><label>Regulation Title</label><span>${selectedItem.title}</span></div>
            <div class="meta-item"><label>Agency / Country</label><span>${selectedItem.agency} (${selectedItem.country})</span></div>
            <div class="meta-item"><label>Publication Date</label><span>${selectedItem.date}</span></div>
            <div class="meta-item"><label>Category</label><span>${selectedItem.category}</span></div>
            <div class="meta-item"><label>Operational Impact</label><span>${selectedItem.impact}</span></div>
            <div class="meta-item">
                <label>Approval Status</label>
                ${selectedItem.adminApproved 
                    ? '<span class="badge badge-approved">Analysis Completed</span>' 
                    : '<span class="badge badge-pending">Pending Review</span>'
                }
            </div>
          </div>

          <div class="section">
            <div class="section-title">Executive Summary</div>
            <div class="content"><p>${analysis.summary}</p></div>
          </div>

          <div class="section">
            <div class="section-title">Impact & Risk Analysis</div>
            <div class="content">
                <p><strong>Operational Impact:</strong> ${analysis.operationalImpact}</p>
                <div style="margin-top: 15px;">
                    <span class="badge ${selectedItem.riskLevel?.includes('High') ? 'badge-risk-high' : selectedItem.riskLevel?.includes('Medium') ? 'badge-risk-med' : 'badge-risk-low'}">
                        Assessed Risk: ${selectedItem.riskLevel}
                    </span>
                </div>
                <p style="margin-top: 10px;"><strong>Compliance Risk:</strong> ${analysis.complianceRisk}</p>
                <p style="margin-top: 10px; font-style: italic; color: #475569; background: #f8fafc; padding: 10px; border-radius: 4px;">"Rationale: ${analysis.riskRationale}"</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Mitigation Strategies</div>
            <ul>${analysis.mitigationStrategies.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>

           <div class="section">
            <div class="section-title">Action Items</div>
            <ul>${analysis.actionItems.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
          
          <div class="footer">
            Generated by AIDE-RegGenie System on ${new Date().toLocaleDateString()} <br>
            Confidential & Proprietary - For Internal Use Only
          </div>

          <script>
             // Fallback for printing in environments where onload might not trigger correctly on dynamic documents
             setTimeout(() => {
                window.print();
             }, 1000);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleAddEntry = async () => {
    if (!newEntryText.trim()) return;
    setIsProcessingNewEntry(true);
    try {
      const extractedData = await categorizeNewEntry(newEntryText);
      const newEntry: RegulationEntry = {
        id: Date.now().toString(),
        title: extractedData.title || 'Untitled Regulation',
        agency: extractedData.agency || 'Unknown Agency',
        region: (extractedData.region as Region) || Region.Global,
        country: extractedData.country || 'Global',
        date: extractedData.date || new Date().toISOString().split('T')[0],
        effectiveDate: extractedData.effectiveDate || 'TBD',
        category: (extractedData.category as Category) || Category.Manufacturing,
        summary: extractedData.summary || newEntryText.substring(0, 100) + '...',
        impact: (extractedData.impact as ImpactLevel) || ImpactLevel.Unknown,
        status: 'Draft', 
        content: newEntryText
      };
      
      onAddEntry(newEntry);
      setIsAddModalOpen(false);
      setNewEntryText('');
    } catch (e) {
      alert('Failed to parse entry. Please try again.');
    } finally {
      setIsProcessingNewEntry(false);
    }
  };

  const handleWebSearch = async () => {
    if (!webSearchQuery.trim()) return;
    setIsWebSearching(true);
    setWebSearchResults([]);
    setImportedWebIds(new Set());
    try {
        const { text, sources } = await searchWebForRegulations(webSearchQuery, webSearchJurisdiction);
        const results = await parseWebSearchResults(text, sources);
        setWebSearchResults(results);
    } catch (error) {
        console.error("Search failed", error);
    } finally {
        setIsWebSearching(false);
    }
  };

  const handleImportWebResult = (item: RegulationEntry) => {
    onAddEntry(item);
    setImportedWebIds(prev => new Set(prev).add(item.id));
  };
  
  const handleImportAllWebResults = () => {
      const newItems = webSearchResults.filter(item => !importedWebIds.has(item.id));
      if(newItems.length === 0) return;
      
      newItems.forEach(item => {
          onAddEntry(item);
      });
      
      setImportedWebIds(prev => {
          const next = new Set(prev);
          newItems.forEach(i => next.add(i.id));
          return next;
      });
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Controls Container */}
      <div className="flex flex-col gap-4 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
        
        {/* Top Row: Search, New Entry */}
        <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
             <div className="flex flex-col sm:flex-row w-full gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm shadow-sm transition-shadow"
                      placeholder="Search keywords, titles, summaries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsWebSearchOpen(true)}
                    className="whitespace-nowrap inline-flex items-center justify-center px-5 py-2.5 border border-slate-200 text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all transform hover:scale-[1.02]"
                  >
                    <svg className="w-4 h-4 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                    Web Search
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="whitespace-nowrap inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all transform hover:scale-[1.02]"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    New Entry
                  </button>
                </div>
            </div>
        </div>

        {/* Filters Row - Unified MultiSelects */}
        <div className="flex flex-wrap items-center gap-3">
             <MultiSelectDropdown 
                label="Status" 
                options={uniqueStatuses} 
                selected={selectedStatuses} 
                onChange={setSelectedStatuses} 
             />
             <MultiSelectDropdown 
                label="Impact" 
                options={uniqueImpacts} 
                selected={selectedImpacts} 
                onChange={setSelectedImpacts} 
             />
             
             <div className="h-8 w-px bg-slate-300 hidden md:block mx-2"></div>

             <MultiSelectDropdown 
                label="Country" 
                options={uniqueCountries} 
                selected={selectedCountries} 
                onChange={setSelectedCountries} 
             />
             <MultiSelectDropdown 
                label="Category" 
                options={uniqueCategories} 
                selected={selectedCategories} 
                onChange={setSelectedCategories} 
             />
             <MultiSelectDropdown 
                label="Agency" 
                options={uniqueAgencies} 
                selected={selectedAgencies} 
                onChange={setSelectedAgencies} 
             />
             
             {(selectedCategories.length > 0 || selectedCountries.length > 0 || selectedAgencies.length > 0 || selectedImpacts.length > 0 || selectedStatuses.length > 0) && (
                <button 
                    onClick={() => {
                        setSelectedCategories([]);
                        setSelectedCountries([]);
                        setSelectedAgencies([]);
                        setSelectedStatuses([]);
                        setSelectedImpacts([]);
                        setSearchTerm('');
                    }}
                    className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium underline flex items-center gap-1"
                >
                    Clear All Filters
                </button>
             )}
        </div>

      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200 flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Regulation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country & Agency</th>
                <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider group cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="Toggle chronological sort"
                >
                  <div className="flex items-center gap-1">
                    Dates
                    <span className={`text-slate-400 transition-transform duration-200 flex items-center ${sortDirection === 'asc' ? 'rotate-180' : ''}`}>
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                  </div>
                </th>
                {/* Split Columns for Impact and Risk */}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Op. Impact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comp. Risk</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <a 
                          href={item.url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-900 group-hover:text-cyan-700 transition-colors hover:underline flex items-center gap-1.5"
                          onClick={(e) => !item.url && e.preventDefault()}
                        >
                          {item.title}
                          {item.url && (
                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          )}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {item.category}
                             </span>
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                               ${item.status === 'Final' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                 item.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                               {item.status}
                             </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div>
                            <div className="text-sm font-bold text-slate-800">{item.agency}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                                {item.country}
                            </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between w-28"><span className="text-xs font-bold text-slate-400">PUB:</span> <span>{item.date}</span></div>
                        {item.effectiveDate && (
                          <div className="flex justify-between w-28"><span className="text-xs font-bold text-slate-700">EFF:</span> <span className="font-medium text-slate-800">{item.effectiveDate}</span></div>
                        )}
                      </div>
                    </td>
                    
                    {/* Operational Impact Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold 
                        ${item.impact === 'High' ? 'bg-red-100 text-red-700 border border-red-200' : 
                          item.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                          'bg-green-100 text-green-700 border border-green-200'}`}>
                        {item.impact}
                      </span>
                    </td>

                    {/* Compliance Risk Column - Updated with enhanced icons and distinct colors */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.riskLevel ? (
                         <div 
                            className="flex flex-col items-start gap-1.5 cursor-pointer group/risk"
                            onClick={() => handleAnalyze(item)}
                         >
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm transition-all ${
                                item.riskLevel.includes('High') || item.riskLevel.includes('Critical') 
                                    ? 'bg-red-100 text-red-800 border-red-200 ring-1 ring-red-500/20' 
                                    : item.riskLevel.includes('Medium') 
                                        ? 'bg-amber-100 text-amber-800 border-amber-200 ring-1 ring-amber-500/20' 
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-200 ring-1 ring-emerald-500/20'
                            }`}>
                                {/* Risk Icons */}
                                {(item.riskLevel.includes('High') || item.riskLevel.includes('Critical')) && (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                )}
                                {item.riskLevel.includes('Medium') && (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                )}
                                {(!item.riskLevel.includes('High') && !item.riskLevel.includes('Critical') && !item.riskLevel.includes('Medium')) && (
                                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                )}
                                {item.riskLevel}
                            </span>
                            {item.adminApproved && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 ml-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Analysis Completed
                                </span>
                            )}
                         </div>
                      ) : (
                          <span className="text-xs text-slate-400 italic flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              Pending Analysis
                          </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAnalyze(item)}
                          className="text-cyan-600 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-md transition-colors text-xs font-bold flex items-center gap-1"
                        >
                          {item.adminApproved ? 'View' : 'Analyze'}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-sm font-medium">No regulations found matching your filters.</p>
                        <button 
                            onClick={() => {
                                setSelectedCategories([]);
                                setSelectedCountries([]);
                                setSelectedAgencies([]);
                                setSelectedStatuses([]);
                                setSelectedImpacts([]);
                                setSearchTerm('');
                            }}
                            className="mt-2 text-sm text-cyan-600 hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Modal (Slide over) */}
      {selectedItem && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setSelectedItem(null)}></div>
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-2xl transform transition ease-in-out duration-500 sm:duration-700 translate-x-0 animate-in slide-in-from-right">
                <div className="h-full flex flex-col bg-white shadow-2xl overflow-y-scroll">
                  <div className="px-6 py-6 bg-slate-900 text-white border-b border-slate-800">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-cyan-500/20 rounded text-cyan-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                         </div>
                         <h2 className="text-lg font-bold text-white">AIDE-RegGenie Impact Assessment</h2>
                      </div>
                      <div className="flex items-center gap-2">
                          {analysis && (
                             <button 
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors text-xs font-bold"
                                title="Export as PDF"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download PDF
                             </button>
                          )}
                          <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full">
                            <span className="sr-only">Close</span>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                      </div>
                    </div>
                    <div>
                      <a href={selectedItem.url || '#'} target="_blank" rel="noopener noreferrer" className="text-xl font-bold leading-snug hover:text-cyan-400 transition-colors flex items-center gap-2">
                        {selectedItem.title}
                        {selectedItem.url && <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>}
                      </a>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300 font-bold">{selectedItem.country}</span>
                        <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300 font-mono">{selectedItem.agency}</span>
                        <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300 font-mono">{selectedItem.category}</span>
                        {selectedItem.adminApproved && (
                            <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Analysis Completed
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 bg-slate-50">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-cyan-500 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-slate-800 font-bold">Analyzing Regulation</p>
                            <p className="text-slate-500 text-sm">AIDE-RegGenie is assessing operational impact and compliance risks...</p>
                        </div>
                      </div>
                    ) : analysis ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Release Authorization & Manual Overrides */}
                        <div className="bg-white p-5 rounded-xl border-2 border-slate-200 shadow-sm">
                             <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                            Manual Classification Overrides
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">Update Operational Impact and Risk Level to align with internal assessments.</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                         <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all select-none ${!approvalFormValue ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-slate-200/50'}`}>
                                             <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${!approvalFormValue ? 'border-slate-600 bg-slate-600' : 'border-slate-400 bg-transparent'}`}>
                                                {!approvalFormValue && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                             </div>
                                             <input type="radio" className="hidden" name="approvalStatus" checked={!approvalFormValue} onChange={() => setApprovalFormValue(false)} />
                                             <span className={`text-xs ${!approvalFormValue ? 'font-bold text-slate-700' : 'text-slate-500'}`}>Pending Review</span>
                                         </label>
                                         
                                         <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all select-none ${approvalFormValue ? 'bg-white shadow-sm border border-emerald-200' : 'hover:bg-slate-200/50'}`}>
                                             <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${approvalFormValue ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400 bg-transparent'}`}>
                                                {approvalFormValue && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                             </div>
                                             <input type="radio" className="hidden" name="approvalStatus" checked={approvalFormValue} onChange={() => setApprovalFormValue(true)} />
                                             <span className={`text-xs ${approvalFormValue ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>Approved</span>
                                         </label>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Operational Impact (Level)</label>
                                        <select 
                                            value={impactFormValue} 
                                            onChange={(e) => setImpactFormValue(e.target.value as ImpactLevel)}
                                            className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 bg-slate-50 h-10"
                                        >
                                            {Object.values(ImpactLevel).map(lvl => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">Determines table sorting priority</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Compliance Risk (Label)</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={riskLevelFormValue}
                                                onChange={(e) => setRiskLevelFormValue(e.target.value)}
                                                placeholder="e.g., High Risk, Critical"
                                                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 bg-slate-50 pl-3 pr-8 h-10"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Displayed on regulatory database</p>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={handleUpdateStatus}
                                        className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        Update Status & Overrides
                                    </button>
                                </div>
                             </div>
                        </div>

                        {/* Executive Summary */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Executive Summary
                           </h4>
                           <p className="text-slate-800 leading-relaxed text-sm">{analysis.summary}</p>
                        </div>

                        {/* Impact & Risk Dashboard */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                    </div>
                                    <h4 className="font-bold text-slate-800">Operational Impact Assessment</h4>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{analysis.operationalImpact}</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                 <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-red-50 rounded-lg text-red-600 border border-red-100">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        </div>
                                        <h4 className="font-bold text-slate-800">Compliance Risk Analysis</h4>
                                    </div>
                                    {riskLevelFormValue && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                                            riskLevelFormValue.includes('High') || riskLevelFormValue.includes('Critical') ? 'bg-red-50 text-red-700 border-red-200' :
                                            riskLevelFormValue.includes('Medium') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                                        }`}>
                                            <span className={`w-2 h-2 rounded-full ${
                                                riskLevelFormValue.includes('High') || riskLevelFormValue.includes('Critical') ? 'bg-red-500' :
                                                riskLevelFormValue.includes('Medium') ? 'bg-amber-500' : 'bg-green-500'
                                            }`}></span>
                                            {riskLevelFormValue}
                                        </span>
                                    )}
                                 </div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-4">{analysis.complianceRisk}</p>
                                
                                {/* Rationale Section */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                   <div className="text-xs font-bold text-slate-500 uppercase mb-1">Rationale</div>
                                   <p className="text-sm text-slate-700 italic">"{analysis.riskRationale}"</p>
                                </div>
                            </div>
                        </div>

                        {/* Risk Management Plan */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 flex items-center gap-2 border-b border-slate-100">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Mitigation Strategies
                            </h4>
                            <div className="grid gap-3">
                                {analysis.mitigationStrategies.map((strategy, i) => (
                                    <div key={i} className="flex items-start gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50 hover:border-emerald-200 transition-colors">
                                         <div className="mt-1.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold border border-emerald-200">{i + 1}</div>
                                         <span className="text-sm text-emerald-900 font-medium leading-snug pt-0.5">{strategy}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Key Changes */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Changes</h4>
                              <ul className="space-y-3">
                                {analysis.keyChanges.map((change, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                    <svg className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                    <span>{change}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Recommended Actions */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Action Items</h4>
                              <ul className="space-y-3">
                                {analysis.actionItems.map((action, i) => (
                                  <li key={i} className="flex gap-3 text-sm text-slate-600">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold border border-slate-200">{i+1}</div>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                        </div>
                        
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                         <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                         <p>Analysis unavailable</p>
                         {selectedItem.adminApproved && selectedItem.riskLevel && (
                             <div className="mt-4 text-center">
                                 <p className="text-sm font-bold text-slate-800">Analysis Completed</p>
                                 <div className="mt-2 inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 text-xs font-mono">
                                     RISK LEVEL: {selectedItem.riskLevel}
                                 </div>
                             </div>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 transform transition-all scale-100">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Add New Regulation</h3>
              <p className="text-sm text-slate-500 mb-4">
                Paste a snippet or the full text of a regulatory update. AIDE-RegGenie will automatically extract metadata (title, agency, dates, category).
              </p>
              <textarea
                className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm resize-none shadow-inner bg-slate-50"
                placeholder="Paste regulation text here..."
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
              ></textarea>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEntry}
                  disabled={isProcessingNewEntry || !newEntryText.trim()}
                  className="px-5 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  {isProcessingNewEntry && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {isProcessingNewEntry ? 'Processing...' : 'Analyze & Add'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Web Search Modal */}
      {isWebSearchOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-0 transform transition-all scale-100 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                      Global Regulatory Web Search
                   </h3>
                   <button onClick={() => setIsWebSearchOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   </button>
                </div>
                <div className="flex gap-2 items-center">
                   <div className="relative min-w-[180px]">
                       <select 
                          value={webSearchJurisdiction}
                          onChange={(e) => setWebSearchJurisdiction(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 bg-slate-50 font-medium text-slate-700"
                       >
                          {SEARCH_JURISDICTIONS.map(j => (
                              <option key={j} value={j}>{j}</option>
                          ))}
                       </select>
                   </div>
                   <input 
                      type="text"
                      className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="E.g., Medical Device Cybersecurity 2025..."
                      value={webSearchQuery}
                      onChange={(e) => setWebSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                   />
                   <button 
                      onClick={handleWebSearch}
                      disabled={isWebSearching || !webSearchQuery.trim()}
                      className="px-6 py-2.5 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-md whitespace-nowrap"
                   >
                      {isWebSearching ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Searching...
                          </>
                      ) : 'Search'}
                   </button>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   Powered by Google Search Grounding. Targeting official health authority websites for {webSearchJurisdiction}.
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  {isWebSearching ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                          <div className="w-12 h-12 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                          <p className="font-medium">Scanning {webSearchJurisdiction} regulatory databases...</p>
                          <p className="text-xs mt-2">Identifying official documents and summaries</p>
                      </div>
                  ) : webSearchResults.length > 0 ? (
                      <>
                        <div className="flex justify-end mb-4">
                             <button 
                                onClick={handleImportAllWebResults}
                                className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 hover:bg-cyan-50 px-3 py-1.5 rounded transition-colors"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                 Import All Results
                             </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {webSearchResults.map((item) => (
                                <div key={item.id} className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${importedWebIds.has(item.id) ? 'border-emerald-200 bg-emerald-50/30 opacity-75' : 'border-slate-200 hover:border-cyan-300 hover:shadow-md'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            {item.agency}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">{item.date}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2" title={item.title}>
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-3 h-12">
                                        {item.summary}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex gap-1">
                                            {item.url && (
                                                <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 hover:underline flex items-center gap-1">
                                                    Source <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                                </a>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleImportWebResult(item)}
                                            disabled={importedWebIds.has(item.id)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${
                                                importedWebIds.has(item.id) 
                                                ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                                            }`}
                                        >
                                            {importedWebIds.has(item.id) ? (
                                                <>
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                  Imported
                                                </>
                                            ) : (
                                                <>
                                                  Import
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                      </>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                          <div className="bg-slate-100 p-4 rounded-full mb-3">
                             <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                          </div>
                          <p className="font-medium text-slate-600">No search results yet.</p>
                          <p className="text-sm max-w-md mt-1">Select a specific jurisdiction or search Global for real-time updates.</p>
                      </div>
                  )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RegulatoryDatabase;
