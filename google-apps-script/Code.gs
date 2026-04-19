/* Antigravity Handover Web API - Full Bidirectional V14.1 (Final Shield) */
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
    
    // --- 嚴格保護邏輯：只準抓括號內的內容 ---
    let mobileContent = "(目前尚無新紀錄，請 Gemini App 在此處輸入新進度)";
    const mobileHeader = "## 📱 【手機端即時紀錄 (Mobile Updates)】";
    const divider = "[END_MOBILE]";
    
    if (payload.overwrite !== true && oldContent.includes(mobileHeader)) {
      const parts = oldContent.split(mobileHeader);
      if (parts.length > 1) {
        // 保護：移除壞掉的 undefined 並只取標籤前的文字
        const subParts = parts[1].split(divider).filter(s => s.trim() !== "undefined");
        if (subParts.length > 0) {
          mobileContent = subParts[0].trim();
        }
      }
    }
    
    let finalContent = payload.content;
    if (payload.overwrite !== true && finalContent.includes(mobileHeader)) {
      const templateParts = finalContent.split(mobileHeader);
      // 確保只抓取 Mac 模板的上下兩端，防止夾帶髒數據
      const lowerPart = templateParts[1].split(divider).pop() || "";
      finalContent = templateParts[0] + "\n" + mobileHeader + "\n" + mobileContent + "\n" + divider + "\n" + lowerPart.trim();
    }

    body.clear().setText(finalContent);
    doc.saveAndClose();
    
    return response("Success: V14.1 Shielded Push");
  } catch (err) {
    return response("Error: " + err.message);
  }
}

// ⚠️ 已徹底禁用定時同步，規避 Race Condition
function syncSmart() {
  console.log("Auto-trigger is DISABLED to keep the shield active.");
}

function response(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
