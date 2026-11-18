import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Send, 
  X, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';

export default function ExceptionRequestModal({
  isOpen,
  onClose,
  initialData = {},
  onSuccess
}) {
  const [formData, setFormData] = useState({
    decision_area_id: initialData.id || '',
    decision_area_title: initialData.decision_area || initialData.decision_area_title || '',
    entity: initialData.entity || 'Bahrain B.S.C.',
    exception_type: initialData.exception_type || 'SEGREGATION_OF_DUTIES_DEVIATION',
    deviated_validation_rules: initialData.deviated_validation_rules || ['VAL-06'],
    regulatory_or_business_rationale: '',
    reporting_manager_email: 'dept.owner@doa.local',
    division_head_email: 'approver@doa.local',
    supporting_evidence_files: ['Regulatory_Waiver_Memo_Signed.pdf'],
    proposed_authority_details: {
      proposed_limit: initialData.monetary_amount || 50000,
      currency: initialData.currency || 'BHD',
      effective_date: initialData.effective_date || new Date().toISOString().split('T')[0]
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.regulatory_or_business_rationale.trim()) {
      setErrorMsg('Mandatory regulatory or business rationale is required.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.createExceptionRequest(formData);
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit exception request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-900 via-rose-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl">
              <AlertOctagon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Submit Governance Exception Request
                <span className="text-xs bg-amber-500/30 text-amber-200 font-medium px-2 py-0.5 rounded-full border border-amber-400/30">
                  Section 4.3
                </span>
              </h2>
              <p className="text-xs text-amber-200/70">
                Routes via Reporting Manager $\rightarrow$ Division Head $\rightarrow$ Central DOA Governance Reviewer.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Decision Area Title *
              </label>
              <input 
                type="text"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.decision_area_title}
                onChange={e => setFormData({ ...formData, decision_area_title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Jurisdiction Entity *
              </label>
              <select 
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.entity}
                onChange={e => setFormData({ ...formData, entity: e.target.value })}
              >
                <option value="Bahrain B.S.C.">Bahrain B.S.C.</option>
                <option value="KSA LLC">KSA LLC</option>
                <option value="UAE Branch">UAE Branch</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Exception Classification *
              </label>
              <select 
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.exception_type}
                onChange={e => setFormData({ ...formData, exception_type: e.target.value })}
              >
                <option value="SEGREGATION_OF_DUTIES_DEVIATION">Segregation of Duties (VAL-06)</option>
                <option value="EVIDENCE_WAIVER">Evidence Exemption / Authoritative Source Waiver (VAL-01)</option>
                <option value="AUDIT_COMMITTEE_SEQUENCE_OVERRIDE">Audit Committee Sequence Override (VAL-03)</option>
                <option value="GOVERNANCE_PATHWAY_OVERRIDE">Pathway Sequence Override (VAL-08)</option>
                <option value="AUTHORITY_LIMIT_CEILING_OVERRIDE">Authority Limit Ceiling Override (VAL-11)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deviated Validation Rules
              </label>
              <input 
                type="text"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-mono text-slate-600"
                value={formData.deviated_validation_rules.join(', ')}
                onChange={e => setFormData({ 
                  ...formData, 
                  deviated_validation_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Documented Regulatory or Business Rationale (Mandatory) *
            </label>
            <textarea 
              rows={4}
              required
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="State the explicit statutory requirement, regulatory waiver, operational bottleneck, or board mandate necessitating deviation from standard DOA validation rules..."
              value={formData.regulatory_or_business_rationale}
              onChange={e => setFormData({ ...formData, regulatory_or_business_rationale: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Step 1: Reporting Manager Reviewer
              </label>
              <input 
                type="email"
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                value={formData.reporting_manager_email}
                onChange={e => setFormData({ ...formData, reporting_manager_email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Step 2: Division Head Reviewer
              </label>
              <input 
                type="email"
                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                value={formData.division_head_email}
                onChange={e => setFormData({ ...formData, division_head_email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting Exception...' : 'Submit Exception Request'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
