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
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import proNexusBrand from '../assets/pro-nexus-brand.png';
import doaNexusBrand from '../assets/doa-nexus-brand.png';
import loginBg from '../assets/login-bg.jpg';

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
      email: 'governance@doa.local',
      password: 'GovTeam@123',
      role: 'ADMIN',
      persona_type: 'GOVERNANCE_TEAM',
      avatar: avatarGovernance
    },
    {
      id: 'doa_admin',
      title: 'DOA Admin (Super Admin)',
      email: 'doaadmin@doa.local',
      password: 'DoaAdmin@123',
      role: 'ADMIN',
      persona_type: 'DOA_ADMIN',
      avatar: avatarDoaAdmin
    },
    {
      id: 'sysadmin',
      title: 'System Admin (Platform Operations)',
      email: 'sysadmin@doa.local',
      password: 'SysAdmin@123',
      role: 'ADMIN',
      persona_type: 'SYSTEM_ADMIN',
      avatar: avatarSysadmin
    }
  ];

  // Combined 12 personas: 9 Normal Users + 3 Governance & Admin
  const ALL_PERSONAS = [
    ...NORMAL_USER_PERSONAS,
    ...ENTERPRISE_ROLES
  ];

  const [selectedEntity, setSelectedEntity] = useState(ENTITIES[0]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('dept_owner');
  const [email, setEmail] = useState('dept.owner@doa.local');
  const [password, setPassword] = useState('User@123');
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

  const currentPersona = ALL_PERSONAS.find(p => p.id === selectedPersonaId) || ALL_PERSONAS[0];

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
    <div 
      className="h-screen w-full flex flex-col justify-between font-sans text-slate-900 bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      
      {/* Top Navbar: Sleek Navbar with Large Pro Nexus Brand Logo */}
      <header className="w-full bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-1.5 shadow-2xs shrink-0">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={proNexusBrand || doaNexusBrand} 
              alt="Pro Nexus" 
              className="h-12 sm:h-14 md:h-16 w-auto object-contain transition-all" 
            />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-500">
            Delegation of Authority Matrix
          </div>
        </div>
      </header>

      {/* Main Content: Centered Unified Sign In Card */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-3 min-h-0 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 animate-fade-in my-auto">
          
          {/* ===================== VIEW 1: SIGN IN ===================== */}
          {viewMode === 'signin' && (
            <>
              {/* Header Title */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Lock className="h-6 w-6 text-blue-600" />
                  Sign In
                </h2>

              </div>

              {/* 1. SELECT ENTITY DROPDOWN */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Entity
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs appearance-none cursor-pointer"
                  >
                    {ENTITIES.map((ent) => (
                      <option key={ent} value={ent}>
                        {ent}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-rose-700 text-xs shadow-2xs animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                
                {/* 2. EMAIL ADDRESS DROPDOWN (BUILT EXACTLY LIKE SELECT ENTITY) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => handleSelectPersonaById(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs appearance-none cursor-pointer"
                    >
                      <optgroup label="── Normal Users ──">
                        {NORMAL_USER_PERSONAS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.email}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="── Governance & Admin ──">
                        {ENTERPRISE_ROLES.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.email}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* 3. PASSWORD FIELD */}
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
                      className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                  {/* Under the password field: Forgot Password Option */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleOpenForgotPassword}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {/* 4. SIGN IN BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 transform active:scale-98 disabled:opacity-50 cursor-pointer"
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
            </>
          )}

          {/* ===================== VIEW 2: FORGOT PASSWORD FLOW ===================== */}
          {viewMode === 'forgot_password' && (
            <div className="space-y-4">
              
              {/* Card Sub-Navigation */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={handleReturnToSignIn}
                  className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Sign In
                </button>
                <span className="text-2xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                  {forgotStep === 4 ? 'Complete' : `Step ${forgotStep} of 3`}
                </span>
              </div>

              {/* Error Alert */}
              {forgotError && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center gap-2 text-rose-700 text-xs shadow-2xs animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="font-semibold leading-tight">{forgotError}</span>
                </div>
              )}

              {/* Success Info Alert */}
              {forgotSuccessMsg && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2 text-emerald-800 text-xs shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold leading-tight">{forgotSuccessMsg}</span>
                </div>
              )}

              {/* STEP 1: ENTER WORK EMAIL */}
              {forgotStep === 1 && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Reset Password
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Enter your registered work email ID to receive a 6-digit verification code.
                    </p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Work Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="e.g. dept.owner@doa.local"
                          className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 transform active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2: ENTER OTP */}
              {forgotStep === 2 && (
                <div className="space-y-2 sm:space-y-2.5">
                  <div>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mb-1.5 shadow-2xs">
                      <Lock className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Enter Verification Code
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      A 6-digit verification code has been generated for{' '}
                      <span className="font-bold text-slate-800">{forgotEmail}</span>.
                    </p>
                  </div>

                  {/* Auto-fill Code on Left, Verification Code on Right */}
                  {devOtpCode && (
                    <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setForgotOtp(devOtpCode)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Auto-fill Code
                      </button>
                      <div className="px-2.5 py-0.5 bg-white border border-slate-300 rounded-lg font-mono text-sm font-black tracking-widest text-slate-900 shadow-2xs">
                        {devOtpCode}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="space-y-2.5 sm:space-y-3">
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="000000"
                          className="block w-full text-center tracking-widest font-mono text-lg py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-slate-500">Didn't receive the code?</span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={forgotLoading}
                        className="font-bold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 cursor-pointer text-xs"
                      >
                        Resend Code
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading || forgotOtp.length !== 6}
                      className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 transform active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Code</span>
                          <ArrowRight className="h-4 w-4" />
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
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Create New Password
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Set a new password for <span className="font-bold text-slate-800">{forgotEmail}</span>.
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
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
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 transform active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save New Password</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 4: SUCCESS */}
              {forgotStep === 4 && (
                <div className="text-center py-4 space-y-4 pt-2">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-md animate-bounce">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Password Reset Complete!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                      Your password for <strong className="text-slate-800 font-semibold">{forgotEmail}</strong> has been updated successfully.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleReturnToSignIn}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 transform active:scale-98 cursor-pointer"
                    >
                      <span>Sign In with New Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* Footer: Pro Nexus Copyright */}
      <footer className="py-2 text-center text-xs text-slate-500 font-medium bg-transparent shrink-0">
        &copy; {new Date().getFullYear()} Pro Nexus. All rights reserved.
      </footer>

    </div>
  );
}
