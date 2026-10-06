/**
 * API Service for DOA Workflow Tool Prototype
 * Connects frontend to FastAPI backend running on http://localhost:8000/api
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper for local storage token
export const getStoredToken = () => localStorage.getItem('doa_access_token');
export const setStoredToken = (token) => localStorage.setItem('doa_access_token', token);
export const removeStoredToken = () => {
  localStorage.removeItem('doa_access_token');
  localStorage.removeItem('doa_user_profile');
};

export const getStoredUser = () => {
  try {
    const u = localStorage.getItem('doa_user_profile');
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem('doa_user_profile', JSON.stringify(user));
};

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { detail: res.statusText };
      }
      const err = new Error(errorData.detail || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.data = errorData;
      throw err;
    }

    if (res.status === 204) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Authentication
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(data.access_token);
    setStoredUser({
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      persona_type: data.persona_type || 'FRONTEND_USER',
      designation: data.designation || '',
      department: data.department || ''
    });
    return data;
  },

  async getMe() {
    return await request('/auth/me');
  },

  logout() {
    removeStoredToken();
  },

  // Functionality 5: Designation-wise authorities
  async getDesignationMatrix(designationKey = 'ceo') {
    return await request(`/user/designation-matrix?designation_key=${encodeURIComponent(designationKey)}`);
  },

  // Functionality 7: Pre-set Management Reports
  async getManagementReports(reportType = 'active_by_dept') {
    return await request(`/user/reports/management?report_type=${encodeURIComponent(reportType)}`);
  },

  // Functionality 9: HR System Integration
  async getHrIntegration() {
    return await request('/user/hr-integration');
  },

  // Dashboard KPIs
  async getDashboardSummary() {
    return await request('/dashboard/summary');
  },

  // DOA Master Records
  async getDoaRecords(params = {}) {
    const query = new URLSearchParams();
    if (params.parent_function && params.parent_function !== 'All') {
      query.append('parent_function', params.parent_function);
    }
    if (params.business_line) {
      query.append('business_line', params.business_line);
    }
    if (params.status) {
      query.append('status', params.status);
    }
    if (params.search) {
      query.append('search', params.search);
    }
    if (params.key_non_key && params.key_non_key !== 'All') {
      query.append('key_non_key', params.key_non_key);
    }
    const queryString = query.toString();
    return await request(`/doa${queryString ? `?${queryString}` : ''}`);
  },

  async getDoaRecord(id) {
    return await request(`/doa/${id}`);
  },

  async getDoaVersions(id) {
    return await request(`/doa/${id}/versions`);
  },

  async archiveDoa(id) {
    return await request(`/doa/${id}/archive`, { method: 'POST' });
  },

  // Change Requests
  async getChangeRequests(status) {
    const endpoint = status ? `/change-requests?status=${status}` : '/change-requests';
    return await request(endpoint);
  },

  async getChangeRequest(id) {
    return await request(`/change-requests/${id}`);
  },

  async getChangeRequestDiff(id) {
    return await request(`/change-requests/${id}/diff`);
  },

  async createChangeRequest(data) {
    return await request('/change-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async approveChangeRequest(id, comment = '') {
    return await request(`/change-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async rejectChangeRequest(id, comment = '') {
    return await request(`/change-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async publishChangeRequest(id) {
    return await request(`/change-requests/${id}/publish`, {
      method: 'POST'
    });
  },

  // Audit Logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.record_id) query.append('record_id', params.record_id);
    const qs = query.toString();
    return await request(`/audit${qs ? `?${qs}` : ''}`);
  },

  // Taxonomy
  async getFunctionTaxonomy() {
    return await request('/taxonomy/functions');
  },

  async getCommitteesTaxonomy() {
    return await request('/taxonomy/committees');
  },

  async getGovernanceDocuments() {
    return await request('/taxonomy/governance-documents');
  },

  async getWorkflowRules() {
    return await request('/taxonomy/workflow-rules');
  },

  async getStatuses() {
    return await request('/taxonomy/statuses');
  },

  // Role-Dedicated RBAC API endpoints
  async getUserDashboard() {
    return await request('/user/dashboard');
  },

  async getGovernanceDashboard() {
    return await request('/governance/dashboard');
  },

  async getGovernanceQueue() {
    return await request('/governance/queue');
  },

  async getGovernanceDiff(crId) {
    return await request(`/governance/queue/${crId}/diff`);
  },

  async addGovernanceComment(crId, comment) {
    return await request(`/governance/requests/${crId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async requestGovernanceClarification(crId, comment) {
    return await request(`/governance/requests/${crId}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async tagGovernanceStakeholders(crId, stakeholders) {
    return await request(`/governance/requests/${crId}/tag`, {
      method: 'POST',
      body: JSON.stringify({ stakeholders })
    });
  },

  async rerouteGovernanceRequest(crId, targetCommittee, reason) {
    return await request(`/governance/requests/${crId}/reroute`, {
      method: 'POST',
      body: JSON.stringify({ target_committee: targetCommittee, reason })
    });
  },

  async escalateGovernanceRequest(crId, reason) {
    return await request(`/governance/requests/${crId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async publishGovernanceRequest(crId) {
    return await request(`/governance/requests/${crId}/publish`, {
      method: 'POST'
    });
  },

  async getDoaAdminDashboard() {
    return await request('/doa-admin/dashboard');
  },

  async requestClarification(crId, comment) {
    return await request(`/doa-admin/requests/${crId}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async resubmitChangeRequest(crId, comment) {
    return await request(`/doa-admin/requests/${crId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async withdrawChangeRequest(crId, comment) {
    return await request(`/doa-admin/requests/${crId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async validateRecord(payload) {
    return await request('/doa-admin/validate-record', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSystemAdminDashboard() {
    return await request('/system-admin/dashboard');
  },

  async getSystemTelemetry() {
    return await request('/system-admin/telemetry');
  },

  // =========================================================================
  // 7 SPECIFIC USER ROLE BACKEND APIS
  // =========================================================================

  // 1. Requestor / Business Line Analyst
  async getRequestorDashboard() {
    return await request('/requestor/dashboard');
  },
  async getRequestorProposals() {
    return await request('/requestor/proposals');
  },
  async submitRequestorProposal(data) {
    return await request('/requestor/proposals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async withdrawRequestorProposal(crId) {
    return await request(`/requestor/proposals/${crId}/withdraw`, {
      method: 'POST'
    });
  },

  // 2. Process Owner (Operational Lead)
  async getProcessOwnerDashboard() {
    return await request('/process-owner/dashboard');
  },
  async getProcessOwnerQueue() {
    return await request('/process-owner/queue');
  },
  async endorseProcessImpact(crId, operationalImpact) {
    return await request(`/process-owner/requests/${crId}/endorse`, {
      method: 'POST',
      body: JSON.stringify({ operational_impact: operationalImpact })
    });
  },

  // 3. Department / Function Owner
  async getDeptOwnerDashboard() {
    return await request('/dept-owner/dashboard');
  },
  async getDeptOwnerQueue() {
    return await request('/dept-owner/queue');
  },
  async getDepartmentDoas() {
    return await request('/dept-owner/department-doas');
  },
  async deptOwnerSignoff(crId, comment) {
    return await request(`/dept-owner/requests/${crId}/signoff`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  // 4. Authority Owner (Charter & Mandates)
  async getAuthorityOwnerDashboard() {
    return await request('/authority-owner/dashboard');
  },
  async getAuthorityMandatesMatrix() {
    return await request('/authority-owner/matrix');
  },
  async verifyAuthorityMandate(crId, comment) {
    return await request(`/authority-owner/requests/${crId}/verify-mandate`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  // 5. Reviewer (2LoD Risk & Policy Review)
  async getReviewerDashboard() {
    return await request('/reviewer/dashboard');
  },
  async getReviewerQueue() {
    return await request('/reviewer/queue');
  },
  async getReviewerDiff(crId) {
    return await request(`/reviewer/diff/${crId}`);
  },
  async recommendReviewerCR(crId, comment) {
    return await request(`/reviewer/requests/${crId}/recommend`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  // 6. Approver (Executive Approver)
  async getApproverDashboard() {
    return await request('/approver/dashboard');
  },
  async getApproverInbox() {
    return await request('/approver/inbox');
  },
  async makeApproverDecision(crId, action, comment) {
    return await request(`/approver/requests/${crId}/decision?action=${action}`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  // 7. Audit Read-Only (Assurance & Compliance)
  async getAuditReadonlyDashboard() {
    return await request('/audit-readonly/dashboard');
  },
  async getAuditDoaVersions(doaId) {
    return await request(`/audit-readonly/versions/${doaId}`);
  },
  async getAuditLedger(skip = 0, limit = 100) {
    return await request(`/audit-readonly/ledger?skip=${skip}&limit=${limit}`);
  },

  // 8. Persona-specific Management Reports (Functionality 7)
  async getRoleReport(endpointUrl) {
    return await request(endpointUrl);
  }
};

