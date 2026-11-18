import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Filter, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';

export default function BahrainKsaAlignmentReportView() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'MATCHES' | 'MISMATCHES'

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.getBahrainKsaAlignmentReport();
      setReport(data);
    } catch (err) {
      console.error('Failed to load alignment report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
              Cross-Geography Acceptance Criterion
            </span>
            <span className="text-xs text-slate-400">Jurisdiction Reconciliation Engine</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Bahrain–KSA DOA Alignment & Reconciliation Dossier
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Reconciles underlying mapped decision areas between Bahrain B.S.C. and KSA LLC, separating complete matches from authority limit and pathway mismatches.
          </p>
        </div>

        <button 
          onClick={loadReport}
          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-white/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-run Alignment Audit</span>
        </button>
      </div>

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Mapped Areas</span>
            <span className="text-2xl font-black text-slate-900">{report.total_decision_areas_mapped}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Dual-Jurisdiction Scope</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Complete Matches</span>
            <span className="text-2xl font-black text-emerald-600">{report.complete_matches_count}</span>
            <span className="text-[11px] text-emerald-600/80 block mt-1">Identical Limits & Pathways</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">Mismatched Areas</span>
            <span className="text-2xl font-black text-rose-600">{report.mismatches_count}</span>
            <span className="text-[11px] text-rose-600/80 block mt-1">Requiring Harmonization</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Harmonization Alignment</span>
            <span className="text-2xl font-black text-indigo-600">{report.alignment_percentage}%</span>
            <span className="text-[11px] text-slate-400 block mt-1">Governance Parity Score</span>
          </div>
        </div>
      )}

      {/* Detailed Tables */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tabFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Items ({report?.total_decision_areas_mapped || 0})
            </button>
            <button
              onClick={() => setTabFilter('MATCHES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tabFilter === 'MATCHES' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Complete Matches ({report?.complete_matches_count || 0})
            </button>
            <button
              onClick={() => setTabFilter('MISMATCHES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tabFilter === 'MISMATCHES' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Mismatches ({report?.mismatches_count || 0})
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Reconciliation generated: {report ? new Date(report.generated_at).toLocaleString() : ''}
          </span>
        </div>

        {/* Matches Section */}
        {(tabFilter === 'ALL' || tabFilter === 'MATCHES') && report?.complete_matches?.length > 0 && (
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Complete Parity Matches ({report.complete_matches.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.complete_matches.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{item.decision_area_title}</span>
                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                      Parity OK
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 text-[11px] mt-2">
                    <span>Bahrain: <strong>{item.bahrain_doa_id}</strong></span>
                    <span>•</span>
                    <span>KSA: <strong>{item.ksa_doa_id}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mismatches Section */}
        {(tabFilter === 'ALL' || tabFilter === 'MISMATCHES') && report?.mismatches?.length > 0 && (
          <div className="p-5">
            <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Mismatched Decision Areas & Required Alignment Outcomes ({report.mismatches.length})</span>
            </h3>
            <div className="space-y-3">
              {report.mismatches.map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-rose-200 shadow-sm text-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.decision_area_title}</h4>
                      <span className="text-[11px] text-slate-500">
                        Bahrain: {item.bahrain_doa_id} vs KSA: {item.ksa_doa_id}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                      {item.comparison_status}
                    </span>
                  </div>

                  <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                    <span className="font-semibold text-rose-900 block mb-0.5">Mismatch Reasons:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                      {item.mismatch_reasons.map((r, rIdx) => (
                        <li key={rIdx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                      Required Action: {item.required_alignment_outcome}
                    </span>
                    <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <span>Initiate Harmonization CR</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
