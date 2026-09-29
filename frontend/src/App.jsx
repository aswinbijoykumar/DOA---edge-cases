import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  mockDoaData as initialDoaData,
  functionTaxonomy,
  authorityTaxonomy
} from './data/doaData';
import { api, getStoredUser, setStoredUser, removeStoredToken, getStoredToken } from './services/api';
import LoginPage from './components/LoginPage';
import NormalUserDashboard from './components/dashboards/NormalUserDashboard';
import UnifiedDoaUserDashboard from './components/dashboards/UnifiedDoaUserDashboard';
import GovernanceTeamDashboard from './components/dashboards/GovernanceTeamDashboard';
import DoaAdminDashboard from './components/dashboards/DoaAdminDashboard';
import SystemAdminDashboard from './components/dashboards/SystemAdminDashboard';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  X, 
  ChevronRight, 
  ChevronDown,
  Info, 
  SlidersHorizontal, 
  Filter, 
  Database, 
  AlertCircle,
  FileText,
  Briefcase,
  Layers,
  Sparkles,
  ShieldAlert,
  Coins,
  ArrowRight,
  ShieldCheck,
  Check,
  HelpCircle,
  GitPullRequest,
  History,
  User,
  LogOut,
  RefreshCw,
  Clock,
  CheckCheck,
  XCircle,
  Send,
  Eye,
  ArrowUpRight,
  Paperclip,
  BookOpen
} from 'lucide-react';


// Custom Dropdown with Radio Buttons inside each option
function RadioDropdown({
  selectedValue,
  options = [],
  onChange,
  placeholder = 'Select...',
  disabled = false,
  disabledPlaceholder = 'Not Applicable',
  accentColor = 'teal'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === selectedValue);

  if (disabled) {
    return (
      <div className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-500 font-medium truncate h-[38px] flex items-center shadow-2xs">
        {disabledPlaceholder}
      </div>
    );
  }

  const borderClass = 
    accentColor === 'indigo' ? 'border-indigo-200/90 hover:border-indigo-400' :
    accentColor === 'amber' ? 'border-amber-200/90 hover:border-amber-400' :
    'border-slate-200 hover:border-teal-400';

  const radioAccent = 
    accentColor === 'indigo' ? 'text-indigo-600 accent-indigo-600' :
    accentColor === 'amber' ? 'text-amber-600 accent-amber-600' :
    'text-teal-600 accent-teal-600';

  const activeOptionBg = 
    accentColor === 'indigo' ? 'bg-indigo-50/90 text-indigo-900 border-indigo-200' :
    accentColor === 'amber' ? 'bg-amber-50/90 text-amber-900 border-amber-200' :
    'bg-teal-50/90 text-teal-900 border-teal-200';

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full text-xs font-semibold border ${borderClass} rounded-xl p-2.5 bg-white text-slate-800 flex items-center justify-between shadow-2xs transition-all text-left h-[38px] focus:outline-none focus:ring-2 focus:ring-teal-500/20`}
      >
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'transform rotate-180 text-teal-600' : ''}`} />
      </button>

      {/* Floating Menu with Radio Buttons on each item */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1 animate-fade-in divide-y divide-slate-50">
          {options.map((opt) => {
            const isChecked = selectedValue === opt.value;
            return (
              <label
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                  isChecked 
                    ? `${activeOptionBg} font-bold shadow-2xs border` 
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name={`radio_dropdown_${accentColor}`}
                  value={opt.value}
                  checked={isChecked}
                  onChange={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`h-3.5 w-3.5 ${radioAccent} border-slate-300`}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate">{opt.label}</span>
                  {opt.subtext && (
                    <span className="text-[10px] text-slate-400 font-normal truncate">{opt.subtext}</span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Navigation State

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'search' | 'request' | 'queue' | 'audit'
  
  // Authentication State (starts from stored user session or null, requiring manual login)
  const [currentUser, setCurrentUser] = useState(() => {
    return getStoredUser() || null;
  });

  // Role Route Definitions according to requirements:
  // Login: /login
  // Normal User: /login/normaluser
  // Governance Team: /login/governance
  // DOA Administrator: /login/doa-admin
  // System Administrator: /login/system-admin
  const ROLE_ROUTES = {
    NORMAL_USER: '/login/normaluser',
    GOVERNANCE_TEAM: '/login/governance',
    DOA_ADMINISTRATOR: '/login/doa-admin',
    SYSTEM_ADMINISTRATOR: '/login/system-admin',
    ADMIN: '/login/system-admin'
  };

  const ROUTE_TO_ROLE = {
    '/login/normaluser': 'NORMAL_USER',
    '/login/governance': 'GOVERNANCE_TEAM',
    '/login/doa-admin': 'DOA_ADMINISTRATOR',
    '/login/system-admin': 'SYSTEM_ADMINISTRATOR'
  };

  // Current URL path tracking
  const [currentPath, setCurrentPath] = useState(() => {
    const p = window.location.pathname.replace(/\/+$/, '') || '/';
    return p;
  });

  // Keep currentPath in sync with browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.replace(/\/+$/, '') || '/';
      setCurrentPath(p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  // Route Protection & Synchronization Guard
  // 1. If unauthenticated and not on /login, redirect to /login
  // 2. If authenticated:
  //    - If on /login or root (/), redirect to dedicated role landing page
  //    - If attempting to access another role's landing route, redirect to user's assigned role route with a warning toast
  //    - If user is on their role's route or tab, keep in sync
  useEffect(() => {
    if (!currentUser) {
      if (currentPath !== '/login') {
        navigateTo('/login');
      }
    } else {
      const userRole = currentUser.role === 'ADMIN' ? 'SYSTEM_ADMINISTRATOR' : currentUser.role;
      const expectedRoute = ROLE_ROUTES[userRole] || '/login/normaluser';

      // If user is at /login or /
      if (currentPath === '/login' || currentPath === '/') {
        navigateTo(expectedRoute);
        return;
      }

      // If user accesses one of the role routes
      const targetRoleForPath = ROUTE_TO_ROLE[currentPath];
      if (targetRoleForPath && targetRoleForPath !== userRole) {
        addToast(`Access restricted: Redirected to your authorized ${ROLE_CONFIGS[userRole]?.label || userRole} landing page.`, 'error');
        navigateTo(expectedRoute);
      }
    }
  }, [currentUser, currentPath]);

  // Handle successful manual login from LoginPage:
  // Detects the user's backend role and persona to route directly to their specific task view
  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    setStoredUser(userObj);
    addToast(`Logged in successfully as ${userObj.full_name} (${userObj.designation || userObj.role})`, 'success');
    
    // Role & Persona Task-Specific Landing View:
    // 1. Requestor / Front-End User -> Lands on 'search' (Search/Lookup & Simple Status Tracker)
    // 2. Reviewer / Risk & Compliance -> Lands on 'queue' (Review Queue & Diff Engine)
    // 3. Approver / Executive -> Lands on 'queue' (Executive Approval Inbox)
    // 4. Department / Process Owner / Auditor -> Lands on 'overview' (Persona Dashboard with Reports & Designations)
    // 5. System Admin -> Lands on 'overview' (System Health & Telemetry)
    const pType = userObj.persona_type;
    if (pType === 'FRONTEND_USER') {
      setActiveTab('search');
    } else if (pType === 'REVIEWER' || userObj.role === 'GOVERNANCE_TEAM') {
      setActiveTab('queue');
    } else if (pType === 'APPROVER' || userObj.role === 'DOA_ADMINISTRATOR') {
      setActiveTab('queue');
    } else if (userObj.role === 'SYSTEM_ADMINISTRATOR') {
      setActiveTab('overview');
    } else {
      setActiveTab('overview');
    }

    // Redirect to role-specific landing route
    const userRole = userObj.role === 'ADMIN' ? 'SYSTEM_ADMINISTRATOR' : userObj.role;
    const targetRoute = ROLE_ROUTES[userRole] || '/login/normaluser';
    navigateTo(targetRoute);
  };

  // Handle explicit manual logout:
  // Clears tokens and redirects back to /login
  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    setActiveTab('overview');
    setSelectedRecord(null);
    setChangeRequests([]);
    setAuditLogs([]);
    navigateTo('/login');
    addToast('Logged out of session', 'info');
  };

  // Backend Loading & Error States
  const [isAuthSwitching, setIsAuthSwitching] = useState(false);
  const [isLoadingDoa, setIsLoadingDoa] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Data State
  const [doaRecords, setDoaRecords] = useState(initialDoaData);
  const [backendSummary, setBackendSummary] = useState(null);
  const [userDashboardStats, setUserDashboardStats] = useState(null);
  const [govDashboardStats, setGovDashboardStats] = useState(null);
  const [doaAdminStats, setDoaAdminStats] = useState(null);
  const [sysAdminStats, setSysAdminStats] = useState(null);
  const [changeRequests, setChangeRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [recordVersions, setRecordVersions] = useState([]);

  // Diff Modal State
  const [activeDiffCR, setActiveDiffCR] = useState(null);
  const [diffDetails, setDiffDetails] = useState(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // Search & Filtering State (Parent / Child Function Filters)
  const [filterParentFunction, setFilterParentFunction] = useState('Finance'); // 'Finance' | 'Risk' | 'All'
  const [filterChildBusinessLine, setFilterChildBusinessLine] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Executive Decision Modal State (Obligatory Rationale Dialog)
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    crId: null,
    action: 'APPROVE', // 'APPROVE' or 'REJECT'
    rationale: ''
  });
  
  // Inspector State (Detail drawer)
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Delete Confirmation Modal State
  const [deleteModalRecord, setDeleteModalRecord] = useState(null);
  
  // New Request Form State
  const [actionMode, setActionMode] = useState('Add'); // 'Add' | 'Modify' | 'Delete'
  const [selectedModifyId, setSelectedModifyId] = useState('');
  
  const [formData, setFormData] = useState({
    parentFunction: 'Finance',
    businessLine: 'Bank Capital and Capital Management',
    decisionArea: '',
    keyNonKey: 'Key',
    regulatory: 'N',
    authority: 'Shareholders (A)',
    rationale: ''
  });

  // Proposed Authority Interactive Builder State
  const [selectedAuthParent, setSelectedAuthParent] = useState('boardCommittees'); // default parent
  const [selectedAuthChild, setSelectedAuthChild] = useState('AC'); // child 1 (e.g. Committee or Executive)
  const [selectedAuthOperator, setSelectedAuthOperator] = useState('E1'); // child 2 (operator code)
  const [isChildOpen, setIsChildOpen] = useState(true); // round button expands child dropdowns
  const [authorityChain, setAuthorityChain] = useState([
    { parentName: 'Board of Directors (BoD)', childName: '', operator: 'A', display: 'BoD (A)' },
    { parentName: 'Board Committees', childName: 'AC - Audit Committee', operator: 'E1', display: 'AC (E1)' }
  ]);

  // Toasts Notification State
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Supported 4 Prototype Roles
  const ROLE_CONFIGS = {
    NORMAL_USER: {
      role: 'NORMAL_USER',
      label: 'Normal User',
      email: 'user@doa.local',
      password: 'User@123',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Search & filter published DOA, submit change requests, track own request status.'
    },
    GOVERNANCE_TEAM: {
      role: 'GOVERNANCE_TEAM',
      label: 'Governance Team',
      email: 'governance@doa.local',
      password: 'GovTeam@123',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Review change requests, inspect Current vs Proposed diffs, audit trail oversight.'
    },
    DOA_ADMINISTRATOR: {
      role: 'DOA_ADMINISTRATOR',
      label: 'DOA Administrator',
      email: 'doaadmin@doa.local',
      password: 'DoaAdmin@123',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      description: 'Approve, reject, publish changes (create new DOA versions), archive master records.'
    },
    SYSTEM_ADMINISTRATOR: {
      role: 'SYSTEM_ADMINISTRATOR',
      label: 'System Administrator',
      email: 'sysadmin@doa.local',
      password: 'SysAdmin@123',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'System-level administration, database/ETL status, API health, audit ledger inspection.'
    }
  };

  // Switch User Profile / Role
  const handleSwitchUser = async (targetRoleKey) => {
    setIsAuthSwitching(true);
    const targetConfig = ROLE_CONFIGS[targetRoleKey] || ROLE_CONFIGS.NORMAL_USER;
    try {
      const res = await api.login(targetConfig.email, targetConfig.password);
      const userObj = {
        id: res.user_id,
        email: res.email,
        full_name: res.full_name,
        role: res.role,
        persona_type: res.persona_type || 'FRONTEND_USER',
        designation: res.designation || '',
        department: res.department || ''
      };
      setCurrentUser(userObj);
      addToast(`Switched account to ${userObj.full_name} (${targetConfig.label})`, 'success');
      
      // Auto-route to role's primary focus tab
      if (res.role === 'SYSTEM_ADMINISTRATOR') {
        setActiveTab('overview');
      } else if (res.role === 'DOA_ADMINISTRATOR' || res.role === 'GOVERNANCE_TEAM') {
        setActiveTab('queue');
      } else {
        setActiveTab('search');
      }

      // Refresh active datasets with new credentials
      loadDoaRecords();
      loadDashboardSummary();
      loadChangeRequests();
      if (['ADMIN', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR', 'GOVERNANCE_TEAM'].includes(userObj.role)) {
        loadAuditLogs();
      }
    } catch (err) {
      console.error("Login failed:", err);
      addToast(`Failed to switch to ${targetConfig.label}: ${err.message}`, 'error');
    } finally {
      setIsAuthSwitching(false);
    }
  };


  // Initial Auth verification: check if stored token & user exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();
      if (storedToken && storedUser) {
        try {
          const profile = await api.getMe();
          setCurrentUser({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            persona_type: profile.persona_type || storedUser.persona_type || 'FRONTEND_USER',
            designation: profile.designation || storedUser.designation || '',
            department: profile.department || storedUser.department || ''
          });
        } catch (e) {
          console.warn("Session expired or invalid token:", e);
          removeStoredToken();
          setCurrentUser(null);
        }
      }
    };
    initAuth();
  }, []);

  // Fetch DOA Master Records from Backend API
  const loadDoaRecords = async () => {
    if (!currentUser) return;
    setIsLoadingDoa(true);
    try {
      const records = await api.getDoaRecords({ status: 'PUBLISHED' });
      if (records && records.length > 0) {
        // Map backend snake_case to frontend camelCase while preserving all UI fields
        const mapped = records.map(r => ({
          ...r,
          parentFunction: r.parent_function || r.function,
          businessLine: r.business_line || r.category,
          keyNonKey: r.key_non_key,
          decisionArea: r.decision_area,
          boardOfDirectors: r.board_of_directors,
          subsidiaryBoard: r.subsidiary_board,
          boardCommittees: r.board_committees,
          boardCommitteesOp: r.board_committees_op,
          boardCommittees2: r.board_committees2,
          boardCommittees2Op: r.board_committees2_op,
          mgmtCommittees: r.mgmt_committees,
          mgmtCommitteesOp: r.mgmt_committees_op,
          mgmtCommittees2: r.mgmt_committees2,
          mgmtCommittees2Op: r.mgmt_committees2_op,
          cLevel1: r.c_level1,
          cLevel1Op: r.c_level1_op,
          cLevel2: r.c_level2,
          cLevel2Op: r.c_level2_op,
          compositeAuthority: r.composite_authority,
          currentVersion: r.current_version
        }));
        setDoaRecords(mapped);
      }
      setBackendError(null);
    } catch (err) {
      console.warn("Using cached DOA records, backend unreachable:", err);
      setBackendError("FastAPI backend is offline or loading. Using local governance cache.");
    } finally {
      setIsLoadingDoa(false);
    }
  };

  // Fetch Dashboard Summary KPIs from Backend
  const loadDashboardSummary = async () => {
    if (!currentUser) return;
    try {
      const summary = await api.getDashboardSummary();
      setBackendSummary(summary);
    } catch (e) {
      // Graceful fallback to client calculation
    }
  };

  // Fetch Change Requests from Backend
  const loadChangeRequests = async () => {
    if (!currentUser) return;
    setIsLoadingQueue(true);
    try {
      const list = await api.getChangeRequests();
      setChangeRequests(list || []);
    } catch (e) {
      console.warn("Could not fetch change requests:", e);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Fetch Audit Logs from Backend (Elevated roles only)
  const isAuditRole = currentUser && ['ADMIN', 'SYSTEM_ADMINISTRATOR', 'DOA_ADMINISTRATOR', 'GOVERNANCE_TEAM'].includes(currentUser.role);

  const loadAuditLogs = async () => {
    if (!isAuditRole) return;
    setIsLoadingAudit(true);
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (e) {
      console.warn("Could not fetch audit logs:", e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Fetch Role-Dedicated Dashboard Data from Backend
  const loadRoleDashboardData = async () => {
    if (!currentUser) return;
    try {
      if (currentUser.role === 'NORMAL_USER') {
        const stats = await api.getUserDashboard();
        setUserDashboardStats(stats);
      } else if (currentUser.role === 'GOVERNANCE_TEAM') {
        const stats = await api.getGovernanceDashboard();
        setGovDashboardStats(stats);
      } else if (currentUser.role === 'DOA_ADMINISTRATOR') {
        const stats = await api.getDoaAdminDashboard();
        setDoaAdminStats(stats);
      } else if (currentUser.role === 'SYSTEM_ADMINISTRATOR' || currentUser.role === 'ADMIN') {
        const stats = await api.getSystemAdminDashboard();
        setSysAdminStats(stats);
      }
    } catch (e) {
      console.warn("Could not fetch role-specific dashboard data:", e);
    }
  };

  // Refresh active datasets on mount and role change
  useEffect(() => {
    if (currentUser) {
      loadDoaRecords();
      loadDashboardSummary();
      loadRoleDashboardData();
      loadChangeRequests();
      if (['ADMIN', 'SYSTEM_ADMINISTRATOR', 'DOA_ADMINISTRATOR', 'GOVERNANCE_TEAM'].includes(currentUser.role)) {
        loadAuditLogs();
      }
    }
  }, [currentUser?.role, currentUser?.id]);

  // Load versions whenever a record is inspected
  useEffect(() => {
    if (selectedRecord?.id) {
      api.getDoaVersions(selectedRecord.id)
        .then(v => setRecordVersions(v || []))
        .catch(() => setRecordVersions([]));
    } else {
      setRecordVersions([]);
    }
  }, [selectedRecord?.id]);

  // Helper to check if a decision text represents regulatory mandates
  const isRegulatoryMandated = (desc) => {
    if (!desc) return false;
    const descLower = desc.toLowerCase();
    const regulatoryKeywords = ["regulatory", "cbb", "central bank", "basel", "ca-", "auditor", "cfo", "breach", "ratio", "compliance", "fatf", "sanctions", "single obligor"];
    return regulatoryKeywords.some(k => descLower.includes(k));
  };

  // KPI calculations with backend synchronization
  const kpis = useMemo(() => {
    if (backendSummary) {
      return {
        sourceRecords: backendSummary.total_published,
        sourceColumns: 7,
        keyDecisions: backendSummary.key_decisions_count,
        regulatoryMandated: backendSummary.regulatory_mandated_count,
        riskRecordsCount: backendSummary.risk_records_count,
        financeRecordsCount: backendSummary.finance_records_count,
        pendingRequests: backendSummary.pending_requests,
        approvedRequests: backendSummary.approved_requests,
        publishedRequests: backendSummary.published_requests
      };
    }
    const sourceRecords = doaRecords.length;
    const sourceColumns = 7;
    const keyDecisions = doaRecords.filter(r => r.keyNonKey === 'Key').length;
    const regulatoryMandated = doaRecords.filter(r => r.regulatory === 'Y' || isRegulatoryMandated(r.decisionArea)).length;
    const riskRecordsCount = doaRecords.filter(r => r.parentFunction === 'Risk' || r.function === 'Risk').length;
    const financeRecordsCount = doaRecords.filter(r => r.parentFunction === 'Finance' || r.function === 'Finance').length;
    
    return {
      sourceRecords,
      sourceColumns,
      keyDecisions,
      regulatoryMandated,
      riskRecordsCount,
      financeRecordsCount,
      pendingRequests: changeRequests.filter(c => c.status === 'SUBMITTED').length,
      approvedRequests: changeRequests.filter(c => c.status === 'APPROVED').length,
      publishedRequests: changeRequests.filter(c => c.status === 'PUBLISHED').length
    };
  }, [doaRecords, backendSummary, changeRequests]);


  // Active child business lines for Search Filter
  const availableChildCategoriesForFilter = useMemo(() => {
    if (filterParentFunction === 'Finance') {
      return functionTaxonomy.Finance || [];
    }
    if (filterParentFunction === 'Risk') {
      return functionTaxonomy.Risk || [];
    }
    return [
      ...(functionTaxonomy.Finance || []),
      ...(functionTaxonomy.Risk || [])
    ];
  }, [filterParentFunction]);

  // Active child business lines for New Request Form
  const availableChildCategoriesForForm = useMemo(() => {
    if (formData.parentFunction === 'Risk') {
      return functionTaxonomy.Risk || [];
    }
    return functionTaxonomy.Finance || [];
  }, [formData.parentFunction]);

  // Current active parent definition in Authority Taxonomy
  const currentAuthParentDef = useMemo(() => {
    return authorityTaxonomy.parents.find(p => p.id === selectedAuthParent) || authorityTaxonomy.parents[0];
  }, [selectedAuthParent]);

  // Handle Parent Authority selection change
  const handleAuthParentChange = (parentId) => {
    setSelectedAuthParent(parentId);
    const parentDef = authorityTaxonomy.parents.find(p => p.id === parentId);
    if (parentDef) {
      if (parentDef.hasChildDropdown && parentDef.children && parentDef.children.length > 0) {
        setSelectedAuthChild(parentDef.children[0].code);
      } else {
        setSelectedAuthChild('');
      }
      if (parentDef.operators && parentDef.operators.length > 0) {
        setSelectedAuthOperator(parentDef.defaultOperator || parentDef.operators[0].code);
      }
    }
    // Automatically open child on parent select or when round button is active
    setIsChildOpen(true);
  };

  // Add constructed authority item to compound authority chain
  const handleAddAuthorityToChain = () => {
    const parentDef = currentAuthParentDef;
    let display = '';
    let childObj = null;

    if (parentDef.hasChildDropdown && selectedAuthChild) {
      childObj = parentDef.children.find(c => c.code === selectedAuthChild);
      const childCode = childObj ? childObj.code : selectedAuthChild;
      display = `${childCode} (${selectedAuthOperator})`;
    } else {
      display = `${parentDef.name.split(' ')[0]} (${selectedAuthOperator})`;
    }

    const newItem = {
      parentName: parentDef.name,
      childName: childObj ? childObj.name : '',
      operator: selectedAuthOperator,
      display
    };

    const newChain = [...authorityChain, newItem];
    setAuthorityChain(newChain);
    
    // Update formData authority string
    const chainStr = newChain.map(c => c.display).join(' ➔ ');
    setFormData(prev => ({ ...prev, authority: chainStr }));
    addToast(`Added '${display}' to proposed authority chain`, 'info');
  };

  // Remove item from authority chain
  const handleRemoveFromChain = (indexToRemove) => {
    const newChain = authorityChain.filter((_, idx) => idx !== indexToRemove);
    setAuthorityChain(newChain);
    const chainStr = newChain.length > 0 ? newChain.map(c => c.display).join(' ➔ ') : '';
    setFormData(prev => ({ ...prev, authority: chainStr }));
  };

  // Cascading Filter Logic for DoA Matrix Table
  const filteredRecords = useMemo(() => {
    return doaRecords.filter(record => {
      // Filter 1: Parent Function (Risk / Finance / All)
      if (filterParentFunction !== 'All') {
        const recParent = (record.parentFunction || record.function || '').toLowerCase();
        if (!recParent.includes(filterParentFunction.toLowerCase())) {
          return false;
        }
      }

      // Filter 2: Child Business Line / Category
      if (filterChildBusinessLine !== '') {
        const recCat = record.category || record.businessLine || '';
        if (recCat !== filterChildBusinessLine) {
          return false;
        }
      }

      // Filter 3: Free-text search across decision area, ID, and authority
      const q = searchQuery.toLowerCase().trim();
      if (q === '') return true;

      const matchText = (record.decisionArea || '').toLowerCase().includes(q) ||
                        (record.shareholders || '').toLowerCase().includes(q) ||
                        (record.boardOfDirectors || '').toLowerCase().includes(q) ||
                        (record.compositeAuthority || '').toLowerCase().includes(q) ||
                        (record.id || '').toLowerCase().includes(q) ||
                        (record.comments || '').toLowerCase().includes(q);

      return matchText;
    });
  }, [doaRecords, filterParentFunction, filterChildBusinessLine, searchQuery]);

  // Group records by category / business line for hierarchical rendering
  const groupedRecords = useMemo(() => {
    const groups = {};
    filteredRecords.forEach(record => {
      const cat = record.category || record.businessLine || 'Other Governance Processes';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(record);
    });
    return groups;
  }, [filteredRecords]);

  // Clear all filters
  const handleClearFilters = () => {
    setFilterParentFunction('All');
    setFilterChildBusinessLine('');
    setSearchQuery('');
    addToast('Filters reset to show all records', 'info');
  };

  // Handle Modify Select change
  const handleModifySelect = (id) => {
    setSelectedModifyId(id);
    const rec = doaRecords.find(r => r.id === id);
    if (rec) {
      const parentFunc = rec.parentFunction || rec.function || 'Finance';
      const availableCategories = functionTaxonomy[parentFunc] || functionTaxonomy.Finance;
      const bLine = rec.category || rec.businessLine || availableCategories[0];
      
      setFormData({
        parentFunction: parentFunc,
        businessLine: bLine,
        decisionArea: rec.decisionArea || '',
        keyNonKey: rec.keyNonKey || 'Key',
        regulatory: (rec.regulatory === 'Y' || isRegulatoryMandated(rec.decisionArea)) ? 'Y' : 'N',
        authority: rec.compositeAuthority || rec.shareholders || rec.boardOfDirectors || 'BoD (A)',
        rationale: rec.comments || rec.rationale || ''
      });
    }
  };

  // Perform Rule Deletion via Change Request
  const executeDeleteRecord = async (recordId) => {
    try {
      const target = doaRecords.find(r => r.id === recordId);
      const res = await api.createChangeRequest({
        request_type: 'DELETE',
        doa_id: recordId,
        department: target?.parentFunction || 'Risk',
        process: target?.businessLine || 'Governance Process',
        rationale: 'Formal retirement request submitted via DoA governance matrix',
        base_version: target?.currentVersion || 1,
        proposed_value: {
          id: recordId,
          status: 'ARCHIVED',
          comments: 'Scheduled for retirement'
        }
      });
      addToast(`Deletion proposal #${res.id} submitted for Admin review & approval`, 'success');
      loadChangeRequests();
      loadDashboardSummary();
    } catch (err) {
      console.error("Delete request error:", err);
      // Fallback local update
      setDoaRecords(prev => prev.filter(rec => rec.id !== recordId));
      addToast(`Proposal to delete rule #${recordId} registered locally`, 'info');
    }
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord(null);
    }
    if (deleteModalRecord && deleteModalRecord.id === recordId) {
      setDeleteModalRecord(null);
    }
    if (selectedModifyId === recordId) {
      setSelectedModifyId('');
    }
  };

  // Form Submission via Backend Change Request API
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (actionMode === 'Add') {
      if (!formData.decisionArea.trim()) {
        addToast('Please enter the Decision Area description', 'error');
        return;
      }
      
      const proposedPayload = {
        parent_function: formData.parentFunction,
        function: formData.parentFunction,
        business_line: formData.businessLine,
        category: formData.businessLine,
        key_non_key: formData.keyNonKey,
        decision_area: formData.decisionArea,
        shareholders: formData.authority.includes('Shareholders') ? formData.authority : '',
        board_of_directors: formData.authority.includes('BoD') ? formData.authority : '',
        composite_authority: formData.authority || 'BoD (A)',
        regulatory: formData.regulatory,
        comments: formData.rationale,
        rationale: formData.rationale,
        effective_date: '2026-01-01',
        review_date: '2027-01-01'
      };

      try {
        const res = await api.createChangeRequest({
          request_type: 'ADD',
          department: formData.parentFunction,
          process: formData.businessLine,
          rationale: formData.rationale || 'New governance rule proposal',
          base_version: 1,
          proposed_value: proposedPayload
        });
        addToast(`New proposal #${res.id} submitted to Change Queue!`, 'success');
        loadChangeRequests();
        loadDashboardSummary();
        setActiveTab('queue');
      } catch (err) {
        console.error("Create request failed:", err);
        // Fallback local addition
        const newId = String(Math.max(...doaRecords.map(r => parseInt(r.id) || 0)) + 1);
        setDoaRecords(prev => [{ ...proposedPayload, id: newId, isCustom: true }, ...prev]);
        addToast(`New proposal #${newId} added locally`, 'info');
      }

      // Reset form fields
      setFormData(prev => ({
        ...prev,
        decisionArea: '',
        rationale: ''
      }));
      
    } else if (actionMode === 'Modify') {
      if (!selectedModifyId) {
        addToast('Please select a rule proposal to modify', 'error');
        return;
      }

      const targetRec = doaRecords.find(r => r.id === selectedModifyId);
      const proposedPayload = {
        decision_area: formData.decisionArea,
        parent_function: formData.parentFunction,
        function: formData.parentFunction,
        business_line: formData.businessLine,
        category: formData.businessLine,
        key_non_key: formData.keyNonKey,
        regulatory: formData.regulatory,
        composite_authority: formData.authority,
        rationale: formData.rationale,
        comments: formData.rationale
      };

      try {
        const res = await api.createChangeRequest({
          request_type: 'MODIFY',
          doa_id: selectedModifyId,
          department: formData.parentFunction,
          process: formData.businessLine,
          rationale: formData.rationale || 'Policy revision request',
          base_version: targetRec?.currentVersion || 1,
          proposed_value: proposedPayload
        });
        addToast(`Modify request #${res.id} submitted to Change Queue!`, 'success');
        loadChangeRequests();
        loadDashboardSummary();
        setActiveTab('queue');
      } catch (err) {
        console.error("Modify request failed:", err);
        setDoaRecords(prev => prev.map(rec => {
          if (rec.id === selectedModifyId) {
            return {
              ...rec,
              ...proposedPayload,
              isModified: true
            };
          }
          return rec;
        }));
        addToast(`Modified proposal #${selectedModifyId} applied locally`, 'info');
      }
      
    } else if (actionMode === 'Delete') {
      if (!selectedModifyId) {
        addToast('Please select a decision rule to delete', 'error');
        return;
      }

      const target = doaRecords.find(r => r.id === selectedModifyId);
      if (target) {
        setDeleteModalRecord(target);
      }
    }
  };

  // Inspect Diff for a Change Request
  const handleInspectDiff = async (cr) => {
    setActiveDiffCR(cr);
    setIsLoadingDiff(true);
    try {
      const diff = await api.getChangeRequestDiff(cr.id);
      setDiffDetails(diff);
    } catch (err) {
      console.error("Error loading diff:", err);
      addToast(`Could not calculate diff: ${err.message}`, 'error');
      setDiffDetails(null);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  // Decision Handlers: Approve / Reject with Mandatory Rationale
  const triggerDecisionModal = (crId, action) => {
    const defaultComment = action === 'APPROVE' 
      ? 'Approved in formal governance session; verified 4-eye workflow and operational impact.' 
      : 'Rejected during executive review; revisions required.';
    setDecisionModal({
      isOpen: true,
      crId,
      action,
      rationale: defaultComment
    });
  };

  const handleApproveCR = async (crId, comment) => {
    try {
      const rationaleText = comment || 'Approved by Board / Governance Committee';
      await api.approveChangeRequest(crId, rationaleText);
      addToast(`Change Request #${crId} formally APPROVED`, 'success');
      loadChangeRequests();
      loadDashboardSummary();
      loadRoleDashboardData();
      loadAuditLogs();
      if (activeDiffCR?.id === crId) {
        setActiveDiffCR(prev => ({ ...prev, status: 'APPROVED' }));
      }
    } catch (err) {
      addToast(`Approval failed: ${err.message}`, 'error');
    }
  };

  const handleRejectCR = async (crId, comment) => {
    try {
      const rationaleText = comment || 'Rejected during executive governance review';
      await api.rejectChangeRequest(crId, rationaleText);
      addToast(`Change Request #${crId} REJECTED`, 'info');
      loadChangeRequests();
      loadDashboardSummary();
      loadRoleDashboardData();
      loadAuditLogs();
      if (activeDiffCR?.id === crId) {
        setActiveDiffCR(prev => ({ ...prev, status: 'REJECTED' }));
      }
    } catch (err) {
      addToast(`Rejection failed: ${err.message}`, 'error');
    }
  };

  const handleConfirmDecision = async () => {
    if (!decisionModal.rationale.trim()) {
      addToast('Mandatory decision rationale is required.', 'error');
      return;
    }
    const { crId, action, rationale } = decisionModal;
    setDecisionModal({ isOpen: false, crId: null, action: 'APPROVE', rationale: '' });
    if (action === 'APPROVE') {
      await handleApproveCR(crId, rationale);
    } else {
      await handleRejectCR(crId, rationale);
    }
  };

  const handlePublishCR = async (crId) => {
    try {
      const res = await api.publishChangeRequest(crId);
      addToast(`Change Request #${crId} PUBLISHED! New master version active.`, 'success');
      loadChangeRequests();
      loadDoaRecords();
      loadDashboardSummary();
      loadAuditLogs();
      if (activeDiffCR?.id === crId) {
        setActiveDiffCR(null);
        setDiffDetails(null);
      }
    } catch (err) {
      if (err.status === 409) {
        addToast(`Conflict (409): ${err.data?.detail || 'Stale version detected. Record was updated previously.'}`, 'error');
      } else {
        addToast(`Publish failed: ${err.message}`, 'error');
      }
    }
  };


  if (!currentUser) {
    return (
      <>
        {/* Toast Notification Container for Login Page errors/notifications */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm transition-all duration-300 transform translate-y-0 animate-fade-in ${
                toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}
              <span className="font-medium">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  if (currentUser.role === 'DOA_ADMINISTRATOR') {
    return (
      <>
        {/* Toast Notification Container */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm transition-all duration-300 transform translate-y-0 animate-fade-in ${
                toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}
              <span className="font-medium">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Dedicated DOA Administrator Cockpit with Topbar, Sidebar (9 sections), KPIs, and Panels */}
        <DoaAdminDashboard
          adminStats={doaAdminStats}
          currentUser={currentUser}
          doaRecords={doaRecords}
          changeRequests={changeRequests}
          auditLogs={auditLogs}
          onLogout={handleLogout}
          onInspectCR={(cr) => handleInspectDiff(cr)}
          onApproveCR={(crId) => handleApproveCR(crId)}
          onPublishCR={(crId) => handlePublishCR(crId)}
          onRejectCR={(crId) => handleRejectCR(crId)}
          onRefreshData={() => {
            loadDoaRecords();
            loadChangeRequests();
            loadAuditLogs();
            loadDashboardSummary();
            loadRoleDashboardData();
          }}
          functionTaxonomy={functionTaxonomy}
          authorityTaxonomy={authorityTaxonomy}
        />

        {/* Diff Modal for Side-by-Side Current vs Proposed Record Inspection */}
        {activeDiffCR && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <GitPullRequest className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">
                        Change Request #{activeDiffCR.id}: {activeDiffCR.department} &bull; {activeDiffCR.process}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        activeDiffCR.request_type === 'ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        activeDiffCR.request_type === 'MODIFY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {activeDiffCR.request_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Comparing Base Version <strong className="text-slate-600">v{activeDiffCR.base_version || 1}</strong> with Proposed Changes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDiffCR(null);
                    setDiffDetails(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Governance Rationale:</span>
                  <p className="text-slate-600 mt-0.5 italic">
                    "{activeDiffCR.rationale || 'No rationale provided'}"
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Requester: <strong>{activeDiffCR.requester_email}</strong></span>
                    <span>Target Base: <strong>v{activeDiffCR.base_version || 1}</strong></span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Current vs. Proposed Changes
                  </h4>

                  {isLoadingDiff ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Computing field-level diff from backend...
                    </div>
                  ) : !diffDetails || !diffDetails.diff || diffDetails.diff.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      No field-level discrepancies detected or this is a brand new rule proposal.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {diffDetails.diff.map((d, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs shadow-2xs">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span className="capitalize">{d.field.replace(/_/g, ' ')}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                              d.change_type === 'MODIFIED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              d.change_type === 'ADDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {d.change_type}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100/70">
                              <span className="text-[9px] uppercase font-bold text-rose-500 block mb-0.5">Current Value</span>
                              <span className="font-medium text-slate-700 break-words">
                                {d.current_value ? String(d.current_value) : <em className="text-slate-400 font-normal">None</em>}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/70">
                              <span className="text-[9px] uppercase font-bold text-emerald-600 block mb-0.5">Proposed Value</span>
                              <span className="font-semibold text-slate-800 break-words">
                                {d.proposed_value ? String(d.proposed_value) : <em className="text-slate-400 font-normal">None</em>}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Status: <strong className="text-slate-700">{activeDiffCR.status}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDiffCR(null);
                      setDiffDetails(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>

                  {activeDiffCR.status === 'SUBMITTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRejectCR(activeDiffCR.id)}
                        className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveCR(activeDiffCR.id)}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                    </>
                  )}

                  {activeDiffCR.status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handlePublishCR(activeDiffCR.id)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Publish New Version
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (currentUser.role === 'GOVERNANCE_TEAM') {
    return (
      <>
        {/* Toast Notification Container */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm transition-all duration-300 transform translate-y-0 animate-fade-in ${
                toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}
              <span className="font-medium">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Dedicated Governance Team Cockpit (A16 to A20) */}
        <GovernanceTeamDashboard
          govStats={govDashboardStats}
          currentUser={currentUser}
          changeRequests={changeRequests}
          doaRecords={doaRecords}
          auditLogs={auditLogs}
          onLogout={handleLogout}
          onInspectCR={(cr) => handleInspectDiff(cr)}
          onRefreshData={() => {
            loadDoaRecords();
            loadChangeRequests();
            loadAuditLogs();
            loadDashboardSummary();
            loadRoleDashboardData();
          }}
        />
      </>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm transition-all duration-300 transform translate-y-0 animate-fade-in ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}
            <span className="font-medium">{toast.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
            
            {/* Protiviti-Inspired Branding */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-teal-600 rounded-lg flex items-center justify-center text-white font-extrabold text-lg tracking-tighter shadow-md">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xl tracking-tight text-slate-800">protiviti</span>
                  <div className="h-1.5 w-1.5 bg-rose-600 rounded-full mt-2"></div>
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Risk &amp; Internal Audit
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">DoA Management Tool</h1>
                <p className="text-xs text-slate-500">Delegation of Authority | Risk &amp; Finance Governance</p>
              </div>
            </div>

            {/* Navigation Tabs & Role Switcher */}
            <div className="flex items-center gap-3">
              <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                {[
                  // Role-tailored dashboards and tabs
                  { id: 'overview', label: 'Overview', icon: Layers, roles: ['NORMAL_USER', 'GOVERNANCE_TEAM', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR', 'ADMIN'] },
                  { id: 'search', label: 'Search DoA', icon: Search, roles: ['NORMAL_USER', 'GOVERNANCE_TEAM', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR', 'ADMIN'] },
                  { id: 'request', label: 'New Request', icon: Edit3, roles: ['NORMAL_USER', 'DOA_ADMINISTRATOR', 'ADMIN'] },
                  { 
                    id: 'queue', 
                    label: currentUser.role === 'GOVERNANCE_TEAM' ? 'Review Queue' : 'Change Queue', 
                    icon: GitPullRequest,
                    roles: ['GOVERNANCE_TEAM', 'DOA_ADMINISTRATOR', 'NORMAL_USER', 'ADMIN', 'SYSTEM_ADMINISTRATOR'],
                    badge: changeRequests.filter(c => c.status === 'SUBMITTED').length
                  },
                  { 
                    id: 'audit', 
                    label: 'Audit Trail', 
                    icon: History, 
                    roles: ['GOVERNANCE_TEAM', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR', 'ADMIN'] 
                  }
                ]
                .filter(tab => tab.roles.includes(currentUser.role))
                .map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSelectedRecord(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 relative ${
                        isActive 
                          ? 'bg-white text-teal-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                      {tab.label}
                      {Boolean(tab.badge) && (
                        <span className="px-1.5 py-0.2 bg-teal-600 text-white rounded-full text-[10px] font-extrabold shadow-xs">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Active User Profile & Logout */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-700">
                  <User className="h-3.5 w-3.5 text-teal-600" />
                  <div className="text-left">
                    <span className="font-bold text-slate-800 block text-xs leading-none">
                      {currentUser.full_name || 'User'}
                    </span>
                    {currentUser.designation && (
                      <span className="text-[10px] text-teal-700 font-semibold block leading-tight mt-0.5">
                        {currentUser.designation}
                      </span>
                    )}
                  </div>
                  <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${ROLE_CONFIGS[currentUser.role]?.badgeClass || 'bg-slate-200 text-slate-700'}`}>
                    {currentUser.persona_type ? currentUser.persona_type.replace('_', ' ') : (ROLE_CONFIGS[currentUser.role]?.label || currentUser.role)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out of session"
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            </div>


            
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* TAB 1: OVERVIEW / ROLE-DEDICATED LANDING DASHBOARD */}
        {activeTab === 'overview' && (
          <>
            {currentUser.role === 'NORMAL_USER' && (
              <UnifiedDoaUserDashboard
                userStats={userDashboardStats}
                currentUser={currentUser}
                kpis={kpis}
                onNavigateTab={(tabId) => {
                  setActiveTab(tabId);
                  setSelectedRecord(null);
                }}
                onInspectCR={(cr) => handleInspectDiff(cr)}
                onRefreshData={() => {
                  loadDoaRecords();
                  loadChangeRequests();
                  loadRoleDashboardData();
                  loadDashboardSummary();
                }}
              />
            )}

            {currentUser.role === 'GOVERNANCE_TEAM' && (
              <GovernanceTeamDashboard
                govStats={govDashboardStats}
                currentUser={currentUser}
                onNavigateTab={(tabId) => {
                  setActiveTab(tabId);
                  setSelectedRecord(null);
                }}
                onInspectCR={(cr) => handleInspectDiff(cr)}
              />
            )}

            {currentUser.role === 'DOA_ADMINISTRATOR' && (
              <DoaAdminDashboard
                adminStats={doaAdminStats}
                currentUser={currentUser}
                onNavigateTab={(tabId) => {
                  setActiveTab(tabId);
                  setSelectedRecord(null);
                }}
                onInspectCR={(cr) => handleInspectDiff(cr)}
                onApproveCR={(crId) => handleApproveCR(crId)}
                onPublishCR={(crId) => handlePublishCR(crId)}
                onRejectCR={(crId) => handleRejectCR(crId)}
                onNewRequest={() => {
                  setActiveTab('request');
                  setActionMode('Add');
                }}
              />
            )}

            {(currentUser.role === 'SYSTEM_ADMINISTRATOR' || currentUser.role === 'ADMIN') && (
              <SystemAdminDashboard
                sysStats={sysAdminStats}
                currentUser={currentUser}
                onNavigateTab={(tabId) => {
                  setActiveTab(tabId);
                  setSelectedRecord(null);
                }}
                onRefresh={loadRoleDashboardData}
              />
            )}
          </>
        )}

        {/* TAB 2: SEARCH DOA */}
        {activeTab === 'search' && (
          <div className="space-y-6 animate-fade-in">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Delegation Matrix Explorer</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Search, filter, and inspect finance &amp; risk authority layers. Click any row to inspect the full governance breakdown.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-medium">
                  Showing <span className="font-bold text-teal-600">{filteredRecords.length}</span> of {doaRecords.length} records
                </span>
                {['NORMAL_USER', 'DOA_ADMINISTRATOR', 'ADMIN'].includes(currentUser.role) && (
                  <button
                    onClick={() => {
                      setActiveTab('request');
                      setActionMode('Add');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Request
                  </button>
                )}
              </div>
            </div>

            {/* Requestor Simple Status Tracker (Requirement 1 & Task Alignment) */}
            {currentUser?.persona_type === 'FRONTEND_USER' && changeRequests.length > 0 && (
              <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-teal-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 border border-teal-500/40 rounded-xl text-teal-300">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-300">
                        Your Authored Request Tracker
                      </span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-white/10 text-white">
                        {changeRequests[0].id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium mt-0.5">
                      Proposal: <strong>"{changeRequests[0].rationale || 'Authority update'}"</strong> &bull; Status: <span className="text-teal-300 font-bold">{changeRequests[0].status}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleInspectDiff(changeRequests[0])}
                  className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Check Submission Comparison</span>
                </button>
              </div>
            )}

            {/* Filter Section - Function & Business Line Dropdowns */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  Function &amp; Decision Filters
                </span>
                {(filterParentFunction !== 'All' || filterChildBusinessLine !== '' || searchQuery !== '') && (
                  <button 
                    onClick={handleClearFilters}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Function Dropdown (Risk / Finance / All) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Function
                  </label>
                  <select 
                    value={filterParentFunction}
                    onChange={(e) => {
                      setFilterParentFunction(e.target.value);
                      setFilterChildBusinessLine(''); // reset child when parent changes
                    }}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-700"
                  >
                    <option value="All">All Functions</option>
                    <option value="Finance">Finance</option>
                    <option value="Risk">Risk</option>
                  </select>
                </div>

                {/* Business Line / Category Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Business Line / Risk Factor
                  </label>
                  <select 
                    value={filterChildBusinessLine}
                    onChange={(e) => setFilterChildBusinessLine(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  >
                    <option value="">All Categories under {filterParentFunction === 'All' ? 'All Functions' : filterParentFunction}</option>
                    {availableChildCategoriesForFilter.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Decision Search Query */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Search Specific Decision Area</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Type keyword, ID, authority code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 pl-9 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[620px] sticky-scrollbar">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-800 text-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold text-center w-12 border-b border-slate-700">No.</th>
                      <th className="py-3.5 px-4 font-semibold w-24 border-b border-slate-700">Function</th>
                      <th className="py-3.5 px-4 font-semibold w-20 border-b border-slate-700">Type</th>
                      <th className="py-3.5 px-4 font-semibold border-b border-slate-700">Decision Area</th>
                      <th className="py-3.5 px-4 font-semibold border-b border-slate-700 w-64">Proposed Authority Chain</th>
                      <th className="py-3.5 px-4 font-semibold text-center w-24 border-b border-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Info className="h-8 w-8 text-slate-300" />
                            <span>No records match your selected criteria</span>
                            <button 
                              onClick={handleClearFilters}
                              className="text-xs text-teal-600 hover:text-teal-700 font-semibold underline mt-2"
                            >
                              Reset filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      Object.keys(groupedRecords).map(category => {
                        const recsInGroup = groupedRecords[category];
                        if (!recsInGroup || recsInGroup.length === 0) return null;
                        
                        const isRiskCat = functionTaxonomy.Risk.includes(category);

                        return (
                          <React.Fragment key={category}>
                            {/* Category Grouping Header */}
                            <tr className={isRiskCat ? "bg-teal-50/70 border-y border-teal-100/60" : "bg-blue-50/70 border-y border-blue-100/60"}>
                              <td colSpan="6" className="py-2.5 px-4 font-bold text-slate-700 text-xs tracking-wide">
                                <span className={`uppercase text-[10px] mr-2 font-extrabold tracking-widest ${isRiskCat ? 'text-teal-700' : 'text-blue-700'}`}>
                                  {isRiskCat ? 'Risk Domain:' : 'Finance Domain:'}
                                </span>
                                {category}
                                <span className="ml-2 text-[10px] text-slate-400 font-normal">({recsInGroup.length} rules)</span>
                              </td>
                            </tr>
                            
                            {/* Records in Category */}
                            {recsInGroup.map((record) => {
                              const isReg = record.regulatory === 'Y' || isRegulatoryMandated(record.decisionArea);
                              const isRisk = record.parentFunction === 'Risk' || record.function === 'Risk';

                              return (
                                <tr 
                                  key={record.id}
                                  onClick={() => setSelectedRecord(record)}
                                  className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                                >
                                  {/* ID / No. */}
                                  <td className="py-3 px-4 text-center font-bold text-slate-400 text-xs border-r border-slate-100">
                                    #{record.id}
                                  </td>
                                  
                                  {/* Function */}
                                  <td className="py-3 px-4 font-semibold text-xs">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ${
                                      isRisk 
                                        ? 'bg-teal-50 text-teal-700 border border-teal-200/50' 
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                                    }`}>
                                      {record.parentFunction || record.function}
                                    </span>
                                  </td>

                                  {/* Key/Non-Key */}
                                  <td className="py-3 px-4 text-xs font-semibold">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                      record.keyNonKey === 'Key' 
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200/50' 
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {record.keyNonKey}
                                    </span>
                                  </td>

                                  {/* Decision Area */}
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 group-hover:text-teal-600 transition-colors">
                                        {record.decisionArea}
                                      </span>
                                      
                                      <div className="flex items-center gap-2 mt-1">
                                        {isReg && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600 uppercase bg-rose-50 border border-rose-200/40 px-1.5 py-0.2 rounded">
                                            Regulatory Mandated
                                          </span>
                                        )}
                                        {record.isCustom && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 border border-emerald-200/40 px-1.5 py-0.2 rounded">
                                            New Proposal
                                          </span>
                                        )}
                                        {record.isModified && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 uppercase bg-blue-50 border border-blue-200/40 px-1.5 py-0.2 rounded">
                                            Modified
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Proposed Authority Chain */}
                                  <td className="py-3 px-4">
                                    <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                      <span className="text-teal-600 flex-shrink-0 font-bold">↳</span>
                                      <span className="truncate" title={record.compositeAuthority || record.shareholders || record.boardOfDirectors}>
                                        {record.compositeAuthority || record.shareholders || record.boardOfDirectors || 'A'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Actions: Role-based Operations */}
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      {['NORMAL_USER', 'DOA_ADMINISTRATOR', 'ADMIN'].includes(currentUser.role) ? (
                                        <>
                                          <button
                                            title="Propose Rule Modification"
                                            onClick={() => {
                                              setActionMode('Modify');
                                              setSelectedModifyId(record.id);
                                              handleModifySelect(record.id);
                                              setActiveTab('request');
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </button>
                                          <button
                                            title="Propose Rule Deletion"
                                            onClick={() => setDeleteModalRecord(record)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          title="Inspect Governance Rule"
                                          onClick={() => setSelectedRecord(record)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NEW REQUEST (Formerly Request Change) */}
        {activeTab === 'request' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Title Section */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">New Request / DoA Amendment</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Submit a new proposal, modify existing thresholds, or delete an outdated delegation rule.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                Governance Workflow
              </span>
            </div>

            {/* Action Mode Selector with Explicit Delete Proposal */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full border border-slate-200/80 shadow-xs">
              {[
                { id: 'Add', label: 'Add Proposal', icon: Plus, activeBg: 'bg-white text-emerald-600 shadow-sm border border-emerald-100' },
                { id: 'Modify', label: 'Modify Proposal', icon: Edit3, activeBg: 'bg-white text-blue-600 shadow-sm border border-blue-100' },
                { id: 'Delete', label: 'Delete Proposal', icon: Trash2, activeBg: 'bg-white text-rose-600 shadow-sm border border-rose-200' },
              ].map(mode => {
                const Icon = mode.icon;
                const isActive = actionMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setActionMode(mode.id);
                      setSelectedModifyId('');
                      if (mode.id === 'Add') {
                        setFormData({
                          parentFunction: 'Finance',
                          businessLine: 'Bank Capital and Capital Management',
                          decisionArea: '',
                          keyNonKey: 'Key',
                          regulatory: 'N',
                          authority: 'Shareholders (A)',
                          rationale: ''
                        });
                      }
                    }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      isActive 
                        ? mode.activeBg 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                
                {/* Search & Select logic for Modify and Delete */}
                {(actionMode === 'Modify' || actionMode === 'Delete') && (
                  <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="h-4 w-4 text-teal-600" />
                      Select Target Rule to {actionMode === 'Delete' ? 'Delete Proposal' : 'Modify'}
                    </label>
                    <select
                      value={selectedModifyId}
                      onChange={(e) => handleModifySelect(e.target.value)}
                      required
                      className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                    >
                      <option value="">-- Choose an existing decision row from DoA store --</option>
                      {doaRecords.map(rec => (
                        <option key={rec.id} value={rec.id}>
                          #{rec.id} [{rec.parentFunction || rec.function}] [{rec.category || rec.businessLine}] - {rec.decisionArea.substring(0, 65)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* DELETE MODE SUMMARY BOX */}
                {actionMode === 'Delete' && selectedModifyId && (
                  <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                      <span>Ready to submit proposal for rule deletion</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      You are drafting a proposal to remove rule <strong className="font-extrabold">#{selectedModifyId}</strong> ({formData.decisionArea}) from the active delegation authority matrix.
                    </p>
                    <div className="text-xs text-slate-600 bg-white/80 p-3 rounded-lg border border-rose-100">
                      <div><strong className="text-slate-700">Function:</strong> {formData.parentFunction} ➔ {formData.businessLine}</div>
                      <div className="mt-1"><strong className="text-slate-700">Authority:</strong> {formData.authority}</div>
                    </div>
                  </div>
                )}

                {/* Form Fields container */}
                <div className={`space-y-5 ${actionMode === 'Delete' ? 'opacity-60 pointer-events-none' : ''}`}>
                  
                  {/* Function & Business Line Dropdowns (2 Dropdowns) */}
                  <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-teal-600" />
                        Function / Business Line
                      </span>
                      <span className="text-[10px] text-teal-600 font-semibold uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50">
                        Governance Domain
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Function Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600">
                          Function
                        </label>
                        <select 
                          value={formData.parentFunction}
                          onChange={(e) => {
                            const newParent = e.target.value;
                            const newCategories = functionTaxonomy[newParent] || [];
                            setFormData(prev => ({
                              ...prev,
                              parentFunction: newParent,
                              businessLine: newCategories[0] || ''
                            }));
                          }}
                          required
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        >
                          <option value="Risk">Risk</option>
                          <option value="Finance">Finance</option>
                        </select>
                      </div>

                      {/* Business Line / Risk Factor Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600">
                          Business Line / Risk Factor
                        </label>
                        <select
                          value={formData.businessLine}
                          onChange={(e) => setFormData(prev => ({ ...prev, businessLine: e.target.value }))}
                          required
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        >
                          {availableChildCategoriesForForm.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Decision Area Content */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Decision Area / Authority Description
                    </label>
                    <input 
                      type="text"
                      value={formData.decisionArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, decisionArea: e.target.value }))}
                      placeholder="e.g. Approve single obligor credit limit for wholesale portfolio above USD 50 million"
                      required={actionMode !== 'Delete'}
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                  </div>

                  {/* Key/Non-Key & Regulatory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Decision Classification
                      </label>
                      <select
                        value={formData.keyNonKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, keyNonKey: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      >
                        <option value="Key">Key Decision</option>
                        <option value="Non-Key">Non-Key Decision</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Regulatory Mandated
                      </label>
                      <select
                        value={formData.regulatory}
                        onChange={(e) => setFormData(prev => ({ ...prev, regulatory: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      >
                        <option value="N">No (Internal Corporate Governance)</option>
                        <option value="Y">Yes (Central Bank / CBB Mandated)</option>
                      </select>
                    </div>
                  </div>

                  {/* Proposed Authority Section with Custom Radio Dropdowns */}
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-teal-50/20 border border-slate-200 rounded-2xl space-y-4 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <SlidersHorizontal className="h-4 w-4 text-teal-600" />
                          PROPOSED AUTHORITY BUILDER
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Click any dropdown to select an option via radio button, then click the round <span className="font-bold text-teal-700">(+)</span> button to add to the delegation chain.
                        </p>
                      </div>
                      
                      {/* Round toggle button for builder expansion */}
                      <button
                        type="button"
                        onClick={() => setIsChildOpen(prev => !prev)}
                        className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 text-teal-700 hover:bg-teal-50 rounded-full shadow-xs transition-all"
                      >
                        <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
                        {isChildOpen ? 'Hide Builder Steps' : 'Open Round Stepper (+)'}
                      </button>
                    </div>

                    {isChildOpen && (
                      <div className="space-y-4 animate-fade-in w-full">
                        {/* 3-Column Radio Dropdowns - Perfectly Aligned with textboxes below */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-end">
                          
                          {/* Column 1: Authority Body Dropdown */}
                          <div className="space-y-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 block">
                              Authority Body
                            </label>
                            <RadioDropdown
                              selectedValue={selectedAuthParent}
                              options={authorityTaxonomy.parents.map(p => ({ value: p.id, label: p.name }))}
                              onChange={(val) => handleAuthParentChange(val)}
                              accentColor="teal"
                            />
                          </div>

                          {/* Column 2: Specific Body / Role Dropdown */}
                          <div className="space-y-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 block truncate">
                              {currentAuthParentDef.hasChildDropdown ? currentAuthParentDef.childLabel || 'Specific Body / Role' : 'Specific Body / Role'}
                            </label>
                            <RadioDropdown
                              selectedValue={selectedAuthChild}
                              options={(currentAuthParentDef.children || []).map(c => ({ value: c.code, label: c.name }))}
                              onChange={(val) => setSelectedAuthChild(val)}
                              disabled={!currentAuthParentDef.hasChildDropdown}
                              disabledPlaceholder={`Direct: ${currentAuthParentDef.name}`}
                              accentColor="indigo"
                            />
                          </div>

                          {/* Column 3: Action Operator Dropdown + Round (+) Button */}
                          <div className="space-y-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 block">
                              Action Operator
                            </label>
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex-1 min-w-0">
                                <RadioDropdown
                                  selectedValue={selectedAuthOperator}
                                  options={currentAuthParentDef.operators.map(op => ({ value: op.code, label: op.label }))}
                                  onChange={(val) => setSelectedAuthOperator(val)}
                                  accentColor="amber"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAddAuthorityToChain}
                                title="Add selected authority step to delegation chain"
                                className="h-[38px] w-[38px] flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-105 active:scale-95"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Visual Chain representation - Exact Width Alignment */}
                        <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 w-full shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Active Proposed Authority Chain (Click x on any pill to remove)
                          </span>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {authorityChain.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">No authority steps added yet. Click the round (+) button above to add steps.</span>
                            ) : (
                              authorityChain.map((item, idx) => (
                                <React.Fragment key={idx}>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs rounded-full shadow-xs">
                                    <span>{item.display}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveFromChain(idx)}
                                      className="text-teal-400 hover:text-rose-600 rounded-full"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </span>
                                  {idx < authorityChain.length - 1 && (
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Authority preview input */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Composite Authority String
                      </label>
                      <input 
                        type="text"
                        value={formData.authority}
                        onChange={(e) => setFormData(prev => ({ ...prev, authority: e.target.value }))}
                        placeholder="e.g. BoD (A) ➔ BRPC (E1) ➔ GCFO (R)"
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                      />
                    </div>
                  </div>

                </div>

                {/* Rationale (Mandatory for change control) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Rationale for Request / Proposal Justification
                  </label>
                  <textarea 
                    rows="2"
                    value={formData.rationale}
                    onChange={(e) => setFormData(prev => ({ ...prev, rationale: e.target.value }))}
                    placeholder="State justification, audit recommendations, risk committee mandates or CBB references..."
                    required
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
                  ></textarea>
                </div>

                {/* Operational Impact Analysis (For Process & Dept Owners) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Operational &amp; Process Impact Assessment</span>
                    <span className="text-[10px] text-teal-600 font-semibold lowercase">Optional / Process Owner review</span>
                  </label>
                  <textarea 
                    rows="2"
                    value={formData.operationalImpact || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, operationalImpact: e.target.value }))}
                    placeholder="Describe how this change affects ERP controls, SLA processing times, segregation of duties, or departmental handovers..."
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
                  ></textarea>
                </div>

                {/* Document Upload Feature (Functionality 3) */}
                <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-teal-600" />
                      Attach Governance Evidence / Policy Document
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">PDF / Board Resolution / Charter Excerpt</span>
                  </label>

                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="file"
                      id="doa-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0];
                          setFormData(prev => ({
                            ...prev,
                            attachedFile: { name: f.name, size: `${Math.round(f.size / 1024)} KB` }
                          }));
                          addToast(`Attached document: ${f.name}`, 'info');
                        }
                      }}
                    />
                    <label
                      htmlFor="doa-file-upload"
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5 text-teal-600" /> Choose Document
                    </label>

                    {formData.attachedFile ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {formData.attachedFile.name} ({formData.attachedFile.size})
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No document attached yet</span>
                    )}
                  </div>
                </div>

                {/* Submit Action Buttons - Dynamic based on Mode */}
                <div>
                  {actionMode === 'Add' && (
                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm tracking-wide bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Submit Add Proposal
                    </button>
                  )}

                  {actionMode === 'Modify' && (
                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm tracking-wide bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" /> Submit Modify Proposal
                    </button>
                  )}

                  {actionMode === 'Delete' && (
                    <button
                      type="submit"
                      disabled={!selectedModifyId}
                      className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm tracking-wide bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Proposal
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>
        )}

        {/* TAB 4: CHANGE QUEUE & GOVERNANCE WORKFLOW */}

        {activeTab === 'queue' && (
          <div className="space-y-6 animate-fade-in">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Governance Change Queue</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Controlled approval queue: inspect field-level Diffs, review rationale, approve, reject, and publish active master versions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-medium">
                  Total Requests: <span className="font-bold text-teal-600">{changeRequests.length}</span>
                </span>
                <button
                  onClick={loadChangeRequests}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </div>

            {/* Change Requests Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-800 text-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold w-24">CR ID</th>
                      <th className="py-3.5 px-4 font-semibold w-24">Type</th>
                      <th className="py-3.5 px-4 font-semibold w-24">Target DOA</th>
                      <th className="py-3.5 px-4 font-semibold">Requester &amp; Details</th>
                      <th className="py-3.5 px-4 font-semibold w-32 text-center">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-center w-48">Governance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {changeRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <GitPullRequest className="h-8 w-8 text-slate-300" />
                            <span>No change requests submitted yet.</span>
                            <button
                              onClick={() => {
                                setActiveTab('request');
                                setActionMode('Add');
                              }}
                              className="text-xs text-teal-600 hover:text-teal-700 font-semibold underline mt-2"
                            >
                              Create a new change request
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      changeRequests.map((cr) => {
                        const isSubmitted = cr.status === 'SUBMITTED';
                        const isApproved = cr.status === 'APPROVED';
                        const isPublished = cr.status === 'PUBLISHED';
                        const isRejected = cr.status === 'REJECTED';

                        return (
                          <tr key={cr.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-700 text-xs">
                              {cr.id}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                cr.request_type === 'ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                cr.request_type === 'MODIFY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {cr.request_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-xs text-slate-700">
                              {cr.doa_id ? `#${cr.doa_id}` : 'New Record'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-xs text-slate-800">
                                  {cr.proposed_value?.decision_area || cr.proposed_value?.decisionArea || cr.rationale || 'Change Request proposal'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  By {cr.requester_email} &bull; {cr.department || 'Governance'} &bull; Base v{cr.base_version}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                isSubmitted ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                isApproved ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                isPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {cr.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Inspect Diff Button */}
                                <button
                                  type="button"
                                  onClick={() => handleInspectDiff(cr)}
                                  title="Inspect Current vs Proposed Field Differences"
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5 text-teal-600" /> Diff
                                </button>

                                {/* Admin / Approver Action Buttons */}
                                {(['ADMIN', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(currentUser.role) || currentUser.persona_type === 'APPROVER') && isSubmitted && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => triggerDecisionModal(cr.id, 'APPROVE')}
                                      title="Approve Change Request (Issue Formal Binding Decision)"
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                                    >
                                      <Check className="h-3.5 w-3.5" /> Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => triggerDecisionModal(cr.id, 'REJECT')}
                                      title="Reject Change Request (Issue Rejection with Rationale)"
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                                    >
                                      <X className="h-3.5 w-3.5" /> Reject
                                    </button>
                                  </>
                                )}

                                {['ADMIN', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(currentUser.role) && isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => handlePublishCR(cr.id)}
                                    title="Publish into Active Master Version"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                                  >
                                    <Send className="h-3 w-3" /> Publish
                                  </button>
                                )}


                                {isPublished && (
                                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                                    <CheckCheck className="h-3.5 w-3.5" /> Published
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
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL (Governance, DOA Admin, System Admin) */}
        {activeTab === 'audit' && ['ADMIN', 'SYSTEM_ADMINISTRATOR', 'DOA_ADMINISTRATOR', 'GOVERNANCE_TEAM'].includes(currentUser.role) && (
          <div className="space-y-6 animate-fade-in">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Compliance &amp; Governance Audit Trail</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Complete immutable ledger of all submissions, approvals, rejections, and version publications.
                </p>
              </div>
              <button
                onClick={loadAuditLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Logs
              </button>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[620px] sticky-scrollbar">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-800 text-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold w-20">Log #</th>
                      <th className="py-3.5 px-4 font-semibold w-36">Action</th>
                      <th className="py-3.5 px-4 font-semibold w-24">Entity</th>
                      <th className="py-3.5 px-4 font-semibold w-28">Record ID</th>
                      <th className="py-3.5 px-4 font-semibold w-48">Actor</th>
                      <th className="py-3.5 px-4 font-semibold">Commentary &amp; Details</th>
                      <th className="py-3.5 px-4 font-semibold w-40 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                          <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-xs font-mono text-slate-400">#{log.id}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action.includes('PUBLISH') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              log.action.includes('APPROVE') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              log.action.includes('SUBMIT') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-700">{log.entity}</td>
                          <td className="py-3 px-4 text-xs font-bold text-teal-700">{log.record_id}</td>
                          <td className="py-3 px-4 text-xs">
                            <div className="font-semibold text-slate-800">{log.user_email}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">{log.role}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {log.comment || 'System mutation record'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 text-right font-mono">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
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


      {/* Slide-over Detail Drawer / Inspector */}
      {selectedRecord && (
        <div className="fixed inset-0 overflow-hidden z-40 animate-fade-in">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            />
            
            {/* Drawer */}
            <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 border-l border-slate-200">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-teal-600">Rule Inspector</span>
                  <h3 className="font-extrabold text-slate-800 text-lg">Record Detail #{selectedRecord.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Decision Area (Core statement) */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Decision Area Description</h4>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    {selectedRecord.decisionArea}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Function Area</h5>
                    <span className="text-xs font-semibold text-slate-700">{selectedRecord.parentFunction || selectedRecord.function}</span>
                  </div>
                  
                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Line / Domain</h5>
                    <span className="text-xs font-semibold text-slate-700">{selectedRecord.category || selectedRecord.businessLine}</span>
                  </div>

                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decision Severity</h5>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${selectedRecord.keyNonKey === 'Key' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                      {selectedRecord.keyNonKey} Decision
                    </span>
                  </div>

                  <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regulatory mandated</h5>
                    <span className="text-xs font-semibold text-slate-700">
                      {selectedRecord.regulatory === 'Y' || isRegulatoryMandated(selectedRecord.decisionArea) ? 'Yes (Mandated)' : 'No (Internal)'}
                    </span>
                  </div>
                </div>

                {/* Policy & Regulatory Citations (Functionality 3 & 6) */}
                <div className="space-y-2 bg-gradient-to-br from-slate-50 to-teal-50/30 p-4 rounded-2xl border border-teal-200/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-teal-600" /> Policy, Charter &amp; Regulatory Citations
                    </h4>
                    <span className="text-[10px] font-bold text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200 shadow-2xs">
                      Linked Governance
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Internal Policy Reference</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {selectedRecord.policy_reference || selectedRecord.policyReference || `Internal Financial Policy §${(Number(selectedRecord.id) % 12 || 1) + 1}.4 (Delegated Caps)`}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Committee Charter Provision</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {selectedRecord.charter_section || selectedRecord.charterSection || `Governance Charter Schedule B, Article ${(Number(selectedRecord.id) % 8 || 1) + 1}`}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regulatory Framework &amp; Mandate</span>
                      <span className="font-semibold text-rose-700 mt-0.5 flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                        {selectedRecord.regulatory_requirement || (selectedRecord.regulatory === 'Y' ? 'Central Bank Regulatory Framework (CBR-Gov §44)' : 'Internal Corporate Governance Mandate')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attached Context Documents (Functionality 3) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-slate-500" /> Attached Policy &amp; Resolution Documents
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      PDF Evidence
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-teal-600" />
                        <div>
                          <span className="font-bold text-slate-800 block">DOA_Charter_Extract_Ref_{selectedRecord.id}.pdf</span>
                          <span className="text-[10px] text-slate-400">Board Mandate &bull; 420 KB &bull; Verified</span>
                        </div>
                      </div>
                      <a
                        href="#preview"
                        onClick={(e) => {
                          e.preventDefault();
                          addToast(`Opening attached document for Authority #${selectedRecord.id}`, 'info');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition-all"
                      >
                        Inspect
                      </a>
                    </div>
                  </div>
                </div>

                {/* Full Authority Approval Flow */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Composite Delegation Flow</h4>
                  <div className="p-3.5 bg-teal-50/60 border border-teal-200/60 rounded-xl text-xs font-bold text-teal-900 font-mono">
                    {selectedRecord.compositeAuthority || selectedRecord.composite_authority || selectedRecord.shareholders || selectedRecord.boardOfDirectors || 'A'}
                  </div>
                </div>

                {/* Specific Roles breakdown */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Governance Bodies Breakdown</h4>
                  
                  <div className="space-y-2 border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {[
                      { role: 'Shareholders', val: selectedRecord.shareholders },
                      { role: 'Board of Directors (BoD)', val: selectedRecord.boardOfDirectors },
                      { role: 'Board Committees', val: [selectedRecord.boardCommittees, selectedRecord.boardCommitteesOp, selectedRecord.boardCommittees2, selectedRecord.boardCommittees2Op].filter(Boolean).join(' ') },
                      { role: 'GCEO', val: selectedRecord.gceo },
                      { role: 'CEO', val: selectedRecord.ceo },
                      { role: 'Management Committees', val: [selectedRecord.mgmtCommittees, selectedRecord.mgmtCommitteesOp, selectedRecord.mgmtCommittees2].filter(Boolean).join(' ') },
                      { role: 'C-Level Management', val: [selectedRecord.cLevel1, selectedRecord.cLevel1Op, selectedRecord.cLevel2, selectedRecord.cLevel2Op].filter(Boolean).join(' ') },
                    ].map(item => (
                      <div key={item.role} className="flex items-center justify-between p-3 bg-slate-50/20 text-xs">
                        <span className="font-semibold text-slate-500">{item.role}</span>
                        {item.val ? (
                          <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200/50 text-teal-800 font-extrabold rounded shadow-xs text-[11px]">
                            {item.val}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium italic">Not Delegated</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Version History Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Version History (Audit Snapshots)</h4>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Active: v{selectedRecord.currentVersion || selectedRecord.current_version || 1}
                    </span>
                  </div>
                  
                  {recordVersions.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
                      Base version 1 (active master)
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recordVersions.map((v) => (
                        <div 
                          key={v.id} 
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                            v.status === 'PUBLISHED' 
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>Version {v.version_number}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-extrabold ${
                                v.status === 'PUBLISHED' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {v.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              By {v.created_by || 'Admin'} &bull; Effective: {v.effective_date || '2026-01-01'}
                            </div>
                          </div>
                          {v.change_request_id && (
                            <span className="text-[10px] font-mono text-teal-700 font-bold bg-white px-2 py-1 rounded border border-slate-200">
                              {v.change_request_id}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes & Rationale */}
                {(selectedRecord.comments || selectedRecord.rationale) && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Governance Rationale &amp; Comments</h4>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg italic">
                      {selectedRecord.comments || selectedRecord.rationale}
                    </p>
                  </div>
                )}

              </div>


              {/* Footer with Role-based Actions */}
              <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                {['NORMAL_USER', 'DOA_ADMINISTRATOR', 'ADMIN'].includes(currentUser.role) ? (
                  <>
                    <button
                      onClick={() => {
                        setActionMode('Modify');
                        setSelectedModifyId(selectedRecord.id);
                        handleModifySelect(selectedRecord.id);
                        setActiveTab('request');
                        setSelectedRecord(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Edit3 className="h-4 w-4" /> Edit Authority
                    </button>
                    <button
                      onClick={() => {
                        const rec = selectedRecord;
                        setSelectedRecord(null);
                        setDeleteModalRecord(rec);
                      }}
                      className="py-2.5 px-4 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Proposal
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="w-full py-2.5 bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    Close Rule Inspector
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DIFF COMPARISON MODAL */}
      {activeDiffCR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60">
                  <GitPullRequest className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Proposal Diff Inspector</h3>
                    <span className="px-2 py-0.2 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                      {activeDiffCR.id}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                      activeDiffCR.request_type === 'ADD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      activeDiffCR.request_type === 'MODIFY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {activeDiffCR.request_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Target DOA: {activeDiffCR.doa_id ? `#${activeDiffCR.doa_id}` : 'New Record'} &bull; Base Version: v{activeDiffCR.base_version}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveDiffCR(null);
                  setDiffDetails(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Persona Tailored Comparison View */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Concurrency / Stale Warning if applicable */}
              {diffDetails?.is_stale && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 font-semibold">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Warning: The live master DOA record has been updated to v{diffDetails.current_doa_version}. This change request was authored against v{diffDetails.base_version}.
                  </span>
                </div>
              )}

              {/* Persona Comparison Perspective Header */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  {currentUser?.persona_type === 'FRONTEND_USER' ? 'Requestor Simple Status Tracker' :
                   currentUser?.persona_type === 'APPROVER' || currentUser?.role === 'DOA_ADMINISTRATOR' ? 'Executive Threshold & Policy Decision Card' :
                   'Risk & Compliance Technical Comparison (Current vs Proposed)'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-white border border-slate-200 text-teal-800">
                  Lifecycle: {activeDiffCR.status}
                </span>
              </div>

              {/* Mandatory Business Justification Card (Requirement 1) */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Mandatory Business Justification
                </span>
                <p className="text-xs font-semibold text-slate-800 italic">
                  "{activeDiffCR.rationale || 'No justification commentary provided.'}"
                </p>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Author: {activeDiffCR.requester_email} ({activeDiffCR.department || 'Governance'})</span>
                  <span>Effective Date: <strong>2026-01-01</strong></span>
                </div>
              </div>

              {/* Operational & Process Impact (if provided) */}
              {activeDiffCR.operational_impact && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">
                    Operational &amp; Process Impact Assessment
                  </span>
                  <p className="text-blue-950 font-medium italic">
                    "{activeDiffCR.operational_impact}"
                  </p>
                </div>
              )}

              {/* VIEW A: FOR REQUESTORS (Simple comparison status) */}
              {currentUser?.persona_type === 'FRONTEND_USER' ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Your Submitted Change vs Live Authority:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeDiffCR.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800' :
                      activeDiffCR.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      activeDiffCR.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      Current Stage: {activeDiffCR.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Live Authority (v{activeDiffCR.base_version})</span>
                      <p className="font-medium text-slate-700">
                        {activeDiffCR.current_value?.composite_authority || activeDiffCR.current_value?.compositeAuthority || 'Original rule'}
                      </p>
                    </div>
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <span className="text-[10px] font-bold text-teal-700 uppercase block mb-1">Your Proposed Authority</span>
                      <p className="font-bold text-teal-950">
                        {activeDiffCR.proposed_value?.composite_authority || activeDiffCR.proposed_value?.authority || 'Proposed update'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Your proposal is currently routed through the 2LoD Risk &amp; Governance review sequence.
                  </p>
                </div>
              ) : currentUser?.persona_type === 'APPROVER' || currentUser?.role === 'DOA_ADMINISTRATOR' ? (
                /* VIEW B: FOR EXECUTIVE APPROVERS (High-Level Summary Decision Card) */
                <div className="p-4 bg-gradient-to-br from-slate-50 to-teal-50/40 border border-teal-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Executive Decision Summary</span>
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold text-[10px]">
                      Requires Executive Sign-Off
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Decision Domain: <strong>{activeDiffCR.department || 'Finance'}</strong></span>
                      <span>Governance Impact: <strong className="text-amber-700">Threshold Adjustment</strong></span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Authority</span>
                        <span className="font-bold text-slate-700">{activeDiffCR.current_value?.composite_authority || 'Original'}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-teal-600" />
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 block uppercase">Proposed New Authority</span>
                        <span className="font-black text-teal-900">{activeDiffCR.proposed_value?.composite_authority || activeDiffCR.proposed_value?.authority || 'Updated'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Eye Workflow Verification Status Check */}
                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                        4-Eye Workflow &amp; Prerequisite Verification Check
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold">
                        Pre-Checks Completed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        <span>Business Justification logged</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        <span>Operational Impact evaluated</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        <span>2LoD Risk &amp; Governance vetted</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        <span>Optimistic Concurrency (v{activeDiffCR.base_version}) verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* VIEW C: FOR RISK & REVIEWERS (Field-by-Field Technical Diff Engine) */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Field Comparison (Automatic Change Highlighting)
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Comparing: Base v{activeDiffCR.base_version} vs Proposed
                    </span>
                  </div>
                  
                  {isLoadingDiff ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-teal-600" />
                      Calculating field differences...
                    </div>
                  ) : !diffDetails || diffDetails.diffs.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                      No field differences found or entire new proposal.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {diffDetails.diffs
                        .filter(d => d.change_type !== 'UNCHANGED' || activeDiffCR.request_type === 'ADD')
                        .map((d) => {
                          const isMod = d.change_type === 'MODIFIED';
                          const isAdd = d.change_type === 'ADDED';
                          const isDel = d.change_type === 'REMOVED';

                          return (
                            <div key={d.field} className="p-3 bg-white text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700">{d.field_label}</span>
                                <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                  isMod ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                  isAdd ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                  isDel ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {d.change_type}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                {/* Current Value */}
                                <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100/70">
                                  <span className="text-[9px] uppercase font-bold text-rose-500 block mb-0.5">Current Value</span>
                                  <span className="font-medium text-slate-700 break-words">
                                    {d.current_value ? String(d.current_value) : <em className="text-slate-400 font-normal">None</em>}
                                  </span>
                                </div>

                                {/* Proposed Value */}
                                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/70">
                                  <span className="text-[9px] uppercase font-bold text-emerald-600 block mb-0.5">Proposed Value</span>
                                  <span className="font-semibold text-slate-800 break-words">
                                    {d.proposed_value ? String(d.proposed_value) : <em className="text-slate-400 font-normal">None</em>}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer with Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Status: <strong className="text-slate-700">{activeDiffCR.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDiffCR(null);
                    setDiffDetails(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>

                {(['ADMIN', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(currentUser.role) || currentUser.persona_type === 'APPROVER') && activeDiffCR.status === 'SUBMITTED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerDecisionModal(activeDiffCR.id, 'REJECT')}
                      className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <X className="h-3.5 w-3.5" /> Reject with Rationale
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDecisionModal(activeDiffCR.id, 'APPROVE')}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve Proposal
                    </button>
                  </>
                )}

                {['ADMIN', 'DOA_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(currentUser.role) && activeDiffCR.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handlePublishCR(activeDiffCR.id)}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Publish New Version
                  </button>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Decision Rationale Modal (Obligatory Comment for APPROVE / REJECT) */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  decisionModal.action === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {decisionModal.action === 'APPROVE' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {decisionModal.action === 'APPROVE' ? 'Executive Formal Approval' : 'Executive Formal Rejection'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Change Request #{decisionModal.crId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModal({ isOpen: false, crId: null, action: 'APPROVE', rationale: '' })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Sign-Off Authority:</span>
                  <span className="text-teal-700">{currentUser?.full_name} ({currentUser?.designation || currentUser?.role})</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {decisionModal.action === 'APPROVE' 
                    ? 'Issuing a binding approval confirms that you have verified the 4-eye review checks and operational statements.' 
                    : 'Rejection requires detailed feedback indicating governance or policy conflicts.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Obligatory Rationale &amp; Decision Comments <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Audit-logged</span>
                </label>
                <textarea
                  rows={4}
                  value={decisionModal.rationale}
                  onChange={(e) => setDecisionModal(prev => ({ ...prev, rationale: e.target.value }))}
                  placeholder="State your formal justification, executive sign-off remarks, or required amendments..."
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionModal({ isOpen: false, crId: null, action: 'APPROVE', rationale: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={!decisionModal.rationale.trim()}
                className={`px-5 py-2 text-xs font-black rounded-xl text-white shadow-md transition-all flex items-center gap-1.5 ${
                  decisionModal.action === 'APPROVE' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
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


      {/* Footer Branding */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-6 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 text-sm">protiviti</span>
            <div className="h-1 w-1 bg-rose-600 rounded-full mt-1.5"></div>
            <span className="text-[10px] text-slate-500 font-medium">DoA Governance Matrix v2.0</span>
          </div>
          <div className="flex gap-4 text-[11px]">
            <span className="hover:text-slate-300 cursor-pointer">Risk Governance</span>
            <span className="hover:text-slate-300 cursor-pointer">Finance Limits</span>
            <span className="hover:text-slate-300 cursor-pointer">Internal Audit Standard</span>
          </div>
          <p className="text-[10px] text-slate-500">
            &copy; 2026 Protiviti Inc. All rights reserved. Confidential governance prototype.
          </p>
        </div>
      </footer>
    </div>
  );
}
