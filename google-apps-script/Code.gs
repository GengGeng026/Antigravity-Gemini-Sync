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
    
    const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    const body = doc.getBody();
    const oldContent = body.getText();
    
    // --- 保護邏輯：提取手機端區塊 ---
    let mobileContent = "(目前尚無新紀錄)";
    const mobileHeader = "## 📱 【手機端即時紀錄 (Mobile Updates)】";
    const divider = "------------------------------------------";
    
    // 若為強制覆寫 (flush)，則跳過提取保護邏輯，允許覆蓋
    if (payload.overwrite !== true && oldContent.includes(mobileHeader)) {
      const parts = oldContent.split(mobileHeader);
      if (parts.length > 1) {
        const subParts = parts[1].split(divider);
        mobileContent = subParts[0].trim(); // 提取出手機寫入的內容
      }
    }
    
    // --- 合併邏輯：將手機內容塞進 Mac 的新模板中 ---
    let finalContent = payload.content;
    if (payload.overwrite !== true && finalContent.includes(mobileHeader)) {
      const templateParts = finalContent.split(mobileHeader);
      const afterHeader = templateParts[1].split(divider);
      // 組合：Mac上部 + Header + 手機內容 + 分隔線 + Mac下部
      finalContent = templateParts[0] + mobileHeader + "\n" + mobileContent + "\n" + divider + afterHeader[1];
    }

    updateCloudFiles(finalContent);
    return response("Success: Synced with Protection");
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
