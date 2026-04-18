/* Antigravity Handover Web API */
const SECRETS = {
  // 請修改成你自己記得的安全密碼
  AUTH_TOKEN: 'YOUR_SECRET_TOKEN_HERE', 
  // 貼上你的目標 Google Docs ID
  TARGET_DOC_ID: 'YOUR_GOOGLE_DOC_ID_HERE'
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

    // 取得 Google Docs 並清空舊內容，寫入新內容
    const doc = DocumentApp.openById(SECRETS.TARGET_DOC_ID);
    const body = doc.getBody();
    body.clear();
    body.setText(payload.content);
    
    // 返回成功響應
    return ContentService.createTextOutput("Success: Handover Doc updated instantly!").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
