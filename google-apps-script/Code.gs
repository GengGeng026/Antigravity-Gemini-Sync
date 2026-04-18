/* Antigravity Handover Web API - Bidirectional V2 */
const SECRETS = {
  // 請修改成你自己記得的安全密碼 (需與 ag-handover.sh 一致)
  AUTH_TOKEN: 'ag-sync-secret-2026', 
  // 貼上你的目標 Google Docs ID
  TARGET_DOC_ID: '1s2dJHSdqOGjRSef5RDSxWhaHlmiEFI8rd4Cw1VHJF4U'
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // 驗證安全性 Token
    if (payload.token !== SECRETS.AUTH_TOKEN) {
      return ContentService.createTextOutput("Error: Unauthorized").setMimeType(ContentService.MimeType.TEXT);
    }
    
    if (!payload.content) {
      return ContentService.createTextOutput("Error: No content provided").setMimeType(ContentService.MimeType.TEXT);
    }

    // --- 1. 更新 Google Docs (手機端 Gemini App 讀取用) ---
    const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    const body = doc.getBody();
    body.clear();
    body.setText(payload.content);
    
    // --- 2. 更新 .txt 檔案 (Mac 端 Antigravity IDE 感知用) ---
    // 取得該文件所在的資料夾
    const file = DriveApp.getFileById(SECRETS.TARGET_DOC_ID);
    const folder = file.getParents().next();
    
    // 尋找名為 GEMINI_BRIDGE.txt 的檔案
    const txtFiles = folder.getFilesByName("GEMINI_BRIDGE.txt");
    let txtFile;
    if (txtFiles.hasNext()) {
      txtFile = txtFiles.next();
      txtFile.setContent(payload.content);
    } else {
      // 如果沒找到就新建一個
      folder.createFile("GEMINI_BRIDGE.txt", payload.content);
    }
    
    // 返回成功響應
    return ContentService.createTextOutput("Success: Doc and Txt synced for bidirectional handover.").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
