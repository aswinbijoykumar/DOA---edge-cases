import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3, 
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
  Check,
  X,
  MessageSquare,
  Bell,
  Trash2,
  SlidersHorizontal,
  Info,
  History,
  CornerDownRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function UnifiedDoaUserDashboard({
  userStats,
  currentUser,
  kpis,
  onNavigateTab,
  onInspectCR,
  onRefreshData
}) {
  // Check RBAC permissions for the unified model
  const canRequest = currentUser?.can_request ?? true;
  const canReview = (
    currentUser?.can_review || 
    ['REVIEWER', 'APPROVER'].includes(currentUser?.persona_type) ||
    ['ADMIN', 'GOVERNANCE_TEAM', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(currentUser?.role)
  );

  // Active top-level subtab in the Unified DOA User Dashboard:
  // 'dashboard' | 'my_requests' | 'create_request' | 'review_queue' | 'clarifications' | 'notifications' | 'history' | 'reports' | 'designations'
  const [activeTab, setActiveTab] = useState(canReview && !canRequest ? 'review_queue' : 'dashboard');

  // Local state for Requests, Drafts, and Queue
  const [myRequests, setMyRequests] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  // Filters
  const [myRequestStatusFilter, setMyRequestStatusFilter] = useState('ALL');
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL');
  const [queueSearch, setQueueSearch] = useState('');

  // Selected Request for Full View / Clarification modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Diff inspection modal
  const [diffData, setDiffData] = useState(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // Clarification Inquiry / Response Form State
  const [clarificationModal, setClarificationModal] = useState({
    isOpen: false,
    mode: 'INQUIRY', // 'INQUIRY' (Reviewer) or 'RESPONSE' (Requestor)
    cr: null,
    message: '',
    attachmentUrl: ''
  });

  // Reviewer Comment / Feedback Modal State
  const [commentModal, setCommentModal] = useState({
    isOpen: false,
    cr: null,
    comment: '',
    operational_comments: ''
  });

  // Reviewer Formal Recommendation Modal State (Recommend Approval / Recommend Rejection)
  const [recommendationModal, setRecommendationModal] = useState({
    isOpen: false,
    cr: null,
    recommendation: 'RECOMMEND_APPROVAL', // 'RECOMMEND_APPROVAL' or 'RECOMMEND_REJECTION'
    notes: '',
    operational_comments: ''
  });

  // Decision Modal State (Approve / Reject) for Approver personas / Admins
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    action: 'APPROVE', // 'APPROVE' or 'REJECT'
    cr: null,
    comment: ''
  });

  // Form State for Create / Edit Request
  const [formData, setFormData] = useState({
    id: null, // if editing draft
    request_type: 'MODIFY', // ADD, MODIFY, DELETE
    doa_id: '',
    department: currentUser?.department || 'Operations',
    process: 'Procure-to-Pay (P2P)',
    decision_area: '',
    currency: 'USD',
    current_limit: '100,000',
    proposed_limit: '250,000',
    effective_date: '2026-04-01',
    priority: 'MEDIUM',
    due_date: '2026-04-15',
    rationale: '',
    risk_impact: '',
    operational_impact: '',
    proposed_value: {},
    attachments: []
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Management Reports State
  const [selectedReportType, setSelectedReportType] = useState('active_by_dept');
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Designation Matrix State
  const [selectedDesignationKey, setSelectedDesignationKey] = useState('ceo');
  const [designationMatrixData, setDesignationMatrixData] = useState(null);
  const [isLoadingDesignation, setIsLoadingDesignation] = useState(false);

  // Load Requestor & Reviewer Data
  const loadUserData = async () => {
    if (!currentUser) return;
    setIsLoadingRequests(true);
    try {
      if (canRequest) {
        const res = await api.getMyRequests();
        setMyRequests(res || []);
      }
      if (canReview) {
        const queueRes = await api.getReviewerQueue();
        setReviewQueue(queueRes || []);
      }
      const notifsRes = await api.getNotifications();
      if (Array.isArray(notifsRes)) {
        setNotifications(notifsRes);
        setUnreadNotifsCount(notifsRes.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.warn('Error loading unified user data:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser?.id, canRequest, canReview]);

  // Toast feedback helper
  const showFeedback = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 5000);
  };

  // Helper: Open Diff Inspection
  const handleOpenDiff = async (cr) => {
    setIsLoadingDiff(true);
    setSelectedRequest(cr);
    try {
      const diff = await api.getChangeRequestDiff(cr.id);
      setDiffData(diff);
      setIsDetailsModalOpen(true);
    } catch (e) {
      showFeedback(`Failed to load comparison: ${e.message}`, 'error');
    } finally {
      setIsLoadingDiff(false);
    }
  };

  // Helper: Open Request Details
  const handleOpenDetails = async (cr) => {
    try {
      const fullCr = await api.getChangeRequest(cr.id);
      setSelectedRequest(fullCr);
      setIsDetailsModalOpen(true);
    } catch (e) {
      setSelectedRequest(cr);
      setIsDetailsModalOpen(true);
    }
  };

  // ==========================================
  // REQUESTOR ACTIONS
  // ==========================================

  // Save Draft
  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    setIsSubmittingForm(true);
    try {
      const payload = {
        request_type: formData.request_type,
        doa_id: formData.doa_id || null,
        department: formData.department,
        process: formData.process,
        rationale: formData.rationale || 'Draft authority revision',
        currency: formData.currency,
        current_limit: formData.current_limit,
        proposed_limit: formData.proposed_limit,
        effective_date: formData.effective_date,
        priority: formData.priority,
        due_date: formData.due_date,
        risk_impact: formData.risk_impact,
        operational_impact: formData.operational_impact,
        proposed_value: {
          decision_area: formData.decision_area,
          department: formData.department,
          process_name: formData.process,
          currency: formData.currency,
          proposed_limit: formData.proposed_limit,
          effective_date: formData.effective_date
        },
        attachments: formData.attachments
      };

      if (formData.id) {
        await api.updateChangeRequest(formData.id, payload);
        showFeedback(`Draft #${formData.id} updated successfully!`, 'success');
      } else {
        const res = await api.saveDraft(payload);
        showFeedback(`New Draft #${res.id} saved successfully!`, 'success');
      }
      resetForm();
      loadUserData();
      setActiveTab('my_requests');
    } catch (err) {
      showFeedback(`Failed to save draft: ${err.message}`, 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Submit Request (New or from Form)
  const handleSubmitRequest = async (e) => {
    if (e) e.preventDefault();
    if (!formData.decision_area && formData.request_type !== 'DELETE') {
      showFeedback('Decision Area / Authority description is required', 'error');
      return;
    }
    setIsSubmittingForm(true);
    try {
      const payload = {
        request_type: formData.request_type,
        doa_id: formData.doa_id || null,
        department: formData.department,
        process: formData.process,
        rationale: formData.rationale || 'Proposed DOA adjustment',
        currency: formData.currency,
        current_limit: formData.current_limit,
        proposed_limit: formData.proposed_limit,
        effective_date: formData.effective_date,
        priority: formData.priority,
        due_date: formData.due_date,
        risk_impact: formData.risk_impact,
        operational_impact: formData.operational_impact,
        proposed_value: {
          decision_area: formData.decision_area,
          department: formData.department,
          process_name: formData.process,
          currency: formData.currency,
          proposed_limit: formData.proposed_limit,
          effective_date: formData.effective_date
        },
        attachments: formData.attachments
      };

      if (formData.id) {
        // Update first then submit
        await api.updateChangeRequest(formData.id, payload);
        await api.submitDraft(formData.id);
        showFeedback(`Request #${formData.id} submitted into the Review Queue!`, 'success');
      } else {
        const res = await api.createChangeRequest(payload);
        showFeedback(`Request #${res.id} created and submitted into the Review Queue!`, 'success');
      }
      resetForm();
      loadUserData();
      setActiveTab('my_requests');
    } catch (err) {
      showFeedback(`Failed to submit request: ${err.message}`, 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Resume / Edit Draft
  const handleEditDraft = (cr) => {
    setFormData({
      id: cr.id,
      request_type: cr.request_type,
      doa_id: cr.doa_id || '',
      department: cr.department || '',
      process: cr.process || '',
      decision_area: cr.proposed_value?.decision_area || cr.proposed_value?.decisionArea || '',
      currency: cr.currency || 'USD',
      current_limit: cr.current_limit || '',
      proposed_limit: cr.proposed_limit || '',
      effective_date: cr.effective_date || '',
      priority: cr.priority || 'MEDIUM',
      due_date: cr.due_date || '',
      rationale: cr.rationale || '',
      risk_impact: cr.risk_impact || '',
      operational_impact: cr.operational_impact || '',
      proposed_value: cr.proposed_value || {},
      attachments: cr.attachments || []
    });
    setActiveTab('create_request');
  };

  // Submit an existing Draft directly
  const handleDirectSubmitDraft = async (crId) => {
    try {
      await api.submitDraft(crId);
      showFeedback(`Draft #${crId} submitted successfully!`, 'success');
      loadUserData();
    } catch (err) {
      showFeedback(`Submit failed: ${err.message}`, 'error');
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (crId) => {
    if (!window.confirm(`Are you sure you want to permanently delete draft #${crId}?`)) return;
    try {
      await api.deleteDraft(crId);
      showFeedback(`Draft #${crId} was deleted.`, 'info');
      loadUserData();
    } catch (err) {
      showFeedback(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      id: null,
      request_type: 'MODIFY',
      doa_id: '',
      department: currentUser?.department || 'Operations',
      process: 'Procure-to-Pay (P2P)',
      decision_area: '',
      currency: 'USD',
      current_limit: '',
      proposed_limit: '',
      effective_date: '2026-04-01',
      priority: 'MEDIUM',
      due_date: '',
      rationale: '',
      risk_impact: '',
      operational_impact: '',
      proposed_value: {},
      attachments: []
    });
  };

  // ==========================================
  // REVIEWER ACTIONS
  // ==========================================

  // Initiate Review
  const handleStartReview = async (crId) => {
    try {
      await api.startReview(crId);
      showFeedback(`Review initiated on #${crId}. Status moved to UNDER_REVIEW.`, 'info');
      loadUserData();
    } catch (err) {
      showFeedback(`Could not start review: ${err.message}`, 'error');
    }
  };

  // Open Reviewer Comment Modal
  const openCommentModal = (cr) => {
    setCommentModal({
      isOpen: true,
      cr,
      comment: cr.reviewer_comments || '',
      operational_comments: cr.operational_comments || ''
    });
  };

  // Submit Reviewer Comment & Feedback
  const handleSendComment = async () => {
    const { cr, comment, operational_comments } = commentModal;
    if (!comment.trim()) {
      showFeedback('Please provide review notes or feedback comments.', 'error');
      return;
    }
    try {
      await api.addReviewerComment(cr.id, comment, operational_comments);
      showFeedback(`Review feedback & operational notes recorded on #${cr.id}.`, 'success');
      setCommentModal({ isOpen: false, cr: null, comment: '', operational_comments: '' });
      setIsDetailsModalOpen(false);
      loadUserData();
    } catch (err) {
      showFeedback(`Failed to save review comments: ${err.message}`, 'error');
    }
  };

  // Open Formal Recommendation Modal (Recommend Approval / Recommend Rejection)
  const openRecommendationModal = (cr, recommendation = 'RECOMMEND_APPROVAL') => {
    if (cr.requester_id === currentUser?.id) {
      showFeedback('Segregation of Duties Policy: You cannot review or recommend on your own request.', 'error');
      return;
    }
    setRecommendationModal({
      isOpen: true,
      cr,
      recommendation,
      notes: cr.reviewer_comments || '',
      operational_comments: cr.operational_comments || ''
    });
  };

  // Submit Formal Recommendation (Guides Final Approver)
  const handleSendRecommendation = async () => {
    const { cr, recommendation, notes, operational_comments } = recommendationModal;
    if (!notes.trim()) {
      showFeedback('Obligatory recommendation rationale notes are required.', 'error');
      return;
    }
    try {
      await api.submitReviewerRecommendation(cr.id, recommendation, notes, operational_comments);
      showFeedback(
        `Formal recommendation (${recommendation === 'RECOMMEND_APPROVAL' ? 'Recommend Approval' : 'Recommend Rejection'}) submitted for Request #${cr.id}!`,
        'success'
      );
      setRecommendationModal({ isOpen: false, cr: null, recommendation: 'RECOMMEND_APPROVAL', notes: '', operational_comments: '' });
      setIsDetailsModalOpen(false);
      loadUserData();
    } catch (err) {
      if (err.status === 403) {
        showFeedback(`Segregation of Duties Violation (403): ${err.data?.detail || err.message}`, 'error');
      } else {
        showFeedback(`Failed to submit recommendation: ${err.message}`, 'error');
      }
    }
  };

  // Trigger Final Decision Confirmation (Approve or Reject for APPROVER / ADMIN roles)
  const openDecisionModal = (cr, action) => {
    // Segregation of Duties Check: Front-end warning
    if (cr.requester_id === currentUser?.id) {
      showFeedback('Segregation of Duties Policy: You cannot approve or reject your own request.', 'error');
      return;
    }
    setDecisionModal({
      isOpen: true,
      action,
      cr,
      comment: ''
    });
  };

  // Confirm Decision (Approve / Reject) with Backend Enforcement
  const handleConfirmDecision = async () => {
    const { action, cr, comment } = decisionModal;
    if (!comment.trim()) {
      showFeedback('Obligatory rationale comment is required.', 'error');
      return;
    }
    try {
      if (action === 'APPROVE') {
        await api.approveChangeRequest(cr.id, comment);
        showFeedback(`Change Request #${cr.id} APPROVED successfully!`, 'success');
      } else {
        await api.rejectChangeRequest(cr.id, comment);
        showFeedback(`Change Request #${cr.id} REJECTED with recorded rationale.`, 'info');
      }
      setDecisionModal({ isOpen: false, action: 'APPROVE', cr: null, comment: '' });
      setIsDetailsModalOpen(false);
      loadUserData();
    } catch (err) {
      if (err.status === 403) {
        showFeedback(`Segregation of Duties Violation (403): ${err.data?.detail || err.message}`, 'error');
      } else {
        showFeedback(`Decision failed: ${err.message}`, 'error');
      }
    }
  };

  // Clarifications
  const openClarificationModal = (cr, mode) => {
    setClarificationModal({
      isOpen: true,
      mode,
      cr,
      message: '',
      attachmentUrl: ''
    });
  };

  const handleSendClarification = async () => {
    const { mode, cr, message, attachmentUrl } = clarificationModal;
    if (!message.trim()) {
      showFeedback('Please enter a clarification message.', 'error');
      return;
    }
    const attachments = attachmentUrl ? [{ name: 'Document Evidence', url: attachmentUrl }] : [];

    try {
      if (mode === 'INQUIRY') {
        await api.requestClarification(cr.id, message, attachments);
        showFeedback(`Clarification request sent to requestor for #${cr.id}!`, 'info');
      } else {
        await api.respondClarification(cr.id, message, attachments);
        showFeedback(`Clarification response posted! Request #${cr.id} returned to Review Queue.`, 'success');
      }
      setClarificationModal({ isOpen: false, mode: 'INQUIRY', cr: null, message: '', attachmentUrl: '' });
      setIsDetailsModalOpen(false);
      loadUserData();
    } catch (err) {
      showFeedback(`Clarification failed: ${err.message}`, 'error');
    }
  };

  // Mark Notification Read
  const handleReadNotification = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadNotifsCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  // Management Reports fetch
  const fetchReport = async (type) => {
    setIsLoadingReport(true);
    try {
      const res = await api.getManagementReports(type);
      setReportData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Designation Matrix fetch
  const fetchDesignationMatrix = async (key) => {
    setIsLoadingDesignation(true);
    try {
      const res = await api.getDesignationMatrix(key);
      setDesignationMatrixData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDesignation(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReport(selectedReportType);
    } else if (activeTab === 'designations') {
      fetchDesignationMatrix(selectedDesignationKey);
    }
  }, [activeTab, selectedReportType, selectedDesignationKey]);

  // Filtered requests lists
  const filteredMyRequests = useMemo(() => {
    if (myRequestStatusFilter === 'ALL') return myRequests;
    return myRequests.filter(r => r.status === myRequestStatusFilter);
  }, [myRequests, myRequestStatusFilter]);

  const filteredQueue = useMemo(() => {
    return reviewQueue.filter(r => {
      const matchesStatus = queueStatusFilter === 'ALL' || r.status === queueStatusFilter;
      const matchesSearch = !queueSearch || 
        r.id.toLowerCase().includes(queueSearch.toLowerCase()) ||
        (r.requester_email && r.requester_email.toLowerCase().includes(queueSearch.toLowerCase())) ||
        (r.department && r.department.toLowerCase().includes(queueSearch.toLowerCase())) ||
        (r.process && r.process.toLowerCase().includes(queueSearch.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [reviewQueue, queueStatusFilter, queueSearch]);

  // Pending clarifications for Requestor
  const pendingClarifications = useMemo(() => {
    return myRequests.filter(r => r.status === 'CLARIFICATION_REQUIRED');
  }, [myRequests]);

  // Reviewer queue statistics
  const reviewerStats = useMemo(() => {
    const incoming = reviewQueue.filter(r => r.status === 'SUBMITTED').length;
    const underReview = reviewQueue.filter(r => r.status === 'UNDER_REVIEW').length;
    const clarification = reviewQueue.filter(r => r.status === 'CLARIFICATION_REQUIRED').length;
    const approved = reviewQueue.filter(r => r.status === 'APPROVED').length;
    const rejected = reviewQueue.filter(r => r.status === 'REJECTED').length;
    return { incoming, underReview, clarification, approved, rejected, total: reviewQueue.length };
  }, [reviewQueue]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Toast Feedback Notification */}
      {actionMessage.text && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-fade-in ${
          actionMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          actionMessage.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
          'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'error' ? <AlertCircle className="h-4 w-4 text-rose-600" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage({ text: '', type: '' })} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner: Dynamic Multi-Permission Persona Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
                DOA Unified User Portal
              </span>
              {canRequest && (
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-extrabold uppercase">
                  Requestor Permission
                </span>
              )}
              {canReview && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase">
                  Reviewer Permission
                </span>
              )}
              {canRequest && canReview && (
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase">
                  Dual Permissions (SoD Enforced)
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Welcome back, {currentUser?.full_name || 'Stakeholder'}</span>
              <Sparkles className="h-5 w-5 text-teal-400" />
            </h2>
            <p className="text-slate-300 text-xs max-w-2xl">
              {canRequest && canReview
                ? 'You have dual capabilities: create, modify, and track your departmental requests, and review eligible incoming proposals from other stakeholders with strict segregation-of-duties enforcement.'
                : canReview
                ? 'You have Reviewer oversight: inspect incoming proposals, conduct field comparisons, request clarifications, and issue binding approval or rejection decisions.'
                : 'You have Requestor authority: draft, submit, and track changes to financial signing limits and delegation rules.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            {canRequest && (
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('create_request');
                }}
                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-teal-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Create Request</span>
              </button>
            )}
            <button
              onClick={loadUserData}
              title="Refresh Portal Data"
              className="p-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Unified Portal Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-1.5 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Layers },
            ...(canRequest ? [
              { id: 'my_requests', label: 'My Requests', icon: FileText, badge: myRequests.length },
              { id: 'create_request', label: formData.id ? 'Edit Draft' : 'Create Request', icon: Plus },
              { id: 'drafts', label: 'Drafts', icon: Edit3, badge: myRequests.filter(r => r.status === 'DRAFT').length }
            ] : []),
            ...(canReview ? [
              { id: 'review_queue', label: 'Review Queue', icon: CheckSquare, badge: reviewQueue.filter(r => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length, highlight: true }
            ] : []),
            { id: 'clarifications', label: 'Clarifications', icon: MessageSquare, badge: pendingClarifications.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount },
            { id: 'history', label: 'Request History', icon: History },
            { id: 'reports', label: 'Reports / Downloads', icon: FileSpreadsheet },
            { id: 'designations', label: 'Designation Matrix', icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-slate-950' : 'text-teal-400'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-slate-950 text-teal-300' : 'bg-teal-500/20 text-teal-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. UNIFIED DASHBOARD TAB */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {canRequest && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">My Authored Requests</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 mt-2">{myRequests.length}</div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Drafts: {myRequests.filter(r => r.status === 'DRAFT').length}</span>
                  <span className="font-semibold text-blue-600 cursor-pointer" onClick={() => setActiveTab('my_requests')}>View &rarr;</span>
                </div>
              </div>
            )}

            {canReview && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">Incoming Review Queue</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 mt-2">
                  {reviewQueue.filter(r => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Eligible reviews from others</span>
                  <span className="font-semibold text-emerald-600 cursor-pointer" onClick={() => setActiveTab('review_queue')}>Open &rarr;</span>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Clarification Required</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600 mt-2">
                {myRequests.filter(r => r.status === 'CLARIFICATION_REQUIRED').length}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
                <span>Requires author response</span>
                <span className="font-semibold text-amber-600 cursor-pointer" onClick={() => setActiveTab('clarifications')}>Reply &rarr;</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Approved Authorities</span>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-teal-600 mt-2">
                {myRequests.filter(r => r.status === 'APPROVED' || r.status === 'PUBLISHED').length}
              </div>
              <div className="text-[11px] text-teal-700 mt-1">
                Active in Master Matrix
              </div>
            </div>
          </div>

          {/* Quick Action & Overview Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Recent Activity & Quick Requests */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Recent Request Activity</h3>
                  <p className="text-xs text-slate-400">Your authored requests and current workflow progress</p>
                </div>
                {canRequest && (
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('create_request');
                    }}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    + New Request
                  </button>
                )}
              </div>

              {myRequests.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No requests authored yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click below to draft your first authority change request.</p>
                  {canRequest && (
                    <button
                      onClick={() => {
                        resetForm();
                        setActiveTab('create_request');
                      }}
                      className="mt-3 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold"
                    >
                      Create Request
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myRequests.slice(0, 5).map(cr => (
                    <div key={cr.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">#{cr.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            cr.request_type === 'ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            cr.request_type === 'MODIFY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {cr.request_type}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {cr.department} &bull; {cr.process}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 italic truncate">
                          "{cr.proposed_value?.decision_area || cr.rationale || 'Change Request'}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          cr.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                          cr.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          cr.status === 'UNDER_REVIEW' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          cr.status === 'CLARIFICATION_REQUIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          cr.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          cr.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {cr.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleOpenDetails(cr)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Segregation-of-Duties Callout & Review Queue Quick Peek */}
            <div className="lg:col-span-4 space-y-4">
              {/* SoD Rule Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  <h4 className="font-extrabold text-xs tracking-wider uppercase text-amber-300">
                    Segregation of Duties (SoD)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enterprise governance requires strict 4-eye separation. If you have both <strong>Requestor</strong> and <strong>Reviewer</strong> permissions:
                </p>
                <div className="bg-black/20 rounded-xl p-3 text-[11px] text-slate-200 space-y-1.5 border border-white/5">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Check className="h-3.5 w-3.5" /> You can create &amp; manage your own proposals.
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-300">
                    <Check className="h-3.5 w-3.5" /> You can review eligible requests from others.
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                    <X className="h-3.5 w-3.5" /> You CANNOT approve or reject your own request.
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Enforced on the backend API layer with HTTP 403 Forbidden.
                </p>
              </div>

              {/* Reviewer Quick Glance */}
              {canReview && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Incoming Reviews ({reviewerStats.incoming})
                    </span>
                    <button onClick={() => setActiveTab('review_queue')} className="text-xs font-bold text-teal-600 hover:text-teal-700">
                      Open Queue &rarr;
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Awaiting Review</span>
                      <div className="text-lg font-black text-amber-800">{reviewerStats.incoming}</div>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">Under Review</span>
                      <div className="text-lg font-black text-indigo-800">{reviewerStats.underReview}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MY REQUESTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'my_requests' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">My DOA Change Requests</h3>
              <p className="text-xs text-slate-500">Track and manage all delegation change requests authored by you</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('create_request');
                }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> New Request
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED', 'APPROVED', 'REJECTED', 'PUBLISHED'].map(st => (
              <button
                key={st}
                onClick={() => setMyRequestStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  myRequestStatusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
                {st === 'ALL' && ` (${myRequests.length})`}
                {st !== 'ALL' && ` (${myRequests.filter(r => r.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Requests Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">CR ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Department &bull; Process</th>
                  <th className="py-3 px-4">Limit (Current &rarr; Proposed)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMyRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No requests found under status "{myRequestStatusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredMyRequests.map(cr => (
                    <tr key={cr.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{cr.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          cr.request_type === 'ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          cr.request_type === 'MODIFY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {cr.request_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{cr.department}</span>
                        <span className="text-[11px] text-slate-500">{cr.process}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-600 text-xs">
                          {cr.current_limit ? `${cr.currency || 'USD'} ${cr.current_limit}` : 'N/A'}
                        </span>
                        <span className="text-slate-400 mx-1.5">&rarr;</span>
                        <span className="font-mono font-bold text-teal-700 text-xs">
                          {cr.proposed_limit ? `${cr.currency || 'USD'} ${cr.proposed_limit}` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          cr.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                          cr.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          cr.status === 'UNDER_REVIEW' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          cr.status === 'CLARIFICATION_REQUIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          cr.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          cr.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {cr.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(cr)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleOpenDiff(cr)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold"
                          >
                            Diff
                          </button>

                          {/* Draft Actions */}
                          {cr.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleEditDraft(cr)}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDirectSubmitDraft(cr.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                              >
                                Submit
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(cr.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
                                title="Delete Draft"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {/* Clarification Response Action */}
                          {cr.status === 'CLARIFICATION_REQUIRED' && (
                            <button
                              onClick={() => openClarificationModal(cr, 'RESPONSE')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold animate-pulse"
                            >
                              Respond
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DRAFTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'drafts' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Drafts Management</h3>
              <p className="text-xs text-slate-500">Edit, resume, or delete your unpublished authority change proposals</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setActiveTab('create_request');
              }}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
            >
              + Create New Draft
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myRequests.filter(r => r.status === 'DRAFT').length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400">
                <Edit3 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No saved drafts.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Use "Save as Draft" when creating a request to resume later.</p>
              </div>
            ) : (
              myRequests.filter(r => r.status === 'DRAFT').map(draft => (
                <div key={draft.id} className="border border-slate-200 rounded-2xl p-5 hover:border-teal-400 transition-all space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-900">#{draft.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 text-slate-700">
                      {draft.request_type}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      {draft.proposed_value?.decision_area || draft.rationale || 'Untitled Draft'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {draft.department} &bull; {draft.process} &bull; Limit: {draft.currency || 'USD'} {draft.proposed_limit || 'N/A'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Saved: {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleEditDraft(draft)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold"
                      >
                        Edit / Resume
                      </button>
                      <button
                        onClick={() => handleDirectSubmitDraft(draft.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE / EDIT REQUEST TAB */}
      {/* ========================================================================= */}
      {activeTab === 'create_request' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-[10px] font-extrabold uppercase">
                  {formData.id ? `Editing Draft #${formData.id}` : 'New Authority Request'}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                {formData.id ? 'Modify & Submit Draft Proposal' : 'Propose Delegation of Authority Change'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit an authority change with full limit thresholds, business justifications, and optional supporting documents.
              </p>
            </div>
            {formData.id && (
              <button
                onClick={resetForm}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Clear / New Request
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-6">
            
            {/* Request Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Request Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'ADD', label: 'New Authority', desc: 'Create a brand new signing rule' },
                  { type: 'MODIFY', label: 'Modify Authority', desc: 'Adjust existing limits or roles' },
                  { type: 'DELETE', label: 'Delete / Retire Authority', desc: 'Decommission an obsolete rule' }
                ].map(item => (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => setFormData(prev => ({ ...prev, request_type: item.type }))}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      formData.request_type === item.type
                        ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-teal-300 bg-slate-50/40'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-900 block">{item.label}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target DOA ID (for MODIFY / DELETE) */}
            {formData.request_type !== 'ADD' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Target Authority / Record ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 225 or 104"
                  value={formData.doa_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, doa_id: e.target.value }))}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}

            {/* Department & Process */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Department / Function
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                >
                  <option value="Finance & Treasury">Finance & Treasury</option>
                  <option value="Supply Chain & Procurement">Supply Chain & Procurement</option>
                  <option value="Commercial Operations">Commercial Operations</option>
                  <option value="Enterprise Risk Management">Enterprise Risk Management</option>
                  <option value="Legal & Governance">Legal & Governance</option>
                  <option value="Information Technology">Information Technology</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Process Workflow
                </label>
                <select
                  value={formData.process}
                  onChange={(e) => setFormData(prev => ({ ...prev, process: e.target.value }))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                >
                  <option value="Procure-to-Pay (P2P)">Procure-to-Pay (P2P)</option>
                  <option value="Capital Expenditure (Capex)">Capital Expenditure (Capex)</option>
                  <option value="Treasury & FX Operations">Treasury & FX Operations</option>
                  <option value="Credit & Underwriting Commitments">Credit & Underwriting Commitments</option>
                  <option value="Corporate Governance & Board Mandates">Corporate Governance & Board Mandates</option>
                </select>
              </div>
            </div>

            {/* Decision Area / Authority Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Decision Area / Authority Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Approve single obligor credit facilities for corporate borrowers above threshold limit..."
                value={formData.decision_area}
                onChange={(e) => setFormData(prev => ({ ...prev, decision_area: e.target.value }))}
                required={formData.request_type !== 'DELETE'}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Approval Limits & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="BHD">BHD (BD)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (AED)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Current Limit</label>
                <input
                  type="text"
                  placeholder="e.g. 100,000"
                  value={formData.current_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_limit: e.target.value }))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Proposed Limit</label>
                <input
                  type="text"
                  placeholder="e.g. 250,000"
                  value={formData.proposed_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, proposed_limit: e.target.value }))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Effective Date</label>
                <input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                />
              </div>
            </div>

            {/* Justification, Risk & SLA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Business Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="State the commercial or operational business justification for this authority change..."
                  value={formData.rationale}
                  onChange={(e) => setFormData(prev => ({ ...prev, rationale: e.target.value }))}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Risk &amp; Impact Assessment
                </label>
                <textarea
                  rows={3}
                  placeholder="Identify regulatory implications, liquidity/counterparty impact, or mitigation controls..."
                  value={formData.risk_impact}
                  onChange={(e) => setFormData(prev => ({ ...prev, risk_impact: e.target.value }))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Priority / Impact</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 bg-slate-50"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH (Urgent SLA)</option>
                  <option value="CRITICAL">CRITICAL (Executive Committee Escalation)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Review Target Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-white"
                />
              </div>
            </div>

            {/* Action Buttons: Save Draft vs Submit Request */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmittingForm}
                className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={isSubmittingForm}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{formData.id ? 'Submit Updated Request' : 'Submit for Review'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REVIEWER QUEUE TAB (Reviewer Permission Only) */}
      {/* ========================================================================= */}
      {activeTab === 'review_queue' && canReview && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[10px] font-extrabold uppercase">
                  Reviewer Queue
                </span>
                <span className="text-xs text-slate-500">&bull; Segregation-of-Duties Active</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1">Incoming Authority Reviews</h3>
              <p className="text-xs text-slate-500">
                Review, compare Current vs Proposed limits, request clarifications, and approve or reject submissions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search queue..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white w-48"
              />
              <button
                onClick={loadUserData}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
          </div>

          {/* Reviewer Status Filters */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED', 'APPROVED', 'REJECTED'].map(st => (
              <button
                key={st}
                onClick={() => setQueueStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  queueStatusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
                {st === 'ALL' && ` (${reviewQueue.length})`}
                {st !== 'ALL' && ` (${reviewQueue.filter(r => r.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Queue Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">CR ID</th>
                  <th className="py-3 px-4">Requestor</th>
                  <th className="py-3 px-4">Department &bull; Process</th>
                  <th className="py-3 px-4">Priority / SLA</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Reviewer Recommendation</th>
                  <th className="py-3 px-4 text-center">Reviewer Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No review requests pending in this view.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map(cr => {
                    const isOwnRequest = cr.requester_id === currentUser?.id;
                    const canAct = !isOwnRequest && ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'].includes(cr.status);

                    return (
                      <tr key={cr.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          #{cr.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block truncate max-w-[160px]">
                            {cr.requester_email}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(cr.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">{cr.department}</span>
                          <span className="text-[11px] text-slate-500">{cr.process}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            cr.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                            cr.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {cr.priority || 'MEDIUM'}
                          </span>
                          {cr.due_date && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Due: {cr.due_date}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            cr.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            cr.status === 'UNDER_REVIEW' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            cr.status === 'CLARIFICATION_REQUIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            cr.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            cr.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {cr.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {cr.reviewer_recommendation === 'RECOMMEND_APPROVAL' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200" title={cr.reviewer_comments || 'Recommend Approval'}>
                              <CheckCircle className="h-3 w-3 text-emerald-600" /> Rec. Approval
                            </span>
                          ) : cr.reviewer_recommendation === 'RECOMMEND_REJECTION' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200" title={cr.reviewer_comments || 'Recommend Rejection'}>
                              <AlertCircle className="h-3 w-3 text-rose-600" /> Rec. Rejection
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Pending Review</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View & Compare Proposed Changes Button */}
                            <button
                              onClick={() => handleOpenDiff(cr)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                              title="Side-by-side comparison of current vs proposed values"
                            >
                              <Eye className="h-3.5 w-3.5 text-teal-600" />
                              <span>Diff</span>
                            </button>

                            {/* Provide Comments & Feedback */}
                            {canAct && (
                              <button
                                onClick={() => openCommentModal(cr)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                                title="Add review notes, feedback & operational comments"
                              >
                                <Edit3 className="h-3 w-3 text-slate-600" />
                                <span>Notes</span>
                              </button>
                            )}

                            {/* Request Clarification Button */}
                            {canAct && (
                              <button
                                onClick={() => openClarificationModal(cr, 'INQUIRY')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold"
                                title="Send request back to requestor with specific questions"
                              >
                                Clarify
                              </button>
                            )}

                            {/* Recommend Action (Recommend Approval or Recommend Rejection) */}
                            {canAct && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openRecommendationModal(cr, 'RECOMMEND_APPROVAL')}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1"
                                  title="Submit formal recommendation: Recommend Approval"
                                >
                                  <Check className="h-3 w-3 text-emerald-600" /> Rec. Approve
                                </button>
                                <button
                                  onClick={() => openRecommendationModal(cr, 'RECOMMEND_REJECTION')}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1"
                                  title="Submit formal recommendation: Recommend Rejection"
                                >
                                  <X className="h-3 w-3 text-rose-600" /> Rec. Reject
                                </button>
                              </div>
                            )}

                            {isOwnRequest && (
                              <span className="text-[10px] text-rose-500 font-bold italic" title="Segregation of Duties: cannot review your own request">
                                (Self-Request)
                              </span>
                            )}
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
      )}

      {/* ========================================================================= */}
      {/* 6. CLARIFICATIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'clarifications' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Clarifications Center</h3>
            <p className="text-xs text-slate-500">
              Manage inquiries from Reviewers, respond to information requests, and attach supporting documentation.
            </p>
          </div>

          {pendingClarifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="h-10 w-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No pending clarifications required!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All your authored requests are proceeding smoothly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingClarifications.map(cr => (
                <div key={cr.id} className="border border-amber-200 bg-amber-50/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-900">#{cr.id}</span>
                      <span className="font-bold text-xs text-slate-800">{cr.department} &bull; {cr.process}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      Response Required
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    Proposal: <strong>"{cr.proposed_value?.decision_area || cr.rationale}"</strong>
                  </p>

                  {cr.decision_comment && (
                    <div className="p-3 bg-white border border-amber-200 rounded-xl text-xs text-amber-950 font-medium">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block mb-1">Reviewer's Note:</span>
                      {cr.decision_comment}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      onClick={() => handleOpenDetails(cr)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      View Request
                    </button>
                    <button
                      onClick={() => openClarificationModal(cr, 'RESPONSE')}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Post Response &amp; Resume Review</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. NOTIFICATIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Notifications Center</h3>
              <p className="text-xs text-slate-500">Live alerts on workflow reviews, status transitions, and committee updates</p>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(n => (
                <div key={n.id} className={`py-3.5 px-4 flex items-center justify-between gap-4 rounded-xl transition-colors ${
                  !n.is_read ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      n.notification_type === 'CLARIFICATION' ? 'bg-amber-100 text-amber-700' :
                      n.notification_type === 'ACTION_REQUIRED' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => handleReadNotification(n.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-100/70 hover:bg-teal-100 rounded-lg flex-shrink-0"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. REQUEST HISTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Audit Trail &amp; Workflow History</h3>
            <p className="text-xs text-slate-500">Chronological history of all status changes, reviewer actions, and endorsements</p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Action &bull; Status</th>
                  <th className="py-3 px-4">User / Reviewer</th>
                  <th className="py-3 px-4">Remarks / Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myRequests.map(cr => (
                  <tr key={cr.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {cr.reviewed_at ? new Date(cr.reviewed_at).toLocaleString() : new Date(cr.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{cr.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        cr.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                        cr.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                        cr.status === 'CLARIFICATION_REQUIRED' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {cr.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {cr.reviewer_email || cr.requester_email}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic">
                      "{cr.decision_comment || cr.rationale || 'Submitted change request'}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MANAGEMENT REPORTS / DOWNLOADS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Reports &amp; Downloads Hub</h3>
              <p className="text-xs text-slate-500">Export active delegations, pending approval queues, and high-risk registers</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { key: 'active_by_dept', label: 'Active Delegations', desc: 'Rules by Finance & Risk' },
              { key: 'pending_approvals', label: 'Pending Queue', desc: 'Awaiting executive decision' },
              { key: 'recently_modified', label: 'Recently Modified', desc: 'Version bump updates' },
              { key: 'regulatory_mandated', label: 'Regulatory Mandated', desc: 'Central Bank compliance' }
            ].map(r => (
              <button
                key={r.key}
                onClick={() => setSelectedReportType(r.key)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedReportType === r.key
                    ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-teal-300 bg-slate-50/40'
                }`}
              >
                <span className="text-xs font-black text-slate-900 block">{r.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{r.desc}</span>
              </button>
            ))}
          </div>

          {isLoadingReport ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Generating report...</p>
            </div>
          ) : reportData && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between text-xs">
                <span className="font-bold">{reportData.title}</span>
                <span className="font-mono text-teal-300">Total: {reportData.count}</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Function &bull; Business Line</th>
                      <th className="py-3 px-4">Decision Area / Activity</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reportData.data || []).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">#{item.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {item.parent_function || item.function || 'Corporate'} &bull; {item.business_line || item.department}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{item.decision_area || item.rationale}</td>
                        <td className="py-3 px-4 font-bold text-teal-700">{item.status || 'PUBLISHED'}</td>
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
      {/* 10. DESIGNATION MATRIX TAB */}
      {/* ========================================================================= */}
      {activeTab === 'designations' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Designation-Wise Authorities Matrix</h3>
              <p className="text-xs text-slate-500">Filter all authorities mapped directly to an executive or governance body</p>
            </div>
            <select
              value={selectedDesignationKey}
              onChange={(e) => setSelectedDesignationKey(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="ceo">Chief Executive Officer (CEO)</option>
              <option value="gceo">Group CEO (GCEO)</option>
              <option value="c_level1">CFO / Chief Financial Officer</option>
              <option value="board_of_directors">Board of Directors (BoD)</option>
              <option value="board_committees">Board Committees (Audit &amp; Risk)</option>
              <option value="mgmt_committees">Management Committees (MANCO)</option>
              <option value="shareholders">Shareholders (AGM)</option>
            </select>
          </div>

          {isLoadingDesignation ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Loading designation matrix...</p>
            </div>
          ) : designationMatrixData && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">DOA ID</th>
                    <th className="py-3 px-4">Decision Area</th>
                    <th className="py-3 px-4">Delegation Action</th>
                    <th className="py-3 px-4">Composite Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(designationMatrixData.authorities || []).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{r.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 max-w-md">{r.decision_area}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          r.action_type === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' :
                          r.action_type === 'ENDORSE' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {r.action_type} ({r.authority_code})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 font-mono">{r.composite_authority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REQUEST DETAILS & CHANGE COMPARISON (DIFF) */}
      {/* ========================================================================= */}
      {isDetailsModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Request Details &bull; #{selectedRequest.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Author: {selectedRequest.requester_email} &bull; Status: <strong className="text-slate-800">{selectedRequest.status}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setDiffData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* CHANGE COMPARISON (CURRENT VALUE vs PROPOSED VALUE) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Change Comparison (Current vs Proposed Value)
                </span>
                
                {isLoadingDiff ? (
                  <div className="py-6 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-teal-600 mb-1" />
                    <span className="text-xs font-semibold">Comparing fields...</span>
                  </div>
                ) : diffData && diffData.diffs ? (
                  <div className="space-y-2">
                    {diffData.diffs.map((d, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-4 text-xs">
                        <div className="border-r border-slate-100 pr-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">CURRENT VALUE</span>
                          <span className="text-slate-700 font-medium">
                            {d.current_value !== null ? String(d.current_value) : <em className="text-slate-400">None</em>}
                          </span>
                        </div>
                        <div className="pl-2">
                          <span className="text-[10px] font-bold text-teal-600 uppercase block">PROPOSED VALUE</span>
                          <span className="text-slate-900 font-bold bg-teal-50 px-2 py-0.5 rounded">
                            {d.proposed_value !== null ? String(d.proposed_value) : <em className="text-slate-400">None</em>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Limit</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {selectedRequest.current_limit ? `${selectedRequest.currency || 'USD'} ${selectedRequest.current_limit}` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-teal-200 bg-teal-50/40">
                      <span className="text-[10px] font-bold text-teal-600 uppercase block">Proposed Limit</span>
                      <span className="font-mono text-teal-900 font-black">
                        {selectedRequest.proposed_limit ? `${selectedRequest.currency || 'USD'} ${selectedRequest.proposed_limit}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Justification & Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-200 rounded-xl bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Business Justification</span>
                  <p className="text-slate-800 mt-1 font-medium">{selectedRequest.rationale || 'None provided'}</p>
                </div>
                <div className="p-3 border border-slate-200 rounded-xl bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Risk &amp; Impact</span>
                  <p className="text-slate-800 mt-1 font-medium">{selectedRequest.risk_impact || 'Standard operational risk profile'}</p>
                </div>
              </div>

              {/* Clarification Thread History */}
              {selectedRequest.clarifications && selectedRequest.clarifications.length > 0 && (
                <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/50 space-y-3">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                    Clarification History Thread
                  </span>
                  <div className="space-y-2">
                    {selectedRequest.clarifications.map(c => (
                      <div key={c.id} className="bg-white p-3 rounded-xl border border-amber-200 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span>{c.user_name} ({c.message_type})</span>
                          <span className="text-slate-400 font-normal">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 mt-1">{c.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setDiffData(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {/* If Requestor on this request and clarification is required */}
                {selectedRequest.requester_id === currentUser?.id && selectedRequest.status === 'CLARIFICATION_REQUIRED' && (
                  <button
                    onClick={() => openClarificationModal(selectedRequest, 'RESPONSE')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Respond to Clarification
                  </button>
                )}

                {/* If Reviewer on this request (SoD checked) */}
                {canReview && selectedRequest.requester_id !== currentUser?.id && ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'].includes(selectedRequest.status) && (
                  <>
                    <button
                      onClick={() => openCommentModal(selectedRequest)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      title="Add review notes and operational feedback"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Comments
                    </button>
                    <button
                      onClick={() => openClarificationModal(selectedRequest, 'INQUIRY')}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-xl text-xs font-bold"
                    >
                      Request Clarification
                    </button>
                    <button
                      onClick={() => openRecommendationModal(selectedRequest, 'RECOMMEND_REJECTION')}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5 text-rose-600" /> Recommend Rejection
                    </button>
                    <button
                      onClick={() => openRecommendationModal(selectedRequest, 'RECOMMEND_APPROVAL')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Recommend Approval
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CLARIFICATION MODAL (Inquiry or Response) */}
      {/* ========================================================================= */}
      {clarificationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {clarificationModal.mode === 'INQUIRY' ? 'Request Clarification from Requestor' : 'Respond to Clarification Inquiry'}
                </h3>
              </div>
              <button
                onClick={() => setClarificationModal({ isOpen: false, mode: 'INQUIRY', cr: null, message: '', attachmentUrl: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {clarificationModal.mode === 'INQUIRY' ? 'Inquiry Message / Clarification Details *' : 'Requestor Response *'}
                </label>
                <textarea
                  rows={4}
                  value={clarificationModal.message}
                  onChange={(e) => setClarificationModal(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={
                    clarificationModal.mode === 'INQUIRY'
                      ? 'Specify questions regarding limit calculations, ERP controls, or committee resolutions...'
                      : 'Provide your formal explanation, reference documents, or adjusted rationale...'
                  }
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Optional Supporting Document Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Doc Ref / Board Resolution extract URL"
                  value={clarificationModal.attachmentUrl}
                  onChange={(e) => setClarificationModal(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClarificationModal({ isOpen: false, mode: 'INQUIRY', cr: null, message: '', attachmentUrl: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendClarification}
                className="px-5 py-2 text-xs font-black rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
              >
                {clarificationModal.mode === 'INQUIRY' ? 'Send Clarification Inquiry' : 'Post Response & Return to Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVIEWER COMMENTS & FEEDBACK MODAL */}
      {/* ========================================================================= */}
      {commentModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Edit3 className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Add Reviewer Comments &amp; Feedback (CR #{commentModal.cr?.id})
                </h3>
              </div>
              <button
                onClick={() => setCommentModal({ isOpen: false, cr: null, comment: '', operational_comments: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Reviewer Notes &amp; Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={commentModal.comment}
                  onChange={(e) => setCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Provide detailed feedback on the proposal, authority alignment, or verification points..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Operational Impact Statement / Comments</label>
                <textarea
                  rows={2}
                  value={commentModal.operational_comments}
                  onChange={(e) => setCommentModal(prev => ({ ...prev, operational_comments: e.target.value }))}
                  placeholder="Operational comments regarding ERP configuration, delegation workflows, or system controls..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCommentModal({ isOpen: false, cr: null, comment: '', operational_comments: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendComment}
                className="px-5 py-2 text-xs font-black rounded-xl text-white bg-slate-900 hover:bg-black shadow-sm"
              >
                Save Review Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FORMAL REVIEWER RECOMMENDATION MODAL (Approval / Rejection) */}
      {/* ========================================================================= */}
      {recommendationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${
                  recommendationModal.recommendation === 'RECOMMEND_APPROVAL' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {recommendationModal.recommendation === 'RECOMMEND_APPROVAL' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {recommendationModal.recommendation === 'RECOMMEND_APPROVAL' ? 'Submit Formal Recommendation: Recommend Approval' : 'Submit Formal Recommendation: Recommend Rejection'}
                </h3>
              </div>
              <button
                onClick={() => setRecommendationModal({ isOpen: false, cr: null, recommendation: 'RECOMMEND_APPROVAL', notes: '', operational_comments: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Request Under Review:</span>
                <span className="font-bold text-slate-800">
                  #{recommendationModal.cr?.id} &bull; {recommendationModal.cr?.department} ({recommendationModal.cr?.process})
                </span>
                <p className="text-slate-600 mt-1 italic">
                  "{recommendationModal.cr?.proposed_value?.decision_area || recommendationModal.cr?.rationale}"
                </p>
              </div>

              {/* Recommendation Choice */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Recommendation Decision *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecommendationModal(prev => ({ ...prev, recommendation: 'RECOMMEND_APPROVAL' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      recommendationModal.recommendation === 'RECOMMEND_APPROVAL'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Recommend Approval
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecommendationModal(prev => ({ ...prev, recommendation: 'RECOMMEND_REJECTION' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      recommendationModal.recommendation === 'RECOMMEND_REJECTION'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="h-3.5 w-3.5 text-rose-600" /> Recommend Rejection
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Recommendation Rationale Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={recommendationModal.notes}
                  onChange={(e) => setRecommendationModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="State your technical review findings and guidance for the final approver..."
                  required
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Operational Comments &amp; Impact Analysis</label>
                <textarea
                  rows={2}
                  value={recommendationModal.operational_comments}
                  onChange={(e) => setRecommendationModal(prev => ({ ...prev, operational_comments: e.target.value }))}
                  placeholder="Notes on operational readiness, system updates, or control assessments..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecommendationModal({ isOpen: false, cr: null, recommendation: 'RECOMMEND_APPROVAL', notes: '', operational_comments: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendRecommendation}
                disabled={!recommendationModal.notes.trim()}
                className={`px-5 py-2 text-xs font-black rounded-xl text-white shadow-sm transition-all flex items-center gap-1.5 ${
                  recommendationModal.recommendation === 'RECOMMEND_APPROVAL' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                } disabled:opacity-50`}
              >
                Submit Recommendation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: FINAL DECISION MODAL (Approve / Reject for Approver Role) */}
      {/* ========================================================================= */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${
                  decisionModal.action === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {decisionModal.action === 'APPROVE' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {decisionModal.action === 'APPROVE' ? 'Issue Binding Approval Decision' : 'Issue Binding Rejection Decision'}
                </h3>
              </div>
              <button
                onClick={() => setDecisionModal({ isOpen: false, action: 'APPROVE', cr: null, comment: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Request Under Review:</span>
                <span className="font-bold text-slate-800">
                  #{decisionModal.cr?.id} &bull; {decisionModal.cr?.department} ({decisionModal.cr?.process})
                </span>
                <p className="text-slate-600 mt-1 italic">
                  "{decisionModal.cr?.proposed_value?.decision_area || decisionModal.cr?.rationale}"
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Obligatory Rationale Comments <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={decisionModal.comment}
                  onChange={(e) => setDecisionModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="State your technical review remarks, regulatory alignment confirmation, or grounds for rejection..."
                  required
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionModal({ isOpen: false, action: 'APPROVE', cr: null, comment: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={!decisionModal.comment.trim()}
                className={`px-5 py-2 text-xs font-black rounded-xl text-white shadow-sm transition-all flex items-center gap-1.5 ${
                  decisionModal.action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                } disabled:opacity-50`}
              >
                {decisionModal.action === 'APPROVE' ? (
                  <>
                    <Check className="h-4 w-4" /> Issue Binding Approval
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" /> Issue Binding Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
