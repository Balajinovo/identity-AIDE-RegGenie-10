
import React from 'react';
import { SYSTEM_BUILD_HISTORY } from '../constants';

const RegulatoryDatabase: React.FC = () => {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="bg-white rounded-xl border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">System Build Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-1">Tracing all functional requirements and prompts used to iterate this platform.</p>
          </div>
          <div className="text-[10px] font-black bg-cyan-600 text-white px-3 py-1.5 rounded shadow-sm flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            TOTAL REQUIREMENTS: {SYSTEM_BUILD_HISTORY.length}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Version / ID</th>
                <th className="px-6 py-4">Requirement Prompt</th>
                <th className="px-6 py-4">Implementation Scope</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SYSTEM_BUILD_HISTORY.slice().reverse().map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs font-black text-slate-900">v{req.version}</div>
                    <div className="text-[10px] font-mono text-cyan-600 font-bold">{req.id}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xl">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                      "{req.prompt}"
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {req.scope.map((s) => (
                        <span
                          key={s}
                          className="text-[8px] bg-white text-slate-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-slate-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-[10px] text-slate-400 font-mono">
                    {new Date(req.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {SYSTEM_BUILD_HISTORY.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
            <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-bold text-slate-500 uppercase tracking-widest">No requirements logged</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegulatoryDatabase;
