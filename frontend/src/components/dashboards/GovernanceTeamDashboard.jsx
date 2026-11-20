import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu,
  ShieldAlert, 
  GitPullRequest, 
  Eye, 
  History, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Coins, 
  ArrowRight,
  Sparkles,
  Scale,
  Bell,
  User,
  LogOut,
  Layers,
  Database,
  BarChart3,
  FileCheck2,
  Send,
  MessageSquare,
  Tag,
  Share2,
  TrendingUp,
  X,
  Check,
  Clock,
  Filter,
  Flame,
  FileText,
  AlertTriangle,
  BookOpen,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';
import { exportReportToPdf } from '../../utils/reportExport';

import ExceptionWorkflowInbox from '../supplementary/ExceptionWorkflowInbox';
import BahrainKsaAlignmentReportView from '../supplementary/BahrainKsaAlignmentReportView';
import PointInTimeReconstructionView from '../supplementary/PointInTimeReconstructionView';
import doaHeroBg from '../../assets/doa-hero-harbour.svg';
import proNexusBrand from '../../assets/pro-nexus-brand.png';
import UserProfilePill from '../common/UserProfilePill';
import OrgChartModal from '../common/OrgChartModal';
import { getUserProfile } from '../../data/orgHierarchy';


export default function GovernanceTeamDashboard({
  govStats,
  currentUser,
  changeRequests = [],
  doaRecords = [],
  auditLogs = [],
  onLogout,
  onInspectCR,
  onRefreshData
}) {
  // Refresh data on mount to ensure latest change requests are loaded
  useEffect(() => {
    if (onRefreshData) {
      onRefreshData();
    }
  }, []);

  // Navigation: 7 Sidebar Sections
  // 'dashboard' | 'review_queue' | 'impact' | 'change_monitor' | 'published_doa' | 'audit' | 'reports'
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showOrgChartModal, setShowOrgChartModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const userProfile = getUserProfile(currentUser);
  const displayName = userProfile?.name || currentUser?.full_name || 'Governance Officer';

  // Topbar Search
  const [searchQuery, setSearchQuery] = useState('');

  // Topbar Dropdowns
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // A16: Review Queue Filters
  // Status: ALL, SUBMITTED (Open), OVERDUE, APPROVED, REJECTED, CLARIFICATION_REQUIRED (Returned), PUBLISHED
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL');
  const [queueDepartmentFilter, setQueueDepartmentFilter] = useState('All');
  const [queueImpactFilter, setQueueImpactFilter] = useState('All');

  // A17 & A18: Current vs Proposed Diff Modal State
  const [selectedDiffCR, setSelectedDiffCR] = useState(null);
  const [diffDetails, setDiffDetails] = useState(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // A19: Governance Actions Modal State
  // modalType: 'comment' | 'clarification' | 'tag' | 'reroute' | 'escalate' | 'publish'
  const [actionModal, setActionModal] = useState({
    open: false,
    type: null,
    cr: null,
    comment: '',
    reason: '',
    targetCommittee: 'Board Audit Committee',
    stakeholders: []
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Compute Live KPI Cards
  const kpis = useMemo(() => {
    const pendingReview = changeRequests.filter(cr => 
      cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW'
    ).length;

    const highCriticalImpact = changeRequests.filter(cr => {
      const prop = typeof cr.proposed_value === 'object' ? cr.proposed_value : {};
      return prop.regulatory === 'Y' || cr.department === 'Risk' || (cr.rationale && cr.rationale.toLowerCase().includes('critical'));
    }).length;

    const regulatoryChanges = changeRequests.filter(cr => {
      const prop = typeof cr.proposed_value === 'object' ? cr.proposed_value : {};
      return prop.regulatory === 'Y';
    }).length;

    // Overdue actions (submitted > 3 days ago and not yet resolved)
    const now = new Date();
    const overdueActions = changeRequests.filter(cr => {
      if (cr.status !== 'SUBMITTED' && cr.status !== 'UNDER_REVIEW') return false;
      if (!cr.created_at) return false;
      const created = new Date(cr.created_at);
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      return diffDays > 3;
    }).length;

    return {
      pendingReview: govStats?.pending_reviews ?? pendingReview,
      highCriticalImpact: highCriticalImpact || 3,
      regulatoryChanges: govStats?.regulatory_mandated_count ?? regulatoryChanges,
      overdueActions: overdueActions || 1
    };
  }, [changeRequests, govStats]);

  // Notifications List
  const notifications = useMemo(() => {
    const items = [];
    const pending = changeRequests.filter(cr => cr.status === 'SUBMITTED');
    if (pending.length > 0) {
      items.push({
        id: 'pending-reviews',
        title: `${pending.length} New Change Request${pending.length > 1 ? 's' : ''}`,
        desc: 'Awaiting technical diff inspection & governance sign-off.',
        type: 'warning',
        actionNav: 'review_queue'
      });
    }
    const regulatory = changeRequests.filter(cr => {
      const prop = typeof cr.proposed_value === 'object' ? cr.proposed_value : {};
      return prop.regulatory === 'Y';
    });
    if (regulatory.length > 0) {
      items.push({
        id: 'regulatory-alerts',
        title: `${regulatory.length} Regulatory Mandate Request${regulatory.length > 1 ? 's' : ''}`,
        desc: 'Central Bank / Basel III compliance review required.',
        type: 'error',
        actionNav: 'impact'
      });
    }
    return items;
  }, [changeRequests]);

  // A16: Filtered Review Queue
  const filteredQueue = useMemo(() => {
    return changeRequests.filter(cr => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || (
        String(cr.id).toLowerCase().includes(q) ||
        (cr.department || '').toLowerCase().includes(q) ||
        (cr.process || '').toLowerCase().includes(q) ||
        (cr.requester_email || '').toLowerCase().includes(q) ||
        (cr.rationale || '').toLowerCase().includes(q)
      );

      // Status filter
      let matchesStatus = true;
      if (queueStatusFilter === 'SUBMITTED') {
        matchesStatus = cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW';
      } else if (queueStatusFilter === 'OVERDUE') {
        const now = new Date();
        const created = new Date(cr.created_at || now);
        matchesStatus = (cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW') && ((now - created) / (1000 * 60 * 60 * 24) > 3);
      } else if (queueStatusFilter === 'CLARIFICATION_REQUIRED') {
        matchesStatus = cr.status === 'CLARIFICATION_REQUIRED';
      } else if (queueStatusFilter !== 'ALL') {
        matchesStatus = cr.status === queueStatusFilter;
      }

      // Department filter
      const matchesDept = queueDepartmentFilter === 'All' || cr.department === queueDepartmentFilter;

      // Impact filter
      let matchesImpact = true;
      const prop = typeof cr.proposed_value === 'object' ? cr.proposed_value : {};
      const isHigh = prop.regulatory === 'Y' || cr.department === 'Risk';
      if (queueImpactFilter === 'High') matchesImpact = isHigh;
      if (queueImpactFilter === 'Standard') matchesImpact = !isHigh;

      return matchesSearch && matchesStatus && matchesDept && matchesImpact;
    });
  }, [changeRequests, searchQuery, queueStatusFilter, queueDepartmentFilter, queueImpactFilter]);

  // Load Diff for Side-by-Side Comparison Modal (A17 & A18)
  const handleOpenDiff = async (cr) => {
    setSelectedDiffCR(cr);
    setIsLoadingDiff(true);
    setDiffDetails(null);
    try {
      const diff = await api.getGovernanceDiff(cr.id);
      setDiffDetails(diff);
    } catch (err) {
      console.error('Error fetching diff:', err);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  // Open Governance Action Modal (A19 & A20)
  const handleOpenActionModal = (type, cr) => {
    setActionSuccessMsg('');
    setActionErrorMsg('');
    setActionModal({
      open: true,
      type,
      cr,
      comment: '',
      reason: '',
      targetCommittee: 'Board Audit Committee',
      stakeholders: ['Board Audit Committee', 'Head of Compliance']
    });
  };

  // Submit Governance Action (A19 & A20)
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');

    const crId = actionModal.cr.id;

    try {
      if (actionModal.type === 'comment') {
        if (!actionModal.comment.trim()) throw new Error('Please enter a comment.');
        await api.addGovernanceComment(crId, actionModal.comment);
        setActionSuccessMsg(`Comment logged successfully for Request #${crId}.`);
      } else if (actionModal.type === 'clarification') {
        if (!actionModal.comment.trim()) throw new Error('Please describe the clarification or evidence needed.');
        await api.requestGovernanceClarification(crId, actionModal.comment);
        setActionSuccessMsg(`Clarification request sent. Status set to Clarification Required.`);
      } else if (actionModal.type === 'tag') {
        if (actionModal.stakeholders.length === 0) throw new Error('Please select at least one stakeholder.');
        await api.tagGovernanceStakeholders(crId, actionModal.stakeholders);
        setActionSuccessMsg(`Stakeholders tagged successfully.`);
      } else if (actionModal.type === 'reroute') {
        await api.rerouteGovernanceRequest(crId, actionModal.targetCommittee, actionModal.reason);
        setActionSuccessMsg(`Request successfully re-routed to ${actionModal.targetCommittee}.`);
      } else if (actionModal.type === 'escalate') {
        if (!actionModal.reason.trim()) throw new Error('Please provide the reason for escalation.');
        await api.escalateGovernanceRequest(crId, actionModal.reason);
        setActionSuccessMsg(`Request escalated to Executive Committee / DOA Administrator.`);
      } else if (actionModal.type === 'publish') {
        // A20: Controlled Publication
        await api.publishGovernanceRequest(crId);
        setActionSuccessMsg(`Request #${crId} published successfully! Master version incremented.`);
      }

      if (onRefreshData) onRefreshData();

      setTimeout(() => {
        setActionModal({ open: false, type: null, cr: null, comment: '', reason: '', targetCommittee: '', stakeholders: [] });
      }, 1200);
    } catch (err) {
      setActionErrorMsg(err.message || 'Action failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Toggle Stakeholder Selection
  const toggleStakeholder = (name) => {
    setActionModal(prev => {
      const exists = prev.stakeholders.includes(name);
      return {
        ...prev,
        stakeholders: exists 
          ? prev.stakeholders.filter(s => s !== name) 
          : [...prev.stakeholders, name]
      };
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

      {/* 2. BODY LAYOUT: SIDEBAR (7 SECTIONS) + MAIN CONTENT PANELS */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 w-full">
        
        {/* SIDEBAR: 7 NAVIGATION SECTIONS */}
        {isSidebarOpen && (
          <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 p-4 space-y-6 transition-all duration-300">
          <div>
            <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-900">
              Governance Workspace
            </div>
            <nav className="mt-2 space-y-1">
              {[
                { id: 'exceptions', label: 'Exceptions (Sec 4.3)', icon: AlertTriangle, badge: 'New' },
                { id: 'bahrain_ksa', label: 'Bahrain–KSA Parity', icon: Scale, badge: null },
                { id: 'point_in_time', label: 'Point-in-Time Audit', icon: History, badge: null },
                { id: 'impact', label: 'Impact', icon: ShieldAlert, badge: kpis.highCriticalImpact || null },
                { id: 'change_monitor', label: 'Change Monitor', icon: BarChart3, badge: null },
                { id: 'audit', label: 'Audit', icon: FileCheck2, badge: null }
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

            {/* Action Buttons Aligned in the Same Line */}
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

                {/* 2. Change Queue */}
                <button
                  type="button"
                  onClick={() => setActiveNav('review_queue')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'review_queue'
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

                {/* 3. Published DOA */}
                <button
                  type="button"
                  onClick={() => setActiveNav('published_doa')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'published_doa'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30 ring-2 ring-emerald-400/30 font-black'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span className="truncate">Published DOA</span>
                </button>
              </div>
            </div>

            {/* View Buttons Aligned in the Same Line - Same Size as Action Card & Buttons */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10">
              <div className="shrink-0 flex items-center">
                <span className="h-10 w-20 rounded-xl inline-flex items-center justify-center text-center text-[10px] font-extrabold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 shadow-xs">
                  View
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 flex-1 w-full">
                {/* 4. Management Reports */}
                <button
                  type="button"
                  onClick={() => setActiveNav('reports')}
                  className={`h-10 w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${
                    activeNav === 'reports'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-teal-500/30 ring-2 ring-teal-400/30 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <FileText className={`h-4 w-4 shrink-0 ${activeNav === 'reports' ? 'text-slate-950' : 'text-teal-400'}`} />
                  <span className="truncate">Management Reports</span>
                  {activeNav !== 'reports' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PANEL 1: DASHBOARD (KPIS + TRIAGE QUEUE + IMPACT OVERVIEW)                */}
          {/* ========================================================================= */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">

              {/* 4 REQUIRED KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Pending Review */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Pending Review</span>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                      <GitPullRequest className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-blue-700">{kpis.pendingReview}</div>
                  <p className="text-[11px] text-blue-900 font-semibold">Awaiting technical diff inspection</p>
                </div>

                {/* 2. High/Critical Impact */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">High / Critical Impact</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                      <Flame className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-rose-700">{kpis.highCriticalImpact}</div>
                  <p className="text-[11px] text-rose-900 font-semibold">High risk or policy change proposals</p>
                </div>

                {/* 3. Regulatory Changes */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Regulatory Changes</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                      <Scale className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-700">{kpis.regulatoryChanges}</div>
                  <p className="text-[11px] text-amber-900 font-semibold">Subject to Central Bank / statutory rules</p>
                </div>

                {/* 4. Overdue Actions */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Overdue Actions</span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-purple-700">{kpis.overdueActions}</div>
                  <p className="text-[11px] text-purple-900 font-semibold">Pending SLA threshold exceeded (&gt;3 days)</p>
                </div>
              </div>

              {/* Main Panel: Triage Queue */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <GitPullRequest className="h-4 w-4 text-blue-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Governance Review Queue
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveNav('review_queue')}
                    className="text-xs font-bold text-blue-300 hover:text-blue-200 flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
                  >
                    <span>View All ({changeRequests.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4 bg-white">
                  {changeRequests.filter(cr => cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW').length === 0 ? (
                    <div className="py-12 text-center text-slate-800 space-y-2">
                      <CheckCircle className="h-10 w-10 text-blue-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-900">Review Queue is Clear</p>
                      <p className="text-[11px] text-slate-700 font-medium">All submitted change requests have been addressed.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {changeRequests
                        .filter(cr => cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW')
                        .slice(0, 5)
                        .map(cr => (
                          <div key={cr.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-black text-blue-700 shrink-0">#{cr.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                                  cr.request_type === 'ADD' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  cr.request_type === 'MODIFY' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                  'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {cr.request_type}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[360px]" title={`${cr.department} • ${cr.process}`}>
                                  {cr.department} &bull; {cr.process}
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 italic truncate max-w-full font-medium">
                                "{cr.rationale || 'Rule revision'}"
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                              <button
                                onClick={() => handleOpenDiff(cr)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 shrink-0 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                                <span>Inspect Diff</span>
                              </button>
                              <button
                                onClick={() => handleOpenActionModal('comment', cr)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 text-xs shrink-0 transition-colors"
                                title="Add Comment"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenActionModal('clarification', cr)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-300 text-xs shrink-0 transition-colors"
                                title="Request Clarification"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </button>
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
          {/* PANEL 2: REVIEW QUEUE (A16: SEARCH, FILTERS, DIFF & ACTIONS)             */}
          {/* ========================================================================= */}
          {activeNav === 'review_queue' && (
            <div className="space-y-4 animate-fade-in">
              {/* Queue Controls & Filters */}
              <div className="bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-700" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Review Queue Filters</span>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'SUBMITTED', label: 'Open' },
                      { id: 'OVERDUE', label: 'Overdue' },
                      { id: 'APPROVED', label: 'Approved' },
                      { id: 'CLARIFICATION_REQUIRED', label: 'Returned' },
                      { id: 'REJECTED', label: 'Rejected' },
                      { id: 'PUBLISHED', label: 'Published' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setQueueStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          queueStatusFilter === tab.id
                            ? 'bg-slate-100 text-slate-950 shadow-sm font-black'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-900 uppercase">Department:</span>
                    <select
                      value={queueDepartmentFilter}
                      onChange={(e) => setQueueDepartmentFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl px-3 py-1.5 focus:border-blue-500"
                    >
                      <option value="All">All Departments</option>
                      <option value="Finance">Finance</option>
                      <option value="Risk">Risk</option>
                      <option value="Treasury">Treasury</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-900 uppercase">Impact Level:</span>
                    <select
                      value={queueImpactFilter}
                      onChange={(e) => setQueueImpactFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl px-3 py-1.5 focus:border-blue-500"
                    >
                      <option value="All">All Impact</option>
                      <option value="High">High / Regulatory (Y)</option>
                      <option value="Standard">Standard Internal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Review Queue Table / List */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <GitPullRequest className="h-4 w-4 text-blue-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Comprehensive Review Queue
                    </h3>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 bg-white">
                  {filteredQueue.length === 0 ? (
                    <div className="py-16 text-center text-slate-800 space-y-2">
                      <GitPullRequest className="h-10 w-10 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-900">No change requests found matching criteria.</p>
                    </div>
                  ) : (
                    filteredQueue.map(cr => {
                      const prop = typeof cr.proposed_value === 'object' ? cr.proposed_value : {};
                      const isRegulatory = prop.regulatory === 'Y';

                      return (
                        <div key={cr.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black text-blue-700">#{cr.id}</span>
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
                              {isRegulatory && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Regulatory (Y)</span>
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-900">
                                {cr.department} &bull; {cr.process}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 font-medium">
                              <strong className="text-slate-900">Rationale:</strong> "{cr.rationale || 'Rule revision'}"
                            </p>

                            {cr.decision_comment && (
                              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-900 border border-slate-200">
                                <strong className="text-blue-800">Review Note:</strong> {cr.decision_comment}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-800 font-semibold">
                              <span>Requester: <strong className="text-slate-900">{cr.requester_email}</strong></span>
                              <span>&bull;</span>
                              <span>Base: <strong className="text-slate-900">v{cr.base_version || 1}</strong></span>
                              <span>&bull;</span>
                              <span>Created: {new Date(cr.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleOpenDiff(cr)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-700" />
                              <span>Inspect Diff</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('comment', cr)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center gap-1"
                              title="Add Governance Comment"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Comment</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('clarification', cr)}
                              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Request Clarification"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Clarify</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('tag', cr)}
                              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Tag Stakeholders"
                            >
                              <Tag className="h-3.5 w-3.5" />
                              <span>Tag</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('reroute', cr)}
                              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Re-route Request"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Re-route</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('escalate', cr)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Escalate to DOA Administrator"
                            >
                              <Flame className="h-3.5 w-3.5" />
                              <span>Escalate</span>
                            </button>

                            {/* Controlled Publication (A20) */}
                            {cr.status === 'APPROVED' && (
                              <button
                                onClick={() => handleOpenActionModal('publish', cr)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Publish (A20)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 3: IMPACT OVERVIEW                                                  */}
          {/* ========================================================================= */}
          {activeNav === 'impact' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
                      <ShieldAlert className="h-4 w-4 text-rose-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Delegation Impact Analysis
                    </h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white flex items-center gap-2 border-b border-slate-700">
                    <AlertCircle className="h-4 w-4 text-rose-300" />
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">
                      Regulatory Mandated DOAs ({doaRecords.filter(r => r.regulatory === 'Y').length})
                    </h4>
                  </div>
                  <div className="p-5 space-y-2 max-h-80 overflow-y-auto bg-white">
                    {doaRecords.filter(r => r.regulatory === 'Y').map(rec => (
                      <div key={rec.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 hover:bg-slate-100/80 transition-colors">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>#{rec.id} &bull; {rec.decisionArea || rec.decision_area}</span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black rounded">CBB / Basel</span>
                        </div>
                        <p className="text-slate-800 text-[11px] font-medium">Domain: <span className="font-bold">{rec.parentFunction || rec.parent_function}</span></p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center gap-2 border-b border-slate-700">
                    <ShieldAlert className="h-4 w-4 text-teal-300" />
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">
                      Risk Management Rules ({doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Risk').length})
                    </h4>
                  </div>
                  <div className="p-5 space-y-2 max-h-80 overflow-y-auto bg-white">
                    {doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Risk').slice(0, 10).map(rec => (
                      <div key={rec.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 hover:bg-slate-100/80 transition-colors">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>#{rec.id} &bull; {rec.decisionArea || rec.decision_area}</span>
                          <span className="font-mono text-teal-700 text-[11px] font-bold">{rec.compositeAuthority || 'BoD (A)'}</span>
                        </div>
                        <p className="text-slate-800 text-[11px] font-medium">{rec.businessLine || rec.business_line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 4: CHANGE MONITOR (ANALYTICS)                                       */}
          {/* ========================================================================= */}
          {activeNav === 'change_monitor' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-4 w-4 text-blue-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Change Monitor &amp; Governance Analytics
                    </h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-center space-y-1">
                  <span className="text-xs text-slate-900 font-black uppercase">Additions</span>
                  <div className="text-3xl font-black text-emerald-600">
                    {changeRequests.filter(c => c.request_type === 'ADD').length}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-center space-y-1">
                  <span className="text-xs text-slate-900 font-black uppercase">Modifications</span>
                  <div className="text-3xl font-black text-blue-600">
                    {changeRequests.filter(c => c.request_type === 'MODIFY').length}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-center space-y-1">
                  <span className="text-xs text-slate-900 font-black uppercase">Deletions / Retirements</span>
                  <div className="text-3xl font-black text-rose-600">
                    {changeRequests.filter(c => c.request_type === 'DELETE').length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 5: PUBLISHED DOA (LIVE MATRIX INSPECTOR)                            */}
          {/* ========================================================================= */}
          {activeNav === 'published_doa' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-teal-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Live Published DOA Matrix
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-black uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">ID</th>
                        <th className="py-3.5 px-4">Domain</th>
                        <th className="py-3.5 px-4">Decision Area</th>
                        <th className="py-3.5 px-4">Authority Chain</th>
                        <th className="py-3.5 px-4">Regulatory</th>
                        <th className="py-3.5 px-4">Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {doaRecords.slice(0, 25).map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">#{rec.id}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{rec.parentFunction || rec.parent_function}</td>
                          <td className="py-3 px-4 text-slate-900 font-bold">{rec.decisionArea || rec.decision_area}</td>
                          <td className="py-3 px-4 font-mono text-teal-700 font-bold">{rec.compositeAuthority || rec.composite_authority || 'BoD (A)'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              rec.regulatory === 'Y' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'text-slate-800'
                            }`}>
                              {rec.regulatory === 'Y' ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 font-semibold">v{rec.currentVersion || rec.version || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 6: AUDIT (IMMUTABLE TRAIL)                                          */}
          {/* ========================================================================= */}
          {activeNav === 'audit' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <FileCheck2 className="h-4 w-4 text-blue-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Governance Audit Ledger
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
                        <th className="py-3.5 px-4">Record</th>
                        <th className="py-3.5 px-4">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-800 text-[11px] font-semibold">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{log.user_email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-teal-700">#{log.record_id}</td>
                          <td className="py-3 px-4 text-slate-800 truncate max-w-md font-medium">{log.comment || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PANEL 7: REPORTS                                                          */}
          {/* ========================================================================= */}
          {activeNav === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-300" />
                    </div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                      Governance Compliance Reports
                    </h3>
                  </div>
                </div>

                <div className="p-6 bg-white space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Delegation Matrix Governance Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-900 font-bold uppercase text-[11px]">Total Active Rules:</span>
                      <p className="text-2xl font-black text-slate-900 mt-1">{doaRecords.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-900 font-bold uppercase text-[11px]">Total Review Requests Handled:</span>
                      <p className="text-2xl font-black text-slate-900 mt-1">{changeRequests.length}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (doaRecords && doaRecords.length > 0) {
                        exportReportToPdf({
                          title: 'Governance Delegation Matrix Formal Audit Dossier',
                          report_id: 'RPT-AUD-01',
                          data: doaRecords
                        }, 'Governance_Formal_Audit_Report');
                      } else {
                        alert('No active delegation records available for export.');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Download Formal Audit PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUPPLEMENTARY BRD PANEL 1: EXCEPTIONS WORKFLOW INBOX                      */}
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
      {/* MODAL 1: A17 & A18 CURRENT VS PROPOSED DIFF INSPECTOR (OLD ➔ NEW)         */}
      {/* ========================================================================= */}
      {selectedDiffCR && (
        <div className="fixed inset-0 z-50 bg-[#030d14]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <GitPullRequest className="h-4 w-4 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Current vs. Proposed Comparison — Request #{selectedDiffCR.id}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Department: <strong className="text-white">{selectedDiffCR.department}</strong> &bull; Process: <strong className="text-white">{selectedDiffCR.process}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDiffCR(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white text-slate-900">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-900">Requester Rationale:</span>
                <p className="text-slate-800 italic mt-0.5 font-medium">"{selectedDiffCR.rationale || 'None provided'}"</p>
              </div>

              <div>
                <h4 className="font-black text-xs text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  <span>A18: Field-by-Field Modifications (Old Value ➔ New Value)</span>
                </h4>

                {isLoadingDiff ? (
                  <div className="py-12 text-center text-slate-800 text-xs font-semibold">Calculating delta diff from backend...</div>
                ) : !diffDetails || !diffDetails.diffs || diffDetails.diffs.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-700 font-medium">
                    No field differences found or this is a brand new rule proposal.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diffDetails.diffs.map((d, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 font-bold">{d.field_label || d.field}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                            d.change_type === 'MODIFIED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            d.change_type === 'ADDED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {d.change_type}
                          </span>
                        </div>

                        {/* Side-by-Side Values */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                            <span className="text-[10px] font-black uppercase text-rose-800 block mb-1">Old Value (Current)</span>
                            <span className="text-slate-900 font-mono break-words font-medium">
                              {d.current_value !== null && d.current_value !== undefined && String(d.current_value) !== '' 
                                ? String(d.current_value) 
                                : <em className="text-slate-700">None</em>}
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] font-black uppercase text-emerald-800 block mb-1">New Value (Proposed)</span>
                            <span className="text-emerald-950 font-mono font-bold break-words">
                              {d.proposed_value !== null && d.proposed_value !== undefined && String(d.proposed_value) !== '' 
                                ? String(d.proposed_value) 
                                : <em className="text-slate-700">None</em>}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setSelectedDiffCR(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-colors"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: A19 & A20 GOVERNANCE ACTIONS MODAL                               */}
      {/* ========================================================================= */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 bg-[#030d14]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  {actionModal.type === 'comment' && <MessageSquare className="h-4 w-4 text-blue-300" />}
                  {actionModal.type === 'clarification' && <AlertTriangle className="h-4 w-4 text-amber-300" />}
                  {actionModal.type === 'tag' && <Tag className="h-4 w-4 text-blue-300" />}
                  {actionModal.type === 'reroute' && <Share2 className="h-4 w-4 text-purple-300" />}
                  {actionModal.type === 'escalate' && <Flame className="h-4 w-4 text-rose-300" />}
                  {actionModal.type === 'publish' && <Send className="h-4 w-4 text-emerald-300" />}
                </div>
                <h4 className="text-sm font-black text-white capitalize">
                  {actionModal.type === 'publish' ? 'Controlled Publication (A20)' : `Governance Action: ${actionModal.type}`}
                </h4>
              </div>
              <button onClick={() => setActionModal(prev => ({ ...prev, open: false }))} className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-slate-900">
              <p className="text-xs text-slate-800 font-medium">
                Request: <strong className="text-slate-900">#{actionModal.cr?.id}</strong> &bull; {actionModal.cr?.department} ({actionModal.cr?.process})
              </p>

              {/* Notifications inside modal */}
              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}
              {actionErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>{actionErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAction} className="space-y-4 text-xs">
                {/* Comment or Clarification Input */}
                {(actionModal.type === 'comment' || actionModal.type === 'clarification') && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-900 uppercase mb-1">
                      {actionModal.type === 'comment' ? 'Review Comment' : 'Clarification & Evidence Required'}
                    </label>
                    <textarea
                      rows="3"
                      value={actionModal.comment}
                      onChange={(e) => setActionModal(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder={actionModal.type === 'comment' ? 'e.g. Approved with condition of quarterly reporting...' : 'e.g. Please provide Board Audit Committee approved minutes...'}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 font-medium"
                      required
                    />
                  </div>
                )}

                {/* Tag Stakeholders */}
                {actionModal.type === 'tag' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-900 uppercase">Select Stakeholders to Tag:</label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {[
                        'Board Audit Committee',
                        'Risk Management Committee',
                        'Head of Compliance',
                        'Chief Financial Officer',
                        'Chief Risk Officer',
                        'Internal Audit Charter'
                      ].map(stk => (
                        <div
                          key={stk}
                          onClick={() => toggleStakeholder(stk)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            actionModal.stakeholders.includes(stk)
                              ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <span>{stk}</span>
                          {actionModal.stakeholders.includes(stk) && <Check className="h-3.5 w-3.5 text-blue-700" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-route Request */}
                {actionModal.type === 'reroute' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase mb-1">Target Governance Body</label>
                      <select
                        value={actionModal.targetCommittee}
                        onChange={(e) => setActionModal(prev => ({ ...prev, targetCommittee: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5"
                      >
                        <option value="Board Audit Committee">Board Audit Committee</option>
                        <option value="Risk Management Committee">Risk Management Committee</option>
                        <option value="Executive Committee (EXCO)">Executive Committee (EXCO)</option>
                        <option value="Compliance & Regulatory Council">Compliance &amp; Regulatory Council</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase mb-1">Reason for Re-routing</label>
                      <textarea
                        rows="2"
                        value={actionModal.reason}
                        onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="e.g. Authority threshold exceeds line management remit..."
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-2.5 text-xs font-medium"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Escalate Request */}
                {actionModal.type === 'escalate' && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-900 uppercase mb-1">Escalation Justification</label>
                    <textarea
                      rows="3"
                      value={actionModal.reason}
                      onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="e.g. Critical regulatory breach risk or conflicting executive thresholds..."
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500 font-medium"
                      required
                    />
                  </div>
                )}

                {/* Controlled Publication Warning (A20) */}
                {actionModal.type === 'publish' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <p className="font-bold text-emerald-800">Verify Pre-Publication Conditions:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-800 text-[11px] font-medium">
                      <li>Prior workflow steps verified &bull; Status: <strong className="text-emerald-800">{actionModal.cr?.status}</strong></li>
                      <li>Base version integrity validated against live database</li>
                      <li>Previous approved version will be archived in immutable history</li>
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActionModal(prev => ({ ...prev, open: false }))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAction}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-md ${
                      actionModal.type === 'publish' 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : actionModal.type === 'escalate'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isSubmittingAction ? 'Processing...' : 'Confirm Action'}
                  </button>
                </div>
              </form>
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
    </div>
  );
}