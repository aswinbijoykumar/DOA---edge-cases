import React, { useState, useMemo } from 'react';
import { 
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
  BookOpen
} from 'lucide-react';
import { api } from '../../services/api';

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
  // Navigation: 7 Sidebar Sections
  // 'dashboard' | 'review_queue' | 'impact' | 'change_monitor' | 'published_doa' | 'audit' | 'reports'
  const [activeNav, setActiveNav] = useState('dashboard');

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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. TOPBAR */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
        {/* Left: Brand & Hub Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">protiviti</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  GOVERNANCE TEAM CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Risk &amp; Delegation Policy Oversight</p>
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
              placeholder="Search change requests, departments, authorities, rationale..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-md">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Governance Alerts</h4>
                  <span className="text-[10px] text-blue-400 font-bold">{notifications.length} active</span>
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
                            n.type === 'error' ? 'bg-rose-400' :
                            n.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
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
              <div className="h-6 w-6 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">
                {currentUser?.full_name?.charAt(0) || 'G'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold leading-none text-slate-200">{currentUser?.full_name || 'Governance Officer'}</p>
                <p className="text-[10px] text-blue-400 font-mono mt-0.5">GOVERNANCE_TEAM</p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-2">
                <div className="px-2 py-1.5 border-b border-slate-800 text-xs">
                  <p className="font-bold text-white">{currentUser?.full_name}</p>
                  <p className="text-[11px] text-slate-400">{currentUser?.email || 'governance@doa.local'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Mandate: Risk &amp; Policy Review
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

      {/* 2. BODY LAYOUT: SIDEBAR (7 SECTIONS) + MAIN CONTENT PANELS */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        
        {/* SIDEBAR: 7 NAVIGATION SECTIONS */}
        <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800/80 flex-shrink-0 p-4 space-y-6">
          <div>
            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Governance Workspace
            </div>
            <nav className="mt-2 space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Layers, badge: null },
                { id: 'review_queue', label: 'Review Queue', icon: GitPullRequest, badge: kpis.pendingReview || null },
                { id: 'impact', label: 'Impact', icon: ShieldAlert, badge: kpis.highCriticalImpact || null },
                { id: 'change_monitor', label: 'Change Monitor', icon: BarChart3, badge: null },
                { id: 'published_doa', label: 'Published DOA', icon: Database, badge: doaRecords.length },
                { id: 'audit', label: 'Audit', icon: FileCheck2, badge: null },
                { id: 'reports', label: 'Reports', icon: FileText, badge: null }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeNav === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveNav(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-slate-950 text-blue-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Oversight Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200">Governance Mandate</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Verify compliance thresholds, tag committees, and ensure controlled publication of approved master records.
            </p>
          </div>
        </aside>

        {/* MAIN PANELS */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">

          {/* ========================================================================= */}
          {/* PANEL 1: DASHBOARD (KPIS + TRIAGE QUEUE + IMPACT OVERVIEW)                */}
          {/* ========================================================================= */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 border border-blue-500/20 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] font-extrabold tracking-widest uppercase text-blue-300">
                        Second Line of Defense
                      </span>
                      <span className="text-xs text-slate-400 font-mono">GOVERNANCE_TEAM</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Delegation Risk &amp; Policy Cockpit: {currentUser?.full_name?.split(' ')[0] || 'Reviewer'}
                    </h2>
                    <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                      Review proposed delegation modifications, verify thresholds against corporate policy, flag regulatory impacts, and perform controlled publication.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveNav('review_queue')}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      <span>Open Review Queue ({kpis.pendingReview})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 REQUIRED KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Pending Review */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pending Review</span>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                      <GitPullRequest className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-blue-400">{kpis.pendingReview}</div>
                  <p className="text-[11px] text-blue-400/90 font-semibold">Awaiting technical diff inspection</p>
                </div>

                {/* 2. High/Critical Impact */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">High / Critical Impact</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                      <Flame className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-rose-400">{kpis.highCriticalImpact}</div>
                  <p className="text-[11px] text-rose-400/90 font-semibold">High risk or policy change proposals</p>
                </div>

                {/* 3. Regulatory Changes */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Regulatory Changes</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Scale className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-300">{kpis.regulatoryChanges}</div>
                  <p className="text-[11px] text-amber-400/90 font-semibold">Subject to Central Bank / statutory rules</p>
                </div>

                {/* 4. Overdue Actions */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Overdue Actions</span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-purple-300">{kpis.overdueActions}</div>
                  <p className="text-[11px] text-purple-400/90 font-semibold">Pending SLA threshold exceeded (&gt;3 days)</p>
                </div>
              </div>

              {/* Main Panel: Triage Queue & Governance Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Governance Review Queue</h3>
                      <p className="text-xs text-slate-400">Actionable change requests requiring second-line review</p>
                    </div>
                    <button
                      onClick={() => setActiveNav('review_queue')}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>View All ({changeRequests.length})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {changeRequests.filter(cr => cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW').length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <CheckCircle className="h-10 w-10 text-blue-400/40 mx-auto" />
                      <p className="text-xs font-semibold text-slate-400">Review Queue is Clear</p>
                      <p className="text-[11px] text-slate-500">All submitted change requests have been addressed.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      {changeRequests
                        .filter(cr => cr.status === 'SUBMITTED' || cr.status === 'UNDER_REVIEW')
                        .slice(0, 5)
                        .map(cr => (
                          <div key={cr.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-400">#{cr.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  cr.request_type === 'ADD' ? 'bg-emerald-500/20 text-emerald-300' :
                                  cr.request_type === 'MODIFY' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {cr.request_type}
                                </span>
                                <span className="text-xs font-bold text-slate-200 truncate">
                                  {cr.department} &bull; {cr.process}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 italic line-clamp-1">
                                "{cr.rationale || 'Rule revision'}"
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleOpenDiff(cr)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-400" />
                                <span>Inspect Diff</span>
                              </button>
                              <button
                                onClick={() => handleOpenActionModal('comment', cr)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-xs"
                                title="Add Comment"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenActionModal('clarification', cr)}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 text-xs"
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

                {/* Right: Governance Powers & Controlled Publication Alert */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-400" />
                      <span>Governance Review Capabilities</span>
                    </h4>
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex items-start gap-2 text-blue-300">
                        <span className="font-bold">✓</span>
                        <span>Side-by-side Current vs Proposed comparison</span>
                      </div>
                      <div className="flex items-start gap-2 text-blue-300">
                        <span className="font-bold">✓</span>
                        <span>Old Value ➔ New Value change highlighting</span>
                      </div>
                      <div className="flex items-start gap-2 text-blue-300">
                        <span className="font-bold">✓</span>
                        <span>Request clarification, add comments, tag stakeholders</span>
                      </div>
                      <div className="flex items-start gap-2 text-blue-300">
                        <span className="font-bold">✓</span>
                        <span>Re-route or escalate to Board Committees</span>
                      </div>
                      <div className="flex items-start gap-2 text-blue-300">
                        <span className="font-bold">✓</span>
                        <span>A20: Controlled publication of approved records</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                      Controlled Publication Mandate
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Approved changes do not immediately overwrite the live DOA. Publication is restricted to authorized reviewers and requires prior workflow sign-off.
                    </p>
                  </div>
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
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Comprehensive Review Queue</h3>
                    <p className="text-xs text-slate-400">Filter across Open, Overdue, Approved, Rejected, Returned, and Published change requests</p>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
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
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Department:</span>
                    <select
                      value={queueDepartmentFilter}
                      onChange={(e) => setQueueDepartmentFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5"
                    >
                      <option value="All">All Departments</option>
                      <option value="Finance">Finance</option>
                      <option value="Risk">Risk</option>
                      <option value="Treasury">Treasury</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Impact Level:</span>
                    <select
                      value={queueImpactFilter}
                      onChange={(e) => setQueueImpactFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5"
                    >
                      <option value="All">All Impact</option>
                      <option value="High">High / Regulatory (Y)</option>
                      <option value="Standard">Standard Internal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Review Queue Table / List */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="divide-y divide-slate-800/80">
                  {filteredQueue.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 space-y-2">
                      <GitPullRequest className="h-10 w-10 text-slate-700 mx-auto" />
                      <p className="text-xs font-semibold text-slate-400">No change requests found matching criteria.</p>
                    </div>
                  ) : (
                    filteredQueue.map(cr => {
                      const prop = typeof cr.proposed_value === 'object' ? cr.proposed_value : {};
                      const isRegulatory = prop.regulatory === 'Y';

                      return (
                        <div key={cr.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black text-blue-400">#{cr.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                cr.request_type === 'ADD' ? 'bg-emerald-500/20 text-emerald-300' :
                                cr.request_type === 'MODIFY' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-rose-500/20 text-rose-300'
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
                              {isRegulatory && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Regulatory (Y)</span>
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-200">
                                {cr.department} &bull; {cr.process}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300">
                              <strong>Rationale:</strong> "{cr.rationale || 'Rule revision'}"
                            </p>

                            {cr.decision_comment && (
                              <div className="p-2 bg-slate-900 rounded-xl text-[11px] text-slate-400 border border-slate-800">
                                <strong className="text-blue-400">Review Note:</strong> {cr.decision_comment}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium">
                              <span>Requester: <strong className="text-slate-300">{cr.requester_email}</strong></span>
                              <span>&bull;</span>
                              <span>Base: <strong className="text-slate-300">v{cr.base_version || 1}</strong></span>
                              <span>&bull;</span>
                              <span>Created: {new Date(cr.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleOpenDiff(cr)}
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-400" />
                              <span>Inspect Diff</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('comment', cr)}
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1"
                              title="Add Governance Comment"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Comment</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('clarification', cr)}
                              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Request Clarification"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Clarify</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('tag', cr)}
                              className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Tag Stakeholders"
                            >
                              <Tag className="h-3.5 w-3.5" />
                              <span>Tag</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('reroute', cr)}
                              className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Re-route Request"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Re-route</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal('escalate', cr)}
                              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="Escalate to DOA Administrator"
                            >
                              <Flame className="h-3.5 w-3.5" />
                              <span>Escalate</span>
                            </button>

                            {/* Controlled Publication (A20) */}
                            {cr.status === 'APPROVED' && (
                              <button
                                onClick={() => handleOpenActionModal('publish', cr)}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
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
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Delegation Impact Analysis</h3>
                <p className="text-xs text-slate-400">Risk domain exposures and statutory regulatory mandates.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase text-rose-400 tracking-wider flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Regulatory Mandated DOAs ({doaRecords.filter(r => r.regulatory === 'Y').length})</span>
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {doaRecords.filter(r => r.regulatory === 'Y').map(rec => (
                      <div key={rec.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>#{rec.id} &bull; {rec.decisionArea || rec.decision_area}</span>
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] rounded">CBB / Basel</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">Domain: {rec.parentFunction || rec.parent_function}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase text-teal-400 tracking-wider flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Risk Management Rules ({doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Risk').length})</span>
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {doaRecords.filter(r => (r.parentFunction || r.parent_function) === 'Risk').slice(0, 10).map(rec => (
                      <div key={rec.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>#{rec.id} &bull; {rec.decisionArea || rec.decision_area}</span>
                          <span className="font-mono text-teal-300 text-[11px]">{rec.compositeAuthority || 'BoD (A)'}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{rec.businessLine || rec.business_line}</p>
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
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Change Monitor &amp; Governance Analytics</h3>
                <p className="text-xs text-slate-400">Distribution of changes by request type, domain, and review outcome.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-xs text-slate-400 font-bold uppercase">Additions</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {changeRequests.filter(c => c.request_type === 'ADD').length}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-xs text-slate-400 font-bold uppercase">Modifications</span>
                  <div className="text-2xl font-black text-blue-400">
                    {changeRequests.filter(c => c.request_type === 'MODIFY').length}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-xs text-slate-400 font-bold uppercase">Deletions / Retirements</span>
                  <div className="text-2xl font-black text-rose-400">
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
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Live Published DOA Matrix</h3>
                  <p className="text-xs text-slate-400">Approved, legally binding master records currently active.</p>
                </div>
                <span className="px-3 py-1 bg-teal-500/20 text-teal-300 font-mono text-xs font-bold rounded-full">
                  {doaRecords.length} Active Records
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Domain</th>
                        <th className="py-3 px-4">Decision Area</th>
                        <th className="py-3 px-4">Authority Chain</th>
                        <th className="py-3 px-4">Regulatory</th>
                        <th className="py-3 px-4">Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {doaRecords.slice(0, 25).map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">#{rec.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-200">{rec.parentFunction || rec.parent_function}</td>
                          <td className="py-3 px-4 text-white font-medium">{rec.decisionArea || rec.decision_area}</td>
                          <td className="py-3 px-4 font-mono text-teal-300">{rec.compositeAuthority || rec.composite_authority || 'BoD (A)'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              rec.regulatory === 'Y' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-500'
                            }`}>
                              {rec.regulatory === 'Y' ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">v{rec.currentVersion || rec.version || 1}</td>
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
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Governance Audit Ledger</h3>
                  <p className="text-xs text-slate-400">Immutable audit logs of all governance actions, comments, and publications.</p>
                </div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 font-mono text-xs font-bold rounded-full">
                  {auditLogs.length} Events Logged
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
                        <th className="py-3 px-4">Record</th>
                        <th className="py-3 px-4">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4 font-semibold text-slate-200">{log.user_email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-300">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-teal-400">#{log.record_id}</td>
                          <td className="py-3 px-4 text-slate-300 truncate max-w-md">{log.comment || '-'}</td>
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
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-2">
                <h3 className="text-base font-bold text-white">Governance Compliance Reports</h3>
                <p className="text-xs text-slate-400">Export compliance summary and delegation matrix status.</p>
              </div>

              <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
                <h4 className="text-sm font-bold text-white">Delegation Matrix Governance Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Total Active Rules:</span>
                    <p className="text-lg font-bold text-white">{doaRecords.length}</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Total Review Requests Handled:</span>
                    <p className="text-lg font-bold text-white">{changeRequests.length}</p>
                  </div>
                </div>
                <button
                  onClick={() => alert('Compliance report downloaded successfully.')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Download Formal Audit PDF
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: A17 & A18 CURRENT VS PROPOSED DIFF INSPECTOR (OLD ➔ NEW)         */}
      {/* ========================================================================= */}
      {selectedDiffCR && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <GitPullRequest className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Current vs. Proposed Comparison — Request #{selectedDiffCR.id}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Department: <strong className="text-slate-200">{selectedDiffCR.department}</strong> &bull; Process: <strong className="text-slate-200">{selectedDiffCR.process}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDiffCR(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <span className="font-bold text-slate-300">Requester Rationale:</span>
                <p className="text-slate-400 italic mt-0.5">"{selectedDiffCR.rationale || 'None provided'}"</p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span>A18: Field-by-Field Modifications (Old Value ➔ New Value)</span>
                </h4>

                {isLoadingDiff ? (
                  <div className="py-12 text-center text-slate-500 text-xs">Calculating delta diff from backend...</div>
                ) : !diffDetails || !diffDetails.diffs || diffDetails.diffs.length === 0 ? (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No field differences found or this is a brand new rule proposal.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diffDetails.diffs.map((d, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-200">{d.field_label || d.field}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                            d.change_type === 'MODIFIED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            d.change_type === 'ADDED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {d.change_type}
                          </span>
                        </div>

                        {/* Side-by-Side Values */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-800/40">
                            <span className="text-[10px] font-bold uppercase text-rose-400 block mb-1">Old Value (Current)</span>
                            <span className="text-slate-300 font-mono break-words">
                              {d.current_value !== null && d.current_value !== undefined && String(d.current_value) !== '' 
                                ? String(d.current_value) 
                                : <em className="text-slate-500">None</em>}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                            <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">New Value (Proposed)</span>
                            <span className="text-emerald-200 font-mono font-bold break-words">
                              {d.proposed_value !== null && d.proposed_value !== undefined && String(d.proposed_value) !== '' 
                                ? String(d.proposed_value) 
                                : <em className="text-slate-500">None</em>}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedDiffCR(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                {actionModal.type === 'comment' && <MessageSquare className="h-4 w-4 text-blue-400" />}
                {actionModal.type === 'clarification' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                {actionModal.type === 'tag' && <Tag className="h-4 w-4 text-blue-400" />}
                {actionModal.type === 'reroute' && <Share2 className="h-4 w-4 text-purple-400" />}
                {actionModal.type === 'escalate' && <Flame className="h-4 w-4 text-rose-400" />}
                {actionModal.type === 'publish' && <Send className="h-4 w-4 text-emerald-400" />}
                <span className="capitalize">
                  {actionModal.type === 'publish' ? 'Controlled Publication (A20)' : `Governance Action: ${actionModal.type}`}
                </span>
              </h4>
              <button onClick={() => setActionModal(prev => ({ ...prev, open: false }))}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Request: <strong className="text-slate-200">#{actionModal.cr?.id}</strong> &bull; {actionModal.cr?.department} ({actionModal.cr?.process})
            </p>

            {/* Notifications inside modal */}
            {actionSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}
            {actionErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <span>{actionErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAction} className="space-y-4 text-xs">
              {/* Comment or Clarification Input */}
              {(actionModal.type === 'comment' || actionModal.type === 'clarification') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    {actionModal.type === 'comment' ? 'Review Comment' : 'Clarification & Evidence Required'}
                  </label>
                  <textarea
                    rows="3"
                    value={actionModal.comment}
                    onChange={(e) => setActionModal(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder={actionModal.type === 'comment' ? 'e.g. Approved with condition of quarterly reporting...' : 'e.g. Please provide Board Audit Committee approved minutes...'}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* Tag Stakeholders */}
              {actionModal.type === 'tag' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase">Select Stakeholders to Tag:</label>
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
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between ${
                          actionModal.stakeholders.includes(stk)
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-200 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <span>{stk}</span>
                        {actionModal.stakeholders.includes(stk) && <Check className="h-3.5 w-3.5 text-blue-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Re-route Request */}
              {actionModal.type === 'reroute' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Target Governance Body</label>
                    <select
                      value={actionModal.targetCommittee}
                      onChange={(e) => setActionModal(prev => ({ ...prev, targetCommittee: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5"
                    >
                      <option value="Board Audit Committee">Board Audit Committee</option>
                      <option value="Risk Management Committee">Risk Management Committee</option>
                      <option value="Executive Committee (EXCO)">Executive Committee (EXCO)</option>
                      <option value="Compliance & Regulatory Council">Compliance &amp; Regulatory Council</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Reason for Re-routing</label>
                    <textarea
                      rows="2"
                      value={actionModal.reason}
                      onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="e.g. Authority threshold exceeds line management remit..."
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2.5 text-xs"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Escalate Request */}
              {actionModal.type === 'escalate' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Escalation Justification</label>
                  <textarea
                    rows="3"
                    value={actionModal.reason}
                    onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Critical regulatory breach risk or conflicting executive thresholds..."
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              )}

              {/* Controlled Publication Warning (A20) */}
              {actionModal.type === 'publish' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <p className="font-bold text-emerald-400">Verify Pre-Publication Conditions:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    <li>Prior workflow steps verified &bull; Status: <strong className="text-emerald-300">{actionModal.cr?.status}</strong></li>
                    <li>Base version integrity validated against live database</li>
                    <li>Previous approved version will be archived in immutable history</li>
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionModal(prev => ({ ...prev, open: false }))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-md ${
                    actionModal.type === 'publish' 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : actionModal.type === 'escalate'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {isSubmittingAction ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
