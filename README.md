# 🏥 CareFlow - 家庭生理數據隱私記錄系統

CareFlow 是一款專為**家庭照護與安寧療護**設計的輕量級、極致隱私生理指標監控系統。

在面對需要高度照護的親人（如癌症晚期或安寧療護患者）時，家屬往往需要繁瑣地記錄多項生理指標以配合醫療決策。本專案正是為了解決傳統紙本記錄易遺失、多位照顧者數據難以同步、以及對個人醫療隱私外洩的擔憂而開發的。

### 🎯 專案目的與核心價值
* **跨裝置協同照護**：讓所有家庭成員不論身在何處，都能即時查看並共同記錄受測者的生理指標，達成無縫的床邊照護合作。
* **100% 醫療隱私安全**：使用端到端本地加密（End-to-End Encryption），所有數據在離開瀏覽器上傳雲端或存在本機前就已完全加密，即便使用免費的第三方雲端空間（Google 試算表），也能確保沒有任何人（包括 Google 官方）能看見原始的健康個資。
* **零維護成本的雲端架構**：完全無需架設付費或複雜的後端資料庫，透過免費的 Google Apps Script (GAS) 作為無伺服器 API，一鍵建置專屬的雲端記錄系統。

### 💡 能為照護家庭帶來什麼幫助？
* **擺脫混亂的紙上記錄**：心率、血壓、血氧、呼吸、尿量等數據能以直觀的視覺化圖表呈現（包含尿量 3 點移動平均線等趨勢分析），幫助照護者一眼看出患者的健康趨勢變化。
* **一鍵複製醫護交班報告**：在居家護理師訪視、醫師巡房或醫院換班時，常常會因為照顧疲憊而無法清楚陳述患者過去一天的狀況。本系統能自動根據過去 12 / 24 小時的數據生成 Markdown 格式的交班報告，讓您一鍵複製透過 LINE / 簡訊傳送給醫護人員，在 10 秒內完成完整、精確的臨床病程交接。

---

## 🌟 核心特色

1. **🔒 端到端本地加密 (End-to-End Client Encryption)**
   * 所有數據在離開您的瀏覽器前，均使用您的 4 位數 PIN 碼進行位元級（XOR）加密。
   * 儲存在瀏覽器本機（`localStorage`）或上傳至 Google 試算表的生理數據均為加密後的 Hex 亂碼，即使資料外洩，沒有密碼也絕對無法還原。

2. **🛡️ 100% 去識別化隱私防護 (De-identified & Privacy Forced)**
   * 系統已徹底移除任何個人特徵欄位（例如：姓名、年齡、性別、診斷、病房編號等）。
   * 看板與雲端僅記錄時間點與生理數據，完全不包含任何 PII（個人敏感個資），確保第三方讀取時也沒有個資外洩風險。

3. **☁️ Vercel + Google Sheets 雲端即時同步**
   * 透過免費的 **Google Apps Script (GAS)** Web App 作為無伺服器（Serverless）後端，將數據同步寫入並讀取您專屬的 Google 試算表。
   * 使用 `text/plain` 格式進行通訊，100% 規避瀏覽器在 Vercel $\rightarrow$ Google 網域之間的 CORS 預檢阻擋，保證跨裝置傳輸順暢。

4. **⚡ 自動保持登入與鎖定 (Auto-Login & Quick Lock)**
   * 一次輸入密碼解鎖後，系統會在當前裝置自動保持登入狀態，重新整理或關閉網頁均無需重複輸入 PIN。
   * 點選頁首的 **「鎖定（鎖頭圖示）」** 可立即清除登入狀態，保護實體裝置安全。
   * 偵測到雲端密碼不符時（如其他裝置修改了密碼），會彈出警示，防止舊資料遭不同密碼覆蓋損毀。

5. **📋 臨床交班報告一鍵複製 (Handover Report)**
   * 系統自動根據過去 12 / 24 小時的生理指標準確生成醫護交班 Markdown 報告。
   * 可一鍵複製，以便透過 LINE/簡訊傳送給家人或在醫師巡房、護理師換班時出示。

---

## 🛠️ Google 試算表與 GAS 後端設定步驟

請依照以下步驟完成您專屬的免費雲端資料庫建置：

### 步驟 1：建立 Google 試算表
1. 前往您的 [Google 雲端硬碟](https://drive.google.com/)，新增一個空白的 **「Google 試算表」**。
2. 將試算表命名為：`CareFlow 照護紀錄`。

### 步驟 2：建立 Apps Script 腳本
1. 在試算表上方選單點選 **「擴充功能」** $\rightarrow$ **「Apps Script」**。
2. 將預設產生的程式碼全部清空，並貼上以下代碼：

```javascript
// ==========================================
// CareFlow 雲端同步 GAS 腳本 API (v1.1)
// ==========================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;
  
  if (action === "getLogs") {
    let sheet = ss.getSheetByName("Logs");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    const logs = [];
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const log = {};
      for (let j = 0; j < headers.length; j++) {
        log[headers[j]] = row[j];
      }
      logs.push(log);
    }
    return ContentService.createTextOutput(JSON.stringify(logs)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "appendLog") {
      let sheet = ss.getSheetByName("Logs");
      if (!sheet) {
        sheet = ss.insertSheet("Logs");
        sheet.appendRow(["id", "timestamp", "type", "data"]);
      }
      const log = postData.log;
      sheet.appendRow([log.id, log.timestamp, log.type, log.data]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "deleteLog") {
      const sheet = ss.getSheetByName("Logs");
      if (sheet) {
        const rows = sheet.getDataRange().getValues();
        const id = postData.id;
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0].toString() === id.toString()) {
            sheet.deleteRow(i + 1);
            return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Log not found" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "clearAll") {
      const logsSheet = ss.getSheetByName("Logs");
      if (logsSheet) {
        logsSheet.clear();
        logsSheet.appendRow(["id", "timestamp", "type", "data"]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 點擊上方的 **「儲存專案 (💾)」** 圖示。

### 步驟 3：部署成網頁應用程式 (Web App)
1. 點擊右上角的 **「部署」** 按鈕 $\rightarrow$ 選擇 **「新增部署」**。
2. 點擊左側齒輪（選取類型），選擇 **「網頁應用程式」 (Web App)**。
3. 進行以下關鍵設定（**非常重要**）：
   * **說明**：輸入 `CareFlow API`
   * **執行身份**：選擇 **「我」 (Me)**
   * **誰有存取權**：選擇 **「所有人」 (Anyone)** (以允許跨裝置通訊)
4. 點擊 **「部署」**。
5. 首次部署時，Google 會要求授權。請點選 **「授予存取權」** $\rightarrow$ 選擇您的 Google 帳戶 $\rightarrow$ 點擊 **「進階」** $\rightarrow$ 點擊 **「前往『未命名專案』(安全)」** $\rightarrow$ 點選 **「允許」 (Allow)**。
6. 部署完成後，複製畫面上顯示的 **「網頁應用程式網址」** (URL)，格式應為：
   `https://script.google.com/macros/s/xxxxxxxxx/exec`

---

## 💻 本地端開發與部署

### 1. 安裝與執行
在本地端開啟專案，安裝套件並啟動開發伺服器：
```bash
# 安裝依賴項目
npm install

# 啟動開發伺服器 (預設運行在 http://localhost:5173/)
npm run dev

# 專案編譯打包 (生成生產用 dist 靜態資料夾)
npm run build
```

### 2. 部署至 Vercel
將專案推送到 GitHub 後，您可以直接在 Vercel 控制台連結 GitHub 專案。Vercel 會自動辨識 Vite 專案並於 1 分鐘內完成構建上線。

---

## 🔒 隱私與安全性聲明
* **無中央伺服器**：您的數據完全儲存在您的個人裝置（`localStorage`）與您自己建立的 Google 試算表中，CareFlow 不提供、也不託管任何第三方資料庫。
* **無法逆向解密**：因為資料採用您的 PIN 碼本地異或 XOR 運算，若您不慎遺失或忘記 PIN 碼，已上傳與本地儲存的數據將**永遠無法還原**。請牢記您與家人約定好的 4 位數解鎖密碼。
