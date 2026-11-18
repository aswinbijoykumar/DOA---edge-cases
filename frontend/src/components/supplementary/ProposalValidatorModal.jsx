import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  FileText, 
  HelpCircle, 
  Send, 
  Layers, 
  Building2, 
  ArrowRight,
  Info,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export default function ProposalValidatorModal({
  isOpen,
  onClose,
  initialData = {},
  onProceedWithException,
  onValidationSuccess
}) {
  const [formData, setFormData] = useState({
    decision_area: initialData.decision_area || '',
    parent_function: initialData.parent_function || 'Finance',
    business_line: initialData.business_line || 'General Corporate Management',
    proposer: initialData.proposer || 'Business Line Analyst',
    reviewer: initialData.reviewer || 'Head of Finance / Reviewer',
    endorser: initialData.endorser || '',
    final_approver: initialData.final_approver || 'Board of Directors',
    rationale: initialData.rationale || '',
    financial_classification: initialData.financial_classification || 'FINANCIAL',
    currency: initialData.currency || 'BHD',
    monetary_amount: initialData.monetary_amount || 50000,
    selected_expenditure_limit_id: initialData.selected_expenditure_limit_id || '',
    entity: initialData.entity || 'Bahrain B.S.C.',
    effective_date: initialData.effective_date || new Date().toISOString().split('T')[0],
    governance_pathway: initialData.governance_pathway || ['Proposer', 'Reviewer', 'Approver'],
    board_committees_involved: initialData.board_committees_involved || [],
    authoritative_source_ids: initialData.authoritative_source_ids || [],
    supporting_documentation: initialData.supporting_documentation || ['Charter_Resolution_Signed.pdf'],
    has_approved_exception: false
  });

  const [availableSources, setAvailableSources] = useState([]);
  const [expenditureLimits, setExpenditureLimits] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [srcRes, limRes] = await Promise.all([
        api.getAuthoritativeSources().catch(() => []),
        api.getExpenditureLimits().catch(() => [])
      ]);
      setAvailableSources(srcRes || []);
      setExpenditureLimits(limRes || []);
    } catch (err) {
      console.error('Failed to load validation master data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await api.validateDecisionAreaProposal(formData);
      setValidationResult(res);
      if (res.can_submit && onValidationSuccess) {
        onValidationSuccess(formData, res);
      }
    } catch (err) {
      setValidationResult({
        can_submit: false,
        classification: 'MANAGEMENT_LEVEL',
        hard_stops: [{
          ref: 'NET-ERR',
          message: err.message || 'Validation request failed'
        }],
        warnings: []
      });
    } finally {
      setValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                DOA Decision Area Pre-Submission Validator
                <span className="text-xs bg-indigo-500/30 text-indigo-300 font-medium px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  VAL-01 — VAL-12
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Executes regulatory hard-stop validations, SoD checks, and Audit Committee sequencing prior to submission.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Decision Area Title *
              </label>
              <input 
                type="text"
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Treasury Borrowing Facility Approvals"
                value={formData.decision_area}
                onChange={e => setFormData({ ...formData, decision_area: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Parent Function & Entity *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.parent_function}
                  onChange={e => setFormData({ ...formData, parent_function: e.target.value })}
                >
                  <option value="Finance">Finance</option>
                  <option value="Risk">Risk</option>
                  <option value="Operations">Operations</option>
                  <option value="Governance">Governance</option>
                </select>
                <select 
                  className="text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.entity}
                  onChange={e => setFormData({ ...formData, entity: e.target.value })}
                >
                  <option value="Bahrain B.S.C.">Bahrain B.S.C.</option>
                  <option value="KSA LLC">KSA LLC</option>
                  <option value="UAE Branch">UAE Branch</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Proposer (P) & Reviewer (R) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text"
                  placeholder="Proposer"
                  className="text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.proposer}
                  onChange={e => setFormData({ ...formData, proposer: e.target.value })}
                />
                <input 
                  type="text"
                  placeholder="Reviewer"
                  className="text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.reviewer}
                  onChange={e => setFormData({ ...formData, reviewer: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Final Approver (A) *
              </label>
              <select 
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={formData.final_approver}
                onChange={e => setFormData({ ...formData, final_approver: e.target.value })}
              >
                <option value="Board of Directors">Board of Directors (Board-Level)</option>
                <option value="Shareholders">Shareholders (Board-Level)</option>
                <option value="Audit Committee">Audit Committee (Board Committee)</option>
                <option value="Group CEO">Group CEO (Board-Level)</option>
                <option value="Chief Executive Officer">Chief Executive Officer (Board-Level)</option>
                <option value="Chief Financial Officer">Chief Financial Officer (Management-Level)</option>
                <option value="Head of Division">Head of Division (Management-Level)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Authoritative Governance Source Links (VAL-01) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                {availableSources.map(s => {
                  const isChecked = formData.authoritative_source_ids.includes(s.id);
                  return (
                    <label 
                      key={s.id} 
                      className={`flex items-start gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                        isChecked ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-medium' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              authoritative_source_ids: [...formData.authoritative_source_ids, s.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              authoritative_source_ids: formData.authoritative_source_ids.filter(id => id !== s.id)
                            });
                          }
                        }}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="leading-tight">
                        <span className="font-semibold">{s.name}</span>
                        <span className="block text-[10px] text-slate-500">Ref: {s.reference} ({s.relevant_clause || 'General'})</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Controlled Expenditure Limit (VAL-11)
              </label>
              <select 
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.selected_expenditure_limit_id}
                onChange={e => setFormData({ ...formData, selected_expenditure_limit_id: e.target.value })}
              >
                <option value="">-- Or enter custom monetary amount --</option>
                {expenditureLimits.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.tier_name}: {l.currency} {l.amount?.toLocaleString()} (Max: {l.max_ceiling ? l.max_ceiling.toLocaleString() : 'Open'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Governance Sequence (VAL-08)
              </label>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 py-2">
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">Proposer</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">Reviewer</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 font-semibold">Approver</span>
              </div>
            </div>
          </div>

          {/* Validation Diagnostics Output */}
          {validationResult && (
            <div className={`p-4 rounded-xl border transition-all ${
              validationResult.can_submit 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {validationResult.can_submit ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <h3 className="text-sm font-bold">
                    {validationResult.can_submit 
                      ? 'Pre-Submission Validation Passed' 
                      : 'Hard-Stop Validation Blocks Detected'}
                  </h3>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  validationResult.classification === 'BOARD_LEVEL'
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  Classification: {validationResult.classification}
                </span>
              </div>

              {/* Hard Stops List */}
              {validationResult.hard_stops?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-rose-800">
                    The following governance rules prevent standard submission:
                  </p>
                  <ul className="space-y-1">
                    {validationResult.hard_stops.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-rose-900 bg-white/80 p-2 rounded-lg border border-rose-200">
                        <span className="font-mono text-[10px] font-bold bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded">
                          {err.ref}
                        </span>
                        <span>{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Callout if Blocked */}
              {!validationResult.can_submit && (
                <div className="mt-4 pt-3 border-t border-rose-200/80 flex items-center justify-between">
                  <p className="text-xs text-rose-800">
                    Cannot proceed with standard workflow. Submit through the multi-stage <strong>Exception Workflow</strong> (Section 4.3).
                  </p>
                  <button 
                    onClick={() => {
                      if (onProceedWithException) {
                        onProceedWithException(formData, validationResult);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Route to Exception Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Simulates pre-submission schema rules against master DOA policy records.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {validating ? (
                <span>Validating...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Pre-Submission Check</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
