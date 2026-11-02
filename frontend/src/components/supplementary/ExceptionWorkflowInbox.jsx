import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  Building2,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';

export default function ExceptionWorkflowInbox({
  currentUser,
  onRefreshStats
}) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedException, setSelectedException] = useState(null);
  const [actionRationale, setActionRationale] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const data = await api.getExceptionRequests();
      setExceptions(data || []);
      if (data?.length > 0 && !selectedException) {
        setSelectedException(data[0]);
      }
    } catch (err) {
      console.error('Failed to load exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!actionRationale.trim()) {
      setMsg({ text: 'Mandatory decision rationale is required by BRD Section 4.3.', type: 'error' });
      return;
    }
    setActionLoading(true);
    setMsg({ text: '', type: '' });
    const normalizedAction = action.startsWith('RETURN') ? 'RETURN' : action;
    try {
      await api.actionExceptionRequest(selectedException.id, normalizedAction, actionRationale);
      setMsg({ text: `Exception request successfully updated (${normalizedAction}).`, type: 'success' });
      setActionRationale('');
      await loadExceptions();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      setMsg({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = exceptions.filter(e => {
    if (statusFilter === 'ALL') return true;
    return e.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
              BRD Section 4.3 & 4.5
            </span>
            <span className="text-xs text-slate-400">4-Stage Approval Route</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Exceptional Decision Areas & Workflow Cockpit
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Permission-controlled routing for justified deviations from standard DOA principles. Captures mandatory rationales, amendments, returns, and decision history.
          </p>
        </div>

        <button 
          onClick={loadExceptions}
          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-white/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Exceptions List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Exception Requests ({filtered.length})
            </span>
            <div className="flex gap-1.5">
              {['ALL', 'SUBMITTED', 'GOVERNANCE_REVIEW'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                    statusFilter === st 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading exception requests...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No exception requests found.</div>
            ) : (
              filtered.map(item => {
                const isSelected = selectedException?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedException(item)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-indigo-700">
                        {item.id}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'APPROVED' || item.status === 'GOVERNANCE_APPROVED'
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.status.includes('REJECT')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                      {item.decision_area_title || item.change_request_id || `Exception #${item.id}`}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{item.entity || item.requester_email}</span>
                      <span>•</span>
                      <span>Deviated: {((item.deviated_principles || item.deviated_validation_rules || [])).join(', ') || 'Custom'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Exception Detail & Action Cockpit */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[650px] overflow-y-auto">
          {selectedException ? (
            <div className="space-y-6">
              
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-600">{selectedException.id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-600">{selectedException.entity || selectedException.requester_email}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedException.decision_area_title || selectedException.change_request_id || `Exception #${selectedException.id}`}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Stage</span>
                  <span className="text-xs font-bold text-slate-700">{selectedException.current_stage || selectedException.status}</span>
                </div>
              </div>

              {/* Deviated Rules & Rationale */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertOctagon className="w-4 h-4 text-amber-600" />
                  <span>Deviated Validation Principles: {((selectedException.deviated_principles || selectedException.deviated_validation_rules || [])).join(', ') || 'Policy Variance'}</span>
                </div>
                <div className="text-xs text-amber-950 bg-white/80 p-3 rounded-lg border border-amber-200">
                  <p className="font-semibold text-slate-700 mb-1">Mandatory Business / Regulatory Rationale:</p>
                  <p className="italic">{selectedException.rationale || selectedException.regulatory_or_business_rationale || 'Documented exception rationale.'}</p>
                </div>
              </div>

              {/* Multi-Stage Routing Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Governance Pathway Progress (Section 4.3)
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border ${
                    selectedException.reporting_mgr_decision === 'APPROVE' || selectedException.reporting_mgr_approval 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Step 1</span>
                    <span className="font-semibold text-slate-800">Reporting Mgr</span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      {selectedException.reporting_mgr_decision || (selectedException.reporting_mgr_approval ? 'Approved' : 'Pending')}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    selectedException.division_head_decision === 'APPROVE' || selectedException.division_head_approval 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Step 2</span>
                    <span className="font-semibold text-slate-800">Division Head</span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      {selectedException.division_head_decision || (selectedException.division_head_approval ? 'Approved' : 'Pending')}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    selectedException.governance_decision === 'APPROVE' || selectedException.governance_senior_reviewer_approval 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Step 3</span>
                    <span className="font-semibold text-slate-800">Senior Governance</span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      {selectedException.governance_decision || (selectedException.governance_senior_reviewer_approval ? 'Approved' : 'Pending')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Decision Action Form */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Record Action Rationale (Mandatory for Approval/Return) *
                </label>
                <textarea
                  rows={3}
                  value={actionRationale}
                  onChange={e => setActionRationale(e.target.value)}
                  placeholder="Enter explicit rationale, comments, or required revisions..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleAction('RETURN_FOR_COMMENTS')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return with Comments</span>
                  </button>

                  <button
                    onClick={() => handleAction('REJECT')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Exception</span>
                  </button>

                  <button
                    onClick={() => handleAction('APPROVE')}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Exception</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select an exception request to view details and action.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
