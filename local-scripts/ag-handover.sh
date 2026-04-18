#!/bin/bash
# ============================================================================
# ag-handover.sh — Antigravity → Gemini App Handover Generator
# 
# Purpose: Scans the most recent Antigravity session, extracts key artifacts,
#          and writes a human-readable summary to GEMINI_BRIDGE.txt on
#          Google Drive for mobile Gemini App consumption.
#
# Usage:   ag-handover              (uses most recent session)
#          ag-handover <session-id>  (uses specific session)
#
# Created: 2026-04-18
# ============================================================================

set -euo pipefail

# --- Configuration ---
BRAIN_DIR="$HOME/.gemini/antigravity/brain"
GDRIVE_BASE="$HOME/Library/CloudStorage/GoogleDrive-danielngkahking@gmail.com/My Drive"
HANDOVER_DIR="$GDRIVE_BASE/AG_Sync/handover"
BRIDGE_FILE="$HANDOVER_DIR/GEMINI_BRIDGE.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M %Z')

# --- Option C: Cloud API Configuration ---
# Google Apps Script Web App URL
GAS_URL="https://script.google.com/macros/s/AKfycbwf2WWDmwnchJHGqZc-DhVhpJgdB7sRGXYK_PYO3RMC4aoxyLWP4rPY3oHLMz68LoJc/exec"
# 安全密碼
AUTH_TOKEN="ag-sync-secret-2026"

# --- Functions ---

# Find the most recently modified session directory
find_latest_session() {
    # Exclude tempmediaStorage, sort by modification time
    ls -dt "$BRAIN_DIR"/*/ 2>/dev/null \
        | grep -v "tempmediaStorage" \
        | head -1 \
        | xargs basename 2>/dev/null
}

# Extract summary from a metadata.json file
extract_summary() {
    local meta_file="$1"
    if [ -f "$meta_file" ]; then
        # Use ruby as a more stable alternative for JSON parsing on some macOS environments
        ruby -rjson -e "data = JSON.parse(File.read('$meta_file')); puts data['summary'] || '(no summary available)'" 2>/dev/null || echo "(unable to parse)"
    fi
}

# Extract first N lines of content from an artifact
extract_content_preview() {
    local file="$1"
    local max_lines="${2:-30}"
    if [ -f "$file" ]; then
        head -n "$max_lines" "$file"
    fi
}

# --- Main ---

echo "🔄 Generating Antigravity → Gemini handover..."

# Determine which session to process
if [ -n "${1:-}" ]; then
    SESSION_ID="$1"
    SESSION_DIR="$BRAIN_DIR/$SESSION_ID"
    if [ ! -d "$SESSION_DIR" ]; then
        echo "❌ Session not found: $SESSION_ID"
        exit 1
    fi
else
    SESSION_ID=$(find_latest_session)
    SESSION_DIR="$BRAIN_DIR/$SESSION_ID"
fi

if [ -z "$SESSION_ID" ] || [ ! -d "$SESSION_DIR" ]; then
    echo "❌ No sessions found in $BRAIN_DIR"
    exit 1
fi

echo "📂 Session: $SESSION_ID"

# Ensure output directory exists
mkdir -p "$HANDOVER_DIR"

# Build the handover document
cat > "$BRIDGE_FILE" << HEADER
Antigravity IDE → Gemini App 狀態橋接文件
==========================================
最後更新：$TIMESTAMP
來源 Session：$SESSION_ID
產生方式：ag-handover script (自動/手動)

------------------------------------------
HEADER

# --- Section 1: Task Progress ---
if [ -f "$SESSION_DIR/task.md" ]; then
    echo "" >> "$BRIDGE_FILE"
    echo "【任務進度 (Task Progress)】" >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    cat "$SESSION_DIR/task.md" >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    echo "------------------------------------------" >> "$BRIDGE_FILE"
fi

# --- Section 2: Walkthrough / Summary ---
if [ -f "$SESSION_DIR/walkthrough.md" ]; then
    echo "" >> "$BRIDGE_FILE"
    echo "【工作總結 (Walkthrough)】" >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    cat "$SESSION_DIR/walkthrough.md" >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    echo "------------------------------------------" >> "$BRIDGE_FILE"
fi

# --- Section 3: Implementation Plan (preview only) ---
if [ -f "$SESSION_DIR/implementation_plan.md" ]; then
    echo "" >> "$BRIDGE_FILE"
    echo "【實施計劃摘要 (Implementation Plan - Preview)】" >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    # Only include first 40 lines to keep it concise for mobile reading
    extract_content_preview "$SESSION_DIR/implementation_plan.md" 40 >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    echo "... (完整計劃可在 Mac 端 Antigravity IDE 查看)" >> "$BRIDGE_FILE"
    echo "" >> "$BRIDGE_FILE"
    echo "------------------------------------------" >> "$BRIDGE_FILE"
fi

# --- Section 4: Artifact Summaries from metadata ---
echo "" >> "$BRIDGE_FILE"
echo "【所有 Artifact 摘要 (Metadata Summaries)】" >> "$BRIDGE_FILE"
echo "" >> "$BRIDGE_FILE"

found_meta=false
for meta in "$SESSION_DIR"/*.metadata.json; do
    if [ -f "$meta" ]; then
        found_meta=true
        artifact_name=$(basename "$meta" .metadata.json)
        summary=$(extract_summary "$meta")
        echo "• $artifact_name" >> "$BRIDGE_FILE"
        echo "  $summary" >> "$BRIDGE_FILE"
        echo "" >> "$BRIDGE_FILE"
    fi
done

if [ "$found_meta" = false ]; then
    echo "(此 Session 無 metadata 記錄)" >> "$BRIDGE_FILE"
fi

echo "------------------------------------------" >> "$BRIDGE_FILE"

# --- Footer ---
cat >> "$BRIDGE_FILE" << FOOTER

【給手機端 Gemini 的提示】
如果你是透過手機 Gemini App 讀取到這份文件，你可以：
1. 基於上述「任務進度」繼續討論未完成的項目
2. 基於「工作總結」提出後續改進建議
3. 將你的新想法整理後存入同一個 AG_Sync/handover/ 資料夾

【給 Antigravity IDE 的提示】
下次開啟 Mac 端 IDE，可以對 Agent 說：
「請讀取 ~/Library/CloudStorage/GoogleDrive-danielngkahking@gmail.com/My Drive/AG_Sync/handover/GEMINI_BRIDGE.txt 瞭解上次的交接狀態」
FOOTER

# --- Option C: Send to Cloud (Google Apps Script) ---
if [ -n "$GAS_URL" ] && [ -n "$AUTH_TOKEN" ]; then
    echo "☁️  正在將內容推播至 Google Docs..."
    
    # Use ruby to generate safe JSON payload with UTF-8 support
    JSON_PAYLOAD=$(ruby -rjson -EUTF-8 -e "
        content = File.read('$BRIDGE_FILE', encoding: 'UTF-8')
        data = { 'token' => '$AUTH_TOKEN', 'content' => content }
        print JSON.generate(data)
    ")

    # Send via curl with follow-location (GAS redirects are common)
    # Using -d @- to read from stdin. Note: DO NOT use -X POST. 
    # -d implicitly sets POST, and allows curl to switch to GET when following the 302 redirect.
    RESPONSE=$(echo "$JSON_PAYLOAD" | curl -s -L "$GAS_URL" \
         -H "Content-Type: application/json" \
         -d @-)

    if [[ "$RESPONSE" == Success* ]]; then
        echo "✅ 雲端同步成功！Google Docs 已更新。"
    else
        echo "⚠️  雲端同步失敗：$RESPONSE"
        echo "   (提醒：請確認 Google Apps Script 已正確填入 TARGET_DOC_ID 並完成『新版本』部署)"
    fi
fi

# Report results
FILESIZE=$(wc -c < "$BRIDGE_FILE" | tr -d ' ')
echo "✅ 本地 Handover 已生成！"
echo "   📄 檔案：$BRIDGE_FILE"
echo "   📏 大小：${FILESIZE} bytes"
echo "   ⏰ 時間：$TIMESTAMP"
echo ""
echo "💡 跨設備同步狀態："
echo "   - 本地：Google Drive 已自動更新 (.txt)"
echo "   - 雲端：Google Docs 已即時覆寫 (Docs)"
echo "   手機端 Gemini 現在可以搜尋『GEMINI_BRIDGE_DOC』來讀取最新進度。"
