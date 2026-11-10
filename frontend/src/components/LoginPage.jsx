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
import doaNexusBrand from '../assets/doa-nexus-brand.png';

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
      title: 'Department Owner (Finance - Bahrain)',
      name: 'Marcus Vance',
      designation: 'Head of Finance & Treasury',
      dept: 'Finance & Treasury',
      scope: 'Finance Only • ENT-BH-01',
      email: 'dept.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      icon: Briefcase,
      color: 'teal',
      duty: 'View & propose authorities strictly within Finance domain (Bahrain HQ); supervisory sign-off on Finance proposals.'
    },
    {
      id: 'risk_owner',
      title: 'Department Owner (Risk - Bahrain)',
      name: 'Tariq Al-Mansoor',
      designation: 'Head of Enterprise Credit & Risk',
      dept: 'Risk Management',
      scope: 'Risk Only • ENT-BH-01',
      email: 'risk.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      icon: ShieldAlert,
      color: 'teal',
      duty: 'View & propose authorities strictly within Risk domain (Bahrain HQ); supervisory sign-off on Risk proposals.'
    },
    {
      id: 'ksa_owner',
      title: 'Department Owner (Finance - KSA)',
      name: 'Nadia Al-Qahtani',
      designation: 'Head of Finance (KSA Subsidiary)',
      dept: 'Finance (KSA)',
      scope: 'Finance Only • ENT-KSA-01',
      email: 'ksa.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      icon: Building,
      color: 'teal',
      duty: 'View Finance DOAs and mutate ONLY KSA Subsidiary (ENT-KSA-01) Finance delegations; read-only on Bahrain HQ.'
    },
    {
      id: 'process_owner',
      title: 'Process Owner (P2P & Ops)',
      name: 'Elena Rostova',
      designation: 'P2P & Procurement Lead',
      dept: 'Supply Chain Operations',
      scope: 'Finance Only • ENT-BH-01',
      email: 'process.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'PROCESS_OWNER',
      icon: Layers,
      color: 'blue',
      duty: 'Review Finance operational processes (P2P/Capex), propose Finance updates, and endorse operational impact.'
    },
    {
      id: 'authority_owner',
      title: 'Authority Owner (Legal/Secretariat)',
      name: 'David Sterling',
      designation: 'Governance Counsel',
      dept: 'Legal & Board Secretariat',
      scope: 'Finance & Risk • ENT-BH-01',
      email: 'authority.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'AUTHORITY_OWNER',
      icon: ShieldCheck,
      color: 'indigo',
      duty: 'Cross-domain charter oversight; propose and verify authorities assigned to executive roles or Board committees.'
    },
    {
      id: 'reviewer',
      title: 'Reviewer (2LoD Risk)',
      name: 'Sophia Zhang',
      designation: 'Senior Risk Reviewer',
      dept: 'Enterprise Risk Management',
      scope: 'Cross-Domain Review • No Propose',
      email: 'reviewer@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'REVIEWER',
      icon: CheckSquare,
      color: 'cyan',
      duty: 'Review proposed Additions, Modifications, and Deletions; issue 2LoD recommendations (cannot author proposals).'
    },
    {
      id: 'approver',
      title: 'Approver (Executive Non-Proposer)',
      name: 'Julian Hayes',
      designation: 'VP Finance (Exec Approver)',
      dept: 'Executive Management',
      scope: 'Cross-Domain Approval • No Propose',
      email: 'approver@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'APPROVER',
      icon: UserCheck,
      color: 'emerald',
      duty: 'Approve or reject proposed DOA changes and Stage 2 exceptions (cannot author proposals or publish master).'
    },
    {
      id: 'frontend_user',
      title: 'Requester (Business Line Analyst)',
      name: 'Aiden Cole',
      designation: 'Business Line Analyst',
      dept: 'Commercial Operations',
      scope: 'Finance Only • Own CRs Only',
      email: 'user@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'FRONTEND_USER',
      icon: Search,
      color: 'amber',
      duty: 'Search Finance DOA records, raise Finance change proposals, and view/withdraw ONLY own submitted requests.'
    },
    {
      id: 'audit_readonly',
      title: 'Audit & Assurance (Read-Only)',
      name: 'Claire Montgomery',
      designation: 'Senior Internal Auditor',
      dept: 'Internal Audit & Assurance',
      scope: 'All Domains • Strictly Read-Only',
      email: 'audit.readonly@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'AUDIT_READONLY',
      icon: Eye,
      color: 'violet',
      duty: 'Independent read-only access to approved records, historical snapshots, change workflows, findings, and audit trail.'
    }
  ];

  const ENTERPRISE_ROLES = [
    {
      id: 'governance_team',
      title: 'Governance Team (2LoD)',
      name: 'Risk & Governance Reviewer',
      designation: '2LoD Governance Officer',
      dept: 'Enterprise Governance & Compliance',
      scope: 'All Domains • Review & Publish',
      email: 'governance@doa.local',
      password: 'GovTeam@123',
      role: 'GOVERNANCE_TEAM',
      persona_type: 'REVIEWER',
      icon: ShieldAlert,
      color: 'rose',
      duty: 'Manage review queues, diff inspection, committee routing, Stage 3 exception approvals, and controlled publication.'
    },
    {
      id: 'doa_admin',
      title: 'DOA Administrator',
      name: 'Chief Delegation Officer',
      designation: 'DOA Administrator',
      dept: 'Executive Office / DOA Governance',
      scope: 'All Domains & Entities • VAL-06 SoD',
      email: 'doaadmin@doa.local',
      password: 'DoaAdmin@123',
      role: 'DOA_ADMINISTRATOR',
      persona_type: 'APPROVER',
      icon: Sparkles,
      color: 'teal',
      duty: 'Executive approval, publish master versions (v1 ➔ v2), archive obsolete rules, subject to 4-eye SoD rules.'
    },
    {
      id: 'sysadmin',
      title: 'System Administrator',
      name: 'IT & System Administrator',
      designation: 'Platform Architect',
      dept: 'Information Technology / Systems',
      scope: 'IT Telemetry & Audit • Read-Only',
      email: 'sysadmin@doa.local',
      password: 'SysAdmin@123',
      role: 'SYSTEM_ADMINISTRATOR',
      persona_type: 'AUDIT_READONLY',
      icon: Database,
      color: 'purple',
      duty: 'System telemetry, ETL database maintenance, security controls, and audit logs (cannot mutate or approve DOAs).'
    }
  ];

  const currentList = activeTab === 'normal_users' ? NORMAL_USER_PERSONAS : ENTERPRISE_ROLES;
  const selectedPersona = currentList.find(p => p.id === selectedPersonaId && p.email === email) 
    || NORMAL_USER_PERSONAS.find(p => p.email === email)
    || ENTERPRISE_ROLES.find(p => p.email === email);

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
          department: data.department,
          entity_id: data.entity_id,
          allowed_domains: data.allowed_domains,
          permissions: data.permissions
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
    <div className="min-h-screen w-full bg-white flex flex-col justify-center p-3 sm:p-5 lg:p-6 font-sans text-slate-900">
      
      {/* Full-width screen-spread layout without outer card boundary */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch min-h-[calc(100vh-2.5rem)]">
        
        {/* Left Column: Blue Shaded Canvas with Horizontal KPI Role Cards */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-3xl p-5 sm:p-7 md:p-8 bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#38bdf8] text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
          {/* Ambient glass light effects */}
          <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-white/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Header: Enlarged DOA Nexus Logo & Persona Segmented Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
              <div className="inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3 bg-white rounded-2xl shadow-xl border border-white/60">
                <img 
                  src={doaNexusBrand} 
                  alt="DOA Nexus - Delegation of authority" 
                  className="h-10 sm:h-12 md:h-14 w-auto object-contain" 
                />
              </div>

              {/* Segmented Persona Category Tabs */}
              <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/20 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('normal_users');
                    handleSelectPersona(NORMAL_USER_PERSONAS[0]);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'normal_users'
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Normal Users ({NORMAL_USER_PERSONAS.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('enterprise_admins');
                    handleSelectPersona(ENTERPRISE_ROLES[0]);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'enterprise_admins'
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Governance &amp; Admin ({ENTERPRISE_ROLES.length})</span>
                </button>
              </div>
            </div>

            {/* Title & Instructions */}
            <div className="pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeTab === 'normal_users' ? 'Select Normal User Persona' : 'Select Governance or Administrative Role'}
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Click any card below to automatically populate credentials and switch perspective.
              </p>
            </div>

            {/* Horizontal Aligned KPI Persona Cards Grid (Strictly fits without scroll) */}
            <div className={`grid gap-3 pt-2 ${
              activeTab === 'normal_users' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 sm:grid-cols-3'
            }`}>
              {currentList.map((p, idx) => {
                const isSelected = selectedPersonaId === p.id && email === p.email;
                const Icon = p.icon;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 text-left relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-2xl ring-2 ring-white scale-[1.02]'
                        : 'bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur-md hover:scale-[1.01]'
                    }`}
                  >
                    {/* Top: Index badge, Name & Check indicator */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-white/25 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-xs font-bold truncate ${
                          isSelected ? 'text-slate-900' : 'text-white'
                        }`}>
                          {p.name}
                        </span>
                      </div>

                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-white/40 shrink-0" />
                      )}
                    </div>

                    {/* Middle: Title & Scope */}
                    <div className="my-0.5">
                      <div className={`text-[11px] font-semibold truncate ${
                        isSelected ? 'text-blue-700' : 'text-blue-100'
                      }`}>
                        {p.title}
                      </div>
                      {p.scope && (
                        <div className={`text-[10px] truncate font-medium ${
                          isSelected ? 'text-slate-500' : 'text-blue-200/90'
                        }`}>
                          {p.scope}
                        </div>
                      )}
                    </div>

                    {/* Bottom: Fast Auth Credential snippet */}
                    <div className={`flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1.5 border-t ${
                      isSelected ? 'border-slate-100' : 'border-white/10'
                    }`}>
                      <span className={`truncate max-w-[130px] ${
                        isSelected ? 'text-slate-400' : 'text-blue-200/80'
                      }`}>
                        {p.email}
                      </span>
                      <span className={`font-sans font-bold px-1.5 py-0.5 rounded text-[9px] ${
                        isSelected ? 'bg-slate-100 text-slate-600' : 'bg-white/20 text-white'
                      }`}>
                        {p.password}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


        </div>

        {/* Right Column: Clean White Authentication Form sitting directly on page */}
        <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-8 md:p-10 flex flex-col justify-center bg-white">
          <div className="w-full max-w-sm mx-auto space-y-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Lock className="h-6 w-6 text-blue-600" />
                Sign In
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter credentials or select any role card to sign in.
              </p>
            </div>

            {/* Active Selected Persona Highlight Pill */}
            {selectedPersona && (
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {selectedPersona.name}
                  </div>
                  <div className="text-[11px] text-blue-700 font-semibold truncate">
                    {selectedPersona.title}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@doa.local"
                    className="block w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xl shadow-blue-600/25 transition-all duration-200 transform active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to Governance Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
