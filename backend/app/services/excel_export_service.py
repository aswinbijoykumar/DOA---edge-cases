import os
import io
from pathlib import Path
from typing import List, Dict, Any, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Candidate paths to locate original template
POSSIBLE_TEMPLATE_PATHS = [
    Path(__file__).resolve().parents[3] / "frontend" / "src" / "assets" / "Data - DOA Tool.xlsx",
    Path(__file__).resolve().parents[2] / "frontend" / "src" / "assets" / "Data - DOA Tool.xlsx",
    Path(r"c:\Works\DOA_Edge_Cases\DOA---edge-cases\frontend\src\assets\Data - DOA Tool.xlsx"),
]

def get_template_path() -> Optional[Path]:
    for p in POSSIBLE_TEMPLATE_PATHS:
        if p.exists():
            return p
    return None

def get_template_lookup():
    template_path = get_template_path()
    if not template_path:
        return {}, []
    
    try:
        wb = openpyxl.load_workbook(template_path, data_only=True)
        ws = wb['Sample Department DOA']
        
        lookup = {}
        current_banner = "General"
        banners_order = []
        
        for r in range(2, ws.max_row + 1):
            v0 = ws.cell(r, 1).value
            v3 = ws.cell(r, 4).value
            if v0 is None:
                if v3:
                    current_banner = str(v3).strip()
                    if current_banner not in banners_order:
                        banners_order.append(current_banner)
            else:
                rec_id = str(v0).strip()
                cols = [ws.cell(r, c).value for c in range(1, 31)]
                lookup[rec_id] = {
                    'banner': current_banner,
                    'cols': cols
                }
        return lookup, banners_order
    except Exception as e:
        print(f"Error loading template: {e}")
        return {}, []

def generate_doa_master_excel(records: List[Dict[str, Any]], title: str = "Delegation of Authority Matrix") -> io.BytesIO:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "DOA Master Matrix"
    ws.views.sheetView[0].showGridLines = True
    
    template_lookup, template_banners = get_template_lookup()
    
    # Visual Styles matching Excel Theme Accent
    header_fill = PatternFill(fill_type="solid", fgColor="BDD7EE")  # Light blue header
    banner_fill = PatternFill(fill_type="solid", fgColor="D9E1F2")  # Light slate-blue category banner
    
    font_header = Font(name="Arial", size=10, bold=True, color="000000")
    font_banner = Font(name="Arial", size=11, bold=True, italic=True, color="000000")
    font_data = Font(name="Arial", size=9, bold=False, color="000000")
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    
    thin_border_side = Side(border_style="thin", color="BFBFBF")
    cell_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    
    # Exact Header Titles
    headers = [
        'Unique No.', 'Function/\nBusiness Line Name', 'Key/Non-Key', 'Decision Area',
        'Shareholders', 'Board of Directors', 'Subsidiary Board', 'Chairman',
        'Board Committees', 'Board Committees', 'Board Committees', 'Board Committees',
        'GCEO', 'CEO',
        'Management Committees and Working Groups', 'Management Committees and Working Groups',
        'Management Committees and Working Groups', 'Management Committees and Working Groups',
        'C-Level Management', 'C-Level Management', 'C-Level Management', 'C-Level Management',
        'C-Level Management', 'C-Level Management', 'C-Level Management', 'C-Level Management',
        'C-Level Management', 'C-Level Management',
        'Comments', 'Regulatory Mandated'
    ]
    
    ws.row_dimensions[1].height = 38
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(1, col_idx, header)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = align_center
        cell.border = cell_border
        
    # Merges on Header row across multi-column committee and c-level headers
    header_merges = ['I1:J1', 'K1:L1', 'O1:P1', 'Q1:R1', 'S1:T1', 'U1:V1', 'W1:X1', 'Y1:Z1', 'AA1:AB1']
    for m in header_merges:
        ws.merge_cells(m)
        
    # Column Widths
    col_widths = {
        1: 12, 2: 24, 3: 16, 4: 45, 5: 18, 6: 18, 7: 18, 8: 18,
        9: 18, 10: 10, 11: 18, 12: 10, 13: 18, 14: 18,
        15: 22, 16: 10, 17: 22, 18: 10,
        19: 18, 20: 10, 21: 18, 22: 10, 23: 18, 24: 10, 25: 18, 26: 10, 27: 18, 28: 10,
        29: 52, 30: 18
    }
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width
        
    # Group records by category/banner
    grouped = {}
    for r in records:
        rec_id = str(r.get('id', '')).strip()
        if rec_id in template_lookup:
            banner = template_lookup[rec_id]['banner']
        else:
            banner = r.get('business_line') or r.get('category') or 'General Processes'
        if banner not in grouped:
            grouped[banner] = []
        grouped[banner].append(r)
        
    # Order groups: preserve template banners first, then any extra banners
    ordered_groups = []
    for b in template_banners:
        if b in grouped:
            ordered_groups.append((b, grouped.pop(b)))
    for b, recs in grouped.items():
        ordered_groups.append((b, recs))
        
    current_row = 2
    for banner, recs in ordered_groups:
        # Category Banner Row
        ws.row_dimensions[current_row].height = 24
        for c in range(1, 31):
            cell = ws.cell(current_row, c)
            cell.fill = banner_fill
            cell.border = cell_border
        banner_cell = ws.cell(current_row, 4, banner)
        banner_cell.font = font_banner
        banner_cell.alignment = align_left
        current_row += 1
        
        # Data Rows
        for r in recs:
            rec_id = str(r.get('id', '')).strip()
            if rec_id in template_lookup:
                cols_data = template_lookup[rec_id]['cols']
            else:
                cols_data = [
                    r.get('id', ''),
                    r.get('function') or r.get('parent_function') or 'Finance',
                    r.get('key_non_key') or 'Key',
                    r.get('decision_area', ''),
                    r.get('shareholders', ''),
                    r.get('board_of_directors', ''),
                    r.get('subsidiary_board', ''),
                    r.get('chairman', ''),
                    r.get('board_committees', ''),
                    r.get('board_committees_op', ''),
                    r.get('board_committees2', ''),
                    r.get('board_committees2_op', ''),
                    r.get('gceo', ''),
                    r.get('ceo', ''),
                    r.get('mgmt_committees', ''),
                    r.get('mgmt_committees_op', ''),
                    r.get('mgmt_committees2', ''),
                    r.get('mgmt_committees2_op', ''),
                    r.get('c_level1', ''),
                    r.get('c_level1_op', ''),
                    r.get('c_level2', ''),
                    r.get('c_level2_op', ''),
                    r.get('c_level3', ''),
                    r.get('c_level3_op', ''),
                    r.get('c_level4', ''),
                    r.get('c_level4_op', ''),
                    r.get('c_level5', ''),
                    r.get('c_level5_op', ''),
                    r.get('comments', ''),
                    r.get('regulatory', 'N')
                ]
            
            ws.row_dimensions[current_row].height = 24
            for c_idx, val in enumerate(cols_data[:30], 1):
                cell = ws.cell(current_row, c_idx, val if val is not None else '')
                cell.font = font_data
                cell.border = cell_border
                if c_idx in [2, 4, 29]:
                    cell.alignment = align_left
                else:
                    cell.alignment = align_center
            current_row += 1
            
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return out

