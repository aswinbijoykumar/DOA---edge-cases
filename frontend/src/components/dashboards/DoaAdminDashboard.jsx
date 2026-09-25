import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, 
  Send, 
  X, 
  ShieldCheck, 
  GitPullRequest, 
  Clock, 
  CheckCircle, 
  Layers, 
  Database,
  ArrowRight,
  Eye,
  Plus,
  Search,
  Bell,
  User,
  LogOut,
  FolderTree,
  Sliders,
  UploadCloud,
  History,
  FileCheck2,
  AlertCircle,
  Filter,
  RefreshCw,
  Archive,
  Ban,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Scale,
  Users,
  Building2,
  Lock,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../../services/api';

export default function DoaAdminDashboard({
  adminStats,
  currentUser,
  doaRecords = [],
  changeRequests = [],
  auditLogs = [],
  onLogout,
  onInspectCR,
  onApproveCR,
  onPublishCR,
  onRejectCR,
  onRefreshData,
  functionTaxonomy = {},
  authorityTaxonomy = {}
}) {
  // Navigation: 9 required sections
  // 'dashboard' | 'repository' | 'decision_areas' | 'queue' | 'taxonomy' | 'workflows' | 'publication' | 'versions' | 'audit_trail'
  const [activeNav, setActiveNav] = useState('dashboard');

  // Global topbar search
  const [searchQuery, setSearchQuery] = useState('');

  // Topbar dropdowns
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Repository view filters
  const [repoParentFilter, setRepoParentFilter] = useState('All');
  const [repoStatusFilter, setRepoStatusFilter] = useState('All');
  const [repoRegFilter, setRepoRegFilter] = useState('All');

  // Change Queue view filter
  const [queueTab, setQueueTab] = useState('ALL'); // ALL, SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUIRED, APPROVED, REJECTED, PUBLISHED

  // Taxonomy & Master Relationships Data (loaded from backend)
  const [committees, setCommittees] = useState([]);
  const [governanceDocs, setGovernanceDocs] = useState([]);
  const [workflowRules, setWorkflowRules] = useState([]);
  const [statusLifecycle, setStatusLifecycle] = useState([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);

  // Clarification Modal State
  const [clarificationModal, setClarificationModal] = useState({ open: false, crId: null, comment: '' });
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);

  // Pre-submission validation drawer & record editor modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState('create'); // 'create' | 'edit'
  const [recordForm, setRecordForm] = useState({
    id: '',
    parent_function: 'Finance',
    business_line: 'Bank Capital and Capital Management',
    decision_area: '',
    key_non_key: 'Key',
    regulatory: 'N',
    shareholders: '',
    board_of_directors: '',
    subsidiary_board: '',
    chairman: '',
    board_committees: '',
    board_committees_op: '',
    gceo: '',
    ceo: '',
    management_committees: '',
    c_level_executives: '',
    composite_authority: '',
    committees: [],
    governance_docs: [],
    regulatory_refs: [],
    comments: ''
  });
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  // Workflow Simulator State
  const [simulatorInput, setSimulatorInput] = useState({
    department: 'Finance',
    riskImpact: 'High',
    regulatoryImpact: 'Yes',
    process: 'Bank Capital'
  });
  const [simulatedRoute, setSimulatedRoute] = useState(null);

  // Historical Version Snapshot Inspector State
  const [selectedVersionRecord, setSelectedVersionRecord] = useState(null);
  const [recordHistoryVersions, setRecordHistoryVersions] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // Load Relational Master Data from backend
  const loadTaxonomyData = async () => {
    setIsLoadingTaxonomy(true);
    try {
      const [comms, docs, rules, statuses] = await Promise.all([
        api.getCommitteesTaxonomy().catch(() => []),
        api.getGovernanceDocuments().catch(() => []),
        api.getWorkflowRules().catch(() => []),
        api.getStatuses().catch(() => [])
      ]);
      setCommittees(comms || []);
      setGovernanceDocs(docs || []);
      setWorkflowRules(rules || []);
      setStatusLifecycle(statuses || []);
    } catch (err) {
      console.error('Error fetching master taxonomy in DOA Admin:', err);
    } finally {
      setIsLoadingTaxonomy(false);
    }
  };

  useEffect(() => {
    loadTaxonomyData();
  }, []);

  // Compute live KPI counters
  const kpis = useMemo(() => {
    const totalDoas = doaRecords.length;
    const draftChanges = changeRequests.filter(cr => cr.status === 'DRAFT').length;
    const pendingReview = changeRequests.filter(cr => 
      cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW' || cr.status === 'CLARIFICATION_REQUIRED'
    ).length;
    const publishedChanges = changeRequests.filter(cr => cr.status === 'PUBLISHED').length;
    const approvedAwaitingPublish = changeRequests.filter(cr => cr.status === 'APPROVED').length;

    return {
      totalDoas: adminStats?.total_active_records || totalDoas,
      draftChanges,
      pendingReview: adminStats?.pending_review || pendingReview,
      publishedChanges: adminStats?.published_count || publishedChanges,
      approvedAwaitingPublish
    };
  }, [doaRecords, changeRequests, adminStats]);

  // Notifications List (Derived from actionable events)
  const notifications = useMemo(() => {
    const items = [];
    const pending = changeRequests.filter(cr => cr.status === 'SUBMITTED');
    if (pending.length > 0) {
      items.push({
        id: 'pending-approvals',
        title: `${pending.length} Pending Approval${pending.length > 1 ? 's' : ''}`,
        desc: 'New delegation change requests require executive review.',
        type: 'warning',
        actionNav: 'queue'
      });
    }
    const approved = changeRequests.filter(cr => cr.status === 'APPROVED');
    if (approved.length > 0) {
      items.push({
        id: 'ready-publish',
        title: `${approved.length} Request${approved.length > 1 ? 's' : ''} Ready to Publish`,
        desc: 'Approved proposals awaiting publication to bump master version.',
        type: 'success',
        actionNav: 'publication'
      });
    }
    const clarification = changeRequests.filter(cr => cr.status === 'CLARIFICATION_REQUIRED');
    if (clarification.length > 0) {
      items.push({
        id: 'clarification-pending',
        title: `${clarification.length} Returned for Clarification`,
        desc: 'Awaiting revised evidence from department requesters.',
        type: 'info',
        actionNav: 'queue'
      });
    }
    return items;
  }, [changeRequests]);

  // Filtered DOA Repository records
  const filteredRecords = useMemo(() => {
    return doaRecords.filter(rec => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || (
        (rec.id && String(rec.id).toLowerCase().includes(q)) ||
        (rec.decisionArea || rec.decision_area || '').toLowerCase().includes(q) ||
        (rec.parentFunction || rec.parent_function || '').toLowerCase().includes(q) ||
        (rec.businessLine || rec.business_line || '').toLowerCase().includes(q) ||
        (rec.compositeAuthority || rec.composite_authority || '').toLowerCase().includes(q)
      );

      const pFunc = rec.parentFunction || rec.parent_function;
      const matchesParent = repoParentFilter === 'All' || pFunc === repoParentFilter;

      const reg = rec.regulatory || 'N';
      const matchesReg = repoRegFilter === 'All' || (repoRegFilter === 'Yes' ? reg === 'Y' : reg === 'N');

      const st = rec.status || 'Active';
      const matchesStatus = repoStatusFilter === 'All' || st.toLowerCase() === repoStatusFilter.toLowerCase();

      return matchesSearch && matchesParent && matchesReg && matchesStatus;
    });
  }, [doaRecords, searchQuery, repoParentFilter, repoRegFilter, repoStatusFilter]);

  // Filtered Change Queue
  const filteredQueue = useMemo(() => {
    return changeRequests.filter(cr => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || (
        String(cr.id).includes(q) ||
        (cr.department || '').toLowerCase().includes(q) ||
        (cr.process || '').toLowerCase().includes(q) ||
        (cr.requester_email || '').toLowerCase().includes(q) ||
        (cr.rationale || '').toLowerCase().includes(q)
      );

      const matchesStatus = queueTab === 'ALL' || cr.status === queueTab;
      return matchesSearch && matchesStatus;
    });
  }, [changeRequests, searchQuery, queueTab]);

  // Run Pre-Submission Server Validation
  const handleValidateForm = async () => {
    setIsValidating(true);
    try {
      const res = await api.validateRecord(recordForm);
      setValidationResult(res);
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [`Validation service failed: ${err.message}`],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Submit new or edited DOA record
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    setIsSubmittingRecord(true);
    try {
      // Validate first if not yet validated
      const val = await api.validateRecord(recordForm);
      if (!val.valid) {
        setValidationResult(val);
        setIsSubmittingRecord(false);
        return;
      }

      // Build proposed payload matching backend schema
      const proposedPayload = {
        parent_function: recordForm.parent_function,
        function: recordForm.parent_function,
        business_line: recordForm.business_line,
        category: recordForm.business_line,
        key_non_key: recordForm.key_non_key,
        decision_area: recordForm.decision_area,
        regulatory: recordForm.regulatory,
        shareholders: recordForm.shareholders,
        board_of_directors: recordForm.board_of_directors,
        subsidiary_board: recordForm.subsidiary_board,
        chairman: recordForm.chairman,
        board_committees: recordForm.board_committees,
        board_committees_op: recordForm.board_committees_op,
        gceo: recordForm.gceo,
        ceo: recordForm.ceo,
        management_committees: recordForm.management_committees,
        c_level_executives: recordForm.c_level_executives,
        composite_authority: recordForm.composite_authority || `${recordForm.board_of_directors || 'BoD (A)'}`,
        comments: recordForm.comments || 'Administrative delegation record',
        rationale: recordForm.comments || 'Direct administrative update by DOA Administrator'
      };

      if (recordModalMode === 'create') {
        const res = await api.createChangeRequest({
          request_type: 'ADD',
          department: recordForm.parent_function,
          process: recordForm.business_line,
          rationale: recordForm.comments || 'New Master DOA Rule created by DOA Administrator',
          base_version: 1,
          proposed_value: proposedPayload
        });
        // Auto approve if DOA Admin
        await api.approveChangeRequest(res.id, 'Executive pre-approved by DOA Administrator');
      } else {
        const res = await api.createChangeRequest({
          request_type: 'MODIFY',
          doa_id: recordForm.id,
          department: recordForm.parent_function,
          process: recordForm.business_line,
          rationale: recordForm.comments || 'Master Rule Modification by DOA Administrator',
          base_version: 1,
          proposed_value: proposedPayload
        });
        await api.approveChangeRequest(res.id, 'Executive pre-approved by DOA Administrator');
      }

      setShowRecordModal(false);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  // Archive or Retire a Record
  const handleArchiveRecord = async (recordId) => {
    if (!window.confirm(`Are you sure you want to retire / archive DOA Record #${recordId}? This will log an immutable audit event.`)) {
      return;
    }
    try {
      const res = await api.createChangeRequest({
        request_type: 'DELETE',
        doa_id: recordId,
        department: 'Governance',
        process: 'Record Retirement',
        rationale: 'Retired and archived by DOA Administrator',
        base_version: 1,
        proposed_value: { id: recordId, status: 'ARCHIVED', comments: 'Administrative retirement' }
      });
      await api.approveChangeRequest(res.id, 'Administrative retirement approval');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(`Retire action failed: ${err.message}`);
    }
  };

  // Clarification handler
  const handleSendClarification = async () => {
    if (!clarificationModal.comment.trim()) {
      alert('Please state what clarification or evidence is required.');
      return;
    }
    setIsSubmittingClarification(true);
    try {
      await api.requestClarification(clarificationModal.crId, clarificationModal.comment);
      setClarificationModal({ open: false, crId: null, comment: '' });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(`Clarification request failed: ${err.message}`);
    } finally {
      setIsSubmittingClarification(false);
    }
  };

  // Inspect Record Versions
  const handleInspectVersions = async (rec) => {
    setSelectedVersionRecord(rec);
    setIsLoadingVersions(true);
    try {
      const logs = await api.getAuditLogs({ record_id: rec.id });
      setRecordHistoryVersions(logs || []);
    } catch (err) {
      console.error('Error loading record version history:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Run Workflow Simulator
  const handleRunSimulator = () => {
    const matchingRules = workflowRules.filter(r => {
      const depMatch = r.department === 'All' || r.department === simulatorInput.department;
      const riskMatch = !r.risk_impact || r.risk_impact === simulatorInput.riskImpact;
      const regMatch = !r.regulatory_impact || r.regulatory_impact === simulatorInput.regulatoryImpact;
      return depMatch && (riskMatch || regMatch);
    });

    setSimulatedRoute({
      department: simulatorInput.department,
      rulesMatched: matchingRules,
      stages: [
        { stage: 'Stage 1: Line Manager & Head of Department', type: 'Sequential', required: true },
        { stage: 'Stage 2: Compliance & Risk Review', type: simulatorInput.regulatoryImpact === 'Yes' ? 'Mandatory Parallel' : 'Conditional', required: true },
        { stage: matchingRules[0]?.governance_body || 'Board Audit Committee', type: 'Executive Final Review', required: true },
        { stage: 'Stage 4: DOA Administrator Final Publication', type: 'Release Authority', required: true }
      ]
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. TOPBAR */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
        {/* Left: Brand & Dashboard Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-teal-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">protiviti</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  DOA ADMIN CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise Delegation Master & Governance Matrix</p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search DOAs, change requests, authority tiers, decision areas..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Notifications, Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              title="Notifications"
              className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-teal-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center shadow-md">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Executive Alerts</h4>
                  <span className="text-[10px] text-teal-400 font-bold">{notifications.length} active</span>
                </div>
                <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No pending notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id}
                        onClick={() => {
                          setActiveNav(n.actionNav);
                          setShowNotifications(false);
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            n.type === 'warning' ? 'bg-amber-400' :
                            n.type === 'success' ? 'bg-teal-400' : 'bg-blue-400'
                          }`} />
                          <span className="text-xs font-bold text-slate-200">{n.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{n.desc}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Sign Out */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-all"
            >
              <div className="h-6 w-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                {currentUser?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold leading-none text-slate-200">{currentUser?.full_name || 'DOA Administrator'}</p>
                <p className="text-[10px] text-teal-400 font-mono mt-0.5">DOA_ADMINISTRATOR</p>
              </div>
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-2">
                <div className="px-2 py-1.5 border-b border-slate-800 text-xs">
                  <p className="font-bold text-white">{currentUser?.full_name}</p>
                  <p className="text-[11px] text-slate-400">{currentUser?.email || 'doaadmin@doa.local'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Authority: Master Matrix Release
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out of Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN PANELS */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        
        {/* SIDEBAR: 9 SECTIONS */}
        <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800/80 flex-shrink-0 p-4 space-y-6">
          <div>
            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Navigation Workspace
            </div>
            <nav className="mt-2 space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Layers, badge: null },
                { id: 'repository', label: 'DOA Repository', icon: Database, badge: kpis.totalDoas },
                { id: 'decision_areas', label: 'Decision Areas', icon: FolderTree, badge: null },
                { id: 'queue', label: 'Change Queue', icon: GitPullRequest, badge: kpis.pendingReview || null },
                { id: 'taxonomy', label: 'Taxonomy', icon: Sliders, badge: null },
                { id: 'workflows', label: 'Workflows', icon: Sliders, badge: null },
                { id: 'publication', label: 'Publication', icon: UploadCloud, badge: kpis.approvedAwaitingPublish || null },
                { id: 'versions', label: 'Versions', icon: History, badge: null },
                { id: 'audit_trail', label: 'Audit Trail', icon: FileCheck2, badge: null },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeNav === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveNav(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-slate-950 text-teal-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Actions Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-200">Executive Actions</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Create a new master DOA record or run parameter-based governance validation.
            </p>
            <button
              onClick={() => {
                setRecordModalMode('create');
                setRecordForm({
                  id: '',
                  parent_function: 'Finance',
                  business_line: 'Bank Capital and Capital Management',
                  decision_area: '',
                  key_non_key: 'Key',
                  regulatory: 'N',
                  shareholders: '',
                  board_of_directors: '',
                  subsidiary_board: '',
                  chairman: '',
                  board_committees: '',
                  board_committees_op: '',
                  gceo: '',
                  ceo: '',
                  management_committees: '',
                  c_level_executives: '',
                  composite_authority: '',
                  committees: [],
                  governance_docs: [],
                  regulatory_refs: [],
                  comments: ''
                });
                setValidationResult(null);
                setShowRecordModal(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create DOA Record</span>
            </button>
          </div>
        </aside>

        {/* MAIN PANELS */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          
          {/* ========================================================================= */}
          {/* PANEL 1: DASHBOARD (KPIS + EXECUTIVE ACTION CENTER)                       */}
          {/* ========================================================================= */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Executive Welcome Banner */}
              <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 border border-teal-500/20 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full text-[10px] font-extrabold tracking-widest uppercase text-teal-300">
                        Executive Action Center
                      </span>
                      <span className="text-xs text-slate-400 font-mono">DOA_ADMINISTRATOR</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Chief Delegation Cockpit: {currentUser?.full_name?.split(' ')[0] || 'Administrator'}
                    </h2>
                    <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                      Final release authority for enterprise Delegation of Authority. Direct approval power, parameter-based workflow routing, and immutable version release.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveNav('repository')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
                    >
                      <Database className="h-4 w-4 text-teal-400" />
                      <span>Browse Matrix</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('queue')}
                      className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-teal-500/20"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      <span>Review Queue ({kpis.pendingReview})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 REQUIRED KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total DOAs */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total DOAs</span>
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                      <Database className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">{kpis.totalDoas}</div>
                  <p className="text-[11px] text-teal-400/90 font-semibold">Active enterprise authority records</p>
                </div>

                {/* Draft Changes */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Draft Changes</span>
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-300">{kpis.draftChanges}</div>
                  <p className="text-[11px] text-slate-400">Proposals being drafted by departments</p>
                </div>

                {/* Pending Review */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pending Review</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <GitPullRequest className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-300">{kpis.pendingReview}</div>
                  <p className="text-[11px] text-amber-400/90 font-semibold">Requires executive review / sign-off</p>
                </div>

                {/* Published Changes */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Published Changes</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">{kpis.publishedChanges}</div>
                  <p className="text-[11px] text-emerald-400/90 font-semibold">Live released matrix versions</p>
                </div>
              </div>

              {/* Actionable Review Queue & Authority Deck */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main: Actionable Queue */}
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Actionable Queue</h3>
                      <p className="text-xs text-slate-400">Direct executive approve, reject, or request clarification</p>
                    </div>
                    <button
                      onClick={() => setActiveNav('queue')}
                      className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <span>View All ({changeRequests.length})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {changeRequests.filter(cr => cr.status === 'SUBMITTED' || cr.status === 'APPROVED').length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <CheckCircle className="h-10 w-10 text-emerald-500/50 mx-auto" />
                      <p className="text-xs font-semibold text-slate-400">Queue is Clear</p>
                      <p className="text-[11px] text-slate-500">No pending submissions awaiting approval.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      {changeRequests
                        .filter(cr => cr.status === 'SUBMITTED' || cr.status === 'APPROVED')
                        .slice(0, 5)
                        .map(cr => (
                          <div key={cr.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-extrabold text-teal-400">#{cr.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  cr.request_type === 'ADD' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                  cr.request_type === 'MODIFY' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {cr.request_type}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  cr.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                  'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}>
                                  {cr.status}
                                </span>
                                <span className="text-xs font-bold text-slate-300 truncate">
                                  {cr.department} &bull; {cr.process}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-1 italic">
                                "{cr.rationale || 'Administrative rule proposal'}"
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => onInspectCR(cr)}
                                title="Inspect Diff"
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition-all text-xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {cr.status === 'SUBMITTED' && (
                                <>
                                  <button
                                    onClick={() => setClarificationModal({ open: true, crId: cr.id, comment: '' })}
                                    title="Request Clarification"
                                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 transition-all text-xs"
                                  >
                                    <HelpCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onApproveCR(cr.id)}
                                    title="Approve Proposal"
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => onRejectCR(cr.id)}
                                    title="Reject Proposal"
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition-all text-xs"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {cr.status === 'APPROVED' && (
                                <button
                                  onClick={() => onPublishCR(cr.id)}
                                  title="Publish into New Master Version"
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Publish (v1➔v2)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Right: Governance Authorities & Release Rules */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-teal-400" />
                      <span>DOA Administrator Powers</span>
                    </h4>
                    <div className="space-y-2.5 text-xs text-slate-300">
                      <div className="flex items-start gap-2 text-teal-300">
                        <span className="font-bold">✓</span>
                        <span>Direct authority to Approve, Reject, and Request Clarification</span>
                      </div>
                      <div className="flex items-start gap-2 text-teal-300">
                        <span className="font-bold">✓</span>
                        <span>Atomic version release (bumps master matrix v1 ➔ v2)</span>
                      </div>
                      <div className="flex items-start gap-2 text-teal-300">
                        <span className="font-bold">✓</span>
                        <span>Pre-submission schema and duplicate checking engine</span>
                      </div>
                      <div className="flex items-start gap-2 text-teal-300">
                        <span className="font-bold">✓</span>
                        <span>Archive and retire authority for inactive delegations</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">
                      Optimistic Concurrency Control
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Publishing checks for base version matches to prevent race conditions or overwriting concurrent governance changes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 2: DOA REPOSITORY (EXCEL MASTER TABLE, CRUD, ARCHIVE, RETIRE)       */}
          {/* ========================================================================= */}
          {activeNav === 'repository' && (
            <div className="space-y-4 animate-fade-in">
              {/* Controls bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white">Master Delegation Repository</h3>
                  <p className="text-xs text-slate-400">Excel matrix fields with 7 authority tiers, key classifications, and regulatory flags</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Function filter */}
                  <select
                    value={repoParentFilter}
                    onChange={(e) => setRepoParentFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                  >
                    <option value="All">All Domains</option>
                    <option value="Finance">Finance</option>
                    <option value="Risk">Risk</option>
                  </select>

                  {/* Regulatory filter */}
                  <select
                    value={repoRegFilter}
                    onChange={(e) => setRepoRegFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                  >
                    <option value="All">All Mandates</option>
                    <option value="Yes">Regulatory Only (Y)</option>
                    <option value="No">Non-Regulatory (N)</option>
                  </select>

                  <button
                    onClick={() => {
                      setRecordModalMode('create');
                      setRecordForm({
                        id: '',
                        parent_function: 'Finance',
                        business_line: 'Bank Capital and Capital Management',
                        decision_area: '',
                        key_non_key: 'Key',
                        regulatory: 'N',
                        shareholders: '',
                        board_of_directors: '',
                        subsidiary_board: '',
                        chairman: '',
                        board_committees: '',
                        board_committees_op: '',
                        gceo: '',
                        ceo: '',
                        management_committees: '',
                        c_level_executives: '',
                        composite_authority: '',
                        committees: [],
                        governance_docs: [],
                        regulatory_refs: [],
                        comments: ''
                      });
                      setValidationResult(null);
                      setShowRecordModal(true);
                    }}
                    className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Master DOA</span>
                  </button>
                </div>
              </div>

              {/* Master Matrix Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Domain / Function</th>
                        <th className="py-3 px-4">Business Line</th>
                        <th className="py-3 px-4">Decision Area</th>
                        <th className="py-3 px-4">Key / Non-Key</th>
                        <th className="py-3 px-4">Regulatory</th>
                        <th className="py-3 px-4">Composite Authority</th>
                        <th className="py-3 px-4">Version</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-12 text-center text-slate-500">
                            No records found matching current criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map(rec => {
                          const pFunc = rec.parentFunction || rec.parent_function;
                          const bLine = rec.businessLine || rec.business_line;
                          const dArea = rec.decisionArea || rec.decision_area;
                          const compAuth = rec.compositeAuthority || rec.composite_authority || rec.authority;
                          const reg = rec.regulatory || 'N';

                          return (
                            <tr key={rec.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-teal-400">#{rec.id}</td>
                              <td className="py-3 px-4 font-semibold text-slate-200">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  pFunc === 'Finance' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                                }`}>
                                  {pFunc}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{bLine}</td>
                              <td className="py-3 px-4 font-medium text-white max-w-sm">{dArea}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.keyNonKey === 'Key' || rec.key_non_key === 'Key'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {rec.keyNonKey || rec.key_non_key || 'Key'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  reg === 'Y' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-500'
                                }`}>
                                  {reg === 'Y' ? 'YES' : 'NO'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-teal-300 max-w-xs truncate">
                                {compAuth || 'BoD (A)'}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">
                                v{rec.currentVersion || rec.version || 1}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleInspectVersions(rec)}
                                    title="View Version History"
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                                  >
                                    <History className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRecordModalMode('edit');
                                      setRecordForm({
                                        id: rec.id,
                                        parent_function: pFunc,
                                        business_line: bLine,
                                        decision_area: dArea,
                                        key_non_key: rec.keyNonKey || rec.key_non_key || 'Key',
                                        regulatory: reg,
                                        shareholders: rec.shareholders || '',
                                        board_of_directors: rec.board_of_directors || '',
                                        subsidiary_board: rec.subsidiary_board || '',
                                        chairman: rec.chairman || '',
                                        board_committees: rec.board_committees || '',
                                        board_committees_op: rec.board_committees_op || '',
                                        gceo: rec.gceo || '',
                                        ceo: rec.ceo || '',
                                        management_committees: rec.management_committees || '',
                                        c_level_executives: rec.c_level_executives || '',
                                        composite_authority: compAuth || '',
                                        committees: [],
                                        governance_docs: [],
                                        regulatory_refs: [],
                                        comments: `Revision of Record #${rec.id}`
                                      });
                                      setValidationResult(null);
                                      setShowRecordModal(true);
                                    }}
                                    title="Edit DOA Record"
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 hover:text-teal-300 transition-all"
                                  >
                                    <Sliders className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleArchiveRecord(rec.id)}
                                    title="Archive / Retire Record"
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
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

          {/* ========================================================================= */}
          {/* PANEL 3: DECISION AREAS (PARENT / CHILD TAXONOMY BREAKDOWN)              */}
          {/* ========================================================================= */}
          {activeNav === 'decision_areas' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Decision Areas & Authority Breakdown</h3>
                <p className="text-xs text-slate-400">Structured governance categorization under Finance and Risk domains.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Finance Domain */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-500" />
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Finance Functions</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Finance').length} Rules
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {(functionTaxonomy.Finance || [
                      'Bank Capital and Capital Management',
                      'Financial Planning and Budgeting',
                      'Treasury and ALM',
                      'General Accounting and Reporting',
                      'Tax Governance'
                    ]).map((bl, i) => {
                      const count = doaRecords.filter(r => (r.businessLine || r.business_line) === bl).length;
                      return (
                        <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200">{bl}</span>
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono text-[10px] rounded-full">
                            {count} DOAs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk Domain */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-purple-500" />
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Risk Functions</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Risk').length} Rules
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {(functionTaxonomy.Risk || [
                      'Enterprise Risk Framework & Policy Approval',
                      'Credit Risk Underwriting & Limit Setting',
                      'Market Risk Limits & VaR Mandate',
                      'Operational Risk Management',
                      'Regulatory Compliance & AML'
                    ]).map((bl, i) => {
                      const count = doaRecords.filter(r => (r.businessLine || r.business_line) === bl).length;
                      return (
                        <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200">{bl}</span>
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-mono text-[10px] rounded-full">
                            {count} DOAs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 4: CHANGE QUEUE (OPEN, OVERDUE, APPROVED, REJECTED, CLARIFICATION)  */}
          {/* ========================================================================= */}
          {activeNav === 'queue' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Delegation Change Queue</h3>
                  <p className="text-xs text-slate-400">Comprehensive queue supporting full workflow status lifecycle</p>
                </div>
                
                {/* Status Segmented Tabs */}
                <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                  {['ALL', 'SUBMITTED', 'CLARIFICATION_REQUIRED', 'APPROVED', 'REJECTED', 'PUBLISHED'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setQueueTab(tab)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        queueTab === tab 
                          ? 'bg-teal-500 text-slate-950 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Queue Records */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="divide-y divide-slate-800/80">
                  {filteredQueue.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 space-y-2">
                      <GitPullRequest className="h-10 w-10 text-slate-700 mx-auto" />
                      <p className="text-xs font-semibold text-slate-400">No requests in this queue state.</p>
                    </div>
                  ) : (
                    filteredQueue.map(cr => (
                      <div key={cr.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-teal-400">#{cr.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              cr.request_type === 'ADD' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              cr.request_type === 'MODIFY' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {cr.request_type}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              cr.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              cr.status === 'PUBLISHED' ? 'bg-teal-500 text-slate-950 font-black' :
                              cr.status === 'CLARIFICATION_REQUIRED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              cr.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {cr.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-bold text-slate-200">
                              {cr.department} &bull; {cr.process}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            <strong>Rationale:</strong> "{cr.rationale || 'Administrative update proposal'}"
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium">
                            <span>Requester: <strong className="text-slate-300">{cr.requester_email}</strong></span>
                            <span>&bull;</span>
                            <span>Target Base: <strong className="text-slate-300">v{cr.base_version || 1}</strong></span>
                            <span>&bull;</span>
                            <span>Submitted: {new Date(cr.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Queue Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => onInspectCR(cr)}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Side-by-Side Diff</span>
                          </button>

                          {cr.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => setClarificationModal({ open: true, crId: cr.id, comment: '' })}
                                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <HelpCircle className="h-3.5 w-3.5" />
                                <span>Clarification</span>
                              </button>
                              <button
                                onClick={() => onApproveCR(cr.id)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => onRejectCR(cr.id)}
                                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {cr.status === 'APPROVED' && (
                            <button
                              onClick={() => onPublishCR(cr.id)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Publish Master (v1 ➔ v2)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 5: TAXONOMY (RELATIONAL EXPLORER)                                   */}
          {/* ========================================================================= */}
          {activeNav === 'taxonomy' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Taxonomy & Relationship Matrix</h3>
                <p className="text-xs text-slate-400">Master relationships for Committees, Policies, and Regulatory Standards.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Committees */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Governance Committees ({committees.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {committees.map(c => (
                      <div key={c.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                        <p className="font-bold text-slate-200">{c.name}</p>
                        <p className="text-[11px] text-slate-400">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Governance Documents */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Regulatory & Governance Documents ({governanceDocs.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {governanceDocs.map(d => (
                      <div key={d.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{d.title}</span>
                          <span className="text-[10px] font-mono text-teal-400">{d.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{d.reference_code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 6: WORKFLOWS (PARAMETER-BASED ROUTING RULES & SIMULATOR)           */}
          {/* ========================================================================= */}
          {activeNav === 'workflows' && (
            <div className="space-y-6 animate-fade-in">
              {/* Simulator Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-teal-400" />
                    <span>Workflow Route Simulator</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Test parameter-based routing conditions (Department, Risk Level, Regulatory Impact).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                    <select
                      value={simulatorInput.department}
                      onChange={(e) => setSimulatorInput(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5"
                    >
                      <option value="Finance">Finance</option>
                      <option value="Risk">Risk</option>
                      <option value="Treasury">Treasury</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Impact</label>
                    <select
                      value={simulatorInput.riskImpact}
                      onChange={(e) => setSimulatorInput(prev => ({ ...prev, riskImpact: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Regulatory Impact</label>
                    <select
                      value={simulatorInput.regulatoryImpact}
                      onChange={(e) => setSimulatorInput(prev => ({ ...prev, regulatoryImpact: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5"
                    >
                      <option value="Yes">Yes (Mandatory Dual Approval)</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleRunSimulator}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md"
                >
                  Simulate Required Routing Stages
                </button>

                {simulatedRoute && (
                  <div className="mt-4 p-4 bg-slate-900/90 border border-teal-500/30 rounded-2xl space-y-3 animate-fade-in">
                    <h5 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Required Sequential & Parallel Review Stages:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {simulatedRoute.stages.map((stg, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-teal-300 uppercase">{stg.type}</span>
                          <p className="text-xs font-bold text-white">{stg.stage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Master Workflow Routing Rules */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Configured Routing Rules ({workflowRules.length})</h3>
                <div className="divide-y divide-slate-800/80">
                  {workflowRules.map(rule => (
                    <div key={rule.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <span className="font-bold text-teal-300">{rule.rule_name}</span>
                        <p className="text-slate-400 text-[11px]">
                          Department: {rule.department} &bull; Governance Body: <strong className="text-slate-300">{rule.governance_body}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-900 rounded-lg text-slate-300 font-mono text-[10px] border border-slate-700">
                        {rule.review_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 7: PUBLICATION (RELEASE DECK & BUMP MASTER VERSION)                */}
          {/* ========================================================================= */}
          {activeNav === 'publication' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Master Matrix Publication Console</h3>
                <p className="text-xs text-slate-400">
                  Approved change requests ready to be permanently published into the live matrix. Publishing bumps master version with optimistic concurrency checks.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                {changeRequests.filter(cr => cr.status === 'APPROVED').length === 0 ? (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <UploadCloud className="h-10 w-10 text-slate-700 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">No Approved Requests Awaiting Release</p>
                    <p className="text-[11px] text-slate-500">Approve requests in the Change Queue first to release a new master version.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {changeRequests
                      .filter(cr => cr.status === 'APPROVED')
                      .map(cr => (
                        <div key={cr.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-teal-400">#{cr.id}</span>
                              <span className="text-xs font-bold text-white">{cr.department} &bull; {cr.process}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                                APPROVED
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">"{cr.rationale}"</p>
                            <p className="text-[11px] text-slate-500">Target: Bump live matrix from v{cr.base_version || 1} ➔ v{(cr.base_version || 1) + 1}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onInspectCR(cr)}
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700"
                            >
                              Review Diff
                            </button>
                            <button
                              onClick={() => onPublishCR(cr.id)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Publish New Version</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 8: VERSIONS (HISTORICAL VERSION SNAPSHOT INSPECTOR)                  */}
          {/* ========================================================================= */}
          {activeNav === 'versions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Historical Version Inspector</h3>
                <p className="text-xs text-slate-400">Select any active DOA rule to inspect its immutable historical revision records.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Record Picker */}
                <div className="md:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select DOA Rule</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {doaRecords.slice(0, 20).map(rec => (
                      <div
                        key={rec.id}
                        onClick={() => handleInspectVersions(rec)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedVersionRecord?.id === rec.id
                            ? 'bg-teal-500/20 border-teal-500/40 text-teal-200'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">#{rec.id}</span>
                          <span className="text-[10px] font-mono text-teal-400">v{rec.currentVersion || rec.version || 1}</span>
                        </div>
                        <p className="mt-1 font-semibold truncate">{rec.decisionArea || rec.decision_area}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historical Timeline */}
                <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {selectedVersionRecord ? `Version History for Record #${selectedVersionRecord.id}` : 'Select a Record'}
                  </h4>

                  {isLoadingVersions ? (
                    <div className="py-12 text-center text-slate-500">Loading audit history...</div>
                  ) : recordHistoryVersions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      {selectedVersionRecord ? 'Initial version snapshot active. No modifications recorded.' : 'Choose a record on the left to see audit versions.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recordHistoryVersions.map((hist, idx) => (
                        <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{hist.action}</span>
                            <span className="text-[10px] text-slate-500">{new Date(hist.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">By: {hist.user_email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 9: AUDIT TRAIL (IMMUTABLE LEDGER)                                    */}
          {/* ========================================================================= */}
          {activeNav === 'audit_trail' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Enterprise Audit Trail Ledger</h3>
                  <p className="text-xs text-slate-400">Immutable record of all creations, approvals, rejections, and publications</p>
                </div>
                <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-xs font-mono text-teal-400 font-bold">
                  {auditLogs.length} Logged Events
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Record ID</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-500">
                            No audit log events available.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-200">{log.user_email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                log.action.includes('APPROVE') ? 'bg-blue-500/20 text-blue-300' :
                                log.action.includes('PUBLISH') ? 'bg-emerald-500/20 text-emerald-300' :
                                log.action.includes('REJECT') ? 'bg-rose-500/20 text-rose-300' :
                                'bg-slate-800 text-slate-300'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-teal-400">
                              {log.record_id ? `#${log.record_id}` : '-'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-md truncate">
                              {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT DOA RECORD (WITH PRE-SUBMISSION VALIDATION)        */}
      {/* ========================================================================= */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {recordModalMode === 'create' ? 'Create New Master DOA Record' : `Edit DOA Record #${recordForm.id}`}
                </h3>
                <p className="text-xs text-slate-400">Full Excel master matrix schema with relationship mapping & pre-validation</p>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domain / Parent Function */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Domain</label>
                  <select
                    value={recordForm.parent_function}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, parent_function: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Risk">Risk</option>
                  </select>
                </div>

                {/* Business Line */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Business Line / Category</label>
                  <input
                    type="text"
                    value={recordForm.business_line}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, business_line: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5"
                    required
                  />
                </div>
              </div>

              {/* Decision Area Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Decision Area Description</label>
                <textarea
                  rows="2"
                  value={recordForm.decision_area}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, decision_area: e.target.value }))}
                  placeholder="e.g. Approval of Capital Adequacy Internal Target"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Key / Non-Key */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Classification</label>
                  <select
                    value={recordForm.key_non_key}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, key_non_key: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5"
                  >
                    <option value="Key">Key Decision</option>
                    <option value="Non-Key">Non-Key Decision</option>
                  </select>
                </div>

                {/* Regulatory Flag */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Regulatory Mandate</label>
                  <select
                    value={recordForm.regulatory}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, regulatory: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5"
                  >
                    <option value="N">No (Internal Corporate Governance)</option>
                    <option value="Y">Yes (CBB / Basel / Statutory Requirement)</option>
                  </select>
                </div>
              </div>

              {/* Authority Tiers */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Authority Tier Assignments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Board of Directors</label>
                    <input
                      type="text"
                      value={recordForm.board_of_directors}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, board_of_directors: e.target.value }))}
                      placeholder="e.g. BoD (A)"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Shareholders</label>
                    <input
                      type="text"
                      value={recordForm.shareholders}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, shareholders: e.target.value }))}
                      placeholder="e.g. Shareholders (A)"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Board Committees</label>
                    <input
                      type="text"
                      value={recordForm.board_committees}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, board_committees: e.target.value }))}
                      placeholder="e.g. AC (R), RMC (R)"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Composite Authority Chain</label>
                    <input
                      type="text"
                      value={recordForm.composite_authority}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, composite_authority: e.target.value }))}
                      placeholder="e.g. BoD (A) ➔ AC (R)"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Server Validation Output Banner */}
              {validationResult && (
                <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  validationResult.valid 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {validationResult.valid ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
                    <span>{validationResult.valid ? 'Pre-Submission Validation Passed' : 'Validation Errors Detected'}</span>
                  </div>
                  {!validationResult.valid && (
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                      {validationResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.warnings?.length > 0 && (
                    <p className="text-[10px] text-amber-300">Notice: {validationResult.warnings.join(', ')}</p>
                  )}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleValidateForm}
                  disabled={isValidating}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                  <span>{isValidating ? 'Validating...' : 'Validate Schema'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRecord}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-teal-500/20"
                  >
                    {isSubmittingRecord ? 'Submitting...' : 'Save & Register Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REQUEST CLARIFICATION                                            */}
      {/* ========================================================================= */}
      {clarificationModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-400" />
                <span>Request Clarification (#{clarificationModal.crId})</span>
              </h4>
              <button onClick={() => setClarificationModal({ open: false, crId: null, comment: '' })}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Return this proposal to the department requester with instructions on required evidence or revisions.
            </p>
            <textarea
              rows="3"
              value={clarificationModal.comment}
              onChange={(e) => setClarificationModal(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="e.g. Please provide Board Audit Committee meeting minutes supporting the requested limit increase..."
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClarificationModal({ open: false, crId: null, comment: '' })}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendClarification}
                disabled={isSubmittingClarification}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md"
              >
                {isSubmittingClarification ? 'Submitting...' : 'Send Clarification Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
