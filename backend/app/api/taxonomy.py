from fastapi import APIRouter, Depends
from typing import Dict, List, Any
from app.database.models import User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/taxonomy", tags=["Taxonomy & Master Data"])

FUNCTION_TAXONOMY = {
    "Finance": [
        "Bank Capital and Capital Management",
        "Budgeting Processes and Financial Disclosures",
        "Other Finance Processes",
        "Non-Key Decision Areas",
        "Treasury & Funding Operations",
        "Cost Allocation & Management Accounting",
        "Subsidiary & SPV Capital Management"
    ],
    "Risk": [
        "Wholesale Credit Risk",
        "Retail Credit Risk",
        "Market & Treasury Risk",
        "Operational & Non-Financial Risk",
        "Liquidity & Asset-Liability Risk",
        "Enterprise Risk Management (ERM)",
        "Compliance & Financial Crime (AML/CFT)",
        "Information Security & Cyber Risk",
        "Shariah Governance Risk",
        "Special Assets & Provisioning"
    ]
}

COMMITTEES_TAXONOMY = [
    {"id": "bod", "code": "BoD", "name": "Board of Directors", "type": "Board"},
    {"id": "ac", "code": "AC", "name": "Audit Committee", "type": "Board Committee"},
    {"id": "rmc", "code": "RMC", "name": "Risk Management Committee", "type": "Board Committee"},
    {"id": "nrc", "code": "NRC", "name": "Nomination & Remuneration Committee", "type": "Board Committee"},
    {"id": "exco", "code": "EXCO", "name": "Executive Committee", "type": "Management Committee"},
    {"id": "aloco", "code": "ALCO", "name": "Asset & Liability Committee", "type": "Management Committee"},
    {"id": "crc", "code": "CRC", "name": "Credit Risk Committee", "type": "Management Committee"},
    {"id": "orco", "code": "ORC", "name": "Operational Risk Committee", "type": "Management Committee"},
    {"id": "itsc", "code": "ITSC", "name": "IT Steering Committee", "type": "Management Committee"}
]

GOVERNANCE_DOCUMENTS = [
    {"id": "DOC-CBB-01", "name": "CBB Rulebook Volume 2 (Licensing & Governance)", "category": "Regulatory", "authority": "Central Bank of Bahrain"},
    {"id": "DOC-BASEL-03", "name": "Basel III Capital Adequacy Framework", "category": "Regulatory", "authority": "Basel Committee on Banking Supervision"},
    {"id": "DOC-CCL-2001", "name": "Commercial Companies Law No. 21", "category": "Statutory", "authority": "Ministry of Industry & Commerce"},
    {"id": "DOC-POL-FIN-01", "name": "Enterprise Capital Management Policy", "category": "Internal Policy", "authority": "Finance"},
    {"id": "DOC-POL-RSK-04", "name": "Wholesale Credit & Underwriting Policy", "category": "Internal Policy", "authority": "Risk Management"},
    {"id": "DOC-POL-AUD-02", "name": "Group Internal Audit Charter & Standard", "category": "Internal Policy", "authority": "Audit Committee"},
    {"id": "DOC-POL-AML-01", "name": "Anti-Money Laundering & Sanctions Policy", "category": "Internal Policy", "authority": "Compliance"},
    {"id": "DOC-SOP-TREAS-01", "name": "Treasury Funding & Liquidity Operating Procedure", "category": "Operating Procedure", "authority": "Treasury"}
]

WORKFLOW_ROUTING_RULES = [
    {
        "id": "RULE-REG-01",
        "rule_name": "Mandatory Regulatory Impact Route",
        "condition": "Regulatory == 'Y' OR Impact == 'Regulatory'",
        "routing_type": "Sequential Review",
        "required_bodies": ["Compliance", "Board Audit Committee (AC)", "DOA Administrator"],
        "description": "Any change with regulatory references or Central Bank mandates requires Compliance pre-clearance and Board Audit Committee endorsement."
    },
    {
        "id": "RULE-FIN-HIGH",
        "rule_name": "High-Value Capital & Treasury Route",
        "condition": "Department == 'Finance' AND Process == 'Bank Capital and Capital Management'",
        "routing_type": "Parallel Review",
        "required_bodies": ["CFO", "ALCO", "Executive Committee (EXCO)", "DOA Administrator"],
        "description": "Capital allocation decisions require parallel review from Asset-Liability Committee and Executive Committee."
    },
    {
        "id": "RULE-RSK-CREDIT",
        "rule_name": "Wholesale Credit & Risk Limit Escalation",
        "condition": "Department == 'Risk' AND Process IN ('Wholesale Credit Risk', 'Market & Treasury Risk')",
        "routing_type": "Conditional Routing",
        "required_bodies": ["CRO", "Risk Management Committee (RMC)", "Board of Directors (BoD)"],
        "description": "Credit limit and portfolio risk governance escalates to RMC and BoD."
    },
    {
        "id": "RULE-STD-OPS",
        "rule_name": "Standard Operational Process Governance",
        "condition": "Key/Non-Key == 'Non-Key' AND Regulatory == 'N'",
        "routing_type": "Fast-Track Sequential",
        "required_bodies": ["Department Head", "Governance Team", "DOA Administrator"],
        "description": "Routine procedural updates require standard departmental review and DOA Administrator sign-off."
    }
]

@router.get("/functions", response_model=Dict[str, List[str]])
def get_functions_taxonomy(current_user: User = Depends(get_current_user)):
    return FUNCTION_TAXONOMY

@router.get("/departments", response_model=List[str])
def get_departments(current_user: User = Depends(get_current_user)):
    return ["Finance", "Risk", "Treasury", "Internal Audit", "Operations", "Compliance", "Legal", "Information Technology"]

@router.get("/committees")
def get_committees(current_user: User = Depends(get_current_user)):
    return COMMITTEES_TAXONOMY

@router.get("/governance-documents")
def get_governance_documents(current_user: User = Depends(get_current_user)):
    return GOVERNANCE_DOCUMENTS

@router.get("/workflow-rules")
def get_workflow_rules(current_user: User = Depends(get_current_user)):
    return WORKFLOW_ROUTING_RULES

@router.get("/statuses", response_model=List[str])
def get_statuses(current_user: User = Depends(get_current_user)):
    return [
        "DRAFT", 
        "SUBMITTED", 
        "UNDER_REVIEW", 
        "CLARIFICATION_REQUIRED", 
        "APPROVED", 
        "REJECTED", 
        "PUBLISHED", 
        "ARCHIVED",
        "WITHDRAWN"
    ]
