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
import nexusLogo from '../assets/nexus-logo.jpg';

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
      title: 'Department / Function Owner (Finance - Bahrain)',
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
      title: 'Department / Function Owner (Risk - Bahrain)',
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
      title: 'Department / Function Owner (Finance - KSA)',
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
      title: 'Process Owner',
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
      title: 'Authority Owner',
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
      title: 'Reviewer (2LoD Risk — Non-Proposer)',
      name: 'Sophia Zhang',
      designation: 'Senior Risk Reviewer',
      dept: 'Enterprise Risk Management',
      scope: 'Cross-Domain Review • No Propose CRUD',
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
      title: 'Approver (Executive — Non-Proposer)',
      name: 'Julian Hayes',
      designation: 'VP Finance (Exec Approver)',
      dept: 'Executive Management',
      scope: 'Cross-Domain Approval • No Propose CRUD',
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
      title: 'Requester',
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
      title: 'Internal Audit / Compliance (Read-Only)',
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
      scope: 'All Domains • Review & Publish (No Propose)',
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
      scope: 'All Domains & Entities • VAL-06 SoD Enforced',
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
      scope: 'IT Telemetry & Audit • Read-Only Business DOA',
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-900">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand & Portal Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl text-center relative z-10 mb-6">
        <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl mb-2 backdrop-blur-md">
          <img 
            src={nexusLogo} 
            alt="DoA Nexus" 
            className="h-8 w-8 object-contain rounded-lg shadow-xs" 
          />
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            DOA Nexus Login Portal
          </h1>
        </div>
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
                <span>Normal User Personas ({NORMAL_USER_PERSONAS.length} Users)</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  activeTab === 'normal_users' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {NORMAL_USER_PERSONAS.length}
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
                      ? 'Scoped by functional domain (Finance vs Risk), legal entity (Bahrain vs KSA), and CRUD authority.'
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
                            {p.scope && (
                              <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-[9px] font-extrabold text-teal-800 uppercase">
                                {p.scope}
                              </span>
                            )}
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
                              Pass: {p.password}
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
                    Login
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
                          <span>Login</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>


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
