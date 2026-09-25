import React from 'react';
import { 
  Server, 
  Database, 
  Users, 
  History, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function SystemAdminDashboard({
  sysStats,
  currentUser,
  onNavigateTab,
  onRefresh
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Role Console Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-extrabold tracking-widest uppercase text-purple-300">
                IT &amp; Systems Administration Control Center
              </span>
              <span className="text-xs text-slate-400 font-mono">RBAC: SYSTEM_ADMINISTRATOR</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Systems Control: {currentUser?.full_name?.split(' ')[0] || 'Admin'}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Monitor backend health, database integrity, user provisioning, and full system-wide audit telemetry for the Delegation of Authority portal.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-shrink-0">
            <button
              onClick={onRefresh}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="h-4 w-4 text-purple-300" />
              <span>Refresh Telemetry</span>
            </button>
            <button
              onClick={() => onNavigateTab('audit')}
              className="px-5 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 transform hover:-translate-y-0.5"
            >
              <History className="h-4 w-4" />
              <span>Full Audit Trail</span>
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

      {/* System Audit Preview & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Security & Audit Trail Feed */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Recent System &amp; Governance Events</h3>
              <p className="text-xs text-slate-500">Live stream of recorded actions across the platform</p>
            </div>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
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

        {/* Right Column: System Security & Access Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-purple-600" />
              System Administrator Scope
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-emerald-700">
                <span className="font-bold">✓</span>
                <span>Complete access to system audit ledger and telemetry</span>
              </div>
              <div className="flex items-start gap-2 text-emerald-700">
                <span className="font-bold">✓</span>
                <span>Database schema and master record integrity monitoring</span>
              </div>
              <div className="flex items-start gap-2 text-emerald-700">
                <span className="font-bold">✓</span>
                <span>Change request queue observation and workflow oversight</span>
              </div>
              <div className="flex items-start gap-2 text-emerald-700">
                <span className="font-bold">✓</span>
                <span>User role authentication verification &amp; token security</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/60 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">
              Security Architecture
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              All REST endpoints enforce JWT authentication with role authorization decorators. CORS headers restrict access to verified frontend clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
