import io
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from xml.sax.saxutils import escape

# Candidate paths to locate original template
POSSIBLE_TEMPLATE_PATHS = [
    Path(__file__).resolve().parents[3] / "frontend" / "src" / "assets" / "Data - DOA Tool.xlsx",
    Path(__file__).resolve().parents[2] / "frontend" / "src" / "assets" / "Data - DOA Tool.xlsx",
    Path(r"c:\Users\aswin.bijoykumar\Downloads\Data - DOA Tool.xlsx"),
    Path(r"c:\Works\DOA_Edge_Cases\DOA---edge-cases\frontend\src\assets\Data - DOA Tool.xlsx"),
]

SEED_JSON_PATH = Path(__file__).resolve().parents[1] / "seed_doa_data.json"

COLS_LETTERS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD'
]

HEADER_TITLES = [
    'Unique No.',
    'Function/\nBusiness Line Name',
    'Key/Non-Key',
    'Decision Area',
    'Shareholders',
    'Board of Directors',
    'Subsidiary Board',
    'Chairman',
    'Board Committees',
    '',
    'Board Committees',
    '',
    'GCEO',
    'CEO',
    'Management Committees and Working Groups',
    '',
    'Management Committees and Working Groups',
    '',
    'C-Level Management',
    '',
    'C-Level Management',
    '',
    'C-Level Management',
    '',
    'C-Level Management',
    '',
    'C-Level Management',
    '',
    ' Comments',
    'Regulatory Mandated '
]


def get_template_path() -> Optional[Path]:
    for p in POSSIBLE_TEMPLATE_PATHS:
        if p.exists():
            return p
    return None


def get_template_and_seed_lookup():
    """
    Parse Data - DOA Tool.xlsx using built-in zipfile + xml.etree.ElementTree
    (no third-party library required) and merge with seed_doa_data.json.
    """
    template_path = get_template_path()
    lookup: Dict[str, Dict[str, Any]] = {}
    banners_order: List[str] = []
    functions_order: List[str] = ["Finance Function", "Risk Function"]

    if template_path:
        try:
            ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            with zipfile.ZipFile(template_path, 'r') as z:
                ss = []
                if 'xl/sharedStrings.xml' in z.namelist():
                    ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
                    for si in ss_root.findall('main:si', ns):
                        ss.append(''.join(
                            t.text or ''
                            for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        ))

                sh_root = ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
                current_func = "Finance Function"
                current_banner = "Bank Capital and Capital Management"

                for r in sh_root.findall('main:sheetData/main:row', ns)[1:]:
                    ht_val = int(float(r.attrib.get('ht', '38')))
                    row_cells: Dict[str, str] = {}
                    for c in r.findall('main:c', ns):
                        ref = c.attrib.get('r', '')
                        col_let = ''.join(ch for ch in ref if ch.isalpha())
                        t_attr = c.attrib.get('t')
                        v_el = c.find('main:v', ns)
                        val = v_el.text if v_el is not None and v_el.text is not None else ''
                        if t_attr == 's' and val != '':
                            val = ss[int(val)]
                        row_cells[col_let] = val

                    if not row_cells.get('A'):
                        if row_cells.get('B'):
                            current_func = row_cells['B'].strip()
                            if current_func not in functions_order:
                                functions_order.append(current_func)
                        elif row_cells.get('D'):
                            current_banner = row_cells['D'].strip()
                            if current_banner not in banners_order:
                                banners_order.append(current_banner)
                    else:
                        rec_id = str(row_cells['A']).strip()
                        cols_arr = [row_cells.get(col_let, '') for col_let in COLS_LETTERS]
                        lookup[rec_id] = {
                            'func_banner': current_func,
                            'banner': current_banner,
                            'ht': ht_val,
                            'cols': cols_arr
                        }
        except Exception as e:
            print(f"[ExcelExport] Error reading template lookup: {e}")

    # Also load seed_doa_data.json for Risk and any additional DOA records
    if SEED_JSON_PATH.exists():
        try:
            seed_items = json.loads(SEED_JSON_PATH.read_text(encoding='utf-8'))
            for s in seed_items:
                rec_id = str(s.get('id', '')).strip()
                if not rec_id or rec_id in lookup:
                    continue
                fn = s.get('parentFunction') or s.get('function') or 'Finance'
                func_banner = f"{fn} Function" if not fn.endswith("Function") else fn
                cat = s.get('category') or s.get('businessLine') or 'General Processes'
                if func_banner not in functions_order:
                    functions_order.append(func_banner)
                if cat not in banners_order:
                    banners_order.append(cat)

                cols_arr = [
                    rec_id,
                    fn,
                    s.get('keyNonKey') or 'Key',
                    s.get('decisionArea') or '',
                    s.get('shareholders') or '',
                    s.get('boardOfDirectors') or '',
                    s.get('subsidiaryBoard') or '',
                    s.get('chairman') or '',
                    s.get('boardCommittees') or '',
                    s.get('boardCommitteesOp') or '',
                    s.get('boardCommittees2') or '',
                    s.get('boardCommittees2Op') or '',
                    s.get('gceo') or '',
                    s.get('ceo') or '',
                    s.get('mgmtCommittees') or '',
                    s.get('mgmtCommitteesOp') or '',
                    s.get('mgmtCommittees2') or '',
                    s.get('mgmtCommittees2Op') or '',
                    s.get('cLevel1') or '',
                    s.get('cLevel1Op') or '',
                    s.get('cLevel2') or '',
                    s.get('cLevel2Op') or '',
                    s.get('cLevel3') or '',
                    s.get('cLevel3Op') or '',
                    s.get('cLevel4') or '',
                    s.get('cLevel4Op') or '',
                    s.get('cLevel5') or '',
                    s.get('cLevel5Op') or '',
                    s.get('comments') or '',
                    s.get('regulatory') or 'N'
                ]
                lookup[rec_id] = {
                    'func_banner': func_banner,
                    'banner': cat,
                    'ht': _estimate_row_height(cols_arr[3], cols_arr[28]),
                    'cols': cols_arr
                }
        except Exception as e:
            print(f"[ExcelExport] Error reading seed JSON: {e}")

    return lookup, functions_order, banners_order


def _estimate_row_height(decision_area: str, comments: str) -> int:
    d_len = len(decision_area or '')
    c_len = len(comments or '')
    c_lines = (comments or '').count('\n') + 1
    max_lines = max(d_len // 38 + 1, c_len // 45 + c_lines)
    if max_lines <= 2:
        return 38
    if max_lines == 3:
        return 57
    if max_lines == 4:
        return 76
    if max_lines == 5:
        return 95
    if max_lines <= 7:
        return 133
    return 190


def _xml_cell(cell_ref: str, style_idx: int, value: Any = '', force_str: bool = False) -> str:
    if value is None or value == '':
        return f'<c r="{cell_ref}" s="{style_idx}"/>'
    s_val = str(value)
    if not force_str and s_val.isdigit():
        return f'<c r="{cell_ref}" s="{style_idx}"><v>{s_val}</v></c>'
    escaped = escape(s_val)
    return f'<c r="{cell_ref}" s="{style_idx}" t="inlineStr"><is><t xml:space="preserve">{escaped}</t></is></c>'


def _normalize_record_to_30_cols(
    r: Dict[str, Any],
    lookup: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Convert any incoming DOA rule, Designation View item, or Management Report row
    into the exact 30-column structure of Data - DOA Tool.xlsx.
    """
    candidate_doa_id = r.get('doa_id') if r.get('doa_id') not in (None, '', 'NEW_RULE', 'NEW') else None
    raw_id = candidate_doa_id or r.get('record_id') or r.get('id') or r.get('version_id') or r.get('log_id') or ''
    clean_id = str(raw_id).strip().lstrip('#')

    # If the row has proposed_changes or proposed_value JSON, parse it for fallback fields
    proposed = {}
    for k in ('proposed_changes', 'proposed_value', 'snapshot'):
        val = r.get(k)
        if isinstance(val, dict):
            proposed.update(val)
        elif isinstance(val, str) and val.startswith('{'):
            try:
                proposed.update(json.loads(val))
            except Exception:
                pass

    if clean_id in lookup:
        tmpl = lookup[clean_id]
        cols = list(tmpl['cols'])
        func_banner = tmpl['func_banner']
        cat_banner = tmpl['banner']
        ht = tmpl['ht']

        # Overlay updated decision_area or comments if explicitly modified
        if r.get('decision_area') or r.get('decisionArea'):
            cols[3] = r.get('decision_area') or r.get('decisionArea')
        if r.get('comments'):
            cols[28] = r.get('comments')
        elif not cols[28]:
            extra_notes = []
            if r.get('decision_comment'):
                extra_notes.append(str(r['decision_comment']))
            if r.get('operational_impact'):
                extra_notes.append(str(r['operational_impact']))
            if r.get('policy_reference') and not r.get('decision_area'):
                extra_notes.append(str(r['policy_reference']))
            if extra_notes:
                cols[28] = "\n\n".join(extra_notes)
                ht = max(ht, _estimate_row_height(cols[3], cols[28]))

        return {
            'func_banner': func_banner,
            'banner': cat_banner,
            'ht': ht,
            'cols': cols
        }

    # Build from record fields + proposed fields
    merged = {**proposed, **r}
    fn = (
        merged.get('function')
        or merged.get('parent_function')
        or merged.get('parentFunction')
        or merged.get('department')
        or 'Finance'
    )
    if 'risk' in fn.lower():
        fn_short = 'Risk'
        func_banner = 'Risk Function'
    else:
        fn_short = 'Finance' if 'finance' in fn.lower() else fn
        func_banner = f"{fn_short} Function" if not fn_short.endswith('Function') else fn_short

    cat_banner = (
        merged.get('category')
        or merged.get('business_line')
        or merged.get('businessLine')
        or merged.get('process_name')
        or merged.get('process')
        or ('Non-Key Decision Areas' if (merged.get('key_non_key') or merged.get('keyNonKey')) == 'Non-Key' else 'Bank Capital and Capital Management')
    )

    decision_area = (
        merged.get('decision_area')
        or merged.get('decisionArea')
        or merged.get('process')
        or merged.get('comment')
        or merged.get('action')
        or f"Governance Record {clean_id}"
    )

    comments_parts = []
    if merged.get('comments'):
        comments_parts.append(str(merged['comments']))
    else:
        if merged.get('regulatory_requirement'):
            comments_parts.append(str(merged['regulatory_requirement']))
        if merged.get('policy_reference'):
            comments_parts.append(str(merged['policy_reference']))
        if merged.get('decision_comment'):
            comments_parts.append(str(merged['decision_comment']))
        if merged.get('operational_impact'):
            comments_parts.append(str(merged['operational_impact']))
    comments_str = "\n\n".join(comments_parts)

    reg_flag = merged.get('regulatory')
    if not reg_flag:
        reg_flag = 'Y' if merged.get('regulatory_requirement') else 'N'

    cols = [
        clean_id,
        fn_short,
        merged.get('key_non_key') or merged.get('keyNonKey') or 'Key',
        decision_area,
        merged.get('shareholders') or '',
        merged.get('board_of_directors') or merged.get('boardOfDirectors') or '',
        merged.get('subsidiary_board') or merged.get('subsidiaryBoard') or '',
        merged.get('chairman') or '',
        merged.get('board_committees') or merged.get('boardCommittees') or '',
        merged.get('board_committees_op') or merged.get('boardCommitteesOp') or '',
        merged.get('board_committees2') or merged.get('boardCommittees2') or '',
        merged.get('board_committees2_op') or merged.get('boardCommittees2Op') or '',
        merged.get('gceo') or '',
        merged.get('ceo') or '',
        merged.get('mgmt_committees') or merged.get('mgmtCommittees') or '',
        merged.get('mgmt_committees_op') or merged.get('mgmtCommitteesOp') or '',
        merged.get('mgmt_committees2') or merged.get('mgmtCommittees2') or '',
        merged.get('mgmt_committees2_op') or merged.get('mgmtCommittees2Op') or '',
        merged.get('c_level1') or merged.get('cLevel1') or '',
        merged.get('c_level1_op') or merged.get('cLevel1Op') or '',
        merged.get('c_level2') or merged.get('cLevel2') or '',
        merged.get('c_level2_op') or merged.get('cLevel2Op') or '',
        merged.get('c_level3') or merged.get('cLevel3') or '',
        merged.get('c_level3_op') or merged.get('cLevel3Op') or '',
        merged.get('c_level4') or merged.get('cLevel4') or '',
        merged.get('c_level4_op') or merged.get('cLevel4Op') or '',
        merged.get('c_level5') or merged.get('cLevel5') or '',
        merged.get('c_level5_op') or merged.get('cLevel5Op') or '',
        comments_str,
        reg_flag
    ]

    return {
        'func_banner': func_banner,
        'banner': cat_banner,
        'ht': _estimate_row_height(decision_area, comments_str),
        'cols': cols
    }


def _build_sheet2_xml(normalized_rows: List[Dict[str, Any]], functions_order: List[str], banners_order: List[str]) -> Tuple[str, int]:
    """
    Build the exact xl/worksheets/sheet2.xml matching Data - DOA Tool.xlsx theme and styles.
    """
    # Group by function_banner -> category_banner -> list of rows
    grouped: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for item in normalized_rows:
        fb = item['func_banner']
        cb = item['banner']
        grouped.setdefault(fb, {}).setdefault(cb, []).append(item)

    ordered_func_keys = [f for f in functions_order if f in grouped] + [f for f in grouped if f not in functions_order]

    xml_rows: List[str] = []

    # ROW 1: Exact 30-Column Header Row (s=32, 41, 42, height=57)
    r1_cells: List[str] = []
    merged_left_indices = {8, 10, 14, 16, 18, 20, 22, 24, 26}   # I, K, O, Q, S, U, W, Y, AA (0-based)
    merged_right_indices = {9, 11, 15, 17, 19, 21, 23, 25, 27}  # J, L, P, R, T, V, X, Z, AB (0-based)

    for idx, col_let in enumerate(COLS_LETTERS):
        ref = f"{col_let}1"
        title = HEADER_TITLES[idx]
        if idx in merged_left_indices:
            r1_cells.append(_xml_cell(ref, 41, title, force_str=True))
        elif idx in merged_right_indices:
            r1_cells.append(_xml_cell(ref, 42, ''))
        else:
            r1_cells.append(_xml_cell(ref, 32, title, force_str=True))
    r1_cells.append('<c r="AE1" s="12"/>')
    r1_cells.append('<c r="AF1" s="12"/>')
    xml_rows.append(
        f'<row r="1" spans="1:32" s="10" customFormat="1" ht="57" x14ac:dyDescent="0.35">'
        f'{"".join(r1_cells)}</row>'
    )

    current_row = 2
    for fb in ordered_func_keys:
        cat_map = grouped[fb]
        # FUNCTION BANNER ROW (Dark Navy #002060, height=60, s=33,34,35,36)
        fb_cells: List[str] = []
        for idx, col_let in enumerate(COLS_LETTERS):
            ref = f"{col_let}{current_row}"
            if idx == 1:  # Column B
                fb_cells.append(_xml_cell(ref, 34, fb, force_str=True))
            elif idx == 2:  # Column C
                fb_cells.append(_xml_cell(ref, 34, ''))
            elif idx == 4:  # Column E
                fb_cells.append(_xml_cell(ref, 35, ''))
            elif idx == 29:  # Column AD
                fb_cells.append(_xml_cell(ref, 36, ''))
            else:
                fb_cells.append(_xml_cell(ref, 33, ''))
        xml_rows.append(
            f'<row r="{current_row}" spans="1:32" ht="60" customHeight="1" x14ac:dyDescent="0.35">'
            f'{"".join(fb_cells)}</row>'
        )
        current_row += 1

        ordered_cats = [b for b in banners_order if b in cat_map] + [b for b in cat_map if b not in banners_order]
        for cb in ordered_cats:
            items = cat_map[cb]
            # CATEGORY BANNER ROW (Light Blue-Gray #D6DCE4, height=60, s=37,38)
            cb_cells: List[str] = []
            for idx, col_let in enumerate(COLS_LETTERS):
                ref = f"{col_let}{current_row}"
                if idx == 3:  # Column D
                    cb_cells.append(_xml_cell(ref, 38, cb, force_str=True))
                elif idx in (2, 28, 29):  # Columns C, AC, AD
                    cb_cells.append(_xml_cell(ref, 38, ''))
                else:
                    cb_cells.append(_xml_cell(ref, 37, ''))
            xml_rows.append(
                f'<row r="{current_row}" spans="1:32" ht="60" customHeight="1" x14ac:dyDescent="0.35">'
                f'{"".join(cb_cells)}</row>'
            )
            current_row += 1

            # DATA ROWS (s=39 centered, s=40 left-aligned for D and AC)
            for item in items:
                cols_vals = item['cols']
                ht = item['ht']
                d_cells: List[str] = []
                for idx, col_let in enumerate(COLS_LETTERS):
                    ref = f"{col_let}{current_row}"
                    val = cols_vals[idx] if idx < len(cols_vals) else ''
                    style_id = 40 if idx in (3, 28) else 39
                    force_str = (idx != 0)
                    d_cells.append(_xml_cell(ref, style_id, val, force_str=force_str))
                xml_rows.append(
                    f'<row r="{current_row}" spans="1:32" ht="{ht}" x14ac:dyDescent="0.35">'
                    f'{"".join(d_cells)}</row>'
                )
                current_row += 1

    max_row = max(1, current_row - 1)

    sheet2_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'mc:Ignorable="x14ac xr xr2 xr3" '
        'xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" '
        'xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" '
        'xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" '
        'xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3" '
        'xr:uid="{B718B181-C9BA-4A4F-9BE1-D25AD77D84C3}">'
        '<sheetPr><tabColor theme="4" tint="0.59999389629810485"/><pageSetUpPr fitToPage="1"/></sheetPr>'
        f'<dimension ref="A1:AF{max_row}"/>'
        '<sheetViews><sheetView showGridLines="0" tabSelected="1" zoomScale="55" zoomScaleNormal="55" zoomScaleSheetLayoutView="40" workbookViewId="0">'
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        '<selection pane="bottomLeft"/>'
        '</sheetView></sheetViews>'
        '<sheetFormatPr defaultColWidth="8.81640625" defaultRowHeight="14" x14ac:dyDescent="0.35"/>'
        '<cols>'
        '<col min="1" max="1" width="12.1796875" style="10" customWidth="1"/>'
        '<col min="2" max="2" width="23.54296875" style="10" customWidth="1"/>'
        '<col min="3" max="3" width="16.1796875" style="10" customWidth="1"/>'
        '<col min="4" max="4" width="45.1796875" style="11" customWidth="1"/>'
        '<col min="5" max="5" width="22.36328125" style="10" customWidth="1"/>'
        '<col min="6" max="9" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="10" max="10" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="11" max="11" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="12" max="12" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="13" max="14" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="15" max="15" width="21.81640625" style="10" customWidth="1"/>'
        '<col min="16" max="16" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="17" max="17" width="21.81640625" style="10" customWidth="1"/>'
        '<col min="18" max="18" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="19" max="19" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="20" max="20" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="21" max="21" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="22" max="22" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="23" max="23" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="24" max="24" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="25" max="25" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="26" max="26" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="27" max="27" width="20.54296875" style="10" customWidth="1"/>'
        '<col min="28" max="28" width="10.54296875" style="10" customWidth="1"/>'
        '<col min="29" max="29" width="55.6328125" style="11" customWidth="1"/>'
        '<col min="30" max="30" width="18.36328125" style="10" customWidth="1"/>'
        '<col min="31" max="16384" width="8.81640625" style="12"/>'
        '</cols>'
        '<sheetData>'
        + "".join(xml_rows)
        + '</sheetData>'
        '<mergeCells count="9">'
        '<mergeCell ref="Q1:R1"/>'
        '<mergeCell ref="O1:P1"/>'
        '<mergeCell ref="I1:J1"/>'
        '<mergeCell ref="K1:L1"/>'
        '<mergeCell ref="AA1:AB1"/>'
        '<mergeCell ref="Y1:Z1"/>'
        '<mergeCell ref="W1:X1"/>'
        '<mergeCell ref="U1:V1"/>'
        '<mergeCell ref="S1:T1"/>'
        '</mergeCells>'
        '<pageMargins left="0.05" right="0" top="0.05" bottom="0.05" header="0" footer="0"/>'
        '<pageSetup paperSize="66" scale="50" fitToHeight="0" orientation="landscape" r:id="rId1"/>'
        '</worksheet>'
    )
    return sheet2_xml, max_row


def generate_doa_master_excel(records: List[Dict[str, Any]], title: str = "Delegation of Authority Matrix") -> io.BytesIO:
    """
    Generate an .xlsx file with the exact theme, sheets (ToC + Sample Department DOA),
    styles, fills, borders, fonts, and 30-column attribute structure of Data - DOA Tool.xlsx.
    """
    template_path = get_template_path()
    lookup, functions_order, banners_order = get_template_and_seed_lookup()

    normalized_rows = [_normalize_record_to_30_cols(r, lookup) for r in (records or [])]
    sheet2_xml, max_row = _build_sheet2_xml(normalized_rows, functions_order, banners_order)

    out = io.BytesIO()
    if template_path and template_path.exists():
        with zipfile.ZipFile(template_path, 'r') as zin:
            with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    data = zin.read(item.filename)
                    if item.filename == 'xl/worksheets/sheet2.xml':
                        zout.writestr(item, sheet2_xml.encode('utf-8'))
                    elif item.filename == 'xl/workbook.xml':
                        wb_str = data.decode('utf-8').replace('$A$1:$AD$48', f'$A$1:$AD${max_row}')
                        zout.writestr(item, wb_str.encode('utf-8'))
                    else:
                        zout.writestr(item, data)
    out.seek(0)
    return out
