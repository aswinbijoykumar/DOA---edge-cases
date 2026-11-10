import avatarGovernance from '../assets/avatar-governance.jpg';
import avatarDoaAdmin from '../assets/avatar-doa-admin.jpg';
import avatarSysadmin from '../assets/avatar-sysadmin.jpg';

import avatarNormal1 from '../assets/avatar-normal-1.jpg'; // Marcus Vance
import avatarNormal2 from '../assets/avatar-normal-2.jpg'; // Elena Rostova
import avatarNormal3 from '../assets/avatar-normal-3.jpg'; // Julian Hayes
import avatarNormal4 from '../assets/avatar-normal-4.jpg'; // Nadia Al-Qahtani
import avatarNormal5 from '../assets/avatar-normal-5.jpg'; // David Sterling
import avatarNormal6 from '../assets/avatar-normal-6.jpg'; // Aiden Cole
import avatarNormal7 from '../assets/avatar-normal-7.jpg'; // Tariq Al-Mansoor
import avatarNormal8 from '../assets/avatar-normal-8.jpg'; // Sophia Zhang
import avatarNormal9 from '../assets/avatar-normal-9.jpg'; // Claire Montgomery

export const ORG_MEMBERS = {
  // 1. Julian Hayes (Executive Approver)
  'approver@doa.local': {
    id: 'approver',
    name: 'Julian Hayes',
    email: 'approver@doa.local',
    role: 'Executive Approver',
    roleKey: 'APPROVER',
    personaType: 'APPROVER',
    designation: 'Executive Committee Approver (VP Finance)',
    department: 'Executive Management',
    entity: 'Group-Wide (ALL)',
    avatar: avatarNormal3,
    reportsTo: {
      name: 'Group Chief Executive Officer (GCEO)',
      role: 'Executive Office',
      designation: 'GCEO / Executive Committee Chair',
      email: 'gceo@ambbank.local',
      avatar: null
    },
    directReportsEmails: ['dept.owner@doa.local', 'risk.owner@doa.local', 'ksa.owner@doa.local'],
    tier: 'Executive Management (Tier 1)',
    status: 'Available'
  },

  // 2. Marcus Vance (Finance Dept Owner)
  'dept.owner@doa.local': {
    id: 'dept_owner',
    name: 'Marcus Vance',
    email: 'dept.owner@doa.local',
    role: 'Department Owner',
    roleKey: 'DEPT_OWNER',
    personaType: 'DEPT_OWNER',
    designation: 'Head of Finance & Treasury',
    department: 'Finance & Treasury',
    entity: 'AMB Bank B.S.C. – Bahrain (Parent Company)',
    avatar: avatarNormal1,
    reportsTo: {
      name: 'Julian Hayes',
      designation: 'Executive Committee Approver (VP Finance)',
      role: 'Executive Approver',
      email: 'approver@doa.local',
      avatar: avatarNormal3
    },
    directReportsEmails: ['process.owner@doa.local', 'user@doa.local'],
    tier: 'Department Head (Tier 2)',
    status: 'Available'
  },

  // 3. Tariq Al-Mansoor (Risk Dept Owner)
  'risk.owner@doa.local': {
    id: 'risk_owner',
    name: 'Tariq Al-Mansoor',
    email: 'risk.owner@doa.local',
    role: 'Department Owner',
    roleKey: 'DEPT_OWNER',
    personaType: 'DEPT_OWNER',
    designation: 'Head of Enterprise Credit & Risk',
    department: 'Risk Management',
    entity: 'AMB Bank B.S.C. – Bahrain (Parent Company)',
    avatar: avatarNormal7,
    reportsTo: {
      name: 'Julian Hayes',
      designation: 'Executive Committee Approver (VP Finance)',
      role: 'Executive Approver',
      email: 'approver@doa.local',
      avatar: avatarNormal3
    },
    directReportsEmails: [],
    tier: 'Department Head (Tier 2)',
    status: 'Available'
  },

  // 4. Nadia Al-Qahtani (KSA Dept Owner)
  'ksa.owner@doa.local': {
    id: 'ksa_owner',
    name: 'Nadia Al-Qahtani',
    email: 'ksa.owner@doa.local',
    role: 'Department Owner',
    roleKey: 'DEPT_OWNER',
    personaType: 'DEPT_OWNER',
    designation: 'Head of Finance (KSA Subsidiary)',
    department: 'Finance (KSA)',
    entity: 'AMB Bank – Saudi Arabia (Subsidiary)',
    avatar: avatarNormal4,
    reportsTo: {
      name: 'Julian Hayes',
      designation: 'Executive Committee Approver (VP Finance)',
      role: 'Executive Approver',
      email: 'approver@doa.local',
      avatar: avatarNormal3
    },
    directReportsEmails: [],
    tier: 'Subsidiary Department Head (Tier 2)',
    status: 'Available'
  },

  // 5. Elena Rostova (Process Owner)
  'process.owner@doa.local': {
    id: 'process_owner',
    name: 'Elena Rostova',
    email: 'process.owner@doa.local',
    role: 'Process Owner',
    roleKey: 'PROCESS_OWNER',
    personaType: 'PROCESS_OWNER',
    designation: 'P2P & Procurement Process Lead',
    department: 'Supply Chain Operations',
    entity: 'AMB Bank B.S.C. – Bahrain (Parent Company)',
    avatar: avatarNormal2,
    reportsTo: {
      name: 'Marcus Vance',
      designation: 'Head of Finance & Treasury',
      role: 'Department Owner',
      email: 'dept.owner@doa.local',
      avatar: avatarNormal1
    },
    directReportsEmails: [],
    tier: 'Process Management (Tier 3)',
    status: 'Available'
  },

  // 6. Aiden Cole (Requester)
  'user@doa.local': {
    id: 'requester',
    name: 'Aiden Cole',
    email: 'user@doa.local',
    role: 'Requester (Analyst)',
    roleKey: 'FRONTEND_USER',
    personaType: 'FRONTEND_USER',
    designation: 'Business Line Analyst',
    department: 'Commercial Operations',
    entity: 'AMB Bank B.S.C. – Bahrain (Parent Company)',
    avatar: avatarNormal6,
    reportsTo: {
      name: 'Marcus Vance',
      designation: 'Head of Finance & Treasury',
      role: 'Department Owner',
      email: 'dept.owner@doa.local',
      avatar: avatarNormal1
    },
    directReportsEmails: [],
    tier: 'Operational Analyst (Tier 4)',
    status: 'Available'
  },

  // 7. David Sterling (Authority Owner)
  'authority.owner@doa.local': {
    id: 'authority_owner',
    name: 'David Sterling',
    email: 'authority.owner@doa.local',
    role: 'Authority Owner',
    roleKey: 'AUTHORITY_OWNER',
    personaType: 'AUTHORITY_OWNER',
    designation: 'Board Secretariat / Governance Counsel',
    department: 'Legal & Corporate Governance',
    entity: 'Group-Wide (ALL)',
    avatar: avatarNormal5,
    reportsTo: {
      name: 'Company Secretary & Board of Directors',
      role: 'Board Secretariat',
      designation: 'Group Corporate Secretary',
      email: 'board.secretariat@ambbank.local',
      avatar: null
    },
    directReportsEmails: [],
    tier: 'Governance & Board Oversight',
    status: 'Available'
  },

  // 8. Sophia Zhang (Reviewer)
  'reviewer@doa.local': {
    id: 'reviewer',
    name: 'Sophia Zhang',
    email: 'reviewer@doa.local',
    role: 'Reviewer (2LoD Risk)',
    roleKey: 'REVIEWER',
    personaType: 'REVIEWER',
    designation: 'Senior Risk & Governance Reviewer',
    department: 'Enterprise Risk Management',
    entity: 'Group-Wide (ALL)',
    avatar: avatarNormal8,
    reportsTo: {
      name: 'Chief Risk Officer (CRO)',
      role: 'Executive Committee',
      designation: 'Chief Risk Officer',
      email: 'cro@ambbank.local',
      avatar: null
    },
    directReportsEmails: [],
    tier: 'Second Line of Defense (2LoD)',
    status: 'Available'
  },

  // 9. Claire Montgomery (Audit)
  'audit.readonly@doa.local': {
    id: 'audit_readonly',
    name: 'Claire Montgomery',
    email: 'audit.readonly@doa.local',
    role: 'Audit & Assurance',
    roleKey: 'AUDIT_READONLY',
    personaType: 'AUDIT_READONLY',
    designation: 'Senior Internal Auditor',
    department: 'Internal Audit & Assurance',
    entity: 'Group-Wide (ALL)',
    avatar: avatarNormal9,
    reportsTo: {
      name: 'Audit Committee Chair / Board',
      role: 'Board Audit Committee',
      designation: 'Chairperson of Audit Committee',
      email: 'audit.chair@ambbank.local',
      avatar: null
    },
    directReportsEmails: [],
    tier: 'Third Line of Defense (3LoD)',
    status: 'Available'
  },

  // 10. Governance Team (Admin)
  'governance@doa.local': {
    id: 'governance_team',
    name: 'Governance Secretariat Team',
    email: 'governance@doa.local',
    role: 'Governance Team Admin',
    roleKey: 'ADMIN',
    personaType: 'GOVERNANCE_TEAM',
    designation: '2LoD Governance Officer / Secretariat',
    department: 'Enterprise Governance & Compliance',
    entity: 'Group-Wide (ALL)',
    avatar: avatarGovernance,
    reportsTo: {
      name: 'Chief Compliance Officer (CCO)',
      role: 'Executive Committee',
      designation: 'Chief Compliance Officer',
      email: 'cco@ambbank.local',
      avatar: null
    },
    directReportsEmails: [],
    tier: 'Enterprise Governance & Policy',
    status: 'Available'
  },

  // 11. DOA Admin (Super Admin)
  'doaadmin@doa.local': {
    id: 'doa_admin',
    name: 'DOA Administrator',
    email: 'doaadmin@doa.local',
    role: 'DOA Super Admin',
    roleKey: 'ADMIN',
    personaType: 'DOA_ADMIN',
    designation: 'Chief Delegation Officer / Super Admin',
    department: 'Executive Office / DOA Governance',
    entity: 'Group-Wide (ALL)',
    avatar: avatarDoaAdmin,
    reportsTo: {
      name: 'Group Chief Executive Officer (GCEO)',
      role: 'Executive Office',
      designation: 'Group CEO',
      email: 'gceo@ambbank.local',
      avatar: null
    },
    directReportsEmails: [],
    tier: 'System Administration & Master DOA',
    status: 'Available'
  },

  // 12. System Admin
  'sysadmin@doa.local': {
    id: 'sysadmin',
    name: 'System Administrator',
    email: 'sysadmin@doa.local',
    role: 'System Administrator',
    roleKey: 'ADMIN',
    personaType: 'SYSTEM_ADMIN',
    designation: 'Platform Architect & IT Administrator',
    department: 'Information Technology / Platform IAM',
    entity: 'Infrastructure & Cloud',
    avatar: avatarSysadmin,
    reportsTo: {
      name: 'Chief Information Officer (CIO)',
      role: 'Executive Committee',
      designation: 'Chief Information Officer',
      email: 'cio@ambbank.local',
      avatar: null
    },
    directReportsEmails: [],
    tier: 'Infrastructure & IAM Security',
    status: 'Available'
  }
};

/**
 * Returns full user profile including AI avatar based on email, personaType, or role.
 */
export const getUserProfile = (userOrEmail) => {
  if (!userOrEmail) return ORG_MEMBERS['dept.owner@doa.local'];
  
  if (typeof userOrEmail === 'string') {
    const emailKey = userOrEmail.toLowerCase().trim();
    if (ORG_MEMBERS[emailKey]) return ORG_MEMBERS[emailKey];
    const match = Object.values(ORG_MEMBERS).find(
      m => m.id === emailKey || m.roleKey === emailKey || m.personaType === emailKey
    );
    return match || ORG_MEMBERS['dept.owner@doa.local'];
  }

  const email = (userOrEmail.email || '').toLowerCase().trim();
  if (ORG_MEMBERS[email]) return ORG_MEMBERS[email];

  const pType = userOrEmail.persona_type;
  if (pType) {
    const match = Object.values(ORG_MEMBERS).find(m => m.personaType === pType);
    if (match) return match;
  }

  const role = userOrEmail.role;
  if (role) {
    const match = Object.values(ORG_MEMBERS).find(m => m.roleKey === role);
    if (match) return match;
  }

  return ORG_MEMBERS['dept.owner@doa.local'];
};

