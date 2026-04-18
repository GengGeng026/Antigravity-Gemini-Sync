# Antigravity-Gemini-Sync 🚀

> A robust, cross-device synchronization bridge between the **Antigravity IDE (macOS)** and the **Gemini Mobile App (Android/iOS)**.

## 🌟 Why this exists?

When using Google Antigravity IDE on a MacBook, all your "Brain" memories and session states are stored locally. However, if you want to leave your desk and continue the exact same conversation seamlessly using the Voice/Live mode of the **Gemini Mobile App**, you hit a wall: The Gemini App cannot directly read local IDE files, and has heavy indexing delays when searching for `.md` or `.txt` files synced via virtual Google Drive.

**This project solves that by creating a dual-track sync system:**
1. ✅ **Local Symlink & Bash Script**: Automatically captures your Mac IDE session state.
2. ✅ **Cloud API (Google Apps Script)**: Instantly overwrites a native Google Docs file, bypassing Google Drive's search indexing delays. Gemini Mobile can search and read native Google Docs instantly.

---

## 🛠️ Architecture

```text
MacBook (Antigravity IDE) 
   │
   ├─ 1. End of session triggers `ag-handover.sh`
   └─ 2. Sends HTTP POST request (with secure token)
         ▼
[Google Cloud] Apps Script Web API  ← Verifies token
         ▼
[Google Drive] GEMINI_BRIDGE_DOC (Native Google Docs format)
         ▲
         └─ 3. Instantly searchable & readable by Gemini Mobile App!
```

---

## 🚀 Setup Guide for Beginners

Follow these steps to set up this sync on your own machine.

### Step 1: Create the Cloud Target (Google Docs)
1. Open your Google Drive in a browser.
2. Create a new Folder (e.g., `AG_Sync/handover/`).
3. Inside, create a new **Google Docs** file. Name it `GEMINI_BRIDGE_DOC`.
4. Look at the URL in your browser. Copy the long ID string between `/d/` and `/edit`.
   *(Example: `1s2dJHSdqOGjRSef5RDSxWhaHlmiEFI8rd4Cw1VHJF4U`)*

### Step 2: Deploy the Cloud API (Google Apps Script)
1. Go to [script.google.com](https://script.google.com/).
2. Create a "New Project" and name it `Antigravity Handover API`.
3. Copy the code from `google-apps-script/Code.gs` in this repository and paste it into the editor.
4. Modify these two lines in the code:
   - `AUTH_TOKEN`: Create your own secret password.
   - `TARGET_DOC_ID`: Paste the ID you copied in Step 1.
5. Click **Deploy** -> **New Deployment**.
6. Choose **Web App**.
   - Execute as: **Me**
   - Who has access: **Anyone** *(Your Auth Token keeps it safe)*
7. Authorize the app if prompted.
8. Copy the **Web App URL** provided at the end.

### Step 3: Configure the Local Script (macOS)
1. Copy the `local-scripts/ag-handover.sh` file to a secure place (e.g., `~/.gemini/antigravity/scripts/`).
2. Open the script and modify the `Configuration` section at the top:
   - `GAS_URL`: Paste your Web App URL from Step 2.
   - `AUTH_TOKEN`: Paste the exact password you used in Step 2.
3. Make the script executable:
   ```bash
   chmod +x ~/.gemini/antigravity/scripts/ag-handover.sh
   # Optional: Create a symlink in your bin folder for easy access
   ln -s ~/.gemini/antigravity/scripts/ag-handover.sh ~/bin/ag-handover
   ```

### Step 4: Automate it in Antigravity (GEMINI.md)
To make your AI Agent run this automatically, add this rule to your IDE's global `GEMINI.md` file:

```markdown
### Cross-Device Handover Automation
**Background**: User switches between Mac (Antigravity IDE) and Mobile (Gemini App). Handover must be instant.
**Agent Duty**:
- At the end of every response/turn, the Agent **MUST automatically** execute `/Users/mac/.gemini/antigravity/scripts/ag-handover.sh` in the background (silent execution).
- When the user returns from mobile, the Agent should ask if they want to load the latest state from Google Docs.
```

## 🎉 How to Use
1. Finish chatting with Antigravity on your Mac. Close the lid.
2. Open the Gemini App on your phone.
3. Say: **"Please search my Google Drive for GEMINI_BRIDGE_DOC and read the latest status so we can continue."**
4. Gemini will read the exact state you left off at!

---
*Created with ❤️ by Antigravity IDE and G-Dragon.*
