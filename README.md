# Antigravity-Gemini-Sync 🚀 | 跨設備同步橋接

> **Bilingual Edition / 雙語版本**
> A robust, cross-device synchronization bridge between the **Antigravity IDE (macOS)** and the **Gemini Mobile App (Android/iOS)**.
> 一套強大的跨設備同步橋接方案，連接 **MacBook 上的 Antigravity IDE** 與 **手機端的 Gemini App**。

---

## 🌟 Why this exists? | 為什麼需要這個？

**[中文]**
當你在 MacBook 上使用 Google Antigravity IDE 時，所有的對話記憶與 session 狀態都保存在本地。如果你想離開座位，改用手機端的 Gemini App（特別是語音/Live 模式）繼續剛才的討論，你會遇到困難：手機端無法讀取 IDE 的本地檔案，且 Google Drive 搜尋對於同步過去的 `.md` 或 `.txt` 檔案有嚴重的索引延遲。

**[English]**
When using Google Antigravity IDE on a MacBook, all session states are stored locally. If you want to continue the conversation seamlessly using the **Gemini Mobile App** (Voice/Live mode), you hit a wall: The mobile app cannot read local files, and has heavy indexing delays when searching for synced `.md/.txt` files.

**本計畫透過「雙向自動化同步系統」解決此問題 (This project solves that by creating an automated bidirectional sync system):**
1. ✅ **本地符號連結 (Local Symlink)**: 自動接管 Mac IDE 的對話歷史。
2. ✅ **雙向雲端 API (Bidirectional Cloud API)**: 
    - **輸出 (Outbound)**: Mac 端自動覆寫雲端 Google Docs，讓手機端 Gemini 秒讀。
    - **輸入 (Inbound)**: 雲端設有 **「自動監視器 (Background Sync)」**，每 5 分鐘自動對齊 Doc 與 Txt。IDE Agent 在對話開始時會「主動感讀」，實現真正的「最後一哩路」自動感知。

---

## 🛠️ Architecture | 系統架構

```text
MacBook (Antigravity IDE) 
   │
   ├─ 1. 對話結束自動觸發 `ag-handover.sh` (End of turn triggers script)
   └─ 2. 發送安全 HTTP POST 請求 (Sends secure API request)
         ▼
[Google Cloud] Apps Script Web API  ← 驗證帳密後執行 (Verifies token)
         ▼
[Google Drive] GEMINI_BRIDGE_DOC (原生 Google Docs 格式)
         ▲
         └─ 3. 手機端 Gemini App 瞬間搜尋並讀取！(Instant mobile access!)
```

---

## 🚀 Setup Guide | 搭建指南

### Step 1: 建立雲端目標文件 (Create Google Docs)
1. 在瀏覽器打開 Google Drive，進入想要存放的資料夾。
2. 新建一份 **Google 文件 (Google Docs)**，命名為 `GEMINI_BRIDGE_DOC`。
3. 複製網址列中間的 ID（例如：`1s2dJHSdqOGjRSef5RDSxWhaHlmiEFI8rd4Cw1VHJF4U`）。

### Step 2: 部署雲端 API (Deploy Apps Script API)
1. 前往 [script.google.com](https://script.google.com/) 並新建專案。
2. 將本倉庫中 `google-apps-script/Code.gs` 的代碼貼入。
3. 修改程式碼中的 `AUTH_TOKEN` (你的密碼) 與 `TARGET_DOC_ID` (步驟 1 的 ID)。
4. 點擊 **部署 (Deploy) > 新增部署作業**。類型選「**網頁應用程式 (Web App)**」，存取權選「**所有人 (Anyone)**」。
5. **重要**：執行一次測試並授權權限，並複製產出的 **Web App URL**。

### Step 3: 配置本地腳本 (Configure macOS Script)
1. 將 `local-scripts/ag-handover.sh` 存入 `~/.gemini/antigravity/scripts/`。
2. 修改腳本頂部的 `Configuration` 區塊，填入你的 `GAS_URL` 與 `AUTH_TOKEN`。
3. 賦予執行權限：
   ```bash
   chmod +x ~/.gemini/antigravity/scripts/ag-handover.sh
   ln -s ~/.gemini/antigravity/scripts/ag-handover.sh ~/bin/ag-handover
   ```

### Step 4: 在 Antigravity 中自動化 (Automate in IDE)
將以下規則加入到 IDE 的全域 `GEMINI.md` 規範中：

```markdown
### 跨設備交接自動化 (Handover Automation)
- **職責**: 每輪回覆結束後，Agent 必須自動執行 `ag-handover.sh` 靜默更新雲端狀態。
- **Duties**: After every response, the Agent MUST automatically execute the sync script.
```

---

## 🎉 How to Use | 如何使用

1. **Mac 端**: 像平常一樣聊天。每當我回答完，雲端就會自動更新。
2. **手機端**: 打開 Gemini App，說出：
   > **「請在我的 Google Drive 搜尋 GEMINI_BRIDGE_DOC，讀取最新進度，我們繼續討論。」**
3. 手機端的 AI 會立刻同步到你在 Mac 上的最後思緒。

---
*Created with ❤️ by Antigravity IDE and G-Dragon (@GengGeng026).*
