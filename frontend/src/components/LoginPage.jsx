import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import proNexusBrandDark from '../assets/pro-nexus-brand-dark.png';
import doaHeroHarbour from '../assets/doa-hero-harbour.svg';

// Admin AI Avatars (Cropped edge-to-edge)
import avatarGovernance from '../assets/avatar-governance.jpg';
import avatarDoaAdmin from '../assets/avatar-doa-admin.jpg';
import avatarSysadmin from '../assets/avatar-sysadmin.jpg';

// Normal User AI Avatars (Cropped edge-to-edge from 9-avatar sheet)
import avatarNormal1 from '../assets/avatar-normal-1.jpg';
import avatarNormal2 from '../assets/avatar-normal-2.jpg';
import avatarNormal3 from '../assets/avatar-normal-3.jpg';
import avatarNormal4 from '../assets/avatar-normal-4.jpg';
import avatarNormal5 from '../assets/avatar-normal-5.jpg';
import avatarNormal6 from '../assets/avatar-normal-6.jpg';
import avatarNormal7 from '../assets/avatar-normal-7.jpg';
import avatarNormal8 from '../assets/avatar-normal-8.jpg';
import avatarNormal9 from '../assets/avatar-normal-9.jpg';

export default function LoginPage({ onLoginSuccess }) {
  const ENTITIES = [
    'AMB Bank B.S.C. – Bahrain (Parent Company)',
    'AMB Bank – Saudi Arabia (Subsidiary)',
    'AMB Bank – United Arab Emirates (Subsidiary)',
    'AMB Bank – Oman Branch',
    'AMB Bank – Jordan Branch',
    'AMB Bank – Qatar Branch',
    'AMB Bank – London Branch'
  ];

  const NORMAL_USER_PERSONAS = [
    {
      id: 'dept_owner',
      title: 'Department Owner (Finance - Bahrain)',
      name: 'Marcus Vance',
      email: 'dept.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      avatar: avatarNormal1
    },
    {
      id: 'risk_owner',
      title: 'Department Owner (Risk - Bahrain)',
      name: 'Tariq Al-Mansoor',
      email: 'risk.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      avatar: avatarNormal7
    },
    {
      id: 'ksa_owner',
      title: 'Department Owner (Finance - KSA)',
      name: 'Nadia Al-Qahtani',
      email: 'ksa.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'DEPT_OWNER',
      avatar: avatarNormal4
    },
    {
      id: 'process_owner',
      title: 'Process Owner (P2P & Ops)',
      name: 'Elena Rostova',
      email: 'process.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'PROCESS_OWNER',
      avatar: avatarNormal2
    },
    {
      id: 'authority_owner',
      title: 'Authority Owner (Legal/Secretariat)',
      name: 'David Sterling',
      email: 'authority.owner@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'AUTHORITY_OWNER',
      avatar: avatarNormal5
    },
    {
      id: 'reviewer',
      title: 'Reviewer (2LoD Risk)',
      name: 'Sophia Zhang',
      email: 'reviewer@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'REVIEWER',
      avatar: avatarNormal8
    },
    {
      id: 'approver',
      title: 'Approver (Executive Non-Proposer)',
      name: 'Julian Hayes',
      email: 'approver@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'APPROVER',
      avatar: avatarNormal3
    },
    {
      id: 'requester',
      title: 'Requester (Business Line Analyst)',
      name: 'Aiden Cole',
      email: 'user@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'FRONTEND_USER',
      avatar: avatarNormal6
    },
    {
      id: 'audit_readonly',
      title: 'Audit & Assurance (Read-Only)',
      name: 'Claire Montgomery',
      email: 'audit.readonly@doa.local',
      password: 'User@123',
      role: 'NORMAL_USER',
      persona_type: 'AUDIT_READONLY',
      avatar: avatarNormal9
    }
  ];

  const ENTERPRISE_ROLES = [
    {
      id: 'governance_team',
      title: 'Governance Team (2LoD Secretariat)',
      name: 'Claire Sterling',
      email: 'governance@doa.local',
      password: 'GovTeam@123',
      role: 'ADMIN',
      persona_type: 'GOVERNANCE_TEAM',
      avatar: avatarGovernance
    },
    {
      id: 'doa_admin',
      title: 'DOA Admin (Super Admin)',
      name: 'Alexander Vance',
      email: 'doaadmin@doa.local',
      password: 'DoaAdmin@123',
      role: 'ADMIN',
      persona_type: 'DOA_ADMIN',
      avatar: avatarDoaAdmin
    },
    {
      id: 'sysadmin',
      title: 'System Admin (Platform Operations)',
      name: 'Lucas Meyer',
      email: 'sysadmin@doa.local',
      password: 'SysAdmin@123',
      role: 'ADMIN',
      persona_type: 'SYSTEM_ADMIN',
      avatar: avatarSysadmin
    }
  ];

  const ALL_PERSONAS = [
    ...NORMAL_USER_PERSONAS,
    ...ENTERPRISE_ROLES
  ];

  const [selectedEntity, setSelectedEntity] = useState(ENTITIES[0]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('dept_owner');
  const [email, setEmail] = useState('dept.owner@doa.local');
  const [password, setPassword] = useState('User@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forgot Password Workflow State
  const [viewMode, setViewMode] = useState('signin'); // 'signin' | 'forgot_password'
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [devOtpCode, setDevOtpCode] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState(null);

  const handleSelectPersonaById = (personaId) => {
    setSelectedPersonaId(personaId);
    const persona = ALL_PERSONAS.find(p => p.id === personaId);
    if (persona) {
      setEmail(persona.email);
      setPassword(persona.password);
      setError(null);
    }
  };

  // Open Forgot Password workflow
  const handleOpenForgotPassword = () => {
    setViewMode('forgot_password');
    setForgotStep(1);
    setForgotEmail(email || '');
    setForgotOtp('');
    setDevOtpCode(null);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError(null);
    setForgotSuccessMsg(null);
  };

  const handleReturnToSignIn = () => {
    setViewMode('signin');
    setForgotStep(1);
    setForgotError(null);
    setForgotSuccessMsg(null);
  };

  // Step 1: Send OTP to work email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your work email ID.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccessMsg(null);
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      if (res.dev_otp) {
        setDevOtpCode(res.dev_otp);
      }
      setForgotStep(2);
      setForgotSuccessMsg(`Verification code sent to ${forgotEmail.trim()}`);
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotError(err.message || 'No account associated with this work email was found.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the complete 6-digit verification code.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccessMsg(null);
    try {
      const res = await api.verifyOtp(forgotEmail.trim(), forgotOtp.trim());
      setResetToken(res.reset_token);
      setForgotStep(3);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setForgotError(err.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await api.resetPassword(forgotEmail.trim(), resetToken, newPassword);
      setForgotStep(4);
      setEmail(forgotEmail.trim());
      setPassword(newPassword);
    } catch (err) {
      console.error('Reset password error:', err);
      setForgotError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess({
          token: data.access_token,
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          persona_type: data.persona_type,
          designation: data.designation,
          department: data.department,
          entity_id: data.entity_id,
          selected_entity: selectedEntity,
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
    <div className="h-screen w-screen flex flex-col justify-between font-sans text-slate-100 bg-[#071C2B] overflow-hidden select-none relative">

      {/* Background Animated SVG Vector Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src={doaHeroHarbour}
          alt="Governance Matrix Network"
          className="w-full h-full object-cover opacity-90 scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071C2B]/60 via-transparent to-[#071C2B]/80" />
      </div>

      {/* Top Navbar: Aligned to identical background shade with crisp contrast */}
      <header className="w-full bg-[#071C2B]/90 backdrop-blur-md border-b border-teal-500/25 px-6 sm:px-8 py-2 shrink-0 z-20 shadow-sm">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={proNexusBrandDark}
              alt="Pro Nexus"
              className="h-9 sm:h-11 w-auto object-contain transition-all"
            />
          </div>
          <div className="text-xs sm:text-sm font-semibold tracking-wide text-teal-200 drop-shadow-xs">
            Delegation of Authority Matrix
          </div>
        </div>
      </header>

      {/* Main Container: Compact, Centered to give background animation maximum visibility */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 min-h-0 overflow-y-auto">
        <div className="w-full max-w-[840px] bg-gradient-to-br from-slate-900/92 via-[#0b2240]/92 to-indigo-950/92 border border-cyan-400/25 rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative my-auto animate-fade-in overflow-hidden">

          {/* ========================================================================= */}
          {/* DYNAMIC CYAN/BLUE FLOWING LINES ACROSS OUTER DIV (DOA NEXUS THEME)        */}
          {/* ========================================================================= */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 420"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="blueGlowOuter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <style>{`
                  @keyframes travelOuterExact {
                    0% { stroke-dashoffset: 45; }
                    55% { stroke-dashoffset: -450; }
                    100% { stroke-dashoffset: -450; }
                  }
                  .outer-pulse-replica {
                    fill: none;
                    stroke: #38bdf8;
                    stroke-width: 1.6;
                    stroke-linecap: round;
                    stroke-dasharray: 45 450;
                    animation: travelOuterExact 5.2s linear infinite;
                  }
                  .outer-track-replica {
                    fill: none;
                    stroke: #0ea5e9;
                    stroke-width: 0.9;
                    opacity: 0.22;
                  }
                `}</style>
              </defs>

              {/* Exact Circuit Tracks weaved across outer div left section */}
              <g className="outer-track-replica">
                {/* Upper Left Branch */}
                <path d="M 30,60 H 140 V 30 H 260 V 75 H 350" />
                <path d="M 190,30 V 90 H 350" />

                {/* Mid-Left Branch (Passing above & around Zero Bottlenecks) */}
                <path d="M 20,165 H 120 V 135 H 240 V 180 H 340" />
                <path d="M 240,135 H 340" />

                {/* Lower-Mid Branch (Passing below Zero Bottlenecks) */}
                <path d="M 20,255 H 120 V 285 H 240 V 240 H 340" />
                <path d="M 240,285 H 340" />

                {/* Bottom Left Branch */}
                <path d="M 30,360 H 140 V 390 H 260 V 345 H 350" />
                <path d="M 190,390 V 330 H 350" />

                {/* Stubs connecting toward the inner card */}
                <path d="M 340,180 H 430 V 140 H 480" />
                <path d="M 340,240 H 430 V 280 H 480" />
              </g>

              {/* Exact Dynamic Blue/Cyan Flowing Pulses */}
              <g filter="url(#blueGlowOuter)">
                <path
                  className="outer-pulse-replica"
                  d="M 30,60 H 140 V 30 H 260 V 75 H 350"
                  style={{ animationDelay: '0.3s' }}
                />
                <path
                  className="outer-pulse-replica"
                  d="M 190,30 V 90 H 350"
                  style={{ animationDelay: '2.7s' }}
                />
                <path
                  className="outer-pulse-replica"
                  d="M 20,165 H 120 V 135 H 240 V 180 H 340 H 430 V 140 H 480"
                  style={{ animationDelay: '1.2s' }}
                />
                <path
                  className="outer-pulse-replica"
                  d="M 20,255 H 120 V 285 H 240 V 240 H 340 H 430 V 280 H 480"
                  style={{ animationDelay: '3.5s' }}
                />
                <path
                  className="outer-pulse-replica"
                  d="M 30,360 H 140 V 390 H 260 V 345 H 350"
                  style={{ animationDelay: '1.9s' }}
                />
              </g>

              {/* Nodes at every junction and terminal */}
              <g fill="#38bdf8" opacity="0.75">
                <circle cx="140" cy="30" r="2.5" />
                <circle cx="260" cy="30" r="2.5" />
                <circle cx="260" cy="75" r="2.5" />
                <circle cx="350" cy="75" r="2" />
                <circle cx="190" cy="90" r="2.5" />
                <circle cx="350" cy="90" r="2" />
                <circle cx="120" cy="135" r="2.5" />
                <circle cx="240" cy="135" r="2.5" />
                <circle cx="240" cy="180" r="2.5" />
                <circle cx="340" cy="180" r="2" />
                <circle cx="120" cy="285" r="2.5" />
                <circle cx="240" cy="285" r="2.5" />
                <circle cx="240" cy="240" r="2.5" />
                <circle cx="340" cy="240" r="2" />
                <circle cx="140" cy="390" r="2.5" />
                <circle cx="260" cy="390" r="2.5" />
                <circle cx="260" cy="345" r="2.5" />
                <circle cx="350" cy="345" r="2" />
                <circle cx="430" cy="140" r="2.5" />
                <circle cx="480" cy="140" r="2" />
                <circle cx="430" cy="280" r="2.5" />
                <circle cx="480" cy="280" r="2" />
              </g>
            </svg>
          </div>

          {/* Grid Layout: Left Branded Headline, Right White & Blue Sign-In Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">

            {/* ==================== LEFT COLUMN: HEADLINE & TRUST INDICATORS ==================== */}
            <div className="md:col-span-5 text-center md:text-left pr-0 md:pr-2 select-none relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span>Enterprise Governance</span>
              </div>
              <h1 className="font-serif italic text-3xl sm:text-4xl text-white tracking-wide leading-tight drop-shadow-[0_2px_16px_rgba(56,189,248,0.35)]">
                Zero <span className="text-cyan-300">Bottlenecks</span>
              </h1>
              <p className="text-xs text-slate-300/90 leading-relaxed max-w-xs mx-auto md:mx-0">
                Streamlined Delegation of Authority workflows with role-scoped signoffs and real-time compliance tracking.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[10px] font-semibold text-cyan-100">
                  2LoD Compliant
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[10px] font-semibold text-teal-100">
                  Audit Ready
                </span>
              </div>
            </div>

            {/* ==================== RIGHT COLUMN: WHITE & BLUE FLOATING SIGN-IN CARD ==================== */}
            <div className="md:col-span-7 relative">

              {/* Floating Crisp White & Blue Sign-In Card */}
              <div className="bg-white/95 border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xl relative z-10 overflow-hidden">

                {/* Top Blue/Teal Accent Strip */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0b2240] via-blue-600 to-teal-500" />

                {/* Subtle Blue Circuit Accents inside the White Card */}
                <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 400 360"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <style>{`
                        @keyframes travelInner {
                          0% { stroke-dashoffset: 45; }
                          55% { stroke-dashoffset: -450; }
                          100% { stroke-dashoffset: -450; }
                        }
                        .inner-pulse {
                          fill: none;
                          stroke: #0284c7;
                          stroke-width: 1.6;
                          stroke-linecap: round;
                          stroke-dasharray: 45 450;
                          animation: travelInner 5.2s linear infinite;
                        }
                        .inner-track {
                          fill: none;
                          stroke: #94a3b8;
                          stroke-width: 0.9;
                          opacity: 0.4;
                        }
                      `}</style>
                    </defs>

                    <g className="inner-track">
                      <path d="M 170,18 H 280 V 55 H 370" />
                      <path d="M 230,18 V 75 H 370" />
                      <path d="M 30,345 H 180 V 315 H 340" />
                      <path d="M 120,345 V 330 H 260" />
                    </g>

                    <g>
                      <path
                        className="inner-pulse"
                        d="M 170,18 H 280 V 55 H 370"
                        style={{ animationDelay: '0.4s' }}
                      />
                      <path
                        className="inner-pulse"
                        d="M 230,18 V 75 H 370"
                        style={{ animationDelay: '2.8s' }}
                      />
                      <path
                        className="inner-pulse"
                        d="M 30,345 H 180 V 315 H 340"
                        style={{ animationDelay: '1.6s' }}
                      />
                    </g>

                    <g fill="#0284c7" opacity="0.75">
                      <circle cx="280" cy="18" r="2.5" />
                      <circle cx="280" cy="55" r="2.5" />
                      <circle cx="370" cy="55" r="2" />
                      <circle cx="230" cy="75" r="2.5" />
                      <circle cx="370" cy="75" r="2" />
                      <circle cx="180" cy="345" r="2.5" />
                      <circle cx="180" cy="315" r="2.5" />
                      <circle cx="340" cy="315" r="2" />
                    </g>
                  </svg>
                </div>

                {/* ===================== VIEW 1: SIGN IN ===================== */}
                {viewMode === 'signin' && (
                  <div className="relative z-10">
                    {/* Card Header: Lock icon & Sign In Title */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            Sign In
                          </h2>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Access your governance workspace
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">

                      {/* 1. SELECT ENTITY */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          SELECT ENTITY
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <select
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-[13px] font-semibold rounded-xl py-2.5 pl-9 pr-8 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer truncate transition-all"
                          >
                            {ENTITIES.map((ent) => (
                              <option key={ent} value={ent} className="bg-white text-slate-900">
                                {ent}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* 2. EMAIL ADDRESS */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          EMAIL ADDRESS
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <select
                            value={selectedPersonaId}
                            onChange={(e) => handleSelectPersonaById(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-[13px] font-semibold rounded-xl py-2.5 pl-9 pr-8 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer truncate transition-all"
                          >
                            <optgroup label="── Normal Users ──" className="bg-slate-50 text-slate-700 font-bold">
                              {NORMAL_USER_PERSONAS.map((p) => (
                                <option key={p.id} value={p.id} className="bg-white text-slate-900 font-normal">
                                  {p.email}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="── Governance &amp; Admin ──" className="bg-slate-50 text-slate-700 font-bold">
                              {ENTERPRISE_ROLES.map((p) => (
                                <option key={p.id} value={p.id} className="bg-white text-slate-900 font-normal">
                                  {p.email}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* 3. PASSWORD */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            PASSWORD
                          </label>
                          <button
                            type="button"
                            onClick={handleOpenForgotPassword}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-[13px] font-semibold rounded-xl py-2.5 pl-9 pr-9 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Error Alert */}
                      {error && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs shadow-xs animate-shake">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                          <span className="font-semibold leading-tight">{error}</span>
                        </div>
                      )}

                      {/* 4. SUBMIT BUTTON */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] via-blue-700 to-teal-600 hover:from-[#102d54] hover:via-blue-600 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                        >
                          {isLoading ? (
                            <span>Authenticating...</span>
                          ) : (
                            <>
                              <span>Sign In to Governance Workspace</span>
                              <ArrowRight className="h-4 w-4 text-white" />
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* ===================== VIEW 2: FORGOT PASSWORD FLOW ===================== */}
                {viewMode === 'forgot_password' && (
                  <div className="space-y-4 relative z-10">

                    {/* Card Sub-Navigation */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={handleReturnToSignIn}
                        className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back to Sign In
                      </button>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {forgotStep === 4 ? 'Complete' : `Step ${forgotStep} of 3`}
                      </span>
                    </div>

                    {/* Error Alert */}
                    {forgotError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs shadow-xs animate-shake">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        <span className="font-semibold leading-tight">{forgotError}</span>
                      </div>
                    )}

                    {/* Success Info Alert */}
                    {forgotSuccessMsg && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs shadow-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="font-semibold leading-tight">{forgotSuccessMsg}</span>
                      </div>
                    )}

                    {/* STEP 1: ENTER WORK EMAIL */}
                    {forgotStep === 1 && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-2 shadow-2xs">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            Reset Password
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Enter your registered work email ID to receive a 6-digit verification code.
                          </p>
                        </div>

                        <form onSubmit={handleSendOtp} className="space-y-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Work Email Address
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Mail className="h-4 w-4" />
                              </div>
                              <input
                                type="email"
                                required
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="e.g. dept.owner@doa.local"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold rounded-xl py-2.5 pl-9 pr-3.5 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={forgotLoading}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] via-blue-700 to-teal-600 hover:from-[#102d54] hover:via-blue-600 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                          >
                            {forgotLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                                <span>Sending Code...</span>
                              </>
                            ) : (
                              <>
                                <span>Send Verification Code</span>
                                <ArrowRight className="h-4 w-4 text-white" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* STEP 2: ENTER OTP */}
                    {forgotStep === 2 && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-2 shadow-2xs">
                            <Lock className="h-4 w-4" />
                          </div>
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            Enter Verification Code
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                            Code generated for <span className="font-bold text-blue-700">{forgotEmail}</span>.
                          </p>
                        </div>

                        {/* Auto-fill Code Helper */}
                        {devOtpCode && (
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setForgotOtp(devOtpCode)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs transition-all cursor-pointer"
                            >
                              Auto-fill Code
                            </button>
                            <div className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-black tracking-widest text-blue-800">
                              {devOtpCode}
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              6-Digit Code
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={forgotOtp}
                              onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="000000"
                              className="w-full text-center tracking-widest font-mono text-base py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-slate-500">Didn't receive the code?</span>
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={forgotLoading}
                              className="font-bold text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                            >
                              Resend Code
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={forgotLoading || forgotOtp.length !== 6}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] via-blue-700 to-teal-600 hover:from-[#102d54] hover:via-blue-600 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                          >
                            {forgotLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <span>Verify Code</span>
                                <ArrowRight className="h-4 w-4 text-white" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* STEP 3: CREATE NEW PASSWORD */}
                    {forgotStep === 3 && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-2 shadow-2xs">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            Create New Password
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Set a new password for <span className="font-bold text-blue-700">{forgotEmail}</span>.
                          </p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              New Password
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold rounded-xl py-2 pl-3 pr-9 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Re-enter new password"
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold rounded-xl py-2 pl-3 pr-3 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={forgotLoading}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] via-blue-700 to-teal-600 hover:from-[#102d54] hover:via-blue-600 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                          >
                            {forgotLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <span>Save New Password</span>
                                <ArrowRight className="h-4 w-4 text-white" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {forgotStep === 4 && (
                      <div className="text-center py-3 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-md animate-bounce">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            Password Reset Complete!
                          </h2>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Your password for <strong className="text-blue-700">{forgotEmail}</strong> has been updated.
                          </p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleReturnToSignIn}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2240] via-blue-700 to-teal-600 hover:from-[#102d54] hover:via-blue-600 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 transition-all transform active:scale-98 cursor-pointer"
                          >
                            <span>Sign In with New Password</span>
                            <ArrowRight className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer: Pro Nexus Copyright (Always visible, shrink-0, not cut off) */}
      <footer className="w-full text-center py-2.5 text-[11px] text-slate-400/80 font-medium z-20 shrink-0 border-t border-teal-500/10 bg-[#071C2B]/60 backdrop-blur-xs">
        &copy; 2026 Pro Nexus. All rights reserved. &bull; Enterprise Delegation of Authority Platform
      </footer>

    </div>
  );
}
