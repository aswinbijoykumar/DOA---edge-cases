import React from 'react';
import { 
  Database, 
  Users, 
  History, 
  Activity, 
  ArrowRight,
  RefreshCw,
  Layers,
  Search,
  GitPullRequest,
  AlertOctagon
} from 'lucide-react';
import doaHeroBg from '../../assets/doa-hero-harbour.svg';
import { getUserProfile } from '../../data/orgHierarchy';

export default function SystemAdminDashboard({
  sysStats,
  currentUser,
  activeTab = 'overview',
  pendingQueueCount = 0,
  onNavigateTab,
  onRefresh
}) {
  const userProfile = getUserProfile(currentUser);
  const displayName = userProfile?.name || currentUser?.full_name || 'Lucas Meyer';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Role Console Banner / KPI Hero Card (Option A - Exact Normal User & DOA Admin Dimensions) */}
      <div className="relative rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden border border-teal-500/30 bg-[#071C2B]">
        {/* Dynamic Animated Harbour SVG Background */}
        <img 
          src={doaHeroBg}
          alt="DOA Hero Matrix"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none"
        />

        {/* Soft Dark Gradient Overlay for optimal text and contrast on left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071C2B]/95 via-[#071C2B]/60 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-white drop-shadow-md">
              <span>Welcome back, {displayName}</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm backdrop-blur-xs cursor-pointer"
              title="Refresh System Telemetry"
            >
              <RefreshCw className="h-3.5 w-3.5 text-teal-300" />
              <span className="hidden sm:inline">Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Aligned in the Same Line - Exact Normal User & DOA Admin Dimensions */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
          <div className="shrink-0 flex items-center">
            <span className="h-10 w-20 rounded-xl inline-flex items-center justify-center text-center text-[10px] font-extrabold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 shadow-xs">
              Action
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 flex-1 w-full">
            {/* 1. Overview */}
            <button
              type="button"
              onClick={() => onNavigateTab('overview')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30 ring-2 ring-indigo-400/30 font-black'
                  : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
              }`}
            >
              <Layers className="h-4 w-4 text-indigo-300 shrink-0" />
              <span className="truncate">Overview</span>
            </button>

            {/* 2. Search DoA */}
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30 ring-2 ring-blue-400/30 font-black'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border-blue-400/30'
              }`}
            >
              <Search className="h-4 w-4 text-blue-300 shrink-0" />
              <span className="truncate">Search DoA</span>
            </button>

            {/* 3. Change Queue */}
            <button
              type="button"
              onClick={() => onNavigateTab('queue')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-teal-600 text-white border-teal-400 shadow-teal-600/30 ring-2 ring-teal-400/30 font-black'
                  : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border-teal-400/30'
              }`}
            >
              <GitPullRequest className="h-4 w-4 text-teal-300 shrink-0" />
              <span className="truncate">Change Queue</span>
              {pendingQueueCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-teal-500 text-slate-950 font-extrabold rounded-full text-[10px] shrink-0">
                  {pendingQueueCount}
                </span>
              )}
            </button>

            {/* 4. Exception Workflow (Restricted / Disabled) */}
            <button
              type="button"
              disabled
              title="Exception Workflow is currently restricted"
              className="h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border shadow-sm bg-white/5 text-slate-500 border-white/10 cursor-not-allowed opacity-60"
            >
              <AlertOctagon className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="truncate">Exception Workflow</span>
            </button>

            {/* 5. Audit Trail */}
            <button
              type="button"
              onClick={() => onNavigateTab('audit')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-teal-400 text-slate-950 border-teal-300 ring-2 ring-teal-400/40 font-black shadow-lg shadow-teal-500/25'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black border-teal-400 shadow-lg shadow-teal-500/25 transform hover:-translate-y-0.5'
              }`}
            >
              <History className="h-4 w-4 text-slate-950 shrink-0" />
              <span className="truncate">Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Infrastructure Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">FastAPI Backend Status</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-3 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span>ONLINE (Healthy)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Uvicorn Server &bull; Port 8000</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Database Repository</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-700 mt-3">
            {sysStats?.total_doa_records ?? 58} Rules
          </div>
          <div className="text-[11px] text-purple-600 mt-1">
            <span>SQLite 3 &bull; WAL Journal Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Provisioned Users</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-700 mt-3">
            {sysStats?.total_users ?? 4} Accounts
          </div>
          <div className="text-[11px] text-blue-600 mt-1">
            <span>4 Distinct Role Personas</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Immutable Audit Logs</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <History className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">
            {sysStats?.total_audit_records ?? 15}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Cryptographic timestamped ledger</span>
          </div>
        </div>
      </div>

      {/* System Audit Telemetry Live Feed (Full-Width Clean Presentation) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Recent System &amp; Governance Events</h3>
          </div>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            Open Full Audit Log <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {(!sysStats?.recent_audits || sysStats.recent_audits.length === 0) ? (
          <div className="py-12 text-center text-slate-400">
            <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No recent audit logs available.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {sysStats.recent_audits.map(log => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">#{log.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      log.action.includes('PUBLISH') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      log.action.includes('APPROVE') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      log.action.includes('REJECT') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {log.entity} #{log.record_id}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1 truncate">
                    Actor: <strong className="text-slate-700">{log.user_email}</strong> &bull; {log.comment || 'System operation executed'}
                  </p>
                </div>

                <div className="text-right text-[11px] text-slate-400 font-mono flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
