import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  Send, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  TrendingUp,
  FileCheck,
  Building,
  Users,
  Award,
  BookOpen,
  Briefcase,
  CheckSquare,
  Eye,
  UserCheck,
  Download,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Paperclip,
  FileDown,
  GitPullRequest,
  AlertOctagon,
  History,
  Edit3,
  Bookmark
} from 'lucide-react';
import { api } from '../../services/api';
import { exportReportToExcel, exportReportToPdf } from '../../utils/reportExport';

import ExceptionRequestModal from '../supplementary/ExceptionRequestModal';
import ExceptionWorkflowInbox from '../supplementary/ExceptionWorkflowInbox';
import GovernanceKpiCardsView from './GovernanceKpiCardsView';
import doaHeroBg from '../../assets/doa-hero-harbour.svg';


// Demo / View-only Latest Amendments to the Delegation of Authority Matrix
const DEMO_LATEST_AMENDMENTS = [
  {
    id: '#342',
    decisionArea: 'Approval of Bank mandates',
    updateType: 'New/Amended',
    department: 'Finance',
    lastUpdateDate: '10-Nov-26'
  },
  {
    id: '#341',
    decisionArea: 'Capital Expenditure & Asset Disposal Authority',
    updateType: 'Modified',
    department: 'Finance & Treasury',
    lastUpdateDate: '08-Nov-26'
  },
  {
    id: '#340',
    decisionArea: 'Credit Facility & Wholesale Lending Approvals (> $5M)',
    updateType: 'New/Amended',
    department: 'Credit Risk',
    lastUpdateDate: '05-Nov-26'
  },
  {
    id: '#339',
    decisionArea: 'Procurement of Enterprise Cloud & IT Infrastructure',
    updateType: 'Threshold Revision',
    department: 'Procurement & IT',
    lastUpdateDate: '02-Nov-26'
  },
  {
    id: '#338',
    decisionArea: 'Executive Remuneration & Incentive Structure Sign-off',
    updateType: 'Modified',
    department: 'Human Resources',
    lastUpdateDate: '29-Oct-26'
  },
  {
    id: '#337',
    decisionArea: 'Legal Settlement Endorsement & Regulatory Representation',
    updateType: 'New/Amended',
    department: 'Legal & Compliance',
    lastUpdateDate: '25-Oct-26'
  }
];

// Demo / View-only Frequently Visited Decision Areas (UI view purpose only, not stored in DB)
const DEMO_FREQUENTLY_VISITED_AREAS = [
  {
    no: '#225',
    decisionArea: 'Approve increase or reduction of share capital',
    function: 'Finance',
    authorityChain: 'Shareholders (A) ← BoD (E2) ← AC (E1) ← ExCom (E) ← GCEO (R2) ← CEO (R1)',
    lastUpdateDate: '10-Nov-26'
  },
  {
    no: '#243',
    decisionArea: 'Approve annual budget and five-year financial plan',
    function: 'Finance',
    authorityChain: 'BoD (A) ← ExCom (E2) ← GCEO (E1) ← CEO (E) ← GCFO (R) ← CFO (P)',
    lastUpdateDate: '08-Nov-26'
  },
  {
    no: '#301',
    decisionArea: 'Approve wholesale single obligor credit limit above USD 50 million up to regulatory cap',
    function: 'Risk',
    authorityChain: 'BoD (A) ← BRPC (E1) ← ExCom (E) ← GRC (E) ← GCRO (R1)',
    lastUpdateDate: '05-Nov-26'
  },
  {
    no: '#305',
    decisionArea: 'Approve Value-at-Risk (VaR) limits, Stressed VaR limits, and Stop-Loss thresholds for Trading Book',
    function: 'Risk',
    authorityChain: 'BoD (A) ← BRPC (E1) ← GRC (E) ← ALCO(G) (R1) ← GCRO (R)',
    lastUpdateDate: '01-Nov-26'
  },
  {
    no: '#251',
    decisionArea: 'Approve tier one (1) or tier two (2) capital issue',
    function: 'Finance',
    authorityChain: 'Shareholders (Y, A1) ← BoD (A) ← AC (E1) ← BRPC (E) ← GCCO (R) ← GCFO (P)',
    lastUpdateDate: '28-Oct-26'
  },
  {
    no: '#308',
    decisionArea: 'Approve Group Risk Appetite Statement (RAS) and Group Risk Tolerance Matrix',
    function: 'Risk',
    authorityChain: 'BoD (A) ← BRPC (E1) ← ExCom (E) ← GRC (E) ← GCRO (P)',
    lastUpdateDate: '22-Oct-26'
  }
];

export default function NormalUserDashboard({ 
  userStats, 
  currentUser, 
  onNavigateTab, 
  onNewRequest,
  kpis,
  pendingQueueCount = 0,
  activeTab = 'overview'
}) {
  // Map persona to their exact designation key
  const PERSONA_TO_DESIGNATION = {
    DEPT_OWNER: 'c_level1', // Head of Finance / CFO
    PROCESS_OWNER: 'mgmt_committees', // Procurement / P2P Management Committees
    AUTHORITY_OWNER: 'board_committees', // Board Secretariat / Audit & Risk Committees
    REVIEWER: 'c_level2', // Enterprise Risk Reviewer
    APPROVER: 'gceo', // Executive Approver / GCEO
    FRONTEND_USER: 'ceo', // General Analyst inspecting CEO authorities
    AUDIT_READONLY: 'board_of_directors' // Internal Audit inspecting BoD mandates
  };

  const initialDesignation = PERSONA_TO_DESIGNATION[currentUser?.persona_type] || 'ceo';

  const isFrontendUser = currentUser?.persona_type === 'FRONTEND_USER';

  const [activeSubTab, setActiveSubTab] = useState('overview');

  useEffect(() => {
    if (currentUser?.persona_type) {
      setActiveSubTab('overview');
    }
  }, [currentUser?.id, currentUser?.persona_type]);

  // Supplementary BRD Modals & Workflow State
  const [showValidatorModal, setShowValidatorModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [blockedValidationData, setBlockedValidationData] = useState(null);


  // Designation Matrix & Interactive Governance KPI Cards State
  const [selectedDesignationKey, setSelectedDesignationKey] = useState(initialDesignation);
  const [activeGovernanceCategory, setActiveGovernanceCategory] = useState(
    currentUser?.persona_type === 'AUTHORITY_OWNER' ? 'board_committee' :
    currentUser?.persona_type === 'DEPT_OWNER' ? 'function' : 'c_level'
  );
  const [selectedGovernanceOptions, setSelectedGovernanceOptions] = useState({
    function: { id: 'ops_logistics', label: 'Operations & Logistics', badge: '96% Compliant' },
    board_committee: { id: 'all_committees', label: 'All Standing Committees', badge: '6 Standing' },
    shareholder: { id: 'all_shareholders', label: 'All Shareholder Mandates', badge: '100% Voting' },
    c_level: { id: 'exec_committee_all', label: 'Exec Committee (All Portfolios)', badge: '7 Officers' },
    group_wide: { id: 'matrix_4_2', label: 'Matrix 4.2 Core Delegations', badge: 'Master Live' }
  });
  const [designationMatrixData, setDesignationMatrixData] = useState(null);
  const [isLoadingDesignation, setIsLoadingDesignation] = useState(false);

  // Management Reports State (Functionality 7)
  const defaultReportKey = 
    currentUser?.persona_type === 'AUDIT_READONLY' ? 'aud_dossier' :
    currentUser?.persona_type === 'APPROVER' ? 'app_portfolio' :
    currentUser?.persona_type === 'REVIEWER' ? 'rev_regulatory' :
    currentUser?.persona_type === 'AUTHORITY_OWNER' ? 'ao_charter' :
    currentUser?.persona_type === 'DEPT_OWNER' ? 'do_limits' :
    currentUser?.persona_type === 'PROCESS_OWNER' ? 'po_alignment' : 'usr_lifecycle';

  const [selectedReportType, setSelectedReportType] = useState(defaultReportKey);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // HR Integration State (Functionality 9)
  const [hrData, setHrData] = useState(null);
  const [isLoadingHr, setIsLoadingHr] = useState(false);
  const [reportsSubView, setReportsSubView] = useState('preset');

  // Persona configurations
  const PERSONA_CONFIGS = {
    DEPT_OWNER: {
      badge: 'Department / Function Owner',
      color: 'border-teal-500/30 bg-teal-500/20 text-teal-300',
      greeting: 'Department Authority Custodian',
      description: 'You have supervisory oversight over Finance & Treasury authorities. Inspect department signing caps, review regulatory compliance, and initiate updates for changing corporate limits.',
      responsibilities: [
        'Supervise departmental signing limits and authority delegation thresholds',
        'Initiate proposed ADD, MODIFY, and DELETE change requests for departmental rules',
        'Upload formal Board Resolution extracts and policy amendments',
        'Ensure departmental alignment with Basel IV and Central Bank guidelines'
      ]
    },
    PROCESS_OWNER: {
      badge: 'Process Owner',
      color: 'border-blue-500/30 bg-blue-500/20 text-blue-300',
      greeting: 'Process Integrity & Operational Lead',
      description: 'You manage authorities linked to operational workflows (Procure-to-Pay, Capex, Treasury). Review process boundaries and provide operational impact assessments on incoming proposals.',
      responsibilities: [
        'Evaluate end-to-end operational workflows (Procure-to-Pay, Capex, Treasury)',
        'Mandatory Operational & Process Impact Assessments on ERP controls and SLA bottlenecks',
        'Filter and inspect DOA authorities mapped across enterprise processes',
        'Attach Process Flow Diagrams and Standard Operating Procedures (SOPs)'
      ]
    },
    AUTHORITY_OWNER: {
      badge: 'Authority Owner',
      color: 'border-indigo-500/30 bg-indigo-500/20 text-indigo-300',
      greeting: 'Mandate & Governance Body Custodian',
      description: 'You safeguard the delegated limits assigned to Board of Directors, Board Committees, and Senior Executives. Verify all mandates against corporate charter provisions.',
      responsibilities: [
        'Safeguard corporate governance mandates for BoD, Board Committees, and C-Suite',
        'Validate proposed authority structures against corporate charter provisions',
        'Review composite authority chains across multiple management bodies',
        'Ensure compliance with statutory committee composition requirements'
      ]
    },
    REVIEWER: {
      badge: 'Governance Reviewer',
      color: 'border-cyan-500/30 bg-cyan-500/20 text-cyan-300',
      greeting: 'Risk & Policy Review Analyst',
      description: 'Perform independent technical reviews on proposed ADD, MODIFY, and DELETE change requests. Validate policy citations and draft recommendation comments.',
      responsibilities: [
        'Conduct 2LoD technical risk reviews on submitted change requests',
        'Inspect field-by-field differences via the visual Diff Engine',
        'Verify statutory and internal corporate policy citations',
        'Submit formal review recommendations prior to executive sign-off'
      ]
    },
    APPROVER: {
      badge: 'Executive Approver',
      color: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
      greeting: 'Executive Committee Approver',
      description: 'Review pending authority change proposals, inspect 4-eye workflow verifications, and approve or reject submissions in accordance with established DOA governance thresholds.',
      responsibilities: [
        'Review submissions in the Executive Pending Approval Queue',
        'Verify 4-Eye Workflow checks and operational impact assessments',
        'Issue binding APPROVE or REJECT decisions with obligatory rationale remarks',
        'Sign-off on critical corporate threshold adjustments before master publication'
      ]
    },
    FRONTEND_USER: {
      badge: 'Requester',
      color: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
      greeting: 'Business Line Requester',
      description: 'Search, filter, and inspect approved DOA rules relevant to your department or business line, and raise change proposals where necessary.',
      responsibilities: [
        'Search and filter approved DOA master rules by department, function, and keyword',
        'Inspect designation-wise authorities for operational line tasks',
        'Draft change proposals to address day-to-day operational boundary gaps',
        'Track personal proposal status through the review lifecycle'
      ]
    },
    AUDIT_READONLY: {
      badge: 'Internal Audit & Compliance (Read-Only)',
      color: 'border-violet-500/30 bg-violet-500/20 text-violet-300',
      greeting: 'Assurance & Audit Examiner',
      description: 'Independent, tamper-evident read-only oversight across all published authorities, historical snapshots, change workflows, and audit ledgers.',
      responsibilities: [
        'Read-only oversight across active master matrix, version snapshots, and change queues',
        'Inspect immutable audit trail of submissions, approvals, rejections, and publications',
        'Export compliance reports and regulatory registers for audit committees',
        'Verify non-repudiation and segregation of duties across historical versions'
      ]
    }
  };

  const personaKey = currentUser?.persona_type || 'FRONTEND_USER';
  const currentPersona = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.FRONTEND_USER;

  // Load Designation Matrix & Governance KPI Cards
  const fetchDesignationMatrix = async (params) => {
    setIsLoadingDesignation(true);
    try {
      const res = await api.getDesignationMatrix(params);
      setDesignationMatrixData(res);
    } catch (err) {
      console.error('Failed to load designation matrix:', err);
    } finally {
      setIsLoadingDesignation(false);
    }
  };

  const handleSelectGovernanceCategory = (categoryId, option) => {
    setActiveGovernanceCategory(categoryId);
    setSelectedGovernanceOptions(prev => ({
      ...prev,
      [categoryId]: option
    }));
    fetchDesignationMatrix({
      category_id: categoryId,
      option_id: option.id
    });
  };

  // Load Management Report (Functionality 7)
  const fetchReport = async (reportItem) => {
    setIsLoadingReport(true);
    try {
      let res;
      if (reportItem?.endpoint) {
        res = await api.getRoleReport(reportItem.endpoint);
      } else if (typeof reportItem === 'string') {
        res = await api.getManagementReports(reportItem);
      } else if (reportItem?.key) {
        res = await api.getManagementReports(reportItem.key);
      }
      setReportData(res);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Load HR Integration
  const fetchHrData = async () => {
    setIsLoadingHr(true);
    try {
      const res = await api.getHrIntegration();
      setHrData(res);
    } catch (err) {
      console.error('Failed to load HR data:', err);
    } finally {
      setIsLoadingHr(false);
    }
  };

  const DESIGNATIONS_LIST = [
    { key: 'board_of_directors', label: 'Board of Directors (BoD)' },
    { key: 'chairman', label: 'Board Chairman' },
    { key: 'gceo', label: 'Group CEO (GCEO)' },
    { key: 'ceo', label: 'Chief Executive Officer (CEO)' },
    { key: 'c_level1', label: 'C-Level / Chief Financial Officer (CFO)' },
    { key: 'board_committees', label: 'Board Committees (Audit / Risk / Exec)' },
    { key: 'mgmt_committees', label: 'Management Committees (MANCO / ALCO)' },
    { key: 'shareholders', label: 'Shareholders (Annual General Meeting)' }
  ];

  // Base global preset reports
  const GLOBAL_REPORT_TYPES = [
    { key: 'active_by_dept', report_id: 'RPT-01', label: 'Active Delegations by Department', desc: 'Summary of active rules categorized by Finance vs Risk functions' },
    { key: 'pending_approvals', report_id: 'RPT-02', label: 'Pending Approval Requests', desc: 'Change proposals currently awaiting workflow review or sign-off' },
    { key: 'recently_modified', report_id: 'RPT-03', label: 'Recently Modified Rules (v2+)', desc: 'History of rules promoted through authority version bump cycles' },
    { key: 'regulatory_mandated', report_id: 'RPT-04', label: 'Regulatory Mandated Rules', desc: 'Authorities citing external Central Bank or statutory guidelines' },
    { key: 'high_risk', report_id: 'RPT-05', label: 'High-Risk Strategic Decisions', desc: 'Key strategic decisions requiring multi-tiered endorsements' }
  ];

  // Role-Specific Tailored Reports Map (All 7 Personas)
  const ROLE_SPECIFIC_REPORTS = {
    FRONTEND_USER: [
      { key: 'usr_lifecycle', report_id: 'RPT-USR-01', endpoint: '/requestor/reports/lifecycle', label: 'My Proposal Lifecycle Report', desc: 'Status tracking of personal change submissions with stage & reviewer feedback' },
      { key: 'usr_limits', report_id: 'RPT-USR-02', endpoint: '/requestor/reports/operational-limits', label: 'Commercial Operational Limits', desc: 'Operational signing caps and permitted operators for commercial operations' }
    ],
    PROCESS_OWNER: [
      { key: 'po_alignment', report_id: 'RPT-PO-01', endpoint: '/process-owner/reports/operational-alignment', label: 'P2P & Capex Workflow Alignment', desc: 'Operational process boundaries, linked rules, and endorsing committee mappings' },
      { key: 'po_impact_queue', report_id: 'RPT-PO-02', endpoint: '/process-owner/reports/impact-queue', label: 'Operational Impact Queue & SLA Telemetry', desc: 'Pending requests requiring process endorsement with >48h SLA telemetry' }
    ],
    DEPT_OWNER: [
      { key: 'do_limits', report_id: 'RPT-DO-01', endpoint: '/dept-owner/reports/signing-limits', label: 'Department Delegated Signing Limits Matrix', desc: 'Finance threshold tiers (L1 Manager, L2 Head, L3 CFO) and statutory authorities' },
      { key: 'do_history', report_id: 'RPT-DO-02', endpoint: '/dept-owner/reports/change-history', label: 'Department Rule Version History', desc: 'Audit log of version revisions, authors, and executive sign-off dates' }
    ],
    AUTHORITY_OWNER: [
      { key: 'ao_charter', report_id: 'RPT-AO-01', endpoint: '/authority-owner/reports/charter-mandates', label: 'Corporate Charter & Terms of Reference Matrix', desc: 'Mandates for BoD, Audit, Risk Committees, and GCEO with charter sections' },
      { key: 'ao_chain_flows', report_id: 'RPT-AO-02', endpoint: '/authority-owner/reports/chain-flows', label: 'Composite Authority Chain Flow Report', desc: 'Multi-tier endorsement flow analysis validating mandatory statutory ratification' }
    ],
    REVIEWER: [
      { key: 'rev_regulatory', report_id: 'RPT-REV-01', endpoint: '/reviewer/reports/regulatory-register', label: 'Regulatory Mandated Rules & Basel Register', desc: 'Authorities mapped against Central Bank regulations and compliance policies' },
      { key: 'rev_diffs', report_id: 'RPT-REV-02', endpoint: '/reviewer/reports/technical-diffs', label: '2LoD Review Queue & Concurrency Diff Analysis', desc: 'Detailed delta inspection (old vs proposed) and concurrency collision checks' }
    ],
    APPROVER: [
      { key: 'app_portfolio', report_id: 'RPT-APP-01', endpoint: '/approver/reports/executive-portfolio', label: 'Executive Pending Approval Portfolio', desc: 'Submissions awaiting executive binding decision with financial exposure telemetry' },
      { key: 'app_decisions', report_id: 'RPT-APP-02', endpoint: '/approver/reports/binding-decisions', label: 'Executive Binding Decisions Audit Report', desc: 'Decisions log with mandatory rationale remarks and publication readiness' }
    ],
    AUDIT_READONLY: [
      { key: 'aud_dossier', report_id: 'RPT-AUD-01', endpoint: '/audit-readonly/reports/version-dossier', label: 'Complete Version Snapshot Dossier', desc: 'Historical timeline of published version snapshots and baseline comparisons' },
      { key: 'aud_ledger', report_id: 'RPT-AUD-02', endpoint: '/audit-readonly/reports/immutable-ledger', label: 'Tamper-Evident Immutable Audit Trail', desc: 'Full audit logs tracking submission, review, endorsement, and publication' },
      { key: 'aud_sod', report_id: 'RPT-AUD-03', endpoint: '/audit-readonly/reports/sod-matrix', label: 'Segregation of Duties (SoD) Exception Matrix', desc: 'Automatic violation checks detecting self-approval or bypassed 4-eye steps' }
    ]
  };

  const roleSpecificReportsList = ROLE_SPECIFIC_REPORTS[personaKey] || [];
  const ALL_ACCESSIBLE_REPORTS = [...roleSpecificReportsList, ...GLOBAL_REPORT_TYPES];

  const canPropose = currentUser?.permissions
    ? Boolean(currentUser.permissions.can_propose)
    : ['FRONTEND_USER', 'PROCESS_OWNER', 'DEPT_OWNER', 'AUTHORITY_OWNER'].includes(personaKey);

  const canViewAudit = personaKey === 'AUDIT_READONLY';

  const scopeDomainsLabel = currentUser?.permissions?.allowed_domains?.length
    ? currentUser.permissions.allowed_domains.join(' & ')
    : (currentUser?.allowed_domains || 'Scoped');
  const scopeEntityLabel = currentUser?.permissions?.entity_id || currentUser?.entity_id || 'ENT-BH-01';

  useEffect(() => {
    if (activeSubTab === 'designations') {
      const currentOpt = selectedGovernanceOptions[activeGovernanceCategory];
      fetchDesignationMatrix({
        category_id: activeGovernanceCategory,
        option_id: currentOpt?.id || 'all'
      });
    } else if (activeSubTab === 'reports') {
      const activeReportObj = ALL_ACCESSIBLE_REPORTS.find(r => r.key === selectedReportType) || ALL_ACCESSIBLE_REPORTS[0];
      if (activeReportObj) {
        fetchReport(activeReportObj);
      }
    } else if (activeSubTab === 'hr_integration') {
      fetchHrData();
    }
  }, [activeSubTab, selectedDesignationKey, selectedReportType]);


  return (
    <div className="space-y-7 animate-fade-in font-sans">
      
      {/* Dynamic Role & Persona Banner / KPI Card */}
      <div className="relative rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden border border-teal-500/30 bg-[#071C2B]">
        {/* Dynamic Animated Harbour SVG Background */}
        <img 
          src={doaHeroBg}
          alt="DOA Hero Matrix"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none"
        />

        {/* Soft Dark Gradient Overlay for optimal text and button contrast on left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071C2B]/95 via-[#071C2B]/60 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div className="space-y-1 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 drop-shadow-md">
              <span>Welcome back, {currentUser?.full_name || 'Stakeholder'}</span>
            </h2>
          </div>
        </div>

        {/* Action Buttons Aligned in the Same Line */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
          <div className="shrink-0 flex items-center">
            <span className="h-10 w-20 rounded-xl inline-flex items-center justify-center text-center text-[10px] font-extrabold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 shadow-xs">
              Action
            </span>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-3 ${canViewAudit ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2.5 flex-1 w-full`}>
            {/* 1. Overview */}
            <button
              onClick={() => {
                onNavigateTab('overview');
                setActiveSubTab('overview');
              }}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                activeTab === 'overview' && activeSubTab === 'overview'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30 ring-2 ring-indigo-400/30 font-black'
                  : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
              }`}
            >
              <Layers className="h-4 w-4 text-indigo-300 shrink-0" />
              <span className="truncate">Overview</span>
            </button>

            {/* 2. Search DoA */}
            <button
              onClick={() => onNavigateTab('search')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30 ring-2 ring-blue-400/30 font-black'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border-blue-400/30'
              }`}
            >
              <Search className="h-4 w-4 text-blue-300 shrink-0" />
              <span className="truncate">Search DoA</span>
            </button>

            {/* 3. Initiate Proposal (enabled strictly for authorized proposer personas) */}
            {!canPropose ? (
              <button
                disabled
                className="h-10 w-full px-2.5 py-1 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border shadow-sm bg-white/5 text-slate-500 border-white/10 cursor-not-allowed opacity-60"
              >
                <Edit3 className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="truncate text-xs font-bold leading-tight">Initiate Proposal</span>
                  <span className="text-[10px] font-medium text-slate-500 leading-tight">(new/amendment)</span>
                </div>
              </button>
            ) : (
              <button
                onClick={onNewRequest}
                className={`h-10 w-full px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                  activeTab === 'request'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-600/30 ring-2 ring-cyan-400/30 font-black'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/30'
                }`}
              >
                <Edit3 className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="truncate text-xs font-bold leading-tight">Initiate Proposal</span>
                  <span className="text-[10px] font-medium text-cyan-200/90 leading-tight">(new/amendment)</span>
                </div>
              </button>
            )}

            {/* 4. Change Queue */}
            <button
              onClick={() => onNavigateTab('queue')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
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

            {/* 5. Exception Workflow */}
            <button
              onClick={() => onNavigateTab('exceptions')}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                activeTab === 'exceptions'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30 ring-2 ring-emerald-400/30 font-black'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
              }`}
            >
              <AlertOctagon className="h-4 w-4 text-emerald-300 shrink-0" />
              <span className="truncate">Exception Workflow</span>
            </button>

            {/* 6. Audit Trail (Internal Audit Read-Only Only) */}
            {canViewAudit && (
              <button
                onClick={() => onNavigateTab('audit')}
                className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                  activeTab === 'audit'
                    ? 'bg-teal-400 text-slate-950 border-teal-300 ring-2 ring-teal-400/40 font-black shadow-lg shadow-teal-500/25'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black border-teal-400 shadow-lg shadow-teal-500/25 transform hover:-translate-y-0.5'
                }`}
              >
                <History className="h-4 w-4 text-slate-950 shrink-0" />
                <span className="truncate">Audit Trail</span>
              </button>
            )}
          </div>
        </div>

        {/* View Buttons Aligned in the Same Line - Same Size as Action Card & Buttons */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
          <div className="shrink-0 flex items-center">
            <span className="h-10 w-20 rounded-xl inline-flex items-center justify-center text-center text-[10px] font-extrabold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 shadow-xs">
              View
            </span>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-3 ${canViewAudit ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2.5 flex-1 w-full`}>
            {/* 1. Designation View */}
            <button
              onClick={() => {
                onNavigateTab('overview');
                setActiveSubTab('designations');
              }}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                activeSubTab === 'designations'
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-teal-500/30 ring-2 ring-teal-400/30 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <Award className={`h-4 w-4 shrink-0 ${activeSubTab === 'designations' ? 'text-slate-950' : 'text-teal-400'}`} />
              <span className="truncate">Designation View</span>
              {activeSubTab !== 'designations' && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* 2. Management Reports */}
            <button
              onClick={() => {
                onNavigateTab('overview');
                setActiveSubTab('reports');
              }}
              className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                activeSubTab === 'reports'
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-teal-500/30 ring-2 ring-teal-400/30 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <FileSpreadsheet className={`h-4 w-4 shrink-0 ${activeSubTab === 'reports' ? 'text-slate-950' : 'text-teal-400'}`} />
              <span className="truncate">Management Reports</span>
              {activeSubTab !== 'reports' && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: OVERVIEW & PERSONAL STATS */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-7">
          {/* Latest amendments to the Delegation of Authority Matrix (Excel Demo Model) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            {/* Table Header Bar */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="h-4 w-4 text-teal-300" />
                </div>
                <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                  Latest amendments to the Delegation of Authority Matrix
                </h3>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6 w-24 text-center">NO.</th>
                    <th className="py-3 px-4 sm:px-6">Decision area</th>
                    <th className="py-3 px-4 sm:px-6">Update Type</th>
                    <th className="py-3 px-4 sm:px-6">Function</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Last update date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {DEMO_LATEST_AMENDMENTS.map((item, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-teal-50/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-400 text-center">
                        {item.id}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                        {item.decisionArea}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          item.updateType === 'New/Amended' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : item.updateType === 'Modified'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.updateType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-700">
                        {item.department}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-slate-600 font-medium whitespace-nowrap">
                        {item.lastUpdateDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Frequently visited decision areas (View-only Demo Card) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            {/* Table Header Bar */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Bookmark className="h-4 w-4 text-indigo-300" />
                </div>
                <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                  Frequently visited decision areas
                </h3>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6 w-24 text-center">NO.</th>
                    <th className="py-3 px-4 sm:px-6">Decision area</th>
                    <th className="py-3 px-4 sm:px-6 w-32">Function</th>
                    <th className="py-3 px-4 sm:px-6">Authority Chain</th>
                    <th className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">Last Update Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {DEMO_FREQUENTLY_VISITED_AREAS.map((item, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-400 text-center">
                        {item.no}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                        {item.decisionArea}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-700">
                        {item.function}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-slate-700 font-medium">
                        {item.authorityChain}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-slate-600 font-medium whitespace-nowrap">
                        {item.lastUpdateDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: DESIGNATION VIEW - INTERACTIVE GOVERNANCE KPI CARDS & DROPDOWNS */}
      {/* ========================================================================= */}
      {activeSubTab === 'designations' && (
        <div className="space-y-6 animate-fade-in">
          <GovernanceKpiCardsView
            currentUser={currentUser}
            activeCategoryId={activeGovernanceCategory}
            selectedOptionsMap={selectedGovernanceOptions}
            onSelectCategory={handleSelectGovernanceCategory}
            matrixData={designationMatrixData}
            isLoading={isLoadingDesignation}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: FUNCTIONALITY 7 & 9 - MANAGEMENT REPORTS & HR ORG HUB        */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-Switch under Management Reports: Pre-Set Reports vs HR Org & Acting Authorities */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportsSubView('preset')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  reportsSubView === 'preset'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Pre-Set Management Reports</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportsSubView('hr_org');
                  fetchHrData();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  reportsSubView === 'hr_org'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>HR Org &amp; Acting Authorities</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
              Corporate Governance Telemetry &bull; Modules 7 &amp; 9
            </span>
          </div>

          {reportsSubView === 'hr_org' ? (
            /* Integrated HR Org & Acting Authorities Section */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-[10px] font-extrabold uppercase">
                      Module 9
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">
                      HR System Integration &amp; Acting Authority Hub
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Real-time synchronization with enterprise HR systems (SAP SuccessFactors / Workday) to auto-update designations, reporting lines, detect vacancies, and route approvals to acting authorities.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live HR Connector: ACTIVE
                  </span>
                </div>
              </div>

              {isLoadingHr ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
                  <p className="text-xs font-semibold">Synchronizing with HR directory...</p>
                </div>
              ) : !hrData ? (
                <div className="py-16 text-center text-slate-400">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No HR connector data available.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* HR Telemetry Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Synced Positions</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">{hrData.total_synced_positions}</div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Vacancies Detected</span>
                      <div className="text-2xl font-black text-amber-800 mt-1">{hrData.vacancies_detected}</div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Active Acting Authorities</span>
                      <div className="text-2xl font-black text-blue-800 mt-1">{hrData.acting_delegations_active}</div>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Sync Frequency</span>
                      <div className="text-sm font-bold text-emerald-800 mt-2">Every 15 Minutes (WebHook)</div>
                    </div>
                  </div>

                  {/* Active Acting Delegations (Sub-Delegations) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Active Sub-Delegations &amp; Interim Sign-Off Authorities
                      </span>
                      <span className="text-xs text-slate-400">
                        Total Active: <strong className="text-slate-800">{hrData.acting_delegations?.length || 0}</strong>
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="max-h-[380px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Primary Position (Substantive)</th>
                              <th className="py-3 px-4">Interim Acting Authority</th>
                              <th className="py-3 px-4">Assigned Delegated Sign-Off</th>
                              <th className="py-3 px-4">Valid Window</th>
                              <th className="py-3 px-4 text-center">Formal Mandate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(hrData.acting_delegations || []).map((del, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-800">{del.primary_position}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{del.primary_holder}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-indigo-700">{del.acting_holder}</div>
                                  <div className="text-[10px] text-slate-500">{del.acting_position}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                    {del.authorized_scope}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                  {del.start_date} &rarr; {del.end_date}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {del.mandate_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded text-[10px] font-extrabold uppercase">
                  Functionality 7
                </span>
                <span className={`px-2.5 py-0.5 border rounded text-[10px] font-extrabold uppercase ${currentPersona.color}`}>
                  {currentPersona.badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Management Governance Reports Hub
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Generate pre-set reports on active delegations, pending approval requests, recently modified rules, and regulatory mandated authorities tailored to your role.
              </p>
            </div>

            {/* Export Buttons: Download in .pdf or in .xlsx */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportReportToPdf(reportData, selectedReportType)}
                disabled={isLoadingReport || !reportData || !reportData.data?.length}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download report in .pdf format"
              >
                <FileDown className="h-3.5 w-3.5 text-rose-600" />
                <span>Download .PDF</span>
              </button>

              <button
                onClick={() => exportReportToExcel(reportData, selectedReportType)}
                disabled={isLoadingReport || !reportData || !reportData.data?.length}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download report in .xlsx format"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Download .XLSX</span>
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Pre-set Report Category Buttons: Role-Specific Primary followed by Global Catalog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Select Pre-Set Report Module:
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Scope: <strong className="text-slate-700">{currentPersona.badge}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ALL_ACCESSIBLE_REPORTS.map(r => {
                const isSelected = selectedReportType === r.key;
                const isRoleSpecific = roleSpecificReportsList.some(item => item.key === r.key);
                return (
                  <button
                    key={r.key}
                    onClick={() => setSelectedReportType(r.key)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/80 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-teal-300 bg-slate-50/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                        {r.report_id}
                      </span>
                      {isRoleSpecific && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                          Role Scoped
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {r.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block line-clamp-2 leading-relaxed">
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Report Results View */}
          {isLoadingReport ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Compiling management report from database...</p>
            </div>
          ) : !reportData ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">No report data generated.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {reportData.report_id || 'RPT-PRESET'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {reportData.scope || `Persona: ${currentPersona.badge}`}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold">{reportData.title}</h4>
                  <p className="text-xs text-slate-400">
                    Compiled: {new Date(reportData.generated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full text-xs font-mono font-bold text-teal-300">
                    Total Records: {reportData.count}
                  </span>
                </div>
              </div>

              {/* Table rendering of report data */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        {(reportData.columns || (Array.isArray(reportData.data) && reportData.data.length > 0 ? Object.keys(reportData.data[0]) : [])).map((col) => (
                          <th key={col} className="py-3 px-4 whitespace-nowrap">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!Array.isArray(reportData.data) || reportData.data.length === 0 ? (
                        <tr>
                          <td colSpan={reportData.columns?.length || 5} className="py-8 text-center text-slate-400">
                            No records found for this report.
                          </td>
                        </tr>
                      ) : (
                        reportData.data.map((item, idx) => {
                          const cols = reportData.columns || Object.keys(item);
                          return (
                            <tr key={item.id || item.log_id || item.version_id || idx} className="hover:bg-slate-50/70 transition-colors">
                              {cols.map((colKey, cIdx) => {
                                const val = item[colKey];
                                const renderedVal = val !== null && val !== undefined ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : '-';
                                const isId = colKey.toLowerCase().includes('id');
                                const isStatus = colKey.toLowerCase().includes('status') || colKey === 'decision';
                                const isAlert = colKey.toLowerCase().includes('alert');

                                return (
                                  <td key={colKey + cIdx} className={`py-3 px-4 ${isId ? 'font-mono font-bold text-slate-900' : 'text-slate-700'}`}>
                                    {isStatus ? (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                        renderedVal.includes('APPROVED') || renderedVal.includes('COMPLIANT') || renderedVal.includes('PASS')
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                          : renderedVal.includes('REJECTED') || renderedVal.includes('VIOLATION')
                                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                          : 'bg-teal-50 text-teal-800 border border-teal-200'
                                      }`}>
                                        {renderedVal}
                                      </span>
                                    ) : isAlert ? (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        renderedVal.includes('EXCEEDED')
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {renderedVal}
                                      </span>
                                    ) : (
                                      <span className="line-clamp-2 max-w-xs">{renderedVal}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {/* Legacy fallback if activeSubTab === 'hr_integration' */}
      {activeSubTab === 'hr_integration' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-[10px] font-extrabold uppercase">
                  Functionality 9
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  HR System Integration &amp; Acting Authority Hub
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Real-time synchronization with enterprise HR systems (SAP SuccessFactors / Workday) to auto-update designations, reporting lines, detect vacancies, and route approvals to acting authorities.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live HR Connector: ACTIVE
              </span>
            </div>
          </div>

          {isLoadingHr ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Synchronizing with HR directory...</p>
            </div>
          ) : !hrData ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">No HR connector data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* HR Telemetry Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Synced Positions</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{hrData.total_synced_positions}</div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Vacancies Detected</span>
                  <div className="text-2xl font-black text-amber-800 mt-1">{hrData.vacancies_detected}</div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Active Acting Authorities</span>
                  <div className="text-2xl font-black text-blue-800 mt-1">{hrData.acting_delegations_active}</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Sync Frequency</span>
                  <div className="text-sm font-bold text-emerald-800 mt-2">Every 15 Minutes (WebHook)</div>
                </div>
              </div>

              {/* Positions & Acting Routing Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Emp Code</th>
                      <th className="py-3 px-4">Designation &bull; Function</th>
                      <th className="py-3 px-4">Active Incumbent</th>
                      <th className="py-3 px-4">Reporting Hierarchy</th>
                      <th className="py-3 px-4">Acting Authority Routing</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hrData.employees.map((emp) => (
                      <tr key={emp.emp_code} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {emp.emp_code}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{emp.designation}</span>
                          <span className="text-[11px] text-slate-500">{emp.department}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.is_vacant ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[11px] flex items-center gap-1 w-max">
                              <AlertTriangle className="h-3 w-3 text-amber-700" />
                              VACANCY DETECTED
                            </span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-800">{emp.full_name}</span>
                              <span className="text-[11px] text-slate-400 block font-mono">{emp.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          Reports to: <strong className="text-slate-900">{emp.reporting_to_name}</strong>
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.acting_authority_name ? (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                                Re-Routed to Acting Authority:
                              </span>
                              <span className="text-xs font-bold text-blue-950 block mt-0.5">
                                {emp.acting_authority_name}
                              </span>
                              <span className="text-[10px] text-blue-700 block mt-0.5">
                                Valid until {emp.acting_valid_until}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Normal routing active</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase">
                            SYNCED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: EXCEPTIONS WORKFLOW INBOX (SECTION 4.3) */}
      {/* ========================================================================= */}
      {activeSubTab === 'exceptions' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Submit New Exception Request</h3>
              <p className="text-xs text-slate-500">Need to propose a decision area that deviates from standard DOA rules?</p>
            </div>
            <button
              onClick={() => setShowExceptionModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Draft Exception Request</span>
            </button>
          </div>
          <ExceptionWorkflowInbox currentUser={currentUser} />
        </div>
      )}



      {/* Supplementary BRD Exception Modal */}
      <ExceptionRequestModal
        isOpen={showExceptionModal}
        onClose={() => {
          setShowExceptionModal(false);
          setBlockedValidationData(null);
        }}
        initialData={blockedValidationData || {}}
        onSuccess={() => {
          setActiveSubTab('exceptions');
        }}
      />

    </div>
  );
}

