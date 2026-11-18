import React, { useState } from 'react';
import { 
  History, 
  Calendar, 
  Search, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Building2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export default function PointInTimeReconstructionView() {
  const [targetDate, setTargetDate] = useState('2026-01-01');
  const [entity, setEntity] = useState('Bahrain B.S.C.');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReconstruct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.reconstructPointInTime(targetDate, entity || null);
      setSnapshot(res);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reconstruct historical snapshot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
              BRD Section 5: Auditable Reconstruction
            </span>
            <span className="text-xs text-slate-400">Point-in-Time Temporal Audit Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Historical Point-in-Time DOA Reconstruction
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Select any past date to reconstruct and inspect the exact legally binding authority matrix, authority holders, limits, and governing sources that were effective on that date.
          </p>
        </div>
      </div>

      {/* Date Query Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleReconstruct} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Target Historical Date *</span>
            </label>
            <input 
              type="date"
              required
              className="text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Entity Filter (Optional)</span>
            </label>
            <select
              className="text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={entity}
              onChange={e => setEntity(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="Bahrain B.S.C.">Bahrain B.S.C.</option>
              <option value="KSA LLC">KSA LLC</option>
              <option value="UAE Branch">UAE Branch</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Reconstructing Matrix...' : 'Reconstruct Historical State'}</span>
          </button>
        </form>

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Snapshot Output View */}
      {snapshot && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Audit Dossier</span>
              <h3 className="text-base font-bold text-slate-900">
                Active Authority Matrix on {snapshot.target_date} ({snapshot.entity_scope})
              </h3>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
              {snapshot.total_records_effective} Effective Records
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {snapshot.effective_records?.map((rec, idx) => (
              <div key={idx} className="py-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700">{rec.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-600">{rec.parent_function} / {rec.business_line}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{rec.decision_area}</h4>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Version Effective: {rec.effective_version_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Proposer</span>
                    <span className="font-medium text-slate-800">{rec.proposer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Reviewer</span>
                    <span className="font-medium text-slate-800">{rec.reviewer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Final Approver</span>
                    <span className="font-semibold text-indigo-700">{rec.approver || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Classification</span>
                    <span className="font-medium text-slate-700">{rec.classification || 'MANAGEMENT_LEVEL'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
