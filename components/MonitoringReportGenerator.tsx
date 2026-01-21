
import React, { useState, useRef, useEffect } from 'react';
import { synthesizeMonitoringReport, transcribeAudio, generateFollowUpLetter, generateConfirmationLetter } from '../services/geminiService';
import { saveMonitoringReport, getAllMonitoringReports, saveAuditEntry } from '../services/dbService';
import { MonitoringReportLog } from '../types';
import { extractRawText } from 'mammoth';

type VisitTab = 'SSV' | 'SMV' | 'SCV';
type OutputTab = 'report' | 'follow-up' | 'confirmation';

const MonitoringReportGenerator: React.FC = () => {
  const [viewMode, setViewMode] = useState<'builder' | 'history'>('builder');
  const [activeVisit, setActiveVisit] = useState<VisitTab>('SMV');
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>('report');
  
  // Intelligence Inputs
  const [notesContent, setNotesContent] = useState('');
  const [meetingMinutes, setMeetingMinutes] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [linkedUrl, setLinkedUrl] = useState('');
  
  // Template Context
  const [templateReference, setTemplateReference] = useState('Standard GxP Template v4.2');
  const [customTemplateText, setCustomTemplateText] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');

  // Correspondence States
  const [followUpHtml, setFollowUpHtml] = useState('');
  const [confirmationHtml, setConfirmationHtml] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');

  // System States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentReport, setCurrentReport] = useState<Partial<MonitoringReportLog> | null>(null);
  const [history, setHistory] = useState<MonitoringReportLog[]>([]);

  // Metadata
  const [projectNumber, setProjectNumber] = useState('AIDE-CLIN-2025');
  const [visitDate, setVisitDate] = useState('');

  const voiceInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const logs = await getAllMonitoringReports();
    setHistory(logs);
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = await extractRawText({ arrayBuffer: buffer });
      setCustomTemplateText(result.value);
      setTemplateFileName(file.name);
      setTemplateReference(`Uploaded: ${file.name}`);
    } catch (err) { alert("Failed to parse template file."); }
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const text = await transcribeAudio(base64, file.type);
        setVoiceTranscript(prev => prev + (prev ? '\n\n' : '') + `[Transcript ${file.name}]:\n` + text);
        setIsTranscribing(false);
      };
    } catch (err) { setIsTranscribing(false); }
  };

  const runSynthesis = async () => {
    if (!notesContent.trim() && !voiceTranscript.trim()) return alert("Incomplete input signals.");
    setIsProcessing(true);
    try {
      const metadata = { projectNumber, visitDate, templateReference };
      const inputs = { notes: notesContent, minutes: meetingMinutes, transcript: voiceTranscript, linkedContext: linkedUrl };
      const templateContext = customTemplateText || `Standard Structure: ${templateReference}`;

      const result = await synthesizeMonitoringReport(activeVisit, inputs, templateContext, metadata);
      
      const fullReport: MonitoringReportLog = {
        id: `MR-${Date.now()}`,
        projectNumber,
        sponsor: 'Sponsor X',
        visitDate,
        visitNumber: '01',
        visitType: activeVisit,
        contentHtml: result.contentHtml || '',
        rawNotes: notesContent,
        audit: result.audit!
      };

      setCurrentReport(fullReport);
      setActiveOutputTab('report');
      await saveMonitoringReport(fullReport);
      loadHistory();
      await saveAuditEntry({ id: `AUDIT-${Date.now()}`, timestamp: Date.now(), action: 'REPORT_GENERATED', user: 'Operator', module: 'monitoring-report', details: `Synthesized report for ${projectNumber}` });
    } finally { setIsProcessing(false); }
  };

  const handleCreateFollowUp = async () => {
    if (!currentReport?.contentHtml) return;
    setIsProcessing(true);
    try {
      const html = await generateFollowUpLetter(currentReport.contentHtml, { projectNumber, visitDate });
      setFollowUpHtml(html);
      setActiveOutputTab('follow-up');
    } finally { setIsProcessing(false); }
  };

  const handleCreateConfirmation = async () => {
    if (!currentReport?.contentHtml || !nextVisitDate) return alert("Select next visit date.");
    setIsProcessing(true);
    try {
      const html = await generateConfirmationLetter(currentReport.contentHtml, nextVisitDate, { projectNumber });
      setConfirmationHtml(html);
      setActiveOutputTab('confirmation');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-6">
          <button onClick={() => setViewMode('builder')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${viewMode === 'builder' ? 'border-cyan-600 text-cyan-600' : 'text-slate-400'}`}>Report Builder</button>
          <button onClick={() => setViewMode('history')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${viewMode === 'history' ? 'border-cyan-600 text-cyan-600' : 'text-slate-400'}`}>Submission History ({history.length})</button>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['SSV', 'SMV', 'SCV'] as VisitTab[]).map(t => (
            <button key={t} onClick={() => setActiveVisit(t)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeVisit === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>{t}</button>
          ))}
        </div>
      </div>

      {viewMode === 'builder' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Input Panel */}
          <div className="flex flex-col gap-6 overflow-y-auto max-h-[850px] pr-2 scrollbar-thin">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Context & Template</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Reference Template</label>
                  <div className="flex gap-2">
                    <select value={templateReference} onChange={e => setTemplateReference(e.target.value)} className="flex-1 border-slate-200 rounded-lg text-xs p-2 bg-slate-50 font-bold outline-none">
                      <option>Standard GxP Template v4.2</option>
                      <option>Early Phase Oncology Master</option>
                      <option>Device-Specific Protocol Template</option>
                    </select>
                    <button onClick={() => templateInputRef.current?.click()} className="px-3 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase">Upload .docx</button>
                    <input type="file" ref={templateInputRef} className="hidden" accept=".docx" onChange={handleTemplateUpload} />
                  </div>
                  {templateFileName && <p className="text-[8px] text-cyan-600 font-bold mt-1 uppercase">Using Custom: {templateFileName}</p>}
                </div>
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Project ID</label><input value={projectNumber} onChange={e => setProjectNumber(e.target.value)} className="w-full border-slate-200 rounded-lg text-xs p-2 bg-slate-50 font-bold" /></div>
                <div><label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Visit Date</label><input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full border-slate-200 rounded-lg text-xs p-2 bg-slate-50" /></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Contemporaneous Site Notes</h3>
                <textarea value={notesContent} onChange={e => setNotesContent(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 text-[11px] h-32 resize-none leading-relaxed focus:ring-2 focus:ring-cyan-500/10 outline-none" placeholder="Primary field observations..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-2">Meeting Minutes</h3>
                  <textarea value={meetingMinutes} onChange={e => setMeetingMinutes(e.target.value)} className="w-full p-3 bg-white/50 rounded-lg border border-indigo-100 text-[10px] h-24 resize-none outline-none" placeholder="Paste site discussion notes..." />
                </div>
                <div className="p-4 bg-cyan-50/50 rounded-xl border border-cyan-100 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[10px] font-black text-cyan-800 uppercase tracking-widest">Voice Upload</h3>
                    <button onClick={() => voiceInputRef.current?.click()} className="text-[9px] font-black text-cyan-600 uppercase hover:underline">Select Audio</button>
                    <input type="file" ref={voiceInputRef} className="hidden" accept="audio/*" onChange={handleVoiceUpload} />
                  </div>
                  {isTranscribing ? <div className="flex-1 flex items-center justify-center animate-pulse text-[9px] font-black text-cyan-600 uppercase">Transcribing...</div> : <textarea value={voiceTranscript} onChange={e => setVoiceTranscript(e.target.value)} className="flex-1 w-full p-3 bg-white/50 rounded-lg border border-cyan-100 text-[10px] h-24 resize-none outline-none" placeholder="Voice transcripts..." />}
                </div>
              </div>

              <div className="flex gap-2">
                <input type="text" value={linkedUrl} onChange={e => setLinkedUrl(e.target.value)} placeholder="CTMS/SharePoint Link for context..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] outline-none" />
                <button className="px-4 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">FETCH</button>
              </div>

              <button onClick={runSynthesis} disabled={isProcessing} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                Generate Artifacts
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative h-full">
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex bg-slate-200/50 p-1 rounded-lg">
                {(['report', 'follow-up', 'confirmation'] as OutputTab[]).map(ot => (
                  <button key={ot} onClick={() => setActiveOutputTab(ot)} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${activeOutputTab === ot ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400'}`}>{ot.replace('-', ' ')}</button>
                ))}
              </div>
              {currentReport && <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase shadow-sm">EXPORT</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
              {isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                  <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Processing Hub Active...</span>
                </div>
              ) : activeOutputTab === 'report' ? (
                currentReport ? (
                  <div className="bg-white shadow-2xl p-10 rounded-sm prose prose-sm max-w-none min-h-[600px] animate-in fade-in zoom-in-95">
                    <div dangerouslySetInnerHTML={{ __html: currentReport.contentHtml || '' }} />
                    <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between gap-4 no-print">
                      <button onClick={handleCreateFollowUp} className="flex-1 py-3 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-100 transition-colors">Generate PI Follow-up Letter</button>
                      <div className="flex-1 flex gap-2">
                        <input type="date" value={nextVisitDate} onChange={e => setNextVisitDate(e.target.value)} className="flex-1 border-slate-200 rounded-lg text-[10px] p-2 outline-none bg-indigo-50/20" />
                        <button onClick={handleCreateConfirmation} className="px-6 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">Confirm Next</button>
                      </div>
                    </div>
                  </div>
                ) : <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Ready for Ingestion</div>
              ) : activeOutputTab === 'follow-up' ? (
                followUpHtml ? <div className="bg-white shadow-2xl p-10 rounded-sm prose prose-sm max-w-none min-h-[600px] animate-in slide-in-from-right-4" dangerouslySetInnerHTML={{ __html: followUpHtml }} /> : <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px]">Follow-up letter pending synthesis</div>
              ) : (
                confirmationHtml ? <div className="bg-white shadow-2xl p-10 rounded-sm prose prose-sm max-w-none min-h-[600px] animate-in slide-in-from-right-4" dangerouslySetInnerHTML={{ __html: confirmationHtml }} /> : <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px]">Confirmation letter pending next visit date</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-6 py-4">Submission ID</th><th className="px-6 py-4">Project</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors text-[11px]">
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">{r.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{r.projectNumber}</td>
                  <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">{r.audit.modelAccuracy}% Precision</span></td>
                  <td className="px-6 py-4 text-right"><button onClick={() => { setCurrentReport(r); setViewMode('builder'); setActiveOutputTab('report'); }} className="text-cyan-600 font-black uppercase hover:underline">Restore</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MonitoringReportGenerator;
