import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import templateXlsxUrl from '../assets/Data - DOA Tool.xlsx?url';
import templateData from './excelTemplateLookup.json';
import { getStoredToken } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const COLS_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD'
];

const HEADER_TITLES = [
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
];

/**
 * Standard CRC-32 calculation for ZIP archive entries
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function estimateRowHeight(decisionArea, comments) {
  const dLen = (decisionArea || '').length;
  const cLen = (comments || '').length;
  const cLines = (comments || '').split('\n').length;
  const maxLines = Math.max(Math.floor(dLen / 38) + 1, Math.floor(cLen / 45) + cLines);
  if (maxLines <= 2) return 38;
  if (maxLines === 3) return 57;
  if (maxLines === 4) return 76;
  if (maxLines === 5) return 95;
  if (maxLines <= 7) return 133;
  return 190;
}

function xmlCell(cellRef, styleIdx, value = '', forceStr = false) {
  if (value === null || value === undefined || value === '') {
    return `<c r="${cellRef}" s="${styleIdx}"/>`;
  }
  const sVal = String(value);
  if (!forceStr && /^\d+$/.test(sVal)) {
    return `<c r="${cellRef}" s="${styleIdx}"><v>${sVal}</v></c>`;
  }
  return `<c r="${cellRef}" s="${styleIdx}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(sVal)}</t></is></c>`;
}

/**
 * Map any DOA record, Designation View item, or Management Report row
 * to the exact 30-column schema of Data - DOA Tool.xlsx.
 */
function normalizeRecordTo30Cols(r, lookup) {
  const candidateDoaId = (r?.doa_id && r.doa_id !== 'NEW_RULE' && r.doa_id !== 'NEW') ? r.doa_id : null;
  const rawId = candidateDoaId || r?.record_id || r?.id || r?.version_id || r?.log_id || '';
  const cleanId = String(rawId).trim().replace(/^#/, '');

  let proposed = {};
  for (const key of ['proposed_changes', 'proposed_value', 'snapshot']) {
    const val = r?.[key];
    if (val && typeof val === 'object') {
      proposed = { ...proposed, ...val };
    } else if (typeof val === 'string' && val.trim().startsWith('{')) {
      try {
        proposed = { ...proposed, ...JSON.parse(val) };
      } catch {
        // ignore invalid json
      }
    }
  }

  if (cleanId && lookup[cleanId]) {
    const tmpl = lookup[cleanId];
    const cols = [...tmpl.cols];
    const funcBanner = tmpl.func_banner;
    const catBanner = tmpl.banner;
    let ht = tmpl.ht;

    if (r.decision_area || r.decisionArea) {
      cols[3] = r.decision_area || r.decisionArea;
    }
    if (r.comments) {
      cols[28] = r.comments;
    } else if (!cols[28]) {
      const extraNotes = [];
      if (r.decision_comment) extraNotes.push(String(r.decision_comment));
      if (r.operational_impact) extraNotes.push(String(r.operational_impact));
      if (r.policy_reference && !(r.decision_area || r.decisionArea)) {
        extraNotes.push(String(r.policy_reference));
      }
      if (extraNotes.length) {
        cols[28] = extraNotes.join('\n\n');
        ht = Math.max(ht, estimateRowHeight(cols[3], cols[28]));
      }
    }

    return {
      func_banner: funcBanner,
      banner: catBanner,
      ht,
      cols
    };
  }

  const merged = { ...proposed, ...r };
  const fn =
    merged.function ||
    merged.parent_function ||
    merged.parentFunction ||
    merged.department ||
    'Finance';

  let fnShort = fn;
  let funcBanner = 'Finance Function';
  if (fn.toLowerCase().includes('risk')) {
    fnShort = 'Risk';
    funcBanner = 'Risk Function';
  } else {
    fnShort = fn.toLowerCase().includes('finance') ? 'Finance' : fn;
    funcBanner = fnShort.endsWith('Function') ? fnShort : `${fnShort} Function`;
  }

  const catBanner =
    merged.category ||
    merged.business_line ||
    merged.businessLine ||
    merged.process_name ||
    merged.process ||
    ((merged.key_non_key || merged.keyNonKey) === 'Non-Key'
      ? 'Non-Key Decision Areas'
      : 'Bank Capital and Capital Management');

  const decisionArea =
    merged.decision_area ||
    merged.decisionArea ||
    merged.process ||
    merged.comment ||
    merged.action ||
    `Governance Record ${cleanId}`;

  const commentsParts = [];
  if (merged.comments) {
    commentsParts.push(String(merged.comments));
  } else {
    if (merged.regulatory_requirement) commentsParts.push(String(merged.regulatory_requirement));
    if (merged.policy_reference) commentsParts.push(String(merged.policy_reference));
    if (merged.decision_comment) commentsParts.push(String(merged.decision_comment));
    if (merged.operational_impact) commentsParts.push(String(merged.operational_impact));
  }
  const commentsStr = commentsParts.join('\n\n');

  const regFlag = merged.regulatory || (merged.regulatory_requirement ? 'Y' : 'N');

  const cols = [
    cleanId,
    fnShort,
    merged.key_non_key || merged.keyNonKey || 'Key',
    decisionArea,
    merged.shareholders || '',
    merged.board_of_directors || merged.boardOfDirectors || '',
    merged.subsidiary_board || merged.subsidiaryBoard || '',
    merged.chairman || '',
    merged.board_committees || merged.boardCommittees || '',
    merged.board_committees_op || merged.boardCommitteesOp || '',
    merged.board_committees2 || merged.boardCommittees2 || '',
    merged.board_committees2_op || merged.boardCommittees2Op || '',
    merged.gceo || '',
    merged.ceo || '',
    merged.mgmt_committees || merged.mgmtCommittees || '',
    merged.mgmt_committees_op || merged.mgmtCommitteesOp || '',
    merged.mgmt_committees2 || merged.mgmtCommittees2 || '',
    merged.mgmt_committees2_op || merged.mgmtCommittees2Op || '',
    merged.c_level1 || merged.cLevel1 || '',
    merged.c_level1_op || merged.cLevel1Op || '',
    merged.c_level2 || merged.cLevel2 || '',
    merged.c_level2_op || merged.cLevel2Op || '',
    merged.c_level3 || merged.cLevel3 || '',
    merged.c_level3_op || merged.cLevel3Op || '',
    merged.c_level4 || merged.cLevel4 || '',
    merged.c_level4_op || merged.cLevel4Op || '',
    merged.c_level5 || merged.cLevel5 || '',
    merged.c_level5_op || merged.cLevel5Op || '',
    commentsStr,
    regFlag
  ];

  return {
    func_banner: funcBanner,
    banner: catBanner,
    ht: estimateRowHeight(decisionArea, commentsStr),
    cols
  };
}

/**
 * Generate exact xl/worksheets/sheet2.xml matching Data - DOA Tool.xlsx
 */
function buildSheet2Xml(normalizedRows, functionsOrder, bannersOrder) {
  const grouped = {};
  normalizedRows.forEach(item => {
    const fb = item.func_banner;
    const cb = item.banner;
    if (!grouped[fb]) grouped[fb] = {};
    if (!grouped[fb][cb]) grouped[fb][cb] = [];
    grouped[fb][cb].push(item);
  });

  const orderedFuncKeys = [
    ...functionsOrder.filter(f => grouped[f]),
    ...Object.keys(grouped).filter(f => !functionsOrder.includes(f))
  ];

  const xmlRows = [];
  const mergedLeftIndices = new Set([8, 10, 14, 16, 18, 20, 22, 24, 26]);
  const mergedRightIndices = new Set([9, 11, 15, 17, 19, 21, 23, 25, 27]);

  // Row 1: Header Row (s=32, 41, 42, height=57)
  const r1Cells = [];
  COLS_LETTERS.forEach((colLet, idx) => {
    const ref = `${colLet}1`;
    const title = HEADER_TITLES[idx];
    if (mergedLeftIndices.has(idx)) {
      r1Cells.push(xmlCell(ref, 41, title, true));
    } else if (mergedRightIndices.has(idx)) {
      r1Cells.push(xmlCell(ref, 42, ''));
    } else {
      r1Cells.push(xmlCell(ref, 32, title, true));
    }
  });
  r1Cells.push('<c r="AE1" s="12"/>');
  r1Cells.push('<c r="AF1" s="12"/>');
  xmlRows.push(
    `<row r="1" spans="1:32" s="10" customFormat="1" ht="57" x14ac:dyDescent="0.35">${r1Cells.join('')}</row>`
  );

  let currentRow = 2;
  orderedFuncKeys.forEach(fb => {
    const catMap = grouped[fb];
    // Function Banner Row (Dark Navy #002060, height=60, s=33,34,35,36)
    const fbCells = COLS_LETTERS.map((colLet, idx) => {
      const ref = `${colLet}${currentRow}`;
      if (idx === 1) return xmlCell(ref, 34, fb, true);
      if (idx === 2) return xmlCell(ref, 34, '');
      if (idx === 4) return xmlCell(ref, 35, '');
      if (idx === 29) return xmlCell(ref, 36, '');
      return xmlCell(ref, 33, '');
    });
    xmlRows.push(
      `<row r="${currentRow}" spans="1:32" ht="60" customHeight="1" x14ac:dyDescent="0.35">${fbCells.join('')}</row>`
    );
    currentRow++;

    const orderedCats = [
      ...bannersOrder.filter(b => catMap[b]),
      ...Object.keys(catMap).filter(b => !bannersOrder.includes(b))
    ];

    orderedCats.forEach(cb => {
      const items = catMap[cb];
      // Category Banner Row (Light Blue-Gray #D6DCE4, height=60, s=37,38)
      const cbCells = COLS_LETTERS.map((colLet, idx) => {
        const ref = `${colLet}${currentRow}`;
        if (idx === 3) return xmlCell(ref, 38, cb, true);
        if (idx === 2 || idx === 28 || idx === 29) return xmlCell(ref, 38, '');
        return xmlCell(ref, 37, '');
      });
      xmlRows.push(
        `<row r="${currentRow}" spans="1:32" ht="60" customHeight="1" x14ac:dyDescent="0.35">${cbCells.join('')}</row>`
      );
      currentRow++;

      // Data Rows (s=39 centered, s=40 left-aligned for D and AC)
      items.forEach(item => {
        const dCells = COLS_LETTERS.map((colLet, idx) => {
          const ref = `${colLet}${currentRow}`;
          const val = item.cols[idx] ?? '';
          const styleId = (idx === 3 || idx === 28) ? 40 : 39;
          const forceStr = idx !== 0;
          return xmlCell(ref, styleId, val, forceStr);
        });
        xmlRows.push(
          `<row r="${currentRow}" spans="1:32" ht="${item.ht}" x14ac:dyDescent="0.35">${dCells.join('')}</row>`
        );
        currentRow++;
      });
    });
  });

  const maxRow = Math.max(1, currentRow - 1);
  const sheet2Xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
    'mc:Ignorable="x14ac xr xr2 xr3" ' +
    'xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" ' +
    'xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" ' +
    'xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" ' +
    'xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3" ' +
    'xr:uid="{B718B181-C9BA-4A4F-9BE1-D25AD77D84C3}">' +
    '<sheetPr><tabColor theme="4" tint="0.59999389629810485"/><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:AF${maxRow}"/>` +
    '<sheetViews><sheetView showGridLines="0" tabSelected="1" zoomScale="55" zoomScaleNormal="55" zoomScaleSheetLayoutView="40" workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft"/>' +
    '</sheetView></sheetViews>' +
    '<sheetFormatPr defaultColWidth="8.81640625" defaultRowHeight="14" x14ac:dyDescent="0.35"/>' +
    '<cols>' +
    '<col min="1" max="1" width="12.1796875" style="10" customWidth="1"/>' +
    '<col min="2" max="2" width="23.54296875" style="10" customWidth="1"/>' +
    '<col min="3" max="3" width="16.1796875" style="10" customWidth="1"/>' +
    '<col min="4" max="4" width="45.1796875" style="11" customWidth="1"/>' +
    '<col min="5" max="5" width="22.36328125" style="10" customWidth="1"/>' +
    '<col min="6" max="9" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="10" max="10" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="11" max="11" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="12" max="12" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="13" max="14" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="15" max="15" width="21.81640625" style="10" customWidth="1"/>' +
    '<col min="16" max="16" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="17" max="17" width="21.81640625" style="10" customWidth="1"/>' +
    '<col min="18" max="18" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="19" max="19" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="20" max="20" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="21" max="21" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="22" max="22" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="23" max="23" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="24" max="24" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="25" max="25" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="26" max="26" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="27" max="27" width="20.54296875" style="10" customWidth="1"/>' +
    '<col min="28" max="28" width="10.54296875" style="10" customWidth="1"/>' +
    '<col min="29" max="29" width="55.6328125" style="11" customWidth="1"/>' +
    '<col min="30" max="30" width="18.36328125" style="10" customWidth="1"/>' +
    '<col min="31" max="16384" width="8.81640625" style="12"/>' +
    '</cols>' +
    '<sheetData>' +
    xmlRows.join('') +
    '</sheetData>' +
    '<mergeCells count="9">' +
    '<mergeCell ref="Q1:R1"/>' +
    '<mergeCell ref="O1:P1"/>' +
    '<mergeCell ref="I1:J1"/>' +
    '<mergeCell ref="K1:L1"/>' +
    '<mergeCell ref="AA1:AB1"/>' +
    '<mergeCell ref="Y1:Z1"/>' +
    '<mergeCell ref="W1:X1"/>' +
    '<mergeCell ref="U1:V1"/>' +
    '<mergeCell ref="S1:T1"/>' +
    '</mergeCells>' +
    '<pageMargins left="0.05" right="0" top="0.05" bottom="0.05" header="0" footer="0"/>' +
    '<pageSetup paperSize="66" scale="50" fitToHeight="0" orientation="landscape" r:id="rId1"/>' +
    '</worksheet>';

  return { sheet2Xml, maxRow };
}

/**
 * Inject updated XML files into the original Data - DOA Tool.xlsx ZIP buffer
 * preserving ToC sheet, styles.xml, theme1.xml, sharedStrings.xml, and printerSettings.
 */
function buildStyledXlsxFromTemplateBuffer(templateArrayBuffer, replacementsMap) {
  const bytes = new Uint8Array(templateArrayBuffer);
  const view = new DataView(templateArrayBuffer);
  const decoder = new TextDecoder('utf-8');
  const encoder = new TextEncoder();

  // Locate End of Central Directory (EOCD) record (0x06054b50)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid template XLSX zip archive');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const entries = [];
  let ptr = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) {
      throw new Error('Invalid Central Directory header');
    }
    const versionMadeBy = view.getUint16(ptr + 4, true);
    const versionNeeded = view.getUint16(ptr + 6, true);
    const flags = view.getUint16(ptr + 8, true);
    const compressionMethod = view.getUint16(ptr + 10, true);
    const modTime = view.getUint16(ptr + 12, true);
    const modDate = view.getUint16(ptr + 14, true);
    const entryCrc32 = view.getUint32(ptr + 16, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const uncompressedSize = view.getUint32(ptr + 24, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const internalAttrs = view.getUint16(ptr + 36, true);
    const externalAttrs = view.getUint32(ptr + 38, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileNameBytes = bytes.subarray(ptr + 46, ptr + 46 + fileNameLen);
    const fileName = decoder.decode(fileNameBytes);

    // Locate raw compressed data in Local File Header
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawCompressedData = bytes.subarray(dataStart, dataStart + compressedSize);

    entries.push({
      fileName,
      fileNameBytes,
      versionMadeBy,
      versionNeeded,
      flags: flags & ~0x0008, // clear data descriptor bit since sizes are known upfront
      compressionMethod,
      modTime,
      modDate,
      crc32: entryCrc32,
      compressedSize,
      uncompressedSize,
      internalAttrs,
      externalAttrs,
      dataBytes: rawCompressedData
    });

    ptr += 46 + fileNameLen + extraLen + commentLen;
  }

  // Apply replacements using uncompressed STORE (method 0)
  entries.forEach(entry => {
    if (Object.prototype.hasOwnProperty.call(replacementsMap, entry.fileName)) {
      const xmlBytes = encoder.encode(replacementsMap[entry.fileName]);
      entry.compressionMethod = 0;
      entry.crc32 = crc32(xmlBytes);
      entry.compressedSize = xmlBytes.length;
      entry.uncompressedSize = xmlBytes.length;
      entry.dataBytes = xmlBytes;
    }
  });

  // Compute total output buffer size
  let localSectionSize = 0;
  let cdSectionSize = 0;
  entries.forEach(e => {
    localSectionSize += 30 + e.fileNameBytes.length + e.dataBytes.length;
    cdSectionSize += 46 + e.fileNameBytes.length;
  });

  const outBuffer = new ArrayBuffer(localSectionSize + cdSectionSize + 22);
  const outBytes = new Uint8Array(outBuffer);
  const outView = new DataView(outBuffer);

  let writeOffset = 0;
  entries.forEach(e => {
    e.newLocalOffset = writeOffset;
    outView.setUint32(writeOffset, 0x04034b50, true);
    outView.setUint16(writeOffset + 4, e.versionNeeded, true);
    outView.setUint16(writeOffset + 6, e.flags, true);
    outView.setUint16(writeOffset + 8, e.compressionMethod, true);
    outView.setUint16(writeOffset + 10, e.modTime, true);
    outView.setUint16(writeOffset + 12, e.modDate, true);
    outView.setUint32(writeOffset + 14, e.crc32, true);
    outView.setUint32(writeOffset + 18, e.compressedSize, true);
    outView.setUint32(writeOffset + 22, e.uncompressedSize, true);
    outView.setUint16(writeOffset + 26, e.fileNameBytes.length, true);
    outView.setUint16(writeOffset + 28, 0, true);
    writeOffset += 30;

    outBytes.set(e.fileNameBytes, writeOffset);
    writeOffset += e.fileNameBytes.length;

    outBytes.set(e.dataBytes, writeOffset);
    writeOffset += e.dataBytes.length;
  });

  const newCdOffset = writeOffset;
  entries.forEach(e => {
    outView.setUint32(writeOffset, 0x02014b50, true);
    outView.setUint16(writeOffset + 4, e.versionMadeBy, true);
    outView.setUint16(writeOffset + 6, e.versionNeeded, true);
    outView.setUint16(writeOffset + 8, e.flags, true);
    outView.setUint16(writeOffset + 10, e.compressionMethod, true);
    outView.setUint16(writeOffset + 12, e.modTime, true);
    outView.setUint16(writeOffset + 14, e.modDate, true);
    outView.setUint32(writeOffset + 16, e.crc32, true);
    outView.setUint32(writeOffset + 20, e.compressedSize, true);
    outView.setUint32(writeOffset + 24, e.uncompressedSize, true);
    outView.setUint16(writeOffset + 28, e.fileNameBytes.length, true);
    outView.setUint16(writeOffset + 30, 0, true);
    outView.setUint16(writeOffset + 32, 0, true);
    outView.setUint16(writeOffset + 34, 0, true);
    outView.setUint16(writeOffset + 36, e.internalAttrs, true);
    outView.setUint32(writeOffset + 38, e.externalAttrs, true);
    outView.setUint32(writeOffset + 42, e.newLocalOffset, true);
    writeOffset += 46;

    outBytes.set(e.fileNameBytes, writeOffset);
    writeOffset += e.fileNameBytes.length;
  });

  // End of Central Directory (EOCD)
  outView.setUint32(writeOffset, 0x06054b50, true);
  outView.setUint16(writeOffset + 4, 0, true);
  outView.setUint16(writeOffset + 6, 0, true);
  outView.setUint16(writeOffset + 8, entries.length, true);
  outView.setUint16(writeOffset + 10, entries.length, true);
  outView.setUint32(writeOffset + 12, cdSectionSize, true);
  outView.setUint32(writeOffset + 16, newCdOffset, true);
  outView.setUint16(writeOffset + 20, 0, true);

  return outBuffer;
}

function triggerBlobDownload(blob, filename) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Export table report data or Designation View authorities to .xlsx (Excel)
 * matching the exact theme, sheets (ToC + Sample Department DOA), colors, fonts,
 * borders, merged headers, and 30-column attributes of Data - DOA Tool.xlsx.
 */
export async function exportReportToExcel(reportData, filenamePrefix = 'management_report') {
  const rows = Array.isArray(reportData) ? reportData : reportData?.data;
  if (!rows || !rows.length) {
    alert('No report records to export.');
    return;
  }

  const cleanTitle = (reportData?.title || filenamePrefix).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // 1. Attempt client-side template-based OpenXML generator using bundled Data - DOA Tool.xlsx
  try {
    const templateRes = await fetch(templateXlsxUrl);
    if (templateRes.ok) {
      const templateBuffer = await templateRes.arrayBuffer();
      const lookup = templateData.lookup || {};
      const functionsOrder = templateData.functionsOrder || ['Finance Function', 'Risk Function'];
      const bannersOrder = templateData.bannersOrder || [];

      const normalizedRows = rows.map(r => normalizeRecordTo30Cols(r, lookup));
      const { sheet2Xml, maxRow } = buildSheet2Xml(normalizedRows, functionsOrder, bannersOrder);
      const updatedWorkbookXml = (templateData.workbookXml || '').replace(
        '$A$1:$AD$48',
        `$A$1:$AD$${maxRow}`
      );

      const replacements = {
        'xl/worksheets/sheet2.xml': sheet2Xml
      };
      if (updatedWorkbookXml) {
        replacements['xl/workbook.xml'] = updatedWorkbookXml;
      }

      const outBuffer = buildStyledXlsxFromTemplateBuffer(templateBuffer, replacements);
      const blob = new Blob([outBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      triggerBlobDownload(blob, filename);
      return;
    }
  } catch (clientTemplateErr) {
    console.warn('Client template Excel export fallback to backend:', clientTemplateErr);
  }

  // 2. Fallback to Backend Excel service
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/user/reports/management/export-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        report_type: filenamePrefix,
        title: reportData?.title || 'Delegation of Authority Management Report',
        data: rows
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
      return;
    }
  } catch (backendErr) {
    console.warn('Backend excel export failed, falling back to basic XLSX generator:', backendErr);
  }

  // 3. Final fallback using SheetJS with the 30-column DOA schema
  const lookup = templateData.lookup || {};
  const normalizedRows = rows.map(r => normalizeRecordTo30Cols(r, lookup));
  const aoa = [HEADER_TITLES.map(h => h || '')];
  normalizedRows.forEach(item => {
    aoa.push(item.cols);
  });
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Department DOA');
  XLSX.writeFile(workbook, filename);
}

/**
 * Clean string formatting for PDF cell values
 */
function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val).replace(/[➔→]|->/g, '←');
}

function humanizeHeader(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Export table report data to .pdf replicating the exact 30-column pattern,
 * hierarchically merged headers, domain/category banners, and styling of Data - DOA Tool.xlsx.
 */
export function exportReportToPdf(reportData, filenamePrefix = 'management_report') {
  if (!reportData) {
    alert('No report records to export.');
    return;
  }

  const rows = Array.isArray(reportData)
    ? reportData
    : (reportData.data || []);

  if (!rows || !rows.length) {
    alert('No report records to export.');
    return;
  }

  const title = reportData.title || 'Delegation of Authority Governance Matrix';
  const reportId = reportData.report_id || filenamePrefix || 'RPT-DOA';
  const scope = reportData.scope || 'Enterprise Governance Matrix';
  const generatedAt = reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : new Date().toLocaleString();
  const count = reportData.count || rows.length;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a3'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Multi-tier / grouped headers matching Data - DOA Tool.xlsx
  const headerRow = [
    { content: 'Unique\nNo.', styles: { halign: 'center' } },
    { content: 'Function/\nLine Name', styles: { halign: 'center' } },
    { content: 'Key/\nNon-Key', styles: { halign: 'center' } },
    { content: 'Decision Area', styles: { halign: 'left' } },
    { content: 'Shareholders', styles: { halign: 'center' } },
    { content: 'Board of\nDirectors', styles: { halign: 'center' } },
    { content: 'Subsidiary\nBoard', styles: { halign: 'center' } },
    { content: 'Chairman', styles: { halign: 'center' } },
    { content: 'Board\nCommittees', colSpan: 2, styles: { halign: 'center' } },
    { content: 'Board\nCommittees', colSpan: 2, styles: { halign: 'center' } },
    { content: 'GCEO', styles: { halign: 'center' } },
    { content: 'CEO', styles: { halign: 'center' } },
    { content: 'Management Committees\nand Working Groups', colSpan: 2, styles: { halign: 'center' } },
    { content: 'Management Committees\nand Working Groups', colSpan: 2, styles: { halign: 'center' } },
    { content: 'C-Level\nManagement', colSpan: 2, styles: { halign: 'center' } },
    { content: 'C-Level\nManagement', colSpan: 2, styles: { halign: 'center' } },
    { content: 'C-Level\nManagement', colSpan: 2, styles: { halign: 'center' } },
    { content: 'C-Level\nManagement', colSpan: 2, styles: { halign: 'center' } },
    { content: 'C-Level\nManagement', colSpan: 2, styles: { halign: 'center' } },
    { content: 'Comments', styles: { halign: 'left' } },
    { content: 'Regulatory\nMandated', styles: { halign: 'center' } }
  ];

  // Column styles with exact proportional widths and alignments
  const columnStyles = {
    0: { cellWidth: 26, halign: 'center' },
    1: { cellWidth: 40, halign: 'center' },
    2: { cellWidth: 26, halign: 'center' },
    3: { cellWidth: 195, halign: 'left' },
    4: { cellWidth: 28, halign: 'center' },
    5: { cellWidth: 28, halign: 'center' },
    6: { cellWidth: 28, halign: 'center' },
    7: { cellWidth: 28, halign: 'center' },
    8: { cellWidth: 26, halign: 'center' },
    9: { cellWidth: 18, halign: 'center' },
    10: { cellWidth: 26, halign: 'center' },
    11: { cellWidth: 18, halign: 'center' },
    12: { cellWidth: 24, halign: 'center' },
    13: { cellWidth: 24, halign: 'center' },
    14: { cellWidth: 34, halign: 'center' },
    15: { cellWidth: 18, halign: 'center' },
    16: { cellWidth: 34, halign: 'center' },
    17: { cellWidth: 18, halign: 'center' },
    18: { cellWidth: 26, halign: 'center' },
    19: { cellWidth: 18, halign: 'center' },
    20: { cellWidth: 26, halign: 'center' },
    21: { cellWidth: 18, halign: 'center' },
    22: { cellWidth: 26, halign: 'center' },
    23: { cellWidth: 18, halign: 'center' },
    24: { cellWidth: 26, halign: 'center' },
    25: { cellWidth: 18, halign: 'center' },
    26: { cellWidth: 26, halign: 'center' },
    27: { cellWidth: 18, halign: 'center' },
    28: { cellWidth: 190, halign: 'left' },
    29: { cellWidth: 26, halign: 'center' }
  };

  // Normalize rows using master lookup
  const lookup = templateData.lookup || {};
  const functionsOrder = templateData.functions_order || ['Finance Function', 'Risk Function'];
  const bannersOrder = templateData.banners_order || [];

  const normalizedRows = rows.map(r => normalizeRecordTo30Cols(r, lookup));

  // Group by function banner and category banner
  const grouped = {};
  normalizedRows.forEach(item => {
    const fb = item.func_banner || 'Finance Function';
    const cb = item.banner || 'General Governance Processes';
    if (!grouped[fb]) grouped[fb] = {};
    if (!grouped[fb][cb]) grouped[fb][cb] = [];
    grouped[fb][cb].push(item);
  });

  const orderedFuncKeys = [
    ...functionsOrder.filter(f => grouped[f]),
    ...Object.keys(grouped).filter(f => !functionsOrder.includes(f))
  ];

  const tableBody = [];

  orderedFuncKeys.forEach(fb => {
    const catMap = grouped[fb];
    // Function Banner (Dark Navy #002060, white bold text)
    tableBody.push([
      {
        content: fb,
        colSpan: 30,
        styles: {
          fillColor: [0, 32, 96],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'left',
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
        }
      }
    ]);

    const orderedCats = [
      ...bannersOrder.filter(b => catMap[b]),
      ...Object.keys(catMap).filter(b => !bannersOrder.includes(b))
    ];

    orderedCats.forEach(cb => {
      const items = catMap[cb];
      // Category Banner (Light Blue-Gray #D9E1F2, dark bolditalic text)
      tableBody.push([
        {
          content: cb,
          colSpan: 30,
          styles: {
            fillColor: [217, 225, 242],
            textColor: [15, 23, 42],
            fontStyle: 'bolditalic',
            fontSize: 7,
            halign: 'left',
            cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 }
          }
        }
      ]);

      // Data Rows
      items.forEach(item => {
        const rowCells = item.cols.map((val, idx) => {
          if (val === null || val === undefined) return '';
          return String(val);
        });
        tableBody.push(rowCells);
      });
    });
  });

  // Top Title Bar on Page 1
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DELEGATION OF AUTHORITY (DOA) PLATFORM', 20, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(153, 246, 228); // teal-200
  doc.text(`Corporate Governance Matrix: [${reportId}] ${title}`, 20, 29);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(7.5);
  doc.text(`Scope: ${scope}  |  Compiled: ${generatedAt}  |  Records: ${count}`, pageWidth - 20, 24, { align: 'right' });

  // Generate Table matching exact 30-column Excel pattern
  autoTable(doc, {
    startY: 44,
    head: [headerRow],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [184, 204, 228], // Exact Excel steel blue
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 6.5,
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
      lineColor: [180, 198, 220],
      lineWidth: 0.5
    },
    styles: {
      fontSize: 6,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
      textColor: [30, 41, 59],
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles,
    margin: { left: 20, right: 20, top: 44, bottom: 26 },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Confidential - Corporate Governance Audit Trail & Delegation Matrix | Page ${data.pageNumber} of ${pageCount}`,
        20,
        doc.internal.pageSize.getHeight() - 12
      );
    }
  });

  const cleanTitle = (reportData.report_id || filenamePrefix).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
