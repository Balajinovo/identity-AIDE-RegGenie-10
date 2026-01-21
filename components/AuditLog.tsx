
import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/dbService';
import { AuditEntry } from '../types';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const data = await getAuditLogs();
      setLogs(data.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Runtime Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-1">Immutable log of user interactions and clinical decisions for compliance verification.</p>
          </div>
          <div className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded shadow-sm flex items-center gap-2 uppercase tracking-tighter">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Active Sessions: LIVE
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Audit Cache...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-20 text-center text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <p className="font-bold text-slate-500 uppercase tracking-widest">No activity recorded</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Operator</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Verification Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter">
                          {log.user.substring(0, 2)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-slate-200">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-black text-indigo-700 uppercase tracking-tight">{log.action}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] text-slate-500 leading-relaxed max-w-md line-clamp-2 italic">
                        "{log.details}"
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
