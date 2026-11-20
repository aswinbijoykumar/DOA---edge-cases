import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu,
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
  Edit3,
  Trash2,
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
import ExceptionWorkflowInbox from '../supplementary/ExceptionWorkflowInbox';
import BahrainKsaAlignmentReportView from '../supplementary/BahrainKsaAlignmentReportView';
import PointInTimeReconstructionView from '../supplementary/PointInTimeReconstructionView';
import doaHeroBg from '../../assets/doa-hero-harbour.svg';
import proNexusBrand from '../../assets/pro-nexus-brand.png';
import UserProfilePill from '../common/UserProfilePill';
import OrgChartModal from '../common/OrgChartModal';
import { getUserProfile } from '../../data/orgHierarchy';
import InitiateProposalModal from './InitiateProposalModal';
import { mockDoaData, functionTaxonomy as defaultFunctionTaxonomy } from '../../data/doaData';



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
  const [showOrgChartModal, setShowOrgChartModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Prototype Proposals State (Full Prototypic Capability for Client Demos)
  const [prototypeChangeRequests, setPrototypeChangeRequests] = useState([]);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalInitialMode, setProposalInitialMode] = useState('Add');
  const [proposalTargetRecord, setProposalTargetRecord] = useState(null);
  const [proposalSuccessModal, setProposalSuccessModal] = useState(null);
  const [prototypeDiffModal, setPrototypeDiffModal] = useState(null);

  // Effective DOA records (with mock fallback if needed)
  const effectiveRecords = useMemo(() => {
    return doaRecords && doaRecords.length > 0 ? doaRecords : mockDoaData;
  }, [doaRecords]);

  // Combined change requests (prototype + server)
  const combinedChangeRequests = useMemo(() => {
    return [...prototypeChangeRequests, ...changeRequests];
  }, [prototypeChangeRequests, changeRequests]);

  const userProfile = getUserProfile(currentUser);
  const displayName = userProfile?.name || currentUser?.full_name || 'Administrator';

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
    const totalDoas = effectiveRecords.length;
    const draftChanges = combinedChangeRequests.filter(cr => cr.status === 'DRAFT').length;
    const pendingReview = combinedChangeRequests.filter(cr => 
      cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW' || cr.status === 'CLARIFICATION_REQUIRED'
    ).length;
    const publishedChanges = combinedChangeRequests.filter(cr => cr.status === 'PUBLISHED').length;
    const approvedAwaitingPublish = combinedChangeRequests.filter(cr => cr.status === 'APPROVED').length;

    return {
      totalDoas: adminStats?.total_active_records || totalDoas,
      draftChanges,
      pendingReview: adminStats?.pending_review 
        ? (adminStats.pending_review + prototypeChangeRequests.filter(cr => cr.status === 'SUBMITTED').length) 
        : pendingReview,
      publishedChanges: adminStats?.published_count || publishedChanges,
      approvedAwaitingPublish
    };
  }, [effectiveRecords, combinedChangeRequests, prototypeChangeRequests, adminStats]);

  // Notifications List (Derived from actionable events)
  const notifications = useMemo(() => {
    const items = [];
    const pending = combinedChangeRequests.filter(cr => cr.status === 'SUBMITTED');
    if (pending.length > 0) {
      items.push({
        id: 'pending-approvals',
        title: `${pending.length} Pending Approval${pending.length > 1 ? 's' : ''}`,
        desc: 'New delegation change requests require executive review.',
        type: 'warning',
        actionNav: 'queue'
      });
    }
    const approved = combinedChangeRequests.filter(cr => cr.status === 'APPROVED');
    if (approved.length > 0) {
      items.push({
        id: 'ready-publish',
        title: `${approved.length} Request${approved.length > 1 ? 's' : ''} Ready to Publish`,
        desc: 'Approved proposals awaiting publication to bump master version.',
        type: 'success',
        actionNav: 'publication'
      });
    }
    const clarification = combinedChangeRequests.filter(cr => cr.status === 'CLARIFICATION_REQUIRED');
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
  }, [combinedChangeRequests]);

  // Filtered DOA Repository records
  const filteredRecords = useMemo(() => {
    return effectiveRecords.filter(rec => {
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
  }, [effectiveRecords, searchQuery, repoParentFilter, repoRegFilter, repoStatusFilter]);

  // Filtered Change Queue
  const filteredQueue = useMemo(() => {
    return combinedChangeRequests.filter(cr => {
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
  }, [combinedChangeRequests, searchQuery, queueTab]);

  // Prototype Proposal Handlers (Client Demonstration)
  const handleCreatePrototypeProposal = (proposalData) => {
    const protoId = `CR-PROTO-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCr = {
      id: protoId,
      request_type: proposalData.request_type, // 'ADD' | 'MODIFY' | 'DELETE'
      department: proposalData.parentFunction,
      process: proposalData.businessLine,
      entity_id: 'ENT-BH-01',
      doa_id: proposalData.targetRecord?.id || null,
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      requester: `${displayName} (DOA Admin)`,
      requester_email: currentUser?.email || 'admin@doa.nexus',
      rationale: proposalData.rationale || 'Demonstration proposal created via DOA Admin Console',
      base_version: proposalData.targetRecord?.currentVersion || proposalData.targetRecord?.version || 1,
      proposed_value: {
        id: proposalData.targetRecord?.id || `NEW-${Math.floor(1000 + Math.random() * 9000)}`,
        parent_function: proposalData.parentFunction,
        business_line: proposalData.businessLine,
        decision_area: proposalData.decisionArea,
        key_non_key: proposalData.keyNonKey,
        regulatory: proposalData.regulatory,
        composite_authority: proposalData.authority,
        rationale: proposalData.rationale,
        status: proposalData.request_type === 'DELETE' ? 'ARCHIVED' : 'ACTIVE'
      },
      target_record: proposalData.targetRecord || null,
      attachments: proposalData.attachedFile ? [proposalData.attachedFile] : [{ name: 'Board_Approved_Governance_Charter.pdf', size: '245 KB' }],
      isPrototype: true
    };

    setPrototypeChangeRequests(prev => [newCr, ...prev]);
    setIsProposalModalOpen(false);
    setProposalSuccessModal(newCr);
  };

  const handleApprovePrototypeCR = (protoId) => {
    setPrototypeChangeRequests(prev => prev.map(cr => cr.id === protoId ? { ...cr, status: 'APPROVED' } : cr));
    setPrototypeDiffModal(null);
  };

  const handleRejectPrototypeCR = (protoId) => {
    setPrototypeChangeRequests(prev => prev.map(cr => cr.id === protoId ? { ...cr, status: 'REJECTED' } : cr));
    setPrototypeDiffModal(null);
  };

  const handlePublishPrototypeCR = (protoId) => {
    setPrototypeChangeRequests(prev => prev.map(cr => cr.id === protoId ? { ...cr, status: 'PUBLISHED' } : cr));
  };

  const handleDiscardPrototypeCR = (protoId) => {
    if (window.confirm(`Are you sure you want to discard prototype proposal #${protoId}?`)) {
      setPrototypeChangeRequests(prev => prev.filter(cr => cr.id !== protoId));
      setPrototypeDiffModal(null);
    }
  };

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
        await api.createChangeRequest({
          request_type: 'ADD',
          department: recordForm.parent_function,
          process: recordForm.business_line,
          rationale: recordForm.comments || 'New Master DOA Rule created by DOA Administrator',
          base_version: 1,
          proposed_value: proposedPayload
        });
      } else {
        await api.createChangeRequest({
          request_type: 'MODIFY',
          doa_id: recordForm.id,
          department: recordForm.parent_function,
          process: recordForm.business_line,
          rationale: recordForm.comments || 'Master Rule Modification by DOA Administrator',
          base_version: 1,
          proposed_value: proposedPayload
        });
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
      const targetRec = doaRecords.find(r => r.id === recordId);
      await api.createChangeRequest({
        request_type: 'DELETE',
        doa_id: recordId,
        department: targetRec?.parentFunction || targetRec?.parent_function || 'Finance',
        process: targetRec?.businessLine || targetRec?.business_line || 'Record Retirement',
        entity_id: targetRec?.entity_id || 'ENT-BH-01',
        rationale: 'Retired and archived by DOA Administrator',
        base_version: targetRec?.currentVersion || targetRec?.current_version || 1,
        proposed_value: { id: recordId, status: 'ARCHIVED', comments: 'Administrative retirement' }
      });
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased">
            {/* 1. TOPBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between shadow-xs">
        {/* Left: Hamburger Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            title={isSidebarOpen ? "Hide Navigation Workspace" : "Show Navigation Workspace"}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img 
            src={proNexusBrand} 
            alt="Pro Nexus" 
            className="h-10 sm:h-11 w-auto object-contain cursor-pointer"
          />
        </div>

        {/* Right: User Profile Pill & Sign Out */}
        <div className="flex items-center gap-3">
          <UserProfilePill 
            currentUser={currentUser} 
            onOpenOrgChart={() => setShowOrgChartModal(true)} 
          />

          <button
            type="button"
            onClick={onLogout}
            title="Log out of session"
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN PANELS */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 w-full">
        
        {/* SIDEBAR: 9 SECTIONS */}
        {isSidebarOpen && (
          <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 p-4 space-y-6 transition-all duration-300">
          <div>
            <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-900">
              Navigation Workspace
            </div>
            <nav className="mt-2 space-y-1">
              {[
                { id: 'decision_areas', label: 'Decision Areas', icon: FolderTree, badge: null },
                { id: 'bahrain_ksa', label: 'Bahrain–KSA Parity', icon: Scale, badge: null },
                { id: 'point_in_time', label: 'Point-in-Time Audit', icon: History, badge: null },
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
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-950 font-black border border-slate-300/80 shadow-xs' 
                        : 'text-slate-900 hover:text-black hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-700'}`} />
                      <span className="font-semibold text-slate-900">{tab.label}</span>
                    </div>
                    {tab.badge !== null && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Create DOA Record Action Button (Executive Actions Card removed) */}
          <div className="pt-2">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create DOA Record</span>
            </button>
          </div>
        </aside>
        )}

        {/* MAIN PANELS */}
        <main className={`flex-1 space-y-6 overflow-x-hidden transition-all duration-300 ${
          isSidebarOpen 
            ? 'p-4 sm:p-6 lg:p-8' 
            : 'max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8'
        }`}>
          
          {/* Dynamic Role & Persona Banner / KPI Hero Card (Exact size as Normal User) */}
          <div className="relative rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden border border-teal-500/30 bg-[#071C2B]">
            {/* Dynamic Animated Harbour SVG Background */}
            <img 
              src={doaHeroBg}
              alt="DOA Hero Matrix"
              className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none"
            />

            {/* Soft Dark Gradient Overlay for optimal text and contrast on left */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#071C2B]/95 via-[#071C2B]/60 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-1 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-white drop-shadow-md">
                  <span>Welcome back, {displayName}</span>
                </h2>
              </div>
            </div>

            {/* Action Buttons Aligned in the Same Line - Exact Normal User Dimensions */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
              <div className="shrink-0 flex items-center">
                <span className="h-10 w-20 rounded-xl inline-flex items-center justify-center text-center text-[10px] font-extrabold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 shadow-xs">
                  Action
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 flex-1 w-full">
                {/* 1. Overview */}
                <button
                  type="button"
                  onClick={() => setActiveNav('dashboard')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'dashboard'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30 ring-2 ring-indigo-400/30 font-black'
                      : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
                  }`}
                >
                  <Layers className="h-4 w-4 text-indigo-300 shrink-0" />
                  <span className="truncate">Overview</span>
                </button>

                {/* 2. Search DoA */}
                <button
                  type="button"
                  onClick={() => setActiveNav('repository')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'repository'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30 ring-2 ring-blue-400/30 font-black'
                      : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border-blue-400/30'
                  }`}
                >
                  <Search className="h-4 w-4 text-blue-300 shrink-0" />
                  <span className="truncate">Search DoA</span>
                </button>

                {/* 3. Initiate Proposal */}
                <button
                  type="button"
                  onClick={() => {
                    setProposalTargetRecord(null);
                    setProposalInitialMode('Add');
                    setIsProposalModalOpen(true);
                  }}
                  className="h-10 w-full px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/30 cursor-pointer hover:shadow-cyan-500/20"
                >
                  <Edit3 className="h-4 w-4 text-cyan-300 shrink-0" />
                  <div className="flex flex-col items-center justify-center min-w-0">
                    <span className="truncate text-xs font-bold leading-tight">Initiate Proposal</span>
                    <span className="text-[10px] font-medium text-cyan-200/90 leading-tight">(new/amendment)</span>
                  </div>
                </button>

                {/* 4. Change Queue */}
                <button
                  type="button"
                  onClick={() => setActiveNav('queue')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'queue'
                      ? 'bg-teal-600 text-white border-teal-400 shadow-teal-600/30 ring-2 ring-teal-400/30 font-black'
                      : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border-teal-400/30'
                  }`}
                >
                  <GitPullRequest className="h-4 w-4 text-teal-300 shrink-0" />
                  <span className="truncate">Change Queue</span>
                  {kpis.pendingReview > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-teal-500 text-slate-950 font-extrabold rounded-full text-[10px] shrink-0">
                      {kpis.pendingReview}
                    </span>
                  )}
                </button>

                {/* 5. Exception Workflow */}
                <button
                  type="button"
                  onClick={() => setActiveNav('exceptions')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'exceptions'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30 ring-2 ring-amber-400/30 font-black'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/30'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 text-amber-300 shrink-0" />
                  <span className="truncate">Exception Workflow</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PANEL 1: DASHBOARD (KPIS + EXECUTIVE ACTION CENTER)                       */}
          {/* ========================================================================= */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">

              {/* 4 REQUIRED KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total DOAs */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Total DOAs</span>
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                      <Database className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{kpis.totalDoas}</div>
                  <p className="text-[11px] text-teal-800 font-semibold">Active enterprise authority records</p>
                </div>

                {/* Draft Changes */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Draft Changes</span>
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{kpis.draftChanges}</div>
                  <p className="text-[11px] text-slate-800 font-semibold">Proposals being drafted by departments</p>
                </div>

                {/* Pending Review */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Pending Review</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                      <GitPullRequest className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-700">{kpis.pendingReview}</div>
                  <p className="text-[11px] text-amber-800 font-semibold">Requires executive review / sign-off</p>
                </div>

                {/* Published Changes */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Published Changes</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-700">{kpis.publishedChanges}</div>
                  <p className="text-[11px] text-emerald-800 font-semibold">Live released matrix versions</p>
                </div>
              </div>

              {/* Actionable Review Queue */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                {/* Table Header Bar */}
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <GitPullRequest className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Actionable Review Queue
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveNav('queue')}
                    className="text-xs font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
                  >
                    <span>View All ({combinedChangeRequests.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  {combinedChangeRequests.filter(cr => cr.status === 'SUBMITTED' || cr.status === 'APPROVED').length === 0 ? (
                    <div className="py-12 text-center text-slate-800 space-y-2">
                      <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-900">Queue is Clear</p>
                      <p className="text-[11px] text-slate-700">No pending submissions awaiting approval.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {combinedChangeRequests
                        .filter(cr => cr.status === 'SUBMITTED' || cr.status === 'APPROVED')
                        .slice(0, 5)
                        .map(cr => (
                          <div key={cr.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-black text-teal-700 shrink-0">#{cr.id}</span>
                                {cr.isPrototype && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                                    PROTOTYPE
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                                  cr.request_type === 'ADD' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  cr.request_type === 'MODIFY' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                  'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {cr.request_type}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                  cr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {cr.status}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[360px]" title={`${cr.department} • ${cr.process}`}>
                                  {cr.department} &bull; {cr.process}
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 truncate italic max-w-full font-medium">
                                "{cr.rationale || 'Administrative rule proposal'}"
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-start md:self-center">
                              <button
                                onClick={() => cr.isPrototype ? setPrototypeDiffModal(cr) : onInspectCR(cr)}
                                title="Inspect Diff"
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 transition-all text-xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {cr.status === 'SUBMITTED' && (
                                <>
                                  <button
                                    onClick={() => setClarificationModal({ open: true, crId: cr.id, comment: '' })}
                                    title="Request Clarification"
                                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 rounded-xl border border-amber-300 transition-all text-xs"
                                  >
                                    <HelpCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => cr.isPrototype ? handleApprovePrototypeCR(cr.id) : onApproveCR(cr.id)}
                                    title="Approve Proposal"
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => cr.isPrototype ? handleRejectPrototypeCR(cr.id) : onRejectCR(cr.id)}
                                    title="Reject Proposal"
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 rounded-xl border border-rose-300 transition-all text-xs"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {cr.status === 'APPROVED' && (
                                <button
                                  onClick={() => cr.isPrototype ? handlePublishPrototypeCR(cr.id) : onPublishCR(cr.id)}
                                  title="Publish into New Master Version"
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0"
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
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 2: DOA REPOSITORY (EXCEL MASTER TABLE, CRUD, ARCHIVE, RETIRE)       */}
          {/* ========================================================================= */}
          {activeNav === 'repository' && (
            <div className="space-y-4 animate-fade-in">
              {/* Controls bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 shadow-sm p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-700" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">Filters & Controls</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Function filter */}
                  <select
                    value={repoParentFilter}
                    onChange={(e) => setRepoParentFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                  >
                    <option value="All">All Domains</option>
                    <option value="Finance">Finance</option>
                    <option value="Risk">Risk</option>
                  </select>

                  {/* Regulatory filter */}
                  <select
                    value={repoRegFilter}
                    onChange={(e) => setRepoRegFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
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
                    className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Master DOA</span>
                  </button>
                </div>
              </div>

              {/* Master Matrix Table */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                {/* Table Header Bar */}
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <Database className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Master Delegation Repository
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-black uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Domain / Function</th>
                        <th className="py-3.5 px-4">Business Line</th>
                        <th className="py-3.5 px-4">Decision Area</th>
                        <th className="py-3.5 px-4">Key / Non-Key</th>
                        <th className="py-3.5 px-4">Regulatory</th>
                        <th className="py-3.5 px-4">Composite Authority</th>
                        <th className="py-3.5 px-4">Version</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-12 text-center text-slate-800 font-semibold">
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
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-teal-700">#{rec.id}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  pFunc === 'Finance' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-purple-100 text-purple-800 border border-purple-300'
                                }`}>
                                  {pFunc}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate">{bLine}</td>
                              <td className="py-3 px-4 font-bold text-slate-900 max-w-sm">{dArea}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  rec.keyNonKey === 'Key' || rec.key_non_key === 'Key'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-100 text-slate-800 border border-slate-300'
                                }`}>
                                  {rec.keyNonKey || rec.key_non_key || 'Key'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  reg === 'Y' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-800'
                                }`}>
                                  {reg === 'Y' ? 'YES' : 'NO'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-900 max-w-xs truncate">
                                {compAuth || 'BoD (A)'}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-800 font-semibold">
                                v{rec.currentVersion || rec.version || 1}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleInspectVersions(rec)}
                                    title="View Version History"
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all border border-slate-300"
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
                                    className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 transition-all"
                                  >
                                    <Sliders className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleArchiveRecord(rec.id)}
                                    title="Archive / Retire Record"
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <FolderTree className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Decision Areas & Authority Breakdown
                    </h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Finance Domain */}
                <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-500" />
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Finance Functions</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-300 bg-blue-900/50 px-2.5 py-1 rounded-full border border-blue-700">
                      {doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Finance').length} Rules
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5 max-h-96 overflow-y-auto pr-1 bg-white">
                    {(functionTaxonomy.Finance || [
                      'Bank Capital and Capital Management',
                      'Financial Planning and Budgeting',
                      'Treasury and ALM',
                      'General Accounting and Reporting',
                      'Tax Governance'
                    ]).map((bl, i) => {
                      const count = doaRecords.filter(r => (r.businessLine || r.business_line) === bl).length;
                      return (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                          <span className="text-xs font-bold text-slate-900">{bl}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono text-[10px] font-bold rounded-full border border-blue-200">
                            {count} DOAs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk Domain */}
                <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950 text-white flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-purple-500" />
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Risk Functions</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-300 bg-purple-900/50 px-2.5 py-1 rounded-full border border-purple-700">
                      {doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Risk').length} Rules
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5 max-h-96 overflow-y-auto pr-1 bg-white">
                    {(functionTaxonomy.Risk || [
                      'Enterprise Risk Framework & Policy Approval',
                      'Credit Risk Underwriting & Limit Setting',
                      'Market Risk Limits & VaR Mandate',
                      'Operational Risk Management',
                      'Regulatory Compliance & AML'
                    ]).map((bl, i) => {
                      const count = doaRecords.filter(r => (r.businessLine || r.business_line) === bl).length;
                      return (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                          <span className="text-xs font-bold text-slate-900">{bl}</span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-mono text-[10px] font-bold rounded-full border border-purple-200">
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <GitPullRequest className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Delegation Change Queue
                    </h3>
                  </div>
                  
                  {/* Status Segmented Tabs */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700">
                    {['ALL', 'SUBMITTED', 'CLARIFICATION_REQUIRED', 'APPROVED', 'REJECTED', 'PUBLISHED'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setQueueTab(tab)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          queueTab === tab 
                            ? 'bg-slate-100 text-slate-950 shadow-sm font-black' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {tab.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change Queue Records */}
                <div className="divide-y divide-slate-200 bg-white">
                  {filteredQueue.length === 0 ? (
                    <div className="py-16 text-center text-slate-800 space-y-2">
                      <GitPullRequest className="h-10 w-10 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-900">No requests in this queue state.</p>
                    </div>
                  ) : (
                    filteredQueue.map(cr => (
                      <div key={cr.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-teal-700">#{cr.id}</span>
                            {cr.isPrototype && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                                PROTOTYPE
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              cr.request_type === 'ADD' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              cr.request_type === 'MODIFY' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {cr.request_type}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              cr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              cr.status === 'PUBLISHED' ? 'bg-teal-500 text-slate-950 font-black' :
                              cr.status === 'CLARIFICATION_REQUIRED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              cr.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {cr.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {cr.department} &bull; {cr.process}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 font-medium">
                            <strong className="text-slate-900">Rationale:</strong> "{cr.rationale || 'Administrative update proposal'}"
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-800 font-semibold">
                            <span>Requester: <strong className="text-slate-900">{cr.requester || cr.requester_email}</strong></span>
                            <span>&bull;</span>
                            <span>Target Base: <strong className="text-slate-900">v{cr.base_version || 1}</strong></span>
                            <span>&bull;</span>
                            <span>Submitted: {new Date(cr.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Queue Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {cr.isPrototype ? (
                            <>
                              <button
                                onClick={() => setPrototypeDiffModal(cr)}
                                className="px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5 text-cyan-700" />
                                <span>Inspect Diff</span>
                              </button>

                              <button
                                onClick={() => {
                                  setProposalTargetRecord(cr.target_record || null);
                                  setProposalInitialMode(cr.request_type === 'DELETE' ? 'Delete' : 'Modify');
                                  setIsProposalModalOpen(true);
                                }}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-blue-700" />
                                <span>Edit</span>
                              </button>

                              {cr.status === 'SUBMITTED' && (
                                <>
                                  <button
                                    onClick={() => handleApprovePrototypeCR(cr.id)}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectPrototypeCR(cr.id)}
                                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                              {cr.status === 'APPROVED' && (
                                <button
                                  onClick={() => handlePublishPrototypeCR(cr.id)}
                                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Publish</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDiscardPrototypeCR(cr.id)}
                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                title="Discard Prototype Proposal"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                <span>Discard</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onInspectCR(cr)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Side-by-Side Diff</span>
                              </button>

                              {(cr.requester_email || '').toLowerCase() === (currentUser?.email || '').toLowerCase() ? (
                                <span className="px-3 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-bold">
                                  VAL-06 SoD: Own Proposal (Requires 2nd Approver)
                                </span>
                              ) : (
                                <>
                                  {cr.status === 'SUBMITTED' && (
                                    <>
                                      <button
                                        onClick={() => setClarificationModal({ open: true, crId: cr.id, comment: '' })}
                                        className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
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
                                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
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
                                </>
                              )}
                            </>
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <Sliders className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Taxonomy & Relationship Matrix
                    </h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Committees */}
                <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-300" />
                      <span>Governance Committees ({committees.length})</span>
                    </h4>
                  </div>
                  <div className="p-5 space-y-2 max-h-80 overflow-y-auto bg-white">
                    {committees.map(c => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs hover:bg-slate-100/80 transition-colors">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-700 mt-0.5">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Governance Documents */}
                <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-teal-300" />
                      <span>Regulatory & Governance Documents ({governanceDocs.length})</span>
                    </h4>
                  </div>
                  <div className="p-5 space-y-2 max-h-80 overflow-y-auto bg-white">
                    {governanceDocs.map(d => (
                      <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs hover:bg-slate-100/80 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{d.title}</span>
                          <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">{d.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-semibold mt-1">{d.reference_code}</p>
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <Sliders className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Workflow Route Simulator
                    </h3>
                  </div>
                </div>

                <div className="p-6 space-y-4 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Department</label>
                      <select
                        value={simulatorInput.department}
                        onChange={(e) => setSimulatorInput(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl p-2.5 focus:border-teal-500"
                      >
                        <option value="Finance">Finance</option>
                        <option value="Risk">Risk</option>
                        <option value="Treasury">Treasury</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Risk Impact</label>
                      <select
                        value={simulatorInput.riskImpact}
                        onChange={(e) => setSimulatorInput(prev => ({ ...prev, riskImpact: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl p-2.5 focus:border-teal-500"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Regulatory Impact</label>
                      <select
                        value={simulatorInput.regulatoryImpact}
                        onChange={(e) => setSimulatorInput(prev => ({ ...prev, regulatoryImpact: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl p-2.5 focus:border-teal-500"
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
                    <div className="mt-4 p-4 bg-slate-900 border border-teal-500/30 rounded-2xl space-y-3 animate-fade-in text-white">
                      <h5 className="text-xs font-black text-teal-300 uppercase tracking-wider">Required Sequential & Parallel Review Stages:</h5>
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
              </div>

              {/* Master Workflow Routing Rules */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <Sliders className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Configured Routing Rules ({workflowRules.length})
                    </h3>
                  </div>
                </div>
                <div className="divide-y divide-slate-200 bg-white p-5">
                  {workflowRules.map(rule => (
                    <div key={rule.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{rule.rule_name}</span>
                        <p className="text-slate-700 text-[11px] font-medium mt-0.5">
                          Department: <span className="font-bold text-slate-900">{rule.department}</span> &bull; Governance Body: <strong className="text-slate-900 font-bold">{rule.governance_body}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-mono text-[10px] font-bold border border-slate-300">
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <UploadCloud className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Master Matrix Publication Console
                    </h3>
                  </div>
                </div>

                <div className="bg-white">
                  {combinedChangeRequests.filter(cr => cr.status === 'APPROVED').length === 0 ? (
                    <div className="py-16 text-center text-slate-800 space-y-2">
                      <UploadCloud className="h-10 w-10 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-900">No Approved Requests Awaiting Release</p>
                      <p className="text-[11px] text-slate-700 font-medium">Approve requests in the Change Queue first to release a new master version.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {combinedChangeRequests
                        .filter(cr => cr.status === 'APPROVED')
                        .map(cr => (
                          <div key={cr.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-teal-700">#{cr.id}</span>
                                {cr.isPrototype && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                                    PROTOTYPE
                                  </span>
                                )}
                                <span className="text-xs font-bold text-slate-900">{cr.department} &bull; {cr.process}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  APPROVED
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 font-medium">"{cr.rationale}"</p>
                              <p className="text-[11px] text-slate-700 font-semibold">Target: Bump live matrix from v{cr.base_version || 1} ➔ v{(cr.base_version || 1) + 1}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => cr.isPrototype ? setPrototypeDiffModal(cr) : onInspectCR(cr)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-colors"
                              >
                                Review Diff
                              </button>
                              {(cr.requester_email || '').toLowerCase() === (currentUser?.email || '').toLowerCase() && !cr.isPrototype ? (
                                <span className="px-3 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-bold">
                                  VAL-06 SoD: Requires Independent Publisher
                                </span>
                              ) : (
                                <button
                                  onClick={() => cr.isPrototype ? handlePublishPrototypeCR(cr.id) : onPublishCR(cr.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Publish New Version</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 8: VERSIONS (HISTORICAL VERSION SNAPSHOT INSPECTOR)                  */}
          {/* ========================================================================= */}
          {activeNav === 'versions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <History className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Historical Version Inspector
                    </h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Record Picker */}
                <div className="md:col-span-5 bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Select DOA Rule</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {doaRecords.slice(0, 20).map(rec => (
                      <div
                        key={rec.id}
                        onClick={() => handleInspectVersions(rec)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedVersionRecord?.id === rec.id
                            ? 'bg-teal-50 border-teal-400 text-teal-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-teal-700">#{rec.id}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">v{rec.currentVersion || rec.version || 1}</span>
                        </div>
                        <p className="mt-1 font-semibold truncate text-slate-900">{rec.decisionArea || rec.decision_area}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historical Timeline */}
                <div className="md:col-span-7 bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {selectedVersionRecord ? `Version History for Record #${selectedVersionRecord.id}` : 'Select a Record'}
                  </h4>

                  {isLoadingVersions ? (
                    <div className="py-12 text-center text-slate-800 font-semibold">Loading audit history...</div>
                  ) : recordHistoryVersions.length === 0 ? (
                    <div className="py-12 text-center text-slate-700 text-xs font-medium">
                      {selectedVersionRecord ? 'Initial version snapshot active. No modifications recorded.' : 'Choose a record on the left to see audit versions.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recordHistoryVersions.map((hist, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{hist.action}</span>
                            <span className="text-[10px] text-slate-700 font-medium">{new Date(hist.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800 text-[11px] font-medium">By: <span className="font-bold text-slate-900">{hist.user_email}</span></p>
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <FileCheck2 className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Enterprise Audit Trail Ledger
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-black uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Timestamp</th>
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Action</th>
                        <th className="py-3.5 px-4">Record ID</th>
                        <th className="py-3.5 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-800 font-semibold">
                            No audit log events available.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-800 font-semibold">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{log.user_email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                log.action.includes('APPROVE') ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                log.action.includes('PUBLISH') ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                log.action.includes('REJECT') ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                'bg-slate-100 text-slate-800 border border-slate-300'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-teal-700">
                              {log.record_id ? `#${log.record_id}` : '-'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-800 max-w-md truncate">
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

          {/* ========================================================================= */}
          {/* SUPPLEMENTARY BRD PANEL 1: EXCEPTIONS WORKFLOW COCKPIT                   */}
          {/* ========================================================================= */}
          {activeNav === 'exceptions' && (
            <div className="animate-fade-in">
              <ExceptionWorkflowInbox currentUser={currentUser} onRefreshStats={onRefreshData} />
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUPPLEMENTARY BRD PANEL 2: BAHRAIN–KSA ALIGNMENT RECONCILIATION DOSSIER  */}
          {/* ========================================================================= */}
          {activeNav === 'bahrain_ksa' && (
            <div className="animate-fade-in">
              <BahrainKsaAlignmentReportView />
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUPPLEMENTARY BRD PANEL 3: POINT-IN-TIME TEMPORAL DOA RECONSTRUCTION      */}
          {/* ========================================================================= */}
          {activeNav === 'point_in_time' && (
            <div className="animate-fade-in">
              <PointInTimeReconstructionView />
            </div>
          )}

        </main>
      </div>


      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT DOA RECORD (WITH PRE-SUBMISSION VALIDATION)        */}
      {/* ========================================================================= */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-[#030d14]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                  <Database className="h-4 w-4 text-teal-300" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {recordModalMode === 'create' ? 'Create New Master DOA Record' : `Edit DOA Record #${recordForm.id}`}
                </h3>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 space-y-4 text-xs bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domain / Parent Function */}
                <div>
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Parent Domain</label>
                  <select
                    value={recordForm.parent_function}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, parent_function: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Risk">Risk</option>
                  </select>
                </div>

                {/* Business Line */}
                <div>
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Business Line / Category</label>
                  <input
                    type="text"
                    value={recordForm.business_line}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, business_line: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5"
                    required
                  />
                </div>
              </div>

              {/* Decision Area Description */}
              <div>
                <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Decision Area Description</label>
                <textarea
                  rows="2"
                  value={recordForm.decision_area}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, decision_area: e.target.value }))}
                  placeholder="e.g. Approval of Capital Adequacy Internal Target"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Key / Non-Key */}
                <div>
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Classification</label>
                  <select
                    value={recordForm.key_non_key}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, key_non_key: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5"
                  >
                    <option value="Key">Key Decision</option>
                    <option value="Non-Key">Non-Key Decision</option>
                  </select>
                </div>

                {/* Regulatory Flag */}
                <div>
                  <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">Regulatory Mandate</label>
                  <select
                    value={recordForm.regulatory}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, regulatory: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5"
                  >
                    <option value="N">No (Internal Corporate Governance)</option>
                    <option value="Y">Yes (CBB / Basel / Statutory Requirement)</option>
                  </select>
                </div>
              </div>

              {/* Authority Tiers */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Authority Tier Assignments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">Board of Directors</label>
                    <input
                      type="text"
                      value={recordForm.board_of_directors}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, board_of_directors: e.target.value }))}
                      placeholder="e.g. BoD (A)"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">Shareholders</label>
                    <input
                      type="text"
                      value={recordForm.shareholders}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, shareholders: e.target.value }))}
                      placeholder="e.g. Shareholders (A)"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">Board Committees</label>
                    <input
                      type="text"
                      value={recordForm.board_committees}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, board_committees: e.target.value }))}
                      placeholder="e.g. AC (R), RMC (R)"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">Composite Authority Chain</label>
                    <input
                      type="text"
                      value={recordForm.composite_authority}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, composite_authority: e.target.value }))}
                      placeholder="e.g. BoD (A) ➔ AC (R)"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Server Validation Output Banner */}
              {validationResult && (
                <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  validationResult.valid 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 font-semibold' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-800 font-semibold'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {validationResult.valid ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
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
                    <p className="text-[10px] text-amber-800">Notice: {validationResult.warnings.join(', ')}</p>
                  )}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleValidateForm}
                  disabled={isValidating}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                  <span>{isValidating ? 'Validating...' : 'Validate Schema'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRecord}
                    className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-teal-500/20"
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
        <div className="fixed inset-0 z-50 bg-[#030d14]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4 w-4 text-amber-300" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  Request Clarification (#{clarificationModal.crId})
                </h4>
              </div>
              <button onClick={() => setClarificationModal({ open: false, crId: null, comment: '' })} className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <p className="text-xs text-slate-800 font-medium">
                Return this proposal to the department requester with instructions on required evidence or revisions.
              </p>
              <textarea
                rows="3"
                value={clarificationModal.comment}
                onChange={(e) => setClarificationModal(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="e.g. Please provide Board Audit Committee meeting minutes supporting the requested limit increase..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClarificationModal({ open: false, crId: null, comment: '' })}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300"
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
        </div>
      )}
      {/* Organization Hierarchy Modal */}
      <OrgChartModal
        isOpen={showOrgChartModal}
        onClose={() => setShowOrgChartModal(false)}
        initialUser={currentUser}
      />

      {/* Initiate Proposal Studio Modal (Prototype Demonstration) */}
      <InitiateProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        onSubmitProposal={handleCreatePrototypeProposal}
        doaRecords={effectiveRecords}
        functionTaxonomy={functionTaxonomy && Object.keys(functionTaxonomy).length > 0 ? functionTaxonomy : defaultFunctionTaxonomy}
        initialMode={proposalInitialMode}
        targetRecord={proposalTargetRecord}
      />

      {/* Prototype Proposal Success Modal */}
      {proposalSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-900">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mx-auto">
              <CheckCircle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Governance Submission
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Governance Proposal Successfully Initiated!
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Assigned Queue Tracking Number: <strong className="font-mono text-cyan-800 font-black">#{proposalSuccessModal.id}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600 font-bold">Proposal Type:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  proposalSuccessModal.request_type === 'ADD' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  proposalSuccessModal.request_type === 'MODIFY' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {proposalSuccessModal.request_type} DECISION AREA
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">Function Line:</span>
                <span className="font-bold text-slate-900">{proposalSuccessModal.department} ➔ {proposalSuccessModal.process}</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-slate-600 font-bold">Decision Area:</span>
                <p className="font-semibold text-slate-900 leading-snug">{proposalSuccessModal.proposed_value?.decision_area}</p>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-slate-600 font-bold">Authority Chain:</span>
                <p className="font-mono text-[11px] font-bold text-indigo-700">{proposalSuccessModal.proposed_value?.composite_authority}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>This proposal is now live in the <strong>Change Queue</strong> for demonstration. You can inspect diffs, test approval workflows, or amend it.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProposalSuccessModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setProposalSuccessModal(null);
                  setActiveNav('queue');
                }}
                className="px-5 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 hover:from-black hover:to-indigo-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <span>View in Change Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prototype Side-by-Side Diff Inspection Modal */}
      {prototypeDiffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-black text-cyan-300">#{prototypeDiffModal.id}</span>
                <span className="text-xs px-2 py-0.5 rounded font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {prototypeDiffModal.request_type} PROPOSAL
                </span>
                <span className="text-xs font-bold text-slate-300">Side-by-Side Diff</span>
              </div>
              <button 
                type="button"
                onClick={() => setPrototypeDiffModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">
              {/* Proposal Summary */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Requester:</span>
                  <span className="font-bold text-slate-900">{prototypeDiffModal.requester}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Department / Function:</span>
                  <span className="font-bold text-slate-900">{prototypeDiffModal.department} ➔ {prototypeDiffModal.process}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Status:</span>
                  <span className="font-bold text-cyan-700">{prototypeDiffModal.status}</span>
                </div>
                <div className="text-xs pt-1">
                  <span className="font-bold text-slate-600">Proposal Rationale:</span>
                  <p className="mt-0.5 text-slate-800 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                    "{prototypeDiffModal.rationale}"
                  </p>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Baseline (Before) */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between pb-2 border-b border-slate-200">
                    <span>Baseline (Current State)</span>
                    <span className="text-[10px] font-mono text-slate-500">v{prototypeDiffModal.base_version || 1}</span>
                  </div>
                  {prototypeDiffModal.request_type === 'ADD' ? (
                    <div className="py-8 text-center text-xs text-slate-700 font-semibold italic">
                      New record — No prior baseline exists.
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-600 font-bold">Rule ID:</span>
                        <p className="font-mono text-slate-800">#{prototypeDiffModal.target_record?.id || prototypeDiffModal.doa_id}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold">Decision Area:</span>
                        <p className="text-slate-800">{prototypeDiffModal.target_record?.decisionArea || prototypeDiffModal.target_record?.decision_area || 'Existing Decision Rule'}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold">Authority:</span>
                        <p className="font-mono text-slate-800">{prototypeDiffModal.target_record?.composite_authority || prototypeDiffModal.target_record?.authority || 'BoD (A)'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Proposed (After) */}
                <div className="p-4 bg-cyan-50/60 border border-cyan-200 rounded-2xl space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-cyan-900 flex items-center justify-between pb-2 border-b border-cyan-200">
                    <span>Proposed Target State</span>
                    <span className="text-[10px] font-mono text-cyan-700 font-bold">
                      {prototypeDiffModal.request_type === 'DELETE' ? 'ARCHIVE PROPOSAL' : 'TARGET v2'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-cyan-800 font-bold">Decision Area:</span>
                      <p className="text-slate-900 font-bold">{prototypeDiffModal.proposed_value?.decision_area}</p>
                    </div>
                    <div>
                      <span className="text-cyan-800 font-bold">Proposed Authority Chain:</span>
                      <p className="font-mono text-indigo-800 font-bold">{prototypeDiffModal.proposed_value?.composite_authority}</p>
                    </div>
                    <div>
                      <span className="text-cyan-800 font-bold">Classification / Regulatory:</span>
                      <p className="text-slate-900">{prototypeDiffModal.proposed_value?.key_non_key} &bull; Reg: {prototypeDiffModal.proposed_value?.regulatory === 'Y' ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDiscardPrototypeCR(prototypeDiffModal.id)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Discard / Delete Proposal</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrototypeDiffModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300"
                >
                  Close
                </button>
                {prototypeDiffModal.status === 'SUBMITTED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRejectPrototypeCR(prototypeDiffModal.id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Reject (Demo)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePrototypeCR(prototypeDiffModal.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Proposal (Demo)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}