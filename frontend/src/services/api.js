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
      department: data.department || '',
      can_request: data.can_request !== undefined ? data.can_request : true,
      can_review: data.can_review !== undefined ? data.can_review : false
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

  // Change Requests & Unified Workflow
  async getChangeRequests(status) {
    const endpoint = status ? `/change-requests?status=${status}` : '/change-requests';
    return await request(endpoint);
  },

  async getMyRequests(status) {
    const endpoint = status ? `/change-requests/my-requests?status=${status}` : '/change-requests/my-requests';
    return await request(endpoint);
  },

  async getReviewerQueue(status) {
    const endpoint = status ? `/change-requests/review-queue?status=${status}` : '/change-requests/review-queue';
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

  async saveDraft(data) {
    return await request('/change-requests/draft', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateChangeRequest(id, data) {
    return await request(`/change-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async submitDraft(id) {
    return await request(`/change-requests/${id}/submit`, {
      method: 'POST'
    });
  },

  async deleteDraft(id) {
    return await request(`/change-requests/${id}/draft`, {
      method: 'DELETE'
    });
  },

  async startReview(id) {
    return await request(`/change-requests/${id}/start-review`, {
      method: 'POST'
    });
  },

  async requestClarification(id, message, attachments = []) {
    return await request(`/change-requests/${id}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ message, attachments })
    });
  },

  async respondClarification(id, message, attachments = []) {
    return await request(`/change-requests/${id}/respond-clarification`, {
      method: 'POST',
      body: JSON.stringify({ message, attachments })
    });
  },

  async addReviewerComment(id, comment, operational_comments = '') {
    return await request(`/change-requests/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment, operational_comments })
    });
  },

  async submitReviewerRecommendation(id, recommendation, notes, operational_comments = '') {
    return await request(`/change-requests/${id}/recommend`, {
      method: 'POST',
      body: JSON.stringify({ recommendation, notes, operational_comments })
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

  // Notifications
  async getNotifications() {
    return await request('/change-requests/notifications');
  },

  async markNotificationRead(id) {
    return await request(`/change-requests/notifications/${id}/read`, {
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
  }
};
