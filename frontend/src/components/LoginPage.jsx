import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  UserCheck, 
  CheckCircle2, 
  Layers, 
  KeyRound, 
  Database,
  Building,
  Sparkles,
  Users,
  Briefcase,
  GitPullRequest,
  CheckSquare,
  Eye,
  FileCheck,
  ShieldAlert,
  Search
} from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('dept.owner@doa.local');
  const [password, setPassword] = useState('User@123');
  const [selectedPersonaId, setSelectedPersonaId] = useState('dept_owner');
  const [activeTab, setActiveTab] = useState('normal_users'); // 'normal_users' | 'enterprise_admins'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const NORMAL_USER_PERSONAS = [
    {
      id: 'dept_owner',
      title: 'Department / Function Owner',
      name: 'Marcus Vance',
      designation: 'Head of Finance & Treasury',
      dept: 'Finance & Treasury',
      email: 'dept.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      icon: Briefcase,
      color: 'teal',
      duty: 'Review authorities relevant to Finance/Treasury; propose strategic revisions and departmental signing thresholds.'
    },
    {
      id: 'process_owner',
      title: 'Process Owner',
      name: 'Elena Rostova',
      designation: 'P2P & Procurement Lead',
      dept: 'Supply Chain Operations',
      email: 'process.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'PROCESS_OWNER',
      icon: Layers,
      color: 'blue',
      duty: 'Review authorities linked to operational processes (P2P/Capex) and provide operational impact assessments.'
    },
    {
      id: 'authority_owner',
      title: 'Authority Owner',
      name: 'David Sterling',
      designation: 'Governance Counsel',
      dept: 'Legal & Board Secretariat',
      email: 'authority.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'AUTHORITY_OWNER',
      icon: ShieldCheck,
      color: 'indigo',
      duty: 'Review proposed changes to authorities assigned to specific executive roles, governance bodies or Board committees.'
    },
    {
      id: 'reviewer',
      title: 'Reviewer',
      name: 'Sophia Zhang',
      designation: 'Senior Risk Reviewer',
      dept: 'Enterprise Risk Management',
      email: 'reviewer@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'REVIEWER',
      icon: CheckSquare,
      color: 'cyan',
      duty: 'Review proposed Additions, Modifications, and Deletions; provide recommendations and clarification requests.'
    },
    {
      id: 'approver',
      title: 'Approver',
      name: 'Julian Hayes',
      designation: 'VP Finance (Exec Approver)',
      dept: 'Executive Management',
      email: 'approver@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'APPROVER',
      icon: UserCheck,
      color: 'emerald',
      duty: 'Approve or reject proposed DOA changes in strict accordance with configured organizational workflow rules.'
    },
    {
      id: 'frontend_user',
      title: 'Front-End User',
      name: 'Aiden Cole',
      designation: 'Commercial Analyst',
      dept: 'Commercial Operations',
      email: 'user@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'FRONTEND_USER',
      icon: Search,
      color: 'amber',
      duty: 'Search, view, and filter approved DOA records relevant to department or process; raise change proposals.'
    },
    {
      id: 'audit_readonly',
      title: 'Internal Audit / Compliance (Read-Only)',
      name: 'Claire Montgomery',
      designation: 'Senior Internal Auditor',
      dept: 'Internal Audit & Assurance',
      email: 'audit.readonly@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'AUDIT_READONLY',
      icon: Eye,
      color: 'violet',
      duty: 'Independent read-only access to approved records, historical snapshots, change workflows, and audit trail.'
    }
  ];

  const ENTERPRISE_ROLES = [
    {
      id: 'governance_team',
      title: 'Governance Team (2LoD)',
      name: 'Risk & Governance Reviewer',
      designation: '2LoD Governance Officer',
      dept: 'Enterprise Governance & Compliance',
      email: 'governance@doa.local',
      password: 'GovTeam@123',
      role: 'GOVERNANCE_TEAM',
      persona_type: 'REVIEWER',
      icon: ShieldAlert,
      color: 'rose',
      duty: 'Manage review queues, diff inspection, committee routing, and 2LoD compliance governance.'
    },
    {
      id: 'doa_admin',
      title: 'DOA Administrator',
      name: 'Chief Delegation Officer',
      designation: 'DOA Administrator',
      dept: 'Executive Office / DOA Governance',
      email: 'doaadmin@doa.local',
      password: 'DoaAdmin@123',
      role: 'DOA_ADMINISTRATOR',
      persona_type: 'APPROVER',
      icon: Sparkles,
      color: 'teal',
      duty: 'Executive approval, publish master versions (v1 ➔ v2), archive obsolete rules, optimistic lock oversight.'
    },
    {
      id: 'sysadmin',
      title: 'System Administrator',
      name: 'IT & System Administrator',
      designation: 'Platform Architect',
      dept: 'Information Technology / Systems',
      email: 'sysadmin@doa.local',
      password: 'SysAdmin@123',
      role: 'SYSTEM_ADMINISTRATOR',
      persona_type: 'AUDIT_READONLY',
      icon: Database,
      color: 'purple',
      duty: 'System telemetry, ETL database maintenance, security controls, and full tamper-evident audit logs.'
    }
  ];

  const currentList = activeTab === 'normal_users' ? NORMAL_USER_PERSONAS : ENTERPRISE_ROLES;

  const handleSelectPersona = (p) => {
    setSelectedPersonaId(p.id);
    setEmail(p.email);
    setPassword(p.password);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.login(email.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess({
          id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          persona_type: data.persona_type,
          designation: data.designation,
          department: data.department
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-900">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand & Portal Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl text-center relative z-10 mb-6">
        <div className="inline-flex items-center justify-center px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl mb-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-2xl tracking-tight text-white">protiviti</span>
            <div className="h-2.5 w-2.5 bg-rose-500 rounded-full mt-1.5 animate-pulse" />
            <span className="text-slate-500 font-light mx-1">|</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">DOA Governance Suite</span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Delegation of Authority (DOA) Governance Portal
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Two Lines of Defense (2LoD) Governance Matrix with Role-Based Access Control, Regulatory &amp; Policy Citations, and Designation Hierarchy.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-5xl px-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-slate-200/80 overflow-hidden">
          
          {/* Persona Category Segmented Control */}
          <div className="bg-slate-100/80 p-2 border-b border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-2xs border border-slate-200/60 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('normal_users');
                  handleSelectPersona(NORMAL_USER_PERSONAS[0]);
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'normal_users'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Normal User Personas (7 Roles)</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  activeTab === 'normal_users' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  7
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('enterprise_admins');
                  handleSelectPersona(ENTERPRISE_ROLES[0]);
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'enterprise_admins'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                <span>Governance &amp; Admin Team</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  activeTab === 'enterprise_admins' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  3
                </span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-medium px-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span>Click any card for 1-Click Fast Auth</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            
            {/* Left Column: Interactive Persona Card Selector */}
            <div className="lg:col-span-7 p-6 sm:p-7 space-y-3.5 max-h-[620px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeTab === 'normal_users' ? 'Select Normal User Persona' : 'Select Governance or Administrative Role'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeTab === 'normal_users'
                      ? 'Demonstrating distinct operational & compliance authorities configured for business stakeholders.'
                      : 'Executive, Reviewer, and System Administrator privileges for 2LoD governance.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentList.map((p) => {
                  const isSelected = selectedPersonaId === p.id && email === p.email;
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPersona(p)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left relative ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20'
                          : 'border-slate-200/80 hover:border-teal-300 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                          isSelected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {p.title}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700">
                              {p.name}
                            </span>
                          </div>

                          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                            {p.designation} &bull; <span className="text-slate-500">{p.dept}</span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {p.duty}
                          </p>

                          <div className="text-[10px] font-mono text-slate-400 mt-1.5 flex items-center justify-between">
                            <span>{p.email}</span>
                            <span className="text-[9px] font-sans font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Pass: User@123
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 pt-1">
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-teal-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-slate-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Authentication Form & Details */}
            <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between bg-slate-50/50">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600">
                    FastAPI REST Authentication
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-teal-600" />
                    Sign In with Selected Persona
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Credentials populate automatically upon clicking any role card.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. user@doa.local"
                        className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-600/25 transition-all duration-200 transform active:scale-98 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span>Authenticating...</span>
                      ) : (
                        <>
                          <span>Enter Governance Workspace</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Key Points Checklist Feature Preview */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 mt-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Key Built-in Capabilities
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span><strong>Designation Matrix:</strong> View CEO, BoD, C-Level authorities in 1 tab</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span><strong>Regulatory Linkages:</strong> Policy, Charter, &amp; CBR citations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span><strong>Management Reports:</strong> Active by Dept, Pending, Modified</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span><strong>HR System Live Sync:</strong> Acting authorities &amp; vacancy alerts</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Database className="h-3 w-3 text-slate-400" /> SQLite &bull; JWT Bearer
                </span>
                <span className="font-semibold text-slate-500">FastAPI Port 8000</span>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

