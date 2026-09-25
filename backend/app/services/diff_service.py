from typing import Dict, Any, List
from app.schemas.schemas import FieldDiff

FIELD_LABELS = {
    "decision_area": "Decision / Activity Area",
    "parent_function": "Function Domain",
    "business_line": "Business Line / Category",
    "category": "Category",
    "key_non_key": "Key / Non-Key",
    "composite_authority": "Composite Authority Chain",
    "shareholders": "Shareholders Operator",
    "board_of_directors": "Board of Directors Operator",
    "subsidiary_board": "Subsidiary Board Operator",
    "chairman": "Chairman Operator",
    "board_committees": "Board Committee 1",
    "board_committees_op": "Board Committee 1 Operator",
    "board_committees2": "Board Committee 2",
    "board_committees2_op": "Board Committee 2 Operator",
    "gceo": "GCEO Operator",
    "ceo": "CEO Operator",
    "mgmt_committees": "Management Committee 1",
    "mgmt_committees_op": "Management Committee 1 Operator",
    "mgmt_committees2": "Management Committee 2",
    "mgmt_committees2_op": "Management Committee 2 Operator",
    "c_level1": "C-Level Executive 1",
    "c_level1_op": "C-Level Executive 1 Operator",
    "c_level2": "C-Level Executive 2",
    "c_level2_op": "C-Level Executive 2 Operator",
    "regulatory": "Regulatory Mandate",
    "rationale": "Rationale / Justification",
    "comments": "Comments / Operational Notes",
    "effective_date": "Effective Date",
    "review_date": "Review Date",
    "status": "Governance Status"
}

def calculate_diff(current: Dict[str, Any], proposed: Dict[str, Any]) -> List[FieldDiff]:
    diffs: List[FieldDiff] = []
    
    # Check all fields in proposed and current
    all_keys = set(current.keys()).union(set(proposed.keys()))
    
    # Keys to ignore during field comparison
    ignore_keys = {"created_at", "created_by", "modified_at", "modified_by", "current_version", "id"}
    
    for key in sorted(all_keys):
        if key in ignore_keys:
            continue
            
        cur_val = current.get(key)
        prop_val = proposed.get(key)
        
        # Normalize None and empty strings
        cur_norm = "" if cur_val is None else str(cur_val).strip()
        prop_norm = "" if prop_val is None else str(prop_val).strip()
        
        label = FIELD_LABELS.get(key, key.replace("_", " ").title())
        
        if key not in current or cur_norm == "":
            if prop_norm != "":
                diffs.append(FieldDiff(
                    field=key,
                    field_label=label,
                    current_value=cur_val,
                    proposed_value=prop_val,
                    change_type="ADDED"
                ))
        elif key not in proposed or prop_norm == "":
            if cur_norm != "":
                diffs.append(FieldDiff(
                    field=key,
                    field_label=label,
                    current_value=cur_val,
                    proposed_value=prop_val,
                    change_type="REMOVED"
                ))
        elif cur_norm != prop_norm:
            diffs.append(FieldDiff(
                field=key,
                field_label=label,
                current_value=cur_val,
                proposed_value=prop_val,
                change_type="MODIFIED"
            ))
        else:
            diffs.append(FieldDiff(
                field=key,
                field_label=label,
                current_value=cur_val,
                proposed_value=prop_val,
                change_type="UNCHANGED"
            ))
            
    return diffs
