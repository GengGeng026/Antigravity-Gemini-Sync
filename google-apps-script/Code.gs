/* Antigravity Handover Web API - Full Bidirectional V14 (Safe Only) */
const SECRETS = {
  AUTH_TOKEN: 'ag-sync-secret-2026', 
  TARGET_DOC_ID: '1s2dJHSdqOGjRSef5RDSxWhaHlmiEFI8rd4Cw1VHJF4U'
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRETS.AUTH_TOKEN) return response("Error: Unauthorized");
    
    const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    const body = doc.getBody();
    const oldContent = body.getText();
    
    // --- 嚴格保護邏輯 ---
    let mobileContent = "(目前尚無新紀錄，請 Gemini App 在此處輸入新進度)";
    const mobileHeader = "## 📱 【手機端即時紀錄 (Mobile Updates)】";
    const divider = "[END_MOBILE]";
    
    if (payload.overwrite !== true && oldContent.includes(mobileHeader)) {
      const parts = oldContent.split(mobileHeader);
      if (parts.length > 1) {
        // 加入 filter(Boolean) 確保不會有 undefined
        const subParts = parts[1].split(divider).filter(s => s !== "undefined");
        if (subParts.length > 0) {
          mobileContent = subParts[0].trim();
        }
      }
    }
    
    let finalContent = payload.content;
    if (payload.overwrite !== true && finalContent.includes(mobileHeader)) {
      const templateParts = finalContent.split(mobileHeader);
      // 組合：Mac上部 + Header + 手機內容 + END_MOBILE標籤 + Mac下部
      // 這裡也加入防錯，確保結構完整
      const lowerPart = templateParts[1].split(divider).pop() || "";
      finalContent = templateParts[0] + mobileHeader + "\n" + mobileContent + "\n" + divider + lowerPart;
    }

    body.clear().setText(finalContent);
    doc.saveAndClose();
    
    return response("Success: V14 Manually Pushed");
  } catch (err) {
    return response("Error: " + err.message);
  }
}

// ⚠️ 注意：不要為此函數設置觸發器！它只供手動執行。
function syncSmart() {
  console.log("Auto-trigger is DISABLED in V14 to prevent race conditions.");
}

function response(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
