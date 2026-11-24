import React, { useState, useEffect, useRef } from 'react';
import { 
  GitMerge, 
  Layers, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  RotateCcw, 
  SlidersHorizontal, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Download, 
  Copy, 
  Check, 
  X, 
  ShieldCheck,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

export const AUTHORITY_TAXONOMY = {
  'Board Committees': [
    { code: 'AC', name: 'AC – Audit Committee', label: 'AC – Audit Committee' },
    { code: 'BRC', name: 'BRC – Board Risk Committee', label: 'BRC – Board Risk Committee' },
    { code: 'NRC', name: 'NRC – Nomination & Remuneration Committee', label: 'NRC – Nomination & Remuneration Committee' },
    { code: 'BoD', name: 'BoD – Board of Directors', label: 'BoD – Board of Directors' },
    { code: 'BCC', name: 'BCC – Board Credit Committee', label: 'BCC – Board Credit Committee' },
    { code: 'BAC', name: 'BAC – Board Assurance Committee', label: 'BAC – Board Assurance Committee' }
  ],
  'Executive Committee (ExCo)': [
    { code: 'CEO', name: 'CEO – Chief Executive Officer', label: 'CEO – Chief Executive Officer' },
    { code: 'CFO', name: 'CFO – Chief Financial Officer', label: 'CFO – Chief Financial Officer' },
    { code: 'CRO', name: 'CRO – Chief Risk Officer', label: 'CRO – Chief Risk Officer' },
    { code: 'COO', name: 'COO – Chief Operating Officer', label: 'COO – Chief Operating Officer' },
    { code: 'GCFO', name: 'GCFO – Group Chief Financial Officer', label: 'GCFO – Group Chief Financial Officer' }
  ],
  'Management Committees': [
    { code: 'ALCO', name: 'ALCO – Asset Liability Committee', label: 'ALCO – Asset Liability Committee' },
    { code: 'ORC', name: 'ORC – Operational Risk Committee', label: 'ORC – Operational Risk Committee' },
    { code: 'MRC', name: 'MRC – Market Risk Committee', label: 'MRC – Market Risk Committee' },
    { code: 'BRPC', name: 'BRPC – Business Review & Planning Committee', label: 'BRPC – Business Review & Planning Committee' }
  ],
  'Risk & Compliance Functions': [
    { code: 'H-MRG', name: 'Head of Model Risk Governance', label: 'Head of Model Risk Governance' },
    { code: 'CCO', name: 'Chief Compliance Officer', label: 'Chief Compliance Officer' },
    { code: 'H-OR', name: 'Head of Operational Risk', label: 'Head of Operational Risk' },
    { code: 'H-ECR', name: 'Head of Enterprise Credit & Risk', label: 'Head of Enterprise Credit & Risk' }
  ],
  'Business Unit Heads': [
    { code: 'H-RB', name: 'Head of Retail Banking', label: 'Head of Retail Banking' },
    { code: 'H-WM', name: 'Head of Wealth Management', label: 'Head of Wealth Management' },
    { code: 'H-WB', name: 'Head of Wholesale Banking', label: 'Head of Wholesale Banking' },
    { code: 'H-TCM', name: 'Head of Treasury & Capital Markets', label: 'Head of Treasury & Capital Markets' }
  ]
};

const OPERATOR_DEFINITIONS = [
  { code: 'P', label: 'Proposer (P)', roleType: 'proposer' },
  { code: 'R', label: 'General Reviewer (R)', roleType: 'reviewer' },
  { code: 'R1', label: 'Reviewer 1 (R1)', roleType: 'reviewer' },
  { code: 'R2', label: 'Reviewer 2 (R2)', roleType: 'reviewer' },
  { code: 'E1', label: 'Endorse 1 (E1)', roleType: 'endorser' },
  { code: 'E2', label: 'Endorse 2 (E2)', roleType: 'endorser' },
  { code: 'E3', label: 'Endorse 3 (E3)', roleType: 'endorser' },
  { code: 'A', label: 'Approver (A)', roleType: 'approver' },
  { code: 'BA', label: 'Board Approver (BA)', roleType: 'approver' }
];

export const ROLE_STYLES = {
  proposer: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-950',
    badgeBg: 'bg-blue-200 text-blue-950 border-blue-300 font-bold',
    dot: 'bg-blue-600',
    stepColor: 'text-blue-700'
  },
  reviewer: {
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-950',
    badgeBg: 'bg-purple-200 text-purple-950 border-purple-300 font-bold',
    dot: 'bg-purple-600',
    stepColor: 'text-purple-700'
  },
  endorser: {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-950',
    badgeBg: 'bg-amber-200 text-amber-950 border-amber-300 font-bold',
    dot: 'bg-amber-600',
    stepColor: 'text-amber-700'
  },
  approver: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-950',
    badgeBg: 'bg-emerald-200 text-emerald-950 border-emerald-300 font-bold',
    dot: 'bg-emerald-600',
    stepColor: 'text-emerald-700'
  }
};

export default function AuthorityChainBuilder({ 
  initialChain = [], 
  onChange,
  onSave,
  className = ""
}) {
  const [chain, setChain] = useState(() => {
    if (initialChain && initialChain.length > 0) {
      return initialChain;
    }
    return [];
  });

  // Sync chain if initialChain prop changes
  useEffect(() => {
    if (Array.isArray(initialChain)) {
      setChain(initialChain);
    }
  }, [initialChain]);

  const [selectedBody, setSelectedBody] = useState('Board Committees');
  const [selectedEntityCodes, setSelectedEntityCodes] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedOperator, setSelectedOperator] = useState('P');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const statusTimerRef = useRef(null);

  const showStatus = (type, text, duration = 3000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMessage({ type, text });
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  // Entities available for current body
  const availableEntities = AUTHORITY_TAXONOMY[selectedBody] || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Whenever body changes, reset selected entities to empty so user chooses
  useEffect(() => {
    setSelectedEntityCodes([]);
    setIsDropdownOpen(false);
  }, [selectedBody]);

  // Handle individual entity checkbox toggle
  const handleToggleEntity = (code) => {
    setSelectedEntityCodes(prev => {
      const withoutAll = prev.filter(c => c !== 'ALL_COMMITTEE_MEMBERS');
      let updated;
      if (withoutAll.includes(code)) {
        updated = withoutAll.filter(c => c !== code);
      } else {
        updated = [...withoutAll, code];
      }
      if (availableEntities.length > 0 && availableEntities.every(e => updated.includes(e.code))) {
        return [...updated, 'ALL_COMMITTEE_MEMBERS'];
      }
      return updated;
    });
  };

  // Handle "All Committee Members" final checkbox toggle
  const handleToggleAllCommitteeMembers = () => {
    const isCurrentlyAll = selectedEntityCodes.includes('ALL_COMMITTEE_MEMBERS');
    if (isCurrentlyAll) {
      setSelectedEntityCodes([]);
    } else {
      setSelectedEntityCodes(['ALL_COMMITTEE_MEMBERS', ...availableEntities.map(e => e.code)]);
    }
  };

  const isAllSelected = selectedEntityCodes.includes('ALL_COMMITTEE_MEMBERS') || 
    (availableEntities.length > 0 && availableEntities.every(e => selectedEntityCodes.includes(e.code)));

  let triggerDisplayText = 'Select Committee / Entity';
  if (isAllSelected) {
    triggerDisplayText = 'All Committee Members';
  } else if (selectedEntityCodes.length === 1) {
    const ent = availableEntities.find(e => e.code === selectedEntityCodes[0]);
    triggerDisplayText = ent ? ent.name : selectedEntityCodes[0];
  } else if (selectedEntityCodes.length > 1) {
    const codes = selectedEntityCodes.filter(c => c !== 'ALL_COMMITTEE_MEMBERS');
    if (codes.length <= 2) {
      triggerDisplayText = codes.map(c => {
        const found = availableEntities.find(e => e.code === c);
        return found ? found.code : c;
      }).join(', ');
    } else {
      triggerDisplayText = `${codes.length} Committees Selected`;
    }
  }

  // Evaluate state machine based on current chain
  const hasProposer = chain.some(n => n.roleType === 'proposer');
  const hasReviewer = chain.some(n => n.roleType === 'reviewer');
  const hasApprover = chain.some(n => n.roleType === 'approver');

  // Determine current phase (1 to 4)
  let currentPhase = 1;
  let isOperatorLocked = false;
  let lockBadgeText = '';
  let operatorBadgeMode = '';
  let phaseDescription = '';
  let subBannerMessage = '';

  if (!hasProposer) {
    currentPhase = 1;
    isOperatorLocked = true;
    lockBadgeText = 'Locked: Mandatory Step 1';
    operatorBadgeMode = 'AUTO: PROPOSER';
    phaseDescription = 'Phase 1: Proposer persona is mandatory and auto-assigned.';
    subBannerMessage = 'Step 1 of Approval Chain: Select an entity and click [ + ] to establish the originating Proposer (P).';
  } else if (!hasReviewer) {
    currentPhase = 2;
    isOperatorLocked = true;
    lockBadgeText = 'Locked: Mandatory Step 2';
    operatorBadgeMode = 'AUTO: REVIEWER';
    phaseDescription = 'Phase 2: Initial Reviewer (R) is mandatory after Proposer.';
    subBannerMessage = 'Step 2 of Approval Chain: Select an entity and click [ + ] to establish the mandatory Initial Reviewer (R).';
  } else if (!hasApprover) {
    currentPhase = 3;
    isOperatorLocked = false;
    operatorBadgeMode = 'CUSTOM OPERATORS';
    phaseDescription = 'Phase 3: Add optional Endorsers (E1-E3), Sub-reviewers, or conclude with an Approver (A).';
    subBannerMessage = 'Step 3: Flexible endorsement phase unlocked. Choose role and click [ + ] to append.';
  } else {
    currentPhase = 4;
    isOperatorLocked = false;
    operatorBadgeMode = 'COMPLIANT: APPROVER';
    phaseDescription = 'Phase 4: Final Sign-off Approver (A / BA) established. Hierarchy compliant.';
    subBannerMessage = 'Authority Chain Complete: Approver established. Reorder if needed or click [ Validate & Save Matrix ].';
  }

  // Synchronize operator selection with state machine constraints
  useEffect(() => {
    if (currentPhase === 1) {
      setSelectedOperator('P');
    } else if (currentPhase === 2) {
      setSelectedOperator('R');
    } else if (currentPhase === 3 && (selectedOperator === 'P')) {
      setSelectedOperator('E1');
    }
  }, [currentPhase]);

  // Notify parent of chain changes
  const notifyChange = (updatedChain) => {
    setChain(updatedChain);
    if (onChange) {
      const compositeString = [...updatedChain].reverse().map(n => n.display).join(' ← ');
      onChange(updatedChain, compositeString);
    }
  };

  // Add node to chain
  const handleAddNode = () => {
    if (hasApprover && selectedOperator !== 'BA' && selectedOperator !== 'A') {
      showStatus('warning', 'Approver is already set. Move or remove the Approver before adding more pre-approval steps.');
      return;
    }

    if (selectedEntityCodes.length === 0) {
      showStatus('warning', 'Please select at least one committee or entity from the dropdown.');
      return;
    }

    const opObj = OPERATOR_DEFINITIONS.find(o => o.code === selectedOperator) || OPERATOR_DEFINITIONS[0];
    const isAllCommitteeMembers = selectedEntityCodes.includes('ALL_COMMITTEE_MEMBERS');

    let newNodes = [];

    if (isAllCommitteeMembers) {
      newNodes.push({
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        authorityBody: selectedBody,
        entity: 'All Committee Members',
        code: 'All Committee Members',
        operator: opObj.code,
        operatorLabel: opObj.label,
        roleType: opObj.roleType,
        display: `All Committee Members (${opObj.code})`
      });
    } else {
      availableEntities
        .filter(ent => selectedEntityCodes.includes(ent.code))
        .forEach((entityObj, idx) => {
          newNodes.push({
            id: `node-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            authorityBody: selectedBody,
            entity: entityObj.name,
            code: entityObj.code,
            operator: opObj.code,
            operatorLabel: opObj.label,
            roleType: opObj.roleType,
            display: `${entityObj.code} (${opObj.code})`
          });
        });
    }

    if (newNodes.length === 0) {
      showStatus('warning', 'Please select at least one committee / entity.');
      return;
    }

    const updated = [...chain, ...newNodes];
    notifyChange(updated);
    showStatus('success', `Added ${newNodes.map(n => n.display).join(', ')} to hierarchy.`);
  };

  // Remove node from chain
  const handleRemoveNode = (index) => {
    const updated = chain.filter((_, idx) => idx !== index);
    notifyChange(updated);
    showStatus('info', 'Step removed from authority hierarchy.');
  };

  // Reorder node
  const handleReorder = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= chain.length) return;

    const updated = [...chain];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Guard rail: Verify Proposer doesn't move after an Approver
    const pIdx = updated.findIndex(n => n.roleType === 'proposer');
    const aIdx = updated.findIndex(n => n.roleType === 'approver');
    if (pIdx !== -1 && aIdx !== -1 && pIdx > aIdx) {
      showStatus('error', 'Invalid order: Proposer (P) cannot appear after an Approver (A).', 4000);
      return;
    }

    notifyChange(updated);
  };

  // Reset chain
  const handleReset = () => {
    if (chain.length === 0) return;
    if (window.confirm('Are you sure you want to reset the proposed authority chain?')) {
      notifyChange([]);
      showStatus('info', 'Authority chain cleared.');
    }
  };

  // Load standard preset
  const handleLoadPreset = () => {
    const preset = [
      {
        id: 'preset-1',
        authorityBody: 'Board Committees',
        entity: 'AC – Audit Committee',
        code: 'AC',
        operator: 'P',
        operatorLabel: 'Proposer (P)',
        roleType: 'proposer',
        display: 'AC (P)'
      },
      {
        id: 'preset-2',
        authorityBody: 'Executive Committee (ExCo)',
        entity: 'CRO – Chief Risk Officer',
        code: 'CRO',
        operator: 'R',
        operatorLabel: 'General Reviewer (R)',
        roleType: 'reviewer',
        display: 'CRO (R)'
      },
      {
        id: 'preset-3',
        authorityBody: 'Board Committees',
        entity: 'BRC – Board Risk Committee',
        code: 'BRC',
        operator: 'E1',
        operatorLabel: 'Endorse 1 (E1)',
        roleType: 'endorser',
        display: 'BRC (E1)'
      },
      {
        id: 'preset-4',
        authorityBody: 'Executive Committee (ExCo)',
        entity: 'CEO – Chief Executive Officer',
        code: 'CEO',
        operator: 'A',
        operatorLabel: 'Approver (A)',
        roleType: 'approver',
        display: 'CEO (A)'
      }
    ];
    notifyChange(preset);
    showStatus('success', 'Standard 4-tier approval preset loaded.');
  };

  // Export JSON payload
  const handleCopyJson = () => {
    const payload = JSON.stringify(getExportPayload(), null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExportPayload = () => {
    return {
      governanceVersion: 'v2.4',
      generatedAt: new Date().toISOString(),
      status: (hasProposer && hasReviewer && hasApprover) ? 'COMPLIANT' : 'INCOMPLETE',
      totalSteps: chain.length,
      compositeString: [...chain].reverse().map(n => n.display).join(' ← '),
      nodes: chain.map((n, idx) => ({
        step: idx + 1,
        authorityBody: n.authorityBody,
        entity: n.entity,
        code: n.code,
        operator: n.operator,
        operatorLabel: n.operatorLabel,
        roleType: n.roleType,
        display: n.display
      }))
    };
  };

  // Validate & Save
  const handleValidateAndSave = () => {
    if (!hasProposer) {
      alert('Validation Error: The delegation hierarchy must have an initiating Proposer (P).');
      return;
    }
    if (!hasReviewer) {
      alert('Validation Error: The delegation hierarchy must have at least one Reviewer (R).');
      return;
    }
    if (!hasApprover) {
      alert('Validation Error: The delegation hierarchy must conclude with an Approver (A / BA).');
      return;
    }

    const compositeString = [...chain].reverse().map(n => n.display).join(' ← ');
    if (onSave) {
      onSave(chain, compositeString);
    }
    showStatus('success', 'Authority matrix validated & saved to proposal!', 3500);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Authority Builder */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        {/* Navy Header (Status feedback renders inline inside fixed-height header to prevent scroll twitching) */}
        <div className="bg-slate-900 px-5 py-3.5 min-h-[52px] flex items-center justify-between gap-3 text-white">
          <h4 className="text-sm font-bold text-white tracking-tight shrink-0">
            Authority Builder
          </h4>
          {statusMessage && (
            <div className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border truncate ${
              statusMessage.type === 'error' ? 'bg-rose-500/20 text-rose-200 border-rose-400/40' :
              statusMessage.type === 'warning' ? 'bg-amber-500/20 text-amber-200 border-amber-400/40' :
              statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' :
              'bg-blue-500/20 text-blue-200 border-blue-400/40'
            }`}>
              {statusMessage.type === 'error' || statusMessage.type === 'warning' ? (
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Builder Form Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* 1. Authority Body */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                AUTHORITY BODY
              </label>
              <div className="relative">
                <select
                  value={selectedBody}
                  onChange={(e) => setSelectedBody(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none cursor-pointer pr-8"
                >
                  {Object.keys(AUTHORITY_TAXONOMY).map(body => (
                    <option key={body} value={body}>{body}</option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Select Committee / Entity with Checkboxes */}
            <div className="md:col-span-4 space-y-1.5" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-700 truncate">
                SELECT COMMITTEE / ENTITY
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className={`w-full text-xs sm:text-sm font-semibold border rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none transition-all cursor-pointer flex items-center justify-between text-left pr-8 ${
                    isDropdownOpen 
                      ? 'border-teal-500 ring-2 ring-teal-500/20' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <span className={`truncate ${selectedEntityCodes.length === 0 ? 'text-slate-700 font-medium' : 'text-slate-800 font-semibold'}`}>
                    {triggerDisplayText}
                  </span>
                </button>
                <ChevronDown className={`h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto animate-fade-in divide-y divide-slate-100">
                    {/* List of Committee Entities with Checkboxes */}
                    <div className="py-0.5">
                      {availableEntities.map(ent => {
                        const isChecked = selectedEntityCodes.includes(ent.code);
                        return (
                          <label
                            key={ent.code}
                            className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 cursor-pointer text-xs sm:text-sm transition-colors ${
                              isChecked ? 'bg-teal-50/60 font-semibold text-slate-900' : 'text-slate-700 font-normal'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleEntity(ent.code)}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer accent-teal-600"
                            />
                            <span className="truncate">{ent.name}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Final Option at the Last: All Committee Members */}
                    <div className="pt-0.5">
                      <label className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 cursor-pointer text-xs sm:text-sm transition-colors ${
                        selectedEntityCodes.includes('ALL_COMMITTEE_MEMBERS') ? 'bg-teal-50 font-bold text-teal-950' : 'text-slate-900 font-semibold'
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedEntityCodes.includes('ALL_COMMITTEE_MEMBERS')}
                          onChange={handleToggleAllCommitteeMembers}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer accent-teal-600"
                        />
                        <span className="truncate font-bold">All Committee Members</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Action Operator */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ACTION OPERATOR
              </label>
              <div className="relative">
                {isOperatorLocked ? (
                  <div className="w-full text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-600 flex items-center justify-between cursor-not-allowed">
                    <span>
                      {selectedOperator === 'P' ? 'Proposer (P)' : 'General Reviewer (R)'}
                    </span>
                    <Lock className="h-4 w-4 text-blue-600 flex-shrink-0" title={lockBadgeText} />
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none cursor-pointer pr-8"
                    >
                      {OPERATOR_DEFINITIONS.filter(op => op.code !== 'P').map(op => (
                        <option key={op.code} value={op.code}>{op.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </>
                )}
              </div>
            </div>

            {/* Append (+) Button */}
            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={handleAddNode}
                title="Append to active authority chain"
                className="w-full h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-sm font-bold text-xl transition-all transform hover:scale-105 active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 3. ACTIVE PROPOSED AUTHORITY CHAIN Canvas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              ACTIVE PROPOSED AUTHORITY CHAIN
            </h4>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {chain.length} Nodes
            </span>
          </div>
        </div>

        {/* Pipeline Canvas Container */}
        <div className="min-h-[140px] flex items-center">
          {chain.length === 0 ? (
            /* Empty State */
            <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center bg-slate-50/50 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">
                Authority Chain is Empty
              </h5>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Begin by selecting a Committee and clicking <span className="font-bold text-emerald-700">[ + ]</span> above. The system will automatically inject the initiating <span className="font-bold text-blue-700">Proposer (P)</span>.
              </p>
            </div>
          ) : (
            /* Populated Connected Pipeline */
            <div className="w-full overflow-x-auto py-2">
              <div className="flex items-center gap-3 min-w-max pb-2">
                {chain.map((node, index) => {
                  const style = ROLE_STYLES[node.roleType] || ROLE_STYLES.proposer;
                  const isLast = index === chain.length - 1;

                  return (
                    <React.Fragment key={node.id}>
                      {/* Node Card */}
                      <div className={`w-[220px] rounded-xl border ${style.border} ${style.bg} p-3.5 shadow-xs flex flex-col justify-between space-y-2.5 transition-all hover:shadow-sm`}>
                        {/* Header: Role Badge (Left) + Remove Button (Right) */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${style.badgeBg}`}>
                            {node.operatorLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNode(index)}
                            title="Remove step"
                            className="h-5 w-5 rounded-full hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Body: Entity Name + Authority Body */}
                        <div>
                          <h6 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {node.entity}
                          </h6>
                          <p className="text-[10px] text-slate-600 font-medium mt-0.5 truncate">
                            {node.authorityBody}
                          </p>
                        </div>
                      </div>

                      {/* Sequential Pipeline Arrow (Pointing Right: →) */}
                      {!isLast && (
                        <div className="flex items-center justify-center px-1 text-slate-400">
                          <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Canvas Footer Bar (Legend & Action Buttons) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Color-coded Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
              <span>Proposer (P)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-600"></span>
              <span>Reviewer (R)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>Endorser (E)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
              <span>Approver (A)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto">

            <button
              type="button"
              onClick={handleValidateAndSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Check className="h-3.5 w-3.5 text-teal-400" />
              <span>Validate & Save Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export Scheme JSON Modal */}
      {jsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-teal-600" />
                <h5 className="text-sm font-bold text-slate-800">
                  Export Proposed Authority Scheme JSON
                </h5>
              </div>
              <button
                type="button"
                onClick={() => setJsonModalOpen(false)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Serializable JSON data model ready for governance API transmission:
              </p>
              <pre className="p-3 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-64 leading-relaxed">
                {JSON.stringify(getExportPayload(), null, 2)}
              </pre>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                onClick={() => setJsonModalOpen(false)}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
