# Strategic Plan & Architecture Proposal: Domain-Based Business Decision Segregation (Risk vs. Finance)

**Document Reference:** `business_decision_plan.md`  
**Target Architecture:** Delegation of Authority (DOA) Governance Platform  
**Target Codebase:** `DOA---edge-cases` (FastAPI backend + React 19 frontend)  

---

## 1. Executive Evaluation: Login Dropdown Approach

### User Proposed Concept
> *"As a prototype, if I build on the login page a dropdown selecting 'Risk' (or 'Finance'), then all 7 user roles will get to see only risk (or finance) regarding decision rules. Is it a good plan for implementation?"*

### Assessment Summary: **Viable for Prototype, but with Limitations**
The login dropdown approach is **acceptable as a quick, low-complexity demo/prototype**, but it has significant architectural and realistic enterprise drawbacks if implemented naively:

#### Pros of the Login Dropdown:
1. **Zero Confusion for Demo Presenters:** The presenter explicitly picks `[ Domain: Risk | Finance ]` right before clicking a persona, making the demonstration intent instantly obvious.
2. **Minimal Backend Disruption:** The selected domain can be passed as a session context parameter (`selected_domain` header, query param, or stored in JWT/local storage).
3. **Immediate Scoping:** The entire UI (matrices, proposal forms, queue items) can filter its default view to the chosen parent function.

#### Cons & Limitations:
1. **Unrealistic Enterprise UX:** In real enterprise governance, employees do not pick their department on the login screen. An employee in Credit Risk cannot choose "Finance" at login to view treasury records. Their identity, department, and role access are strictly bound to their HR profile and directory credentials.
2. **Artificial Persona Duplication:** Elena Rostova is the *P2P Process Owner* (Operations/Finance), and Sophia Zhang is the *Senior Risk Reviewer* (Enterprise Risk). If a user logs in as Elena under "Risk", Elena is now managing Risk rules she has no authority over.
3. **Session Rigidity:** If a user logs in under "Risk" and needs to cross-check an interconnected Finance threshold (e.g. Capex funding vs Credit exposure), they must log out and log back in.

---

## 2. Recommended Superior Alternative: Dual-Layer Domain Architecture

Instead of locking the domain at the login gate, we recommend a **Hybrid Context Architecture** that supports both realistic enterprise RBAC and agile prototype switching:

### Option A (Recommended for Prototype + Scalability): **Global Domain Switcher in Top Navigation Bar**
Keep the login authentic to the user, and place an interactive **Domain Pillar Switcher** in the top header:
```
┌────────────────────────────────────────────────────────────────────────┐
│  protiviti •  DoA Management Tool   [ Domain: 🏢 Finance | 🛡️ Risk ]   │
│  Tabs: Overview | Search DoA | New Request | Change Queue | Audit      │
└────────────────────────────────────────────────────────────────────────┘
```
- **How it works:**
  - When logged in as **Marcus Vance (Head of Finance & Treasury)**, the default domain automatically locks to **Finance**.
  - When logged in as **Sophia Zhang (Senior Risk Reviewer)**, the default domain automatically locks to **Risk**.
  - Elevated Governance and Audit roles (Claire Montgomery, Governance Team, DOA Admin) can freely toggle between **Finance (7 Business Lines)** and **Risk (10 Business Lines)** or view **All Domains**.
  - Single-domain personas receive an informative badge: `Domain: Finance (Restricted)`.

### Option B (Recommended if Login Selection is Mandatory): **Domain-Aware Persona Selector on Login Page**
If you want the login screen to drive the experience, structure the login page by **Domain Pillars** rather than a disconnected dropdown:
- Create two distinct login domain tabs or persona cards:
  - **🏛️ Corporate Finance Domain:**
    - Requestor (Aiden Cole - Commercial Ops)
    - Process Owner (Elena Rostova - P2P & Capex Lead)
    - Department Owner (Marcus Vance - Head of Finance & Treasury)
    - Executive Approver (Julian Hayes - VP Finance)
  - **🛡️ Enterprise Risk & Governance Domain:**
    - Risk Analyst / Requestor
    - Credit & Market Risk Process Owner
    - Head of Risk / Department Owner (CRO Office)
    - 2LoD Risk Reviewer (Sophia Zhang)
    - Mandate & Charter Owner (David Sterling)
- **Benefit:** Avoids mismatching personas with wrong departments while giving immediate, zero-friction access to Risk-only or Finance-only workflows.

---

## 3. End-to-End Implementation Roadmap

### Phase 1: Backend Domain Scoping & Data Boundary
1. **Query-Level Enforcement:**
   - In `backend/app/api/roles_workflows.py` and `backend/app/api/change_requests.py`, accept an optional `parent_function: Optional[str] = Query(None)`.
   - If the user's role/persona belongs to a dedicated department (e.g. `Finance`), auto-filter `DOARecord.parent_function == 'Finance'` and `ChangeRequest.department.ilike('%Finance%')`.
2. **Business Line Mapping:**
   - When `domain == 'Finance'`, restrict business line choices to the **7 Finance Business Lines**:
     * Bank Capital and Capital Management
     * Budgeting Processes and Financial Disclosures
     * Other Finance Processes
     * Non-Key Decision Areas
     * Treasury & Funding Operations
     * Cost Allocation & Management Accounting
     * Subsidiary & SPV Capital Management
   - When `domain == 'Risk'`, restrict business line choices to the **10 Risk Business Lines**:
     * Wholesale Credit Risk
     * Retail Credit Risk
     * Market & Treasury Risk
     * Operational & Non-Financial Risk
     * Liquidity & Asset-Liability Risk
     * Enterprise Risk Management (ERM)
     * Compliance & Financial Crime (AML/CFT)
     * Information Security & Cyber Risk
     * Shariah Governance Risk
     * Special Assets & Provisioning

### Phase 2: Frontend Context & State Propagation
1. **Domain Context Provider:**
   - Store `activeDomain` in React state (`'Finance' | 'Risk' | 'All'`).
   - Store selection in `localStorage.setItem('doa_active_domain', activeDomain)`.
2. **Global Header Pill / Switcher:**
   - Render a dual-pill toggle in `App.jsx` header:
     - `[ 🏢 Finance (7 BLs) ]`
     - `[ 🛡️ Risk (10 BLs) ]`
3. **Synchronized View Filtering:**
   - **Search DoA Tab:** Automatically filters parent taxonomy, child business lines, and rule counts.
   - **New Request Tab:** Pre-populates and locks parent function to the active domain; cascades only compatible business lines in dropdown.
   - **Change Queue Tab:** Filters proposals to only those affecting the active domain.

---

## 4. Architectural Comparison Matrix

| Criteria | User Idea: Login Dropdown | Plan A: Header Domain Switcher (Recommended) | Plan B: Domain-Grouped Personas |
|---|---|---|---|
| **Demo Clarity** | High | Very High | Exceptional |
| **Enterprise Realism** | Low (Users don't pick dept at login) | High (Context-aware RBAC) | High (Pre-assigned domain roles) |
| **Implementation Risk** | Low | Low (Pure state & filter prop) | Very Low |
| **Flexibility During Demo** | Low (Requires logout to change) | High (Switch on the fly without logout) | Medium (One-click re-login) |
| **Segregation of Duties** | Weak (Spoofable via dropdown) | Strong (Locked by persona + elevates for audit) | Strong (Strict role mapping) |

---

## 5. Conclusion & Actionable Recommendation

**Recommendation:** Proceed with **Plan A (Header Domain Switcher) coupled with Persona Default Binding**:
1. When logging in, the persona's native department sets the default domain (e.g. `Finance` for Marcus Vance, `Risk` for Sophia Zhang).
2. Users can easily see and toggle between **Finance** and **Risk** in the top navigation bar with live indicator badges showing which business lines are active.
3. If an explicit login-page selection is desired for stakeholder presentation, a **Domain Selector** can be added to `LoginPage.jsx` that automatically selects the corresponding persona and filters the app upon entry.
