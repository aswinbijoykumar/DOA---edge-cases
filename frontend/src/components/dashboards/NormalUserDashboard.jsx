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
  FileDown
} from 'lucide-react';
import { api } from '../../services/api';
import { exportReportToExcel, exportReportToPdf } from '../../utils/reportExport';

export default function NormalUserDashboard({ 
  userStats, 
  currentUser, 
  onNavigateTab, 
  onNewRequest,
  kpis
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

  // Sub-tab view inside Normal User Workspace
  // 'overview' | 'designations' | 'reports' | 'hr_integration'
  const [activeSubTab, setActiveSubTab] = useState(
    currentUser?.persona_type === 'AUTHORITY_OWNER' ? 'designations' :
    currentUser?.persona_type === 'PROCESS_OWNER' ? 'hr_integration' :
    currentUser?.persona_type === 'AUDIT_READONLY' ? 'reports' : 'overview'
  );

  // Designation Matrix State (Functionality 5)
  const [selectedDesignationKey, setSelectedDesignationKey] = useState(initialDesignation);
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
      badge: 'Front-End User',
      color: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
      greeting: 'Business Line Analyst',
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

  // Load Designation Matrix
  const fetchDesignationMatrix = async (key) => {
    setIsLoadingDesignation(true);
    try {
      const res = await api.getDesignationMatrix(key);
      setDesignationMatrixData(res);
    } catch (err) {
      console.error('Failed to load designation matrix:', err);
    } finally {
      setIsLoadingDesignation(false);
    }
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

  useEffect(() => {
    if (activeSubTab === 'designations') {
      fetchDesignationMatrix(selectedDesignationKey);
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
      
      {/* Dynamic Role & Persona Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 border rounded-full text-[10px] font-extrabold tracking-widest uppercase ${currentPersona.color}`}>
                {currentPersona.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentUser?.designation || 'Business Stakeholder'} &bull; {currentUser?.department || 'Operations'}
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>Welcome back, {currentUser?.full_name || 'Stakeholder'}</span>
              <Sparkles className="h-5 w-5 text-teal-400" />
            </h2>
            
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {currentPersona.description}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onNavigateTab('search')}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Search className="h-4 w-4 text-teal-300" />
              <span>Search DOA Matrix</span>
            </button>
            
            {currentUser?.persona_type !== 'AUDIT_READONLY' && (
              <button
                onClick={onNewRequest}
                className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span>Propose Change Request</span>
              </button>
            )}
          </div>
        </div>

        {/* Feature Sub-Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Persona Workspace', icon: Briefcase },
            { id: 'designations', label: 'Designation-Wise Authorities', icon: Award, highlight: true },
            { id: 'reports', label: 'Management Reports', icon: FileSpreadsheet, highlight: true },
            { id: 'hr_integration', label: 'HR Org & Acting Authorities', icon: Users, highlight: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-slate-950' : 'text-teal-400'}`} />
                <span>{tab.label}</span>
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: OVERVIEW & PERSONAL STATS */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-7">
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">My Authored Submissions</span>
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-3">
                {userStats?.total_my_requests ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium truncate">
                Authored by {currentUser?.email}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">In Review Queue</span>
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600 mt-3">
                {userStats?.my_pending ?? 0}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 font-medium">
                Awaiting 2LoD validation
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Approved Proposals</span>
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-blue-600 mt-3">
                {userStats?.my_approved ?? 0}
              </div>
              <div className="text-[11px] text-blue-700 mt-1 font-medium">
                Ready for v2 master publication
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Active Published Rules</span>
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600 mt-3">
                {userStats?.total_published_doa ?? kpis?.sourceRecords ?? 53}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                Live corporate governance matrix
              </div>
            </div>
          </div>

          {/* Submissions & Role Guidance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {currentUser?.persona_type === 'APPROVER' ? 'Pending Approval Queue & Recent Proposals' : 'My Recent Change Proposals'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentUser?.persona_type === 'APPROVER' ? 'Inspect change submissions requiring executive endorsement' : 'Track status of your drafted or submitted delegation rules'}
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('queue')}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  View All in Queue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {(!userStats?.recent_submissions || userStats.recent_submissions.length === 0) ? (
                <div className="py-12 text-center text-slate-400">
                  <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No change proposals authored yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click below to draft your first authority modification proposal.</p>
                  <button
                    onClick={onNewRequest}
                    className="mt-4 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 transition-all"
                  >
                    Draft First Proposal
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {userStats.recent_submissions.map(sub => (
                    <div key={sub.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">#{sub.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            sub.request_type === 'ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            sub.request_type === 'MODIFY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {sub.request_type}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {sub.department} &bull; {sub.process || 'DOA Authority'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 italic truncate">
                          "{sub.rationale || 'Rule proposal'}"
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          sub.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          sub.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          sub.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {sub.status}
                        </span>
                        <button
                          onClick={() => onNavigateTab('queue')}
                          className="text-xs text-slate-400 hover:text-slate-700 p-1"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Persona Action Center */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    Role Responsibilities
                  </h4>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {currentPersona.badge}
                  </span>
                </div>
                
                <div className="space-y-2 text-xs">
                  {(currentPersona.responsibilities || [
                    'Search, filter, and view designation-wise authorities',
                    'Inspect policy, charter, and regulatory citations',
                    'Generate live pre-set management reports',
                    'View HR hierarchy & acting delegation routing'
                  ]).map((resp, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-700">
                      <span className="font-bold text-teal-600 flex-shrink-0">✓</span>
                      <span className="leading-snug">{resp}</span>
                    </div>
                  ))}
                  
                  {currentUser?.persona_type === 'AUDIT_READONLY' && (
                    <div className="flex items-start gap-2 text-amber-700 pt-1 border-t border-slate-200">
                      <span className="font-bold flex-shrink-0">ℹ</span>
                      <span>Assurance Read-Only mode: proposal modification locked</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Feature Callouts */}
              <div className="bg-gradient-to-br from-teal-50 to-indigo-50 border border-teal-200/70 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> High-Impact Features
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Need to check all authorities of the CEO or Board? Switch to the <strong>Designation-Wise Authorities</strong> tab above to view them grouped with exact action codes.
                </p>
                <button
                  onClick={() => setActiveSubTab('designations')}
                  className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
                >
                  View Designation Matrix <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: FUNCTIONALITY 5 - DESIGNATION-WISE AUTHORITIES UNDER ONE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'designations' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-[10px] font-extrabold uppercase">
                  Functionality 5
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Designation-Wise Authorities Matrix
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                View all authorities for a specific executive designation or governance body under one consolidated table, highlighting whether they Approve (A), Endorse (E), Recommend (R), or Receive Notification (N).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs">
                <Award className="h-4 w-4 text-teal-700" />
                <span className="text-slate-600">Your Incumbent Role:</span>
                <strong className="text-teal-900 font-extrabold">{currentUser?.designation || 'Stakeholder'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  View Designation:
                </label>
                <select
                  value={selectedDesignationKey}
                  onChange={(e) => setSelectedDesignationKey(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer shadow-2xs"
                >
                  {DESIGNATIONS_LIST.map(d => (
                    <option key={d.key} value={d.key}>
                      {d.label} {d.key === initialDesignation ? '(Your Role)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Persona-Specific Authority Banner */}
          {selectedDesignationKey === initialDesignation && (
            <div className="p-4 bg-teal-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/30 rounded-xl">
                  <Award className="h-5 w-5 text-teal-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs tracking-wider uppercase text-teal-300">
                    Showing authorities specifically delegated to YOUR designation
                  </h4>
                  <p className="text-xs text-slate-200 mt-0.5">
                    These are the rules where you possess explicit signing, endorsement, or approval powers.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-teal-800 border border-teal-700 rounded-xl text-xs font-mono font-bold text-teal-200">
                Incumbent: {currentUser?.full_name}
              </span>
            </div>
          )}

          {/* Action Code Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="font-extrabold text-slate-500 uppercase text-[10px]">Action Legend:</span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-md text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Approve (A / A1 / A2)
            </span>
            <span className="flex items-center gap-1.5 font-bold text-blue-800 bg-blue-100/70 border border-blue-300 px-2.5 py-1 rounded-md text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Endorse (E / E1 / E2)
            </span>
            <span className="flex items-center gap-1.5 font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-md text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              Recommend (R / R1)
            </span>
            <span className="flex items-center gap-1.5 font-bold text-purple-800 bg-purple-100/70 border border-purple-300 px-2.5 py-1 rounded-md text-[11px]">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              Notification (N)
            </span>
          </div>

          {/* Designation Authorities Table */}
          {isLoadingDesignation ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Filtering designation authorities...</p>
            </div>
          ) : !designationMatrixData || designationMatrixData.authorities.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">No direct authorities mapped to this designation.</p>
            </div>
          ) : (
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-700">
                  Total Active Authorities for {DESIGNATIONS_LIST.find(d => d.key === selectedDesignationKey)?.label}: <span className="text-teal-700">{designationMatrixData.total_authorities}</span>
                </span>
                <span className="text-slate-400 text-[11px]">Live Database &bull; Active Version 1</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ref #</th>
                      <th className="py-3 px-4">Function &bull; Business Line</th>
                      <th className="py-3 px-6">Decision Area / Authority Mandate</th>
                      <th className="py-3 px-4 text-center">Specific Action</th>
                      <th className="py-3 px-4">Policy &amp; Regulatory Linkage</th>
                      <th className="py-3 px-4">Composite Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {designationMatrixData.authorities.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          #{item.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            item.function === 'Risk' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {item.function}
                          </span>
                          <div className="text-[11px] text-slate-600 font-semibold mt-1 truncate max-w-[180px]">
                            {item.business_line}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <p className="font-bold text-slate-800 leading-snug">
                            {item.decision_area}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded ${
                              item.key_non_key === 'Key' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.key_non_key} Decision
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg font-black text-xs border ${
                            item.action_type === 'APPROVE' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                            item.action_type === 'ENDORSE' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            item.action_type === 'RECOMMEND' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            'bg-purple-100 text-purple-900 border-purple-300'
                          }`}>
                            {item.authority_code} ({item.action_type})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {item.policy_reference && (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                                <BookOpen className="h-3 w-3 text-teal-600" />
                                <span className="truncate max-w-[200px]">{item.policy_reference}</span>
                              </div>
                            )}
                            {item.regulatory_requirement && (
                              <div className="flex items-center gap-1.5 text-[10px] text-rose-700 font-medium">
                                <ShieldCheck className="h-3 w-3 text-rose-500" />
                                <span className="truncate max-w-[200px]">{item.regulatory_requirement}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-teal-900 font-bold bg-teal-50/40 rounded">
                          {item.composite_authority}
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
      {/* SUB-VIEW 3: FUNCTIONALITY 7 - PRE-SET MANAGEMENT REPORTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 animate-fade-in">
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
                        {(reportData.columns || (reportData.data.length ? Object.keys(reportData.data[0]) : [])).map((col) => (
                          <th key={col} className="py-3 px-4 whitespace-nowrap">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.data.map((item, idx) => {
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: FUNCTIONALITY 9 - HR SYSTEM INTEGRATION & ACTING AUTHORITIES */}
      {/* ========================================================================= */}
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
                      <th className="py-3 px-4">Designation &bull; Department</th>
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

    </div>
  );
}

