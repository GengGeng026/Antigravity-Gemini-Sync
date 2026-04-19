/* Antigravity Handover Web API - V19 Clean Architecture
 *
 * 修復重點：
 * - 完全棄用 split/pop 重拼邏輯（污染根源）
 * - 改用 indexOf 精準定位 MOBILE 區塊邊界
 * - doPost 支援三個 action：push / mobile_update / pull
 * - 每次寫入 Doc 後同步回 GEMINI_BRIDGE.txt
 *
 * action 說明：
 *   push          ← Antigravity 離開時呼叫，寫入新模板，保留 Doc 現有的手機端紀錄
 *   mobile_update ← Gemini App 更新手機端紀錄時呼叫（只改 MOBILE 區塊）
 *   pull          ← Antigravity 啟動時呼叫，取得 Doc 最新內容（含手機端最新紀錄）
 */

const SECRETS = {
  AUTH_TOKEN: 'ag-sync-secret-2026',
  TARGET_DOC_ID: '1s2dJHSdqOGjRSef5RDSxWhaHlmiEFI8rd4Cw1VHJF4U',
  TXT_FILE_NAME: 'GEMINI_BRIDGE.txt'
};

const MOBILE_HEADER = '## 📱 【手機端即時紀錄 (Mobile Updates)】';
const MOBILE_END    = '[END_MOBILE]';
const DEFAULT_MOBILE = '(目前尚無新紀錄，請 Gemini App 在此處輸入新進度)';

// ─── 工具：從完整文字中提取 MOBILE 區塊內容 ───────────────────────
function extractMobile(text) {
  const hIdx = text.indexOf(MOBILE_HEADER);
  if (hIdx === -1) return DEFAULT_MOBILE;

  const afterH = text.slice(hIdx + MOBILE_HEADER.length);
  const eIdx   = afterH.indexOf(MOBILE_END);
  if (eIdx === -1) return DEFAULT_MOBILE;

  const extracted = afterH.slice(0, eIdx).trim();
  return extracted || DEFAULT_MOBILE;
}

// ─── 工具：把 mobileContent 注入模板的 MOBILE 區塊，其他部分一字不動 ─
function injectMobile(template, mobileContent) {
  const hIdx = template.indexOf(MOBILE_HEADER);
  if (hIdx === -1) return template; // 模板沒有佔位符，原樣返回

  const afterH = template.slice(hIdx + MOBILE_HEADER.length);
  const eIdx   = afterH.indexOf(MOBILE_END);
  if (eIdx === -1) return template;

  const before = template.slice(0, hIdx);                        // MOBILE_HEADER 之前
  const after  = afterH.slice(eIdx + MOBILE_END.length);        // [END_MOBILE] 之後

  return before
    + MOBILE_HEADER + '\n'
    + mobileContent + '\n'
    + MOBILE_END
    + after; // after 保留原有換行，不 trim，避免截掉尾部內容
}

// ─── 工具：把最終內容同步回 Drive 上的 GEMINI_BRIDGE.txt ─────────────
function syncToTxt(content) {
  try {
    const iter = DriveApp.searchFiles(
      'title = "' + SECRETS.TXT_FILE_NAME + '" and trashed = false'
    );
    if (iter.hasNext()) {
      iter.next().setContent(content);
    } else {
      console.warn('syncToTxt: 找不到 ' + SECRETS.TXT_FILE_NAME);
    }
  } catch (err) {
    console.error('syncToTxt 失敗: ' + err.message);
    // 不拋出：txt 同步失敗不應讓整個 doPost 中斷
  }
}

// ─── 主入口 ──────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRETS.AUTH_TOKEN) return res('Error: Unauthorized');

    const action = payload.action || 'push'; // 向下相容舊版呼叫

    const doc  = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    const body = doc.getBody();

    // ── PUSH：Antigravity 離開時，寫入新模板，保留 Doc 現有手機端紀錄 ──
    if (action === 'push') {
      if (!payload.content) return res('Error: missing content');

      const currentDoc     = body.getText();
      const savedMobile    = extractMobile(currentDoc);      // 從 Doc 現有內容救出手機端紀錄
      const finalContent   = injectMobile(payload.content, savedMobile); // 注入到新模板

      body.clear().setText(finalContent);
      doc.saveAndClose();
      syncToTxt(finalContent);
      return res('Success: V15 Push OK');
    }

    // ── MOBILE_UPDATE：Gemini App 更新手機端紀錄 ──────────────────────
    if (action === 'mobile_update') {
      if (!payload.mobile_content) return res('Error: missing mobile_content');

      const currentDoc   = body.getText();
      const finalContent = injectMobile(currentDoc, payload.mobile_content);

      body.clear().setText(finalContent);
      doc.saveAndClose();
      syncToTxt(finalContent);
      return res('Success: V15 Mobile Update OK');
    }

    // ── PULL：Antigravity 啟動時拉取 Doc 最新內容（含手機端新紀錄） ──
    if (action === 'pull') {
      const currentContent = body.getText();
      doc.saveAndClose();
      syncToTxt(currentContent); // 順便確保 txt 是最新的
      return res(currentContent);
    }

    return res('Error: Unknown action "' + action + '"');

  } catch (err) {
    return res('Error: ' + err.message);
  }
}

// ─── GET：讓 Antigravity 用 curl GET 也能拉取內容 ──────────────────
function doGet(e) {
  try {
    if ((e.parameter.token || '') !== SECRETS.AUTH_TOKEN) return res('Error: Unauthorized');
    const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    return res(doc.getBody().getText());
  } catch (err) {
    return res('Error: ' + err.message);
  }
}

function res(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

function deleteSyncSmartTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncSmart')
    .forEach(t => ScriptApp.deleteTrigger(t));
  console.log('✅ syncSmart 觸發器已全部刪除');
}

function syncSmart() {
  // 已停用，觸發器待清除中
}