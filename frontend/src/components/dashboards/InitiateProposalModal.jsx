import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Briefcase, 
  ShieldCheck, 
  Search, 
  Paperclip, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { functionTaxonomy as defaultTaxonomy } from '../../data/doaData';

export default function InitiateProposalModal({
  isOpen,
  onClose,
  onSubmitProposal,
  doaRecords = [],
  functionTaxonomy = defaultTaxonomy,
  initialMode = 'Add',
  targetRecord = null
}) {
  const [actionMode, setActionMode] = useState(initialMode); // 'Add' | 'Modify' | 'Delete'
  const [selectedModifyId, setSelectedModifyId] = useState(targetRecord?.id || '');
  const [filterFunctionForSelect, setFilterFunctionForSelect] = useState('ALL');
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');

  // Extract all available functions dynamically from taxonomy and records
  const allFunctions = useMemo(() => {
    const fnSet = new Set(['Finance', 'Risk']);
    Object.keys(functionTaxonomy || {}).forEach(f => fnSet.add(f));
    doaRecords.forEach(r => {
      const f = r.parentFunction || r.parent_function || r.function;
      if (f) fnSet.add(f);
    });
    return Array.from(fnSet);
  }, [functionTaxonomy, doaRecords]);

  // Form state
  const [formData, setFormData] = useState({
    parentFunction: 'Finance',
    businessLine: 'Bank Capital and Capital Management',
    decisionArea: '',
    keyNonKey: 'Key',
    regulatory: 'N',
    authority: 'BoD (A) ← EXCO (R) ← CEO (P)',
    rationale: '',
    attachedFile: null
  });

  // Reset or initialize mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setActionMode(initialMode);
      if (targetRecord) {
        loadRecordIntoForm(targetRecord);
      } else if (initialMode === 'Add') {
        resetAddForm('Finance');
      }
    }
  }, [isOpen, initialMode, targetRecord]);

  // Available business lines for current function
  const availableBusinessLines = useMemo(() => {
    const list = (functionTaxonomy && functionTaxonomy[formData.parentFunction]) || [];
    if (list.length > 0) return list;
    if (formData.parentFunction === 'Risk') {
      return [
        'Wholesale Credit Risk',
        'Retail Credit Risk',
        'Market & Treasury Risk',
        'Operational & Non-Financial Risk',
        'Enterprise Risk Management (ERM)'
      ];
    }
    return [
      'Bank Capital and Capital Management',
      'Budgeting Processes and Financial Disclosures',
      'Treasury & Funding Operations',
      'Other Finance Processes'
    ];
  }, [formData.parentFunction, functionTaxonomy]);

  // Reset form for Add mode
  const resetAddForm = (funcName = 'Finance') => {
    setSelectedModifyId('');
    const lines = (functionTaxonomy && functionTaxonomy[funcName]) || [];
    setFormData({
      parentFunction: funcName,
      businessLine: lines[0] || 'Bank Capital and Capital Management',
      decisionArea: '',
      keyNonKey: 'Key',
      regulatory: 'N',
      authority: 'BoD (A) ← EXCO (R) ← CEO (P)',
      rationale: '',
      attachedFile: null
    });
  };

  // Populate form from a target record
  const loadRecordIntoForm = (rec) => {
    if (!rec) return;
    const pFunc = rec.parentFunction || rec.parent_function || rec.function || 'Finance';
    const bLine = rec.businessLine || rec.business_line || rec.category || 'Bank Capital and Capital Management';
    setSelectedModifyId(rec.id);
    setFormData({
      parentFunction: pFunc,
      businessLine: bLine,
      decisionArea: rec.decisionArea || rec.decision_area || '',
      keyNonKey: rec.keyNonKey || rec.key_non_key || 'Key',
      regulatory: rec.regulatory || 'N',
      authority: rec.composite_authority || rec.authority || 'BoD (A)',
      rationale: rec.comments || rec.rationale || '',
      attachedFile: null
    });
  };

  // Filtered records for Modify / Delete selector
  const selectableRecords = useMemo(() => {
    return doaRecords.filter(rec => {
      const pFunc = rec.parentFunction || rec.parent_function || rec.function;
      const matchFunc = filterFunctionForSelect === 'ALL' || pFunc === filterFunctionForSelect;
      const desc = (rec.decisionArea || rec.decision_area || '').toLowerCase();
      const matchQuery = !ruleSearchQuery || 
        rec.id?.toString().includes(ruleSearchQuery) || 
        desc.includes(ruleSearchQuery.toLowerCase());
      return matchFunc && matchQuery;
    });
  }, [doaRecords, filterFunctionForSelect, ruleSearchQuery]);

  // Handle Mode Change
  const handleModeSwitch = (newMode) => {
    setActionMode(newMode);
    if (newMode === 'Add') {
      resetAddForm(formData.parentFunction);
    } else if ((newMode === 'Modify' || newMode === 'Delete') && !selectedModifyId && doaRecords.length > 0) {
      loadRecordIntoForm(doaRecords[0]);
    }
  };

  // Handle Record Select for Modify/Delete
  const handleRecordSelectionChange = (recId) => {
    const target = doaRecords.find(r => r.id === recId || r.id === Number(recId));
    if (target) {
      loadRecordIntoForm(target);
    } else {
      setSelectedModifyId('');
    }
  };

  // Authority Presets
  const authorityPresets = [
    'Shareholders (A)',
    'BoD (A)',
    'BoD (A) ← EXCO (R) ← CEO (P)',
    'CEO (A) ← BRC (E1) ← CRO (R) ← AC (P)',
    'BoD (A) ← Chairman (E1) ← CEO (R) ← CFO (P)',
    'EXCO (A) ← Business Head (R) ← Unit Manager (P)'
  ];

  // Handle Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (actionMode === 'Add' && !formData.decisionArea.trim()) {
      alert('Please provide a Decision Area / Authority Description.');
      return;
    }
    if ((actionMode === 'Modify' || actionMode === 'Delete') && !selectedModifyId) {
      alert('Please select a decision rule to ' + (actionMode === 'Delete' ? 'delete' : 'modify') + '.');
      return;
    }
    if (!formData.rationale.trim()) {
      alert('Please provide a justification / rationale for this proposal.');
      return;
    }
    if (!formData.attachedFile) {
      alert('Please attach governance evidence / policy document. This is a mandatory requirement.');
      return;
    }

    const currentTargetRec = doaRecords.find(r => r.id === selectedModifyId || r.id === Number(selectedModifyId));

    onSubmitProposal({
      request_type: actionMode === 'Add' ? 'ADD' : actionMode === 'Modify' ? 'MODIFY' : 'DELETE',
      parentFunction: formData.parentFunction,
      businessLine: formData.businessLine,
      decisionArea: formData.decisionArea,
      keyNonKey: formData.keyNonKey,
      regulatory: formData.regulatory,
      authority: formData.authority,
      rationale: formData.rationale,
      attachedFile: formData.attachedFile,
      targetRecord: currentTargetRec
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">Initiate Proposal</h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

          {/* Action Mode Selector (Add / Modify / Delete) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            {[
              { id: 'Add', label: 'Add Decision Area', icon: Plus, activeBg: 'bg-white text-emerald-700 shadow-sm border border-emerald-200 font-black' },
              { id: 'Modify', label: 'Modify Decision Area', icon: Edit3, activeBg: 'bg-white text-blue-700 shadow-sm border border-blue-200 font-black' },
              { id: 'Delete', label: 'Delete Decision Area', icon: Trash2, activeBg: 'bg-white text-rose-700 shadow-sm border border-rose-200 font-black' },
            ].map(mode => {
              const Icon = mode.icon;
              const isActive = actionMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeSwitch(mode.id)}
                  className={`py-2.5 px-3 text-xs rounded-xl transition-all flex items-center justify-center gap-2 ${
                    isActive 
                      ? mode.activeBg 
                      : 'text-slate-700 hover:text-black hover:bg-slate-200/60 font-bold'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Target Rule Selector for Modify and Delete Modes */}
            {(actionMode === 'Modify' || actionMode === 'Delete') && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-cyan-600" />
                    <span>Select Target Rule to {actionMode === 'Delete' ? 'Retire / Delete' : 'Modify'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Filter Function:</span>
                    <select
                      value={filterFunctionForSelect}
                      onChange={(e) => setFilterFunctionForSelect(e.target.value)}
                      className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none"
                    >
                      <option value="ALL">All Functions ({doaRecords.length})</option>
                      {allFunctions.map(fn => (
                        <option key={fn} value={fn}>{fn}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={ruleSearchQuery}
                    onChange={(e) => setRuleSearchQuery(e.target.value)}
                    placeholder="Search by rule ID or keywords to find target record..."
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <select
                    value={selectedModifyId}
                    onChange={(e) => handleRecordSelectionChange(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 shadow-2xs"
                  >
                    <option value="">-- Choose a record from Delegation Matrix ({selectableRecords.length} available) --</option>
                    {selectableRecords.map(rec => (
                      <option key={rec.id} value={rec.id}>
                        #{rec.id} [{rec.parentFunction || rec.function || 'Finance'}] - {(rec.decisionArea || rec.decision_area || '').substring(0, 85)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* DELETE MODE WARNING & SUMMARY BANNER */}
            {actionMode === 'Delete' && selectedModifyId && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>Proposing Immediate Retirement / Deletion for Rule #{selectedModifyId}</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  This proposal requests archiving authority record <strong className="font-black text-rose-950">#{selectedModifyId}</strong> ({formData.decisionArea}) from the enterprise Delegation of Authority framework.
                </p>
                <div className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-rose-200 space-y-1">
                  <div><strong>Domain Function:</strong> {formData.parentFunction} ➔ {formData.businessLine}</div>
                  <div><strong>Current Authority:</strong> <code className="font-mono text-indigo-700 font-bold">{formData.authority}</code></div>
                  <div><strong>Classification:</strong> {formData.keyNonKey} | Regulatory: {formData.regulatory === 'Y' ? 'Mandated' : 'Internal'}</div>
                </div>
              </div>
            )}

            {/* FUNCTION LINE & BUSINESS LINE */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-cyan-600" />
                  Governance Function Line &amp; Business Process
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Function Line Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    Function Line <span className="text-rose-500 font-black">*</span>
                  </label>
                  <select
                    value={formData.parentFunction}
                    disabled={actionMode === 'Delete'}
                    onChange={(e) => {
                      const newFunc = e.target.value;
                      const nextLines = (functionTaxonomy && functionTaxonomy[newFunc]) || [];
                      setFormData(prev => ({
                        ...prev,
                        parentFunction: newFunc,
                        businessLine: nextLines[0] || 'Bank Capital and Capital Management'
                      }));
                    }}
                    required
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    {allFunctions.map(fn => (
                      <option key={fn} value={fn}>{fn}</option>
                    ))}
                  </select>
                </div>

                {/* Business Line / Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    Business Line / Sub-Process <span className="text-rose-500 font-black">*</span>
                  </label>
                  <select
                    value={formData.businessLine}
                    disabled={actionMode === 'Delete'}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessLine: e.target.value }))}
                    required
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    {availableBusinessLines.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* DECISION AREA, CLASSIFICATION & REGULATORY */}
            <div className={`p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs ${
              actionMode === 'Delete' ? 'opacity-70 pointer-events-none' : ''
            }`}>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                  Decision Area / Authority Description <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  value={formData.decisionArea}
                  onChange={(e) => setFormData(prev => ({ ...prev, decisionArea: e.target.value }))}
                  placeholder="e.g. Approve single obligor credit limit for wholesale portfolio above USD 50 million"
                  required={actionMode !== 'Delete'}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Decision Classification
                  </label>
                  <select
                    value={formData.keyNonKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, keyNonKey: e.target.value }))}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="Key">Key Decision (High Enterprise Significance)</option>
                    <option value="Non-Key">Non-Key Decision (Operational / Departmental)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Regulatory Mandated (CBB Compliance)
                  </label>
                  <select
                    value={formData.regulatory}
                    onChange={(e) => setFormData(prev => ({ ...prev, regulatory: e.target.value }))}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="N">No (Internal Corporate Governance)</option>
                    <option value="Y">Yes (Central Bank / CBB Mandated)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AUTHORITY SEQUENCE & HIERARCHY */}
            <div className={`p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs ${
              actionMode === 'Delete' ? 'opacity-70 pointer-events-none' : ''
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-600" />
                  Approval Authority Chain (Execution Sequence)
                </span>
              </div>

              {/* Authority String Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Authority Sequence String:
                </label>
                <input 
                  type="text"
                  value={formData.authority}
                  onChange={(e) => setFormData(prev => ({ ...prev, authority: e.target.value }))}
                  placeholder="e.g. BoD (A) ← EXCO (R) ← CEO (P)"
                  required={actionMode !== 'Delete'}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl p-3 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Quick Preset Badges */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700">Quick Authority Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {authorityPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, authority: preset }))}
                      className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        formData.authority === preset
                          ? 'bg-cyan-50 text-cyan-900 border-cyan-400 font-extrabold shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RATIONALE & JUSTIFICATION */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                Rationale for Proposal / Governance Justification <span className="text-rose-500">*</span>
              </label>
              <textarea 
                rows="3"
                value={formData.rationale}
                onChange={(e) => setFormData(prev => ({ ...prev, rationale: e.target.value }))}
                placeholder="State corporate justification, risk appetite adjustments, CBB circular references, or departmental requirements..."
                required
                className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 shadow-2xs resize-none"
              ></textarea>
            </div>

            {/* DOCUMENT EVIDENCE ATTACHMENT */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-cyan-600" />
                  Attach Governance Evidence / Policy Charter <span className="text-rose-500 font-black">*</span>
                </label>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Mandatory</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="proto-file-upload"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setFormData(prev => ({
                        ...prev,
                        attachedFile: { name: f.name, size: `${Math.round(f.size / 1024)} KB` }
                      }));
                    }
                  }}
                />
                <label
                  htmlFor="proto-file-upload"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-cyan-700" /> Choose Document
                </label>

                {formData.attachedFile ? (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    {formData.attachedFile.name} ({formData.attachedFile.size})
                  </span>
                ) : (
                  <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                    * Governance policy document attachment is required
                  </span>
                )}
              </div>
            </div>

            {/* SUBMIT BUTTONS */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-all"
              >
                Cancel
              </button>

              {actionMode === 'Add' && (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-white font-black text-xs bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Submit Proposal (Add Area)
                </button>
              )}

              {actionMode === 'Modify' && (
                <button
                  type="submit"
                  disabled={!selectedModifyId}
                  className="px-6 py-2.5 rounded-xl text-white font-black text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" /> Submit Modify Proposal
                </button>
              )}

              {actionMode === 'Delete' && (
                <button
                  type="submit"
                  disabled={!selectedModifyId}
                  className="px-6 py-2.5 rounded-xl text-white font-black text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> Submit Delete Proposal
                </button>
              )}
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}

