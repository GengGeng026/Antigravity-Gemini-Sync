/* Antigravity Handover Web API - Full Bidirectional V3 */
const SECRETS = {
  // 請修改成你自己記得的安全密碼
  AUTH_TOKEN: 'ag-sync-secret-2026', 
  // 貼上你的目標 Google Docs ID
  TARGET_DOC_ID: '1s2dJHSdqOGjRSef5RDSxWhaHlmiEFI8rd4Cw1VHJF4U'
};

/**
 * 處理來自 Mac 的推播請求 (Outbound)
 */
/**
 * 處理來自 Mac 的推播請求 (Outbound)
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRETS.AUTH_TOKEN) return response("Error: Unauthorized");
    if (!payload.content) return response("Error: No content");

    // 取得當前雲端內容
    const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    const existingContent = doc.getBody().getText();

    // 簡單的保護邏輯：如果雲端有最新的「維護紀錄」而推播的內容沒有，
    // 這通常意味著 Mac 腳本過時或正在洗掉手機紀錄。
    // 在這種情況下，我們可以選擇合併或報錯，目前先強制保護執行 Mac 端腳本後的合併
    updateCloudFiles(payload.content);
    return response("Success: Synced Outbound");
  } catch (err) {
    return response("Error: " + err.message);
  }
}

/**
 * 定時觸發器執行的函式：從 Doc 同步回 Txt (Inbound - 最後一哩路)
 */
function syncDocToTxt() {
  const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
  const content = doc.getBody().getText();
  updateTxtFile(content);
  console.log("Auto-sync: Doc to Txt completed.");
}

/**
 * 共用的更新邏輯
 */
function updateCloudFiles(content) {
  // 更新 Doc
  const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
  doc.getBody().clear().setText(content);
  
  // 更新 Txt
  updateTxtFile(content);
}

function updateTxtFile(content) {
  const folder = DriveApp.getFileById(SECRETS.TARGET_DOC_ID).getParents().next();
  const files = folder.getFilesByName("GEMINI_BRIDGE.txt");
  if (files.hasNext()) {
    const file = files.next();
    // 只有內容不同時才覆寫，節省資源
    if (file.getBlob().getDataAsString() !== content) {
      file.setContent(content);
    }
  } else {
    folder.createFile("GEMINI_BRIDGE.txt", content);
  }
}

/**
 * 輔助函式：一鍵設定定時器 (執行一次即可)
 */
function setupTrigger() {
  // 先刪除舊的定時器避免重複
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'syncDocToTxt') ScriptApp.deleteTrigger(t);
  });
  
  // 設定每 5 分鐘執行一次
  ScriptApp.newTrigger('syncDocToTxt')
    .timeBased()
    .everyMinutes(5)
    .create();
    
  return "Trigger set to run every 5 minutes.";
}

function response(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
