import React, { useState } from 'react';
import { 
  X, 
  Network, 
  Mail, 
  Building2, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown
} from 'lucide-react';
import { ORG_MEMBERS, getUserProfile } from '../../data/orgHierarchy';

export default function OrgChartModal({ isOpen, onClose, initialUser }) {
  const initialProfile = getUserProfile(initialUser);
  const [focusedEmail, setFocusedEmail] = useState(initialProfile.email);

  if (!isOpen) return null;

  const currentPerson = ORG_MEMBERS[focusedEmail] || initialProfile;
  const reportsToManager = currentPerson.reportsTo ? (
    ORG_MEMBERS[currentPerson.reportsTo.email] || {
      name: currentPerson.reportsTo.name,
      designation: currentPerson.reportsTo.designation || currentPerson.reportsTo.role,
      role: currentPerson.reportsTo.role,
      email: currentPerson.reportsTo.email,
      avatar: currentPerson.reportsTo.avatar,
      department: 'Executive Office'
    }
  ) : null;

  const directReports = (currentPerson.directReportsEmails || [])
    .map(email => ORG_MEMBERS[email])
    .filter(Boolean);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Modal Top Header (Concise with No "MS Teams View" text) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-xs">
              <Network className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Organization Hierarchy
              </h3>
              <p className="text-[11px] text-slate-300">
                Reporting structure &amp; chain of command
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Concise Hierarchy Tree (Focus member section completely removed) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">

          {/* LEVEL 1: MANAGER / REPORTS TO (IF APPLICABLE) */}
          {reportsToManager && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <ArrowUp className="h-2.5 w-2.5 text-indigo-500" />
                <span>Reports To (Manager)</span>
              </div>
              
              <div 
                onClick={() => {
                  if (ORG_MEMBERS[reportsToManager.email]) {
                    setFocusedEmail(reportsToManager.email);
                  }
                }}
                className={`w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xs p-2.5 flex items-center gap-3 transition-all ${
                  ORG_MEMBERS[reportsToManager.email] 
                    ? 'hover:border-indigo-400 hover:shadow-xs cursor-pointer group' 
                    : 'opacity-90'
                }`}
              >
                <div className="relative shrink-0">
                  {reportsToManager.avatar ? (
                    <img
                      src={reportsToManager.avatar}
                      alt={reportsToManager.name}
                      className="w-10 h-10 rounded-full object-cover border border-indigo-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200 shadow-2xs text-xs">
                      {reportsToManager.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {reportsToManager.name}
                    </h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                      Manager
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {reportsToManager.designation || reportsToManager.role}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5" />
                    <span>{reportsToManager.email}</span>
                  </p>
                </div>
              </div>

              {/* Connecting Connector Line */}
              <div className="w-0.5 h-4 bg-indigo-300 my-0.5" />
              <div className="w-2 h-2 rounded-full bg-indigo-500 -mt-1 shadow-2xs" />
            </div>
          )}

          {/* LEVEL 2: ACTIVE FOCUS CARD */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md bg-white rounded-2xl border-2 border-indigo-500 shadow-md p-4 relative">
              <div className="flex items-start gap-3.5">
                <div className="relative shrink-0">
                  <img
                    src={currentPerson.avatar}
                    alt={currentPerson.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-2xs" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">
                      {currentPerson.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-indigo-600 text-white shadow-2xs shrink-0">
                      Focus
                    </span>
                  </div>
                  <p className="text-xs font-bold text-indigo-600 mt-0.5 truncate">
                    {currentPerson.designation}
                  </p>

                  <div className="mt-1.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {currentPerson.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Rows */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                  <span className="truncate font-medium">{currentPerson.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Building2 className="h-3 w-3 text-indigo-500 shrink-0" />
                  <span className="truncate font-medium">{currentPerson.entity}</span>
                </div>
              </div>
            </div>

            {/* Connecting Connector Line downwards (if direct reports exist) */}
            {directReports.length > 0 && (
              <>
                <div className="w-0.5 h-4 bg-indigo-300 mt-0.5" />
                <div className="w-2 h-2 rounded-full bg-indigo-500 -mt-1 shadow-2xs" />
              </>
            )}
          </div>

          {/* LEVEL 3: DIRECT REPORTS / TEAM */}
          {directReports.length > 0 && (
            <div>
              <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-center gap-1">
                <ArrowDown className="h-2.5 w-2.5 text-indigo-500" />
                <span>Direct Reports ({directReports.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto">
                {directReports.map((report) => (
                  <div
                    key={report.email}
                    onClick={() => setFocusedEmail(report.email)}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-400 p-2.5 flex items-center gap-2.5 transition-all cursor-pointer group"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={report.avatar}
                        alt={report.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 group-hover:border-indigo-400 transition-colors shadow-2xs"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-[11px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {report.name}
                        </h5>
                        <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {report.designation}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {report.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Note: Redundant footer with "Click on any manager..." and "Close" button removed as requested */}

      </div>
    </div>
  );
}
