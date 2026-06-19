import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Heart, 
  Activity, 
  Wind, 
  Droplet, 
  AlertCircle, 
  Clipboard, 
  Copy, 
  Check, 
  Plus, 
  Clock, 
  X, 
  Pill,
  Trash2,
  Settings,
  Lock,
  RefreshCw,
  HandHeart,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Moon
} from 'lucide-react';

// 判斷是否為觸控設備 (Coarse Pointer)
const IS_TOUCH_DEVICE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// 產生具有隨機後綴的唯一識別碼，防範毫秒內快速點擊造成 ID 衝突
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// 輕度混淆本地儲存的 PIN 碼以防直接外洩 (Option A)
const obfuscatePin = (pin) => {
  if (!pin) return '';
  try {
    return btoa(pin.split('').reverse().join(''));
  } catch {
    return pin;
  }
};

const deobfuscatePin = (obfuscated) => {
  if (!obfuscated) return '';
  try {
    return atob(obfuscated).split('').reverse().join('');
  } catch {
    return obfuscated;
  }
};

// 原生位元運算加密與解密工具函數 (支援 UTF-8 中文字元，防止 localStorage 直接外洩個資)
function encrypt(text, key) {
  if (!text) return '';
  if (!key) return text;
  try {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const keyBytes = encoder.encode(key);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      const xor = bytes[i] ^ keyBytes[i % keyBytes.length];
      hex += xor.toString(16).padStart(2, '0');
    }
    return hex;
  } catch (e) {
    console.error('加密失敗:', e);
    return '';
  }
}

function decrypt(hex, key) {
  if (!hex) return '';
  if (!key) return hex;
  try {
    if (hex.length % 2 !== 0) return '';
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      const byteVal = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
      if (isNaN(byteVal)) return '';
      bytes[i] = byteVal ^ keyBytes[i % keyBytes.length];
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (e) {
    console.error('解密失敗:', e);
    return '';
  }
}

// 雲端 GAS 輔助請求工具 (採用 text/plain 避免 CORS OPTIONS 預檢阻擋，達成流暢跨網域存取)
async function postToGas(url, payload) {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (err) {
    console.error('GAS POST 錯誤:', err);
    throw err;
  }
}

async function getFromGas(url, action) {
  if (!url) return null;
  try {
    const response = await fetch(`${url}?action=${action}`, {
      method: 'GET',
      mode: 'cors'
    });
    return await response.json();
  } catch (err) {
    console.error('GAS GET 錯誤:', err);
    throw err;
  }
}

// 4位數密碼鎖 (PIN) 與建立密碼畫面
function PinScreen({ onUnlock, isSetup }) {
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(isSetup ? 'enter' : 'unlock'); // 'enter', 'confirm', 'unlock'
  const [tempPin, setTempPin] = useState('');
  const [error, setError] = useState('');

  const handlePinComplete = useCallback((enteredPin) => {
    if (step === 'unlock') {
      const success = onUnlock(enteredPin);
      if (!success) {
        setError('密碼錯誤，請再試一次');
        setPin('');
      }
    } else if (step === 'enter') {
      setTempPin(enteredPin);
      setPin('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (enteredPin === tempPin) {
        onUnlock(enteredPin, true); // true 表示初次設定
      } else {
        setError('兩次輸入的密碼不一致，請重新輸入');
        setPin('');
        setStep('enter');
        setTempPin('');
      }
    }
  }, [step, onUnlock, tempPin]);

  const handleKeyPress = useCallback((num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) {
        setTimeout(() => handlePinComplete(newPin), 200);
      }
    }
  }, [pin, handlePinComplete]);

  const handleBackspace = useCallback(() => {
    setPin(pin.slice(0, -1));
    setError('');
  }, [pin]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace]);

  return (
    <div className="min-h-screen bg-monitor-bg text-monitor-text flex flex-col justify-between p-6 max-w-md mx-auto border-x border-monitor-border font-sans">
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 my-auto animate-pulse-slow">
        {/* Logo 和標題 */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-md border border-monitor-border overflow-hidden">
            <img src="/logo.png" alt="CareFlow Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-widest uppercase text-rose-600">CareFlow 密碼鎖</h1>
            <p className="text-xs text-monitor-dim mt-1">健康與生理數值紀錄系統</p>
          </div>
        </div>

        {/* 提示訊息 */}
        <div className="text-center space-y-1 px-4">
          <h2 className="text-base font-bold text-monitor-text">
            {step === 'unlock' && '請輸入 4 位數密碼解鎖'}
            {step === 'enter' && '建立家庭專屬密碼鎖'}
            {step === 'confirm' && '請再次輸入以確認密碼'}
          </h2>
          <p className="text-xs text-monitor-dim">
            {step === 'unlock' && '保護您的個人隱私與生理紀錄數據'}
            {step === 'enter' && '請輸入一個 4 位數 PIN 碼'}
            {step === 'confirm' && '確認您的家庭防護新密碼'}
          </p>
        </div>

        {/* 圓點指示器 */}
        <div className="flex justify-center space-x-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 border-slate-300 transition-all duration-150 ${
                index < pin.length ? 'bg-monitor-green border-monitor-green scale-110 shadow-md shadow-monitor-green/30' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="text-xs text-monitor-red font-bold bg-monitor-red/10 border border-monitor-red/20 px-4 py-2 rounded-lg flex items-center gap-1.5 animate-bounce">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* 虛擬數字鍵盤 */}
      <div className="space-y-4 max-w-xs mx-auto w-full pb-8">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num.toString())}
              className="h-14 bg-white hover:bg-slate-50 active:bg-slate-100 border border-monitor-border text-xl font-semibold rounded-xl flex items-center justify-center shadow-sm text-monitor-text transition focus:outline-none"
            >
              {num}
            </button>
          ))}
          {/* 重設系統 */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('確定要清除此裝置的所有資料並重設系統嗎？此動作將永久刪除所有歷史紀錄，無法復原。')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="text-[10px] text-monitor-dim hover:text-monitor-text font-bold active:scale-95 transition flex items-center justify-center px-1"
          >
            重設系統
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 bg-white hover:bg-slate-50 active:bg-slate-100 border border-monitor-border text-xl font-semibold rounded-xl flex items-center justify-center shadow-sm text-monitor-text transition focus:outline-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 bg-white hover:bg-slate-50 active:bg-slate-100 border border-monitor-border text-lg rounded-xl flex items-center justify-center shadow-sm transition focus:outline-none text-monitor-dim"
          >
            清除
          </button>
        </div>
      </div>
    </div>
  );
}


// 預載的腫瘤/安寧病房臨床紀錄資料（模擬過去24小時）
// 基準時間：2026-06-16T15:20:07+08:00
const INITIAL_LOGS = [
  {
    id: '1',
    timestamp: '2026-06-15T16:00:00+08:00',
    type: 'vitals',
    hr: 85,
    spo2: 98,
    rr: 16,
    sbp: 118,
    dbp: 75,
    map: 89,
    notes: '基準生理數據穩定。'
  },
  {
    id: '2',
    timestamp: '2026-06-15T18:30:00+08:00',
    type: 'event',
    eventType: 'medication',
    medicationName: '強效止痛藥 (如嗎啡)',
    notes: '受測者主訴下背部突發性疼痛。'
  },
  {
    id: '3',
    timestamp: '2026-06-15T22:00:00+08:00',
    type: 'vitals',
    hr: 92,
    spo2: 97,
    rr: 18,
    sbp: 110,
    dbp: 70,
    map: 83,
    notes: '夜間安頓休息。'
  },
  {
    id: '4',
    timestamp: '2026-06-16T02:00:00+08:00',
    type: 'event',
    eventType: 'urine',
    volumeCc: 320,
    color: 'clear_yellow',
    notes: '尿液清澈淡黃。'
  },
  {
    id: '5',
    timestamp: '2026-06-16T06:00:00+08:00',
    type: 'vitals',
    hr: 110, // 心搏過速
    spo2: 95,
    rr: 28,  // 呼吸急促（骨痛/焦慮指標）
    sbp: 135,
    dbp: 88,
    map: 104,
    notes: '呼吸與心率明顯上升，受測者主訴深層骨痛。'
  },
  {
    id: '6',
    timestamp: '2026-06-16T06:15:00+08:00',
    type: 'event',
    eventType: 'medication',
    medicationName: '強效止痛藥 (如嗎啡)',
    notes: '因應劇烈突發痛給藥，已確認止痛貼片在位。'
  },
  {
    id: '7',
    timestamp: '2026-06-16T08:30:00+08:00',
    type: 'vitals',
    hr: 82,
    spo2: 98,
    rr: 18, // 趨於穩定
    sbp: 115,
    dbp: 72,
    map: 86,
    notes: '疼痛控制中，安靜休息。'
  },
  {
    id: '8',
    timestamp: '2026-06-16T11:00:00+08:00',
    type: 'event',
    eventType: 'urine',
    volumeCc: 280,
    color: 'tea',
    notes: '發現深茶色尿液，已鼓勵多喝水。'
  },
  {
    id: '9',
    timestamp: '2026-06-16T13:45:00+08:00',
    type: 'event',
    eventType: 'urine',
    volumeCc: 300,
    color: 'bright_red', // 肉眼血尿
    notes: '發現鮮紅肉眼血尿，已聯繫專科護理師。'
  },
  {
    id: '10',
    timestamp: '2026-06-16T14:00:00+08:00',
    type: 'event',
    eventType: 'medication',
    medicationName: '胃腸與解痙藥',
    notes: '給予藥物以緩解膀胱痙攣。'
  },
  {
    id: '11',
    timestamp: '2026-06-16T15:00:00+08:00',
    type: 'vitals',
    hr: 94,
    spo2: 97,
    rr: 20,
    sbp: 112,
    dbp: 68,
    map: 83,
    notes: '近期生理數據追蹤。'
  }
];

function App() {
  const [isLocked, setIsLocked] = useState(() => {
    const hasVerify = !!localStorage.getItem('careflow_verify');
    if (!hasVerify) return true;
    
    // 檢查是否有儲存的 session pin，若有且正確，免解鎖
    const savedObfuscated = localStorage.getItem('careflow_session_pin');
    const savedPin = deobfuscatePin(savedObfuscated);
    if (savedPin) {
      const verifyToken = localStorage.getItem('careflow_verify');
      const decrypted = decrypt(verifyToken, savedPin);
      if (decrypted === 'careflow_auth_ok') {
        return false;
      }
    }
    return true;
  });

  const [password, setPassword] = useState(() => {
    return deobfuscatePin(localStorage.getItem('careflow_session_pin')) || '';
  });
  const [gasUrl, setGasUrl] = useState(() => {
    const envUrl = import.meta.env.VITE_GAS_URL || '';
    if (envUrl) {
      return envUrl;
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const gasParam = params.get('gas');
      if (gasParam) {
        const trimmed = gasParam.trim();
        localStorage.setItem('careflow_gas_url', trimmed);
        return trimmed;
      }
      return localStorage.getItem('careflow_gas_url') || '';
    }
    return '';
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'

  const [isDemo, setIsDemo] = useState(() => {
    return !localStorage.getItem('careflow_initialized');
  });

  const [logs, setLogs] = useState(() => {
    const savedObfuscated = localStorage.getItem('careflow_session_pin');
    const savedPin = deobfuscatePin(savedObfuscated);
    if (savedPin) {
      const verifyToken = localStorage.getItem('careflow_verify');
      const decrypted = decrypt(verifyToken, savedPin);
      if (decrypted === 'careflow_auth_ok') {
        const savedLogs = localStorage.getItem('careflow_logs');
        if (savedLogs) {
          const dec = decrypt(savedLogs, savedPin);
          if (dec) {
            try {
              return JSON.parse(dec);
            } catch {
              return INITIAL_LOGS;
            }
          }
        }
        return INITIAL_LOGS;
      }
    }
    return []; // 未解鎖前先不載入資料
  });

  const [patient, setPatient] = useState(() => {
    const savedObfuscated = localStorage.getItem('careflow_session_pin');
    const savedPin = deobfuscatePin(savedObfuscated);
    if (savedPin) {
      const verifyToken = localStorage.getItem('careflow_verify');
      const decrypted = decrypt(verifyToken, savedPin);
      if (decrypted === 'careflow_auth_ok') {
        const savedPatient = localStorage.getItem('careflow_patient');
        if (savedPatient) {
          const dec = decrypt(savedPatient, savedPin);
          if (dec) {
            try {
              return JSON.parse(dec);
            } catch {
              return {
                name: '受測者 S-001',
                age: '74',
                gender: '男',
                diagnosis: '轉移性攝護腺癌'
              };
            }
          }
        }
        return {
          name: '受測者 S-001',
          age: '74',
          gender: '男',
          diagnosis: '轉移性攝護腺癌'
        };
      }
    }
    return { name: '', age: '', gender: '', diagnosis: '' }; // 未解鎖前為空
  });

  // 彈出式視窗與介面狀態
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showUrineModal, setShowUrineModal] = useState(false);
  const [showMedModal, setShowMedModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCareRequestModal, setShowCareRequestModal] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null); // { type, key, strokeColor, label, unit }
  const [isLogTimelineExpanded, setIsLogTimelineExpanded] = useState(false);
  const [reportDuration, setReportDuration] = useState(24); // 預設 24 小時區間
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' or 'trends'
  const [collapsedHours, setCollapsedHours] = useState({});

  const handleExpandAllHours = () => {
    setCollapsedHours({});
  };

  const handleCollapseAllHours = (allKeys) => {
    const nextCollapsed = {};
    allKeys.forEach(k => {
      nextCollapsed[k] = true;
    });
    setCollapsedHours(nextCollapsed);
  };
  
  // 顯示字型大小設定狀態 (數值型比例 0.85 - 1.45)
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('careflow_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());
    localStorage.setItem('careflow_font_scale', fontScale.toString());
  }, [fontScale]);

  // 提示框狀態 (用於圖表 hover/click 顯示)
  const [activeTooltip, setActiveTooltip] = useState(null); // { chartId, index, x, y, time, value }

  // 表單欄位狀態
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [customMap, setCustomMap] = useState(null);
  const [heartRate, setHeartRate] = useState(80);
  const [oxygen, setOxygen] = useState(98);
  const [respRate, setRespRate] = useState(16);
  const [urineVolume, setUrineVolume] = useState(200);
  const [urineColor, setUrineColor] = useState('clear_yellow');
  const [customMed, setCustomMed] = useState('');
  const [noteText, setNoteText] = useState('');
  const [careRequestText, setCareRequestText] = useState('');

  // 計算所得的平均壓 (MAP)
  const calculatedMap = Math.round(diastolic + (systolic - diastolic) / 3);
  const meanArterialPressure = customMap !== null ? customMap : calculatedMap;

  // 滾動容器 ref (用於點擊標題列回到頂部)
  const mainRef = useRef(null);

  // 歷史紀錄篩選類別 (all | vitals | urine | medication | care_request)
  const [logFilter, setLogFilter] = useState('all');

  // 從雲端 GAS 拉取最新資料並在裝置解密的非同步函數 (支援離線快取優先)
  const triggerSync = useCallback(async (pinKey) => {
    const url = gasUrl;
    if (!url) return;
    
    setSyncStatus('syncing');
    try {
      // 1. 同步拉取受測者個資
      const pRes = await getFromGas(url, 'getPatient');
      let remotePatient = null;
      if (pRes && pRes.encrypted_data) {
        const dec = decrypt(pRes.encrypted_data, pinKey);
        if (dec) {
          try {
            remotePatient = JSON.parse(dec);
          } catch (err) {
            console.warn('解析雲端受測者個資失敗:', err);
          }
        }
      }
      
      // 2. 同步拉取生理與臨床紀錄
      const lRes = await getFromGas(url, 'getLogs');
      let remoteLogs = [];
      let decryptFailed = false;
      if (Array.isArray(lRes) && lRes.length > 0) {
        remoteLogs = lRes.map(item => {
          const dec = decrypt(item.data, pinKey);
          if (dec) {
            try {
              const parsed = JSON.parse(dec);
              return { id: item.id.toString(), timestamp: item.timestamp, type: item.type, ...parsed };
            } catch (err) {
              console.warn('解析雲端紀錄失敗:', err);
            }
          }
          decryptFailed = true;
          return null;
        }).filter(Boolean);
      }
      
      if (Array.isArray(lRes) && lRes.length > 0 && remoteLogs.length === 0 && decryptFailed) {
        alert("⚠️ 提示：偵測到雲端已有照護紀錄，但使用當前輸入的密碼解密失敗。\n\n請確認您的 4 位數密碼是否與其他家人設定的一致！若不一致將無法讀取歷史數據。");
      }
      
      // 3. 更新狀態並寫入本機快取
      if (remotePatient) {
        setPatient(remotePatient);
      }
      if (remoteLogs.length > 0) {
        // 過濾承已在本機刪除過的記錄，防止雲端同步讓刪除的資料復活
        try {
          const deletedIds = new Set(JSON.parse(localStorage.getItem('careflow_deleted_ids') || '[]'));
          remoteLogs = remoteLogs.filter(l => !deletedIds.has(l.id.toString()));
        } catch (err) {
          console.warn('過濾刪除紀錄失敗:', err);
        }
        // 由新到舊排序
        remoteLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(remoteLogs);
        setIsDemo(false);
        localStorage.setItem('careflow_initialized', 'true');
      }
      
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (err) {
      console.error('雲端同步失敗:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [gasUrl]);

  // 檢查 URL 是否帶有 gas 參數，如有則在掛載時清理網址列 (已在 useState 中載入值)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gasParam = params.get('gas');
    if (gasParam) {
      // 從網址列移除 ?gas=...
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // 當解鎖狀態、密碼或雲端網址變更時，自動觸發雲端同步
  useEffect(() => {
    if (!isLocked && password && gasUrl) {
      // 延後執行以避免 React 偵測到 Effect 內部的同步 setState (react-hooks/set-state-in-effect)
      const timer = setTimeout(() => {
        triggerSync(password);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLocked, password, gasUrl, triggerSync]);

  // 本地儲存同步 - 生理紀錄
  useEffect(() => {
    const noPin = localStorage.getItem('careflow_no_pin') === 'true';
    if (!isLocked) {
      if (noPin) {
        localStorage.setItem('careflow_logs', JSON.stringify(logs));
      } else if (password) {
        const encrypted = encrypt(JSON.stringify(logs), password);
        localStorage.setItem('careflow_logs', encrypted);
      }
    }
  }, [logs, isLocked, password]);

  // 本地儲存同步 - 受測者基本資料
  useEffect(() => {
    const noPin = localStorage.getItem('careflow_no_pin') === 'true';
    if (!isLocked) {
      if (noPin) {
        localStorage.setItem('careflow_patient', JSON.stringify(patient));
      } else if (password) {
        const encrypted = encrypt(JSON.stringify(patient), password);
        localStorage.setItem('careflow_patient', encrypted);
      }
    }
  }, [patient, isLocked, password]);

  // 清除資料、新建受測者重設函數
  const handleStartFresh = async () => {
    if (window.confirm('確定要清除所有紀錄並新建受測者嗎？此動作將刪除當前瀏覽器儲存的所有歷史數據，無法復原。')) {
      setLogs([]);
      const newPatient = {
        name: '受測者 S-001',
        age: '',
        gender: '',
        diagnosis: '一般照護'
      };
      setPatient(newPatient);
      localStorage.setItem('careflow_initialized', 'true');
      setIsDemo(false);
      setShowSettingsModal(false);

      // 同步清空雲端試算表
      const url = gasUrl;
      if (url) {
        setSyncStatus('syncing');
        try {
          await postToGas(url, { action: 'clearAll' });
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (error) {
          console.error('Failed to clear cloud logs:', error);
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
        }
      }
    }
  };

  // 取得最新生理數據
  const getLatestVitals = useCallback(() => {
    const vitalsLogs = logs.filter(l => l.type === 'vitals');
    if (vitalsLogs.length === 0) return { hr: '--', spo2: '--', rr: '--', bp: '--/--', map: '--' };
    
    const sorted = [...vitalsLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latest = sorted[0];
    return {
      hr: latest.hr,
      spo2: latest.spo2,
      rr: latest.rr,
      bp: `${latest.sbp}/${latest.dbp}`,
      sbp: latest.sbp,
      dbp: latest.dbp,
      map: latest.map,
      timestamp: latest.timestamp
    };
  }, [logs]);

  const latest = useMemo(() => getLatestVitals(), [getLatestVitals]);

  // 開啟生理數據輸入視窗並自動填入「前一次的輸入值」 (Carry over last recorded values)
  const openVitalsModalWithLatest = () => {
    setNoteText('');
    const latestHr = latest.hr !== '--' ? latest.hr : 80;
    const latestSpo2 = latest.spo2 !== '--' ? latest.spo2 : 98;
    const latestRr = latest.rr !== '--' ? latest.rr : 16;
    
    let latestSbp = 120;
    let latestDbp = 80;
    
    if (latest.bp && latest.bp !== '--/--') {
      const parts = latest.bp.split('/');
      latestSbp = parseInt(parts[0], 10) || 120;
      latestDbp = parseInt(parts[1], 10) || 80;
    }

    setHeartRate(latestHr);
    setOxygen(latestSpo2);
    setRespRate(latestRr);
    setSystolic(latestSbp);
    setDiastolic(latestDbp);
    setCustomMap(null); // 重置為自動計算 (依據載入的最新收縮壓/舒張壓)
    setShowVitalsModal(true);
  };

  // 生理數據警報值判定
  const isHrAlert = (hr) => hr !== '--' && (Number(hr) > 100 || Number(hr) < 50);
  const isSpo2Alert = (spo2) => spo2 !== '--' && Number(spo2) < 95;
  const isRrAlert = (rr) => rr !== '--' && Number(rr) > 24;
  const isBpAlert = (sbp, dbp) => sbp !== '--' && dbp !== '--' && (Number(sbp) > 140 || Number(dbp) > 90 || Number(sbp) < 90 || Number(dbp) < 55);

  // 繪製趨勢圖的 SVG 元件 (支援時間間距比例繪圖與時間標籤)
  const renderSparkline = (key, strokeColor, label, unit, isLarge = false) => {
    const data = logs
      .filter(l => l.type === 'vitals')
      .map(l => ({ val: l[key], time: new Date(l.timestamp) }))
      .filter(d => d.val !== null && !isNaN(d.val))
      .reverse(); // 舊到新排序

    if (data.length < 2) {
      return (
        <div className="bg-monitor-card border border-monitor-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs font-bold text-monitor-dim mb-1">{label}</div>
          <div className="text-[11px] text-monitor-dim py-4">數據量不足以繪製趨勢圖 (至少需2筆記錄)</div>
        </div>
      );
    }

    const width = isLarge ? 480 : 320;
    const height = isLarge ? 180 : 90;
    const paddingX = isLarge ? 12 : 6;
    const paddingY = isLarge ? 24 : 16;
    
    const vals = data.map(d => d.val);
    const min = Math.min(...vals) - 2;
    const max = Math.max(...vals) + 2;
    const valRange = max - min || 1;

    const times = data.map(d => d.time.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    const points = data.map(d => {
      const timeRatio = (d.time.getTime() - minTime) / timeRange;
      const x = paddingX + timeRatio * (width - paddingX * 2);
      const y = height - paddingY - (isLarge ? 12 : 8) - ((d.val - min) / valRange) * (height - paddingY * 2 - (isLarge ? 24 : 16));
      return { x, y, val: d.val, time: d.time };
    });

    const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

    const showLabelFlags = new Array(points.length).fill(false);
    if (points.length > 0) {
      showLabelFlags[points.length - 1] = true;
      let lastLabeledX = points[points.length - 1].x;
      for (let i = points.length - 2; i >= 0; i--) {
        if (lastLabeledX - points[i].x > (isLarge ? 45 : 30)) {
          showLabelFlags[i] = true;
          lastLabeledX = points[i].x;
        }
      }
    }

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-bold text-monitor-text">{label}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-monitor-dim">
              最新: <strong className="text-monitor-text">{vals[vals.length - 1]}</strong> {unit} (區間: {Math.round(min)}-{Math.round(max)})
            </span>
            {!isLarge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedChart({ type: 'vitals', key, strokeColor, label, unit });
                }}
                className="p-1 hover:bg-slate-100 rounded-md text-monitor-dim hover:text-monitor-text transition"
                title="放大圖表"
              >
                <Maximize2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <svg className={isLarge ? "w-full h-44" : "w-full h-20"} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <line x1="0" y1={height/2 - 4} x2={width} y2={height/2 - 4} stroke="#f1f5f9" strokeDasharray="3 3" />
            
            {/* 繪製時間軸垂直格線與時間標籤 (防重疊) */}
            {(() => {
              let lastLabelX = -999;
              const labelSpacing = isLarge ? 70 : 60;
              return points.map((p, i) => {
                const showLabel = p.x - lastLabelX > labelSpacing;
                if (showLabel) {
                  lastLabelX = p.x;
                }
                return showLabel ? (
                  <g key={`grid-${i}`}>
                    <line x1={p.x} y1={paddingY - 6} x2={p.x} y2={height - paddingY - 2} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                    <text
                      x={p.x}
                      y={height - 2}
                      textAnchor="middle"
                      fontSize={isLarge ? "8.5" : "7.5"}
                      fill="#64748b"
                      className="font-mono font-bold"
                    >
                      {(() => {
                        const month = String(p.time.getMonth() + 1).padStart(2, '0');
                        const day = String(p.time.getDate()).padStart(2, '0');
                        const hour = String(p.time.getHours()).padStart(2, '0');
                        const minute = String(p.time.getMinutes()).padStart(2, '0');
                        return `${month}/${day} ${hour}:${minute}`;
                      })()}
                    </text>
                  </g>
                ) : null;
              });
            })()}

            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isLarge ? "3" : "2.5"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                {activeTooltip && activeTooltip.chartId === key && activeTooltip.index === i && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isLarge ? "6" : "4.5"}
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth={isLarge ? "2.5" : "2"}
                  />
                )}
                {showLabelFlags[i] && (
                  <text
                    x={p.x}
                    y={p.y - (isLarge ? 9 : 7)}
                    textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                    fontSize={isLarge ? "9.5" : "8.5"}
                    fontWeight="bold"
                    fill={strokeColor}
                    className="font-mono bg-white"
                  >
                    {p.val}
                  </text>
                )}
                
                {/* 增加觸控/懸停感應區 (全高垂直切片，無死角) */}
                {(() => {
                  const leftX = i === 0 ? 0 : (points[i - 1].x + p.x) / 2;
                  const rightX = i === points.length - 1 ? width : (p.x + points[i + 1].x) / 2;
                  const sliceWidth = rightX - leftX;
                  return (
                    <rect
                      x={leftX}
                      y={0}
                      width={sliceWidth}
                      height={height}
                      fill="transparent"
                      className="cursor-pointer"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      onMouseEnter={() => {
                        if (IS_TOUCH_DEVICE) return;
                        const timeStr = p.time.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                                        p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        setActiveTooltip({
                          chartId: key,
                          index: i,
                          x: p.x,
                          y: p.y,
                          time: timeStr,
                          value: `${label.split(' ')[0]}: ${p.val} ${unit}`
                        });
                      }}
                      onMouseLeave={() => {
                        if (IS_TOUCH_DEVICE) return;
                        setActiveTooltip(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const isSame = activeTooltip && activeTooltip.chartId === key && activeTooltip.index === i;
                        if (isSame) {
                          setActiveTooltip(null);
                        } else {
                          const timeStr = p.time.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                                          p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          setActiveTooltip({
                            chartId: key,
                            index: i,
                            x: p.x,
                            y: p.y,
                            time: timeStr,
                            value: `${label.split(' ')[0]}: ${p.val} ${unit}`
                          });
                        }
                      }}
                    />
                  );
                })()}
              </g>
            ))}

            {/* 繪製浮動提示框 */}
            {activeTooltip && activeTooltip.chartId === key && (
              (() => {
                const tooltipWidth = 95;
                const tooltipHeight = 32;
                let tooltipX = activeTooltip.x - tooltipWidth / 2;
                if (tooltipX < 4) tooltipX = 4;
                if (tooltipX + tooltipWidth > width - 4) tooltipX = width - tooltipWidth - 4;

                let tooltipY = activeTooltip.y - tooltipHeight - 8;
                if (tooltipY < 4) {
                  tooltipY = activeTooltip.y + 12;
                }

                return (
                  <g key="tooltip-group" style={{ pointerEvents: 'none' }}>
                    {/* 垂直引導線 */}
                    <line 
                      x1={activeTooltip.x} 
                      y1={paddingY - 6} 
                      x2={activeTooltip.x} 
                      y2={height - paddingY - 2} 
                      stroke="#94a3b8" 
                      strokeWidth="0.8" 
                      strokeDasharray="2 2" 
                    />
                    {/* 提示框背景 */}
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="5"
                      fill="#1e293b"
                      fillOpacity="0.9"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    {/* 時間 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 11}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill="#cbd5e1"
                      className="font-mono font-bold"
                    >
                      {activeTooltip.time}
                    </text>
                    {/* 數據內容 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 23}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="#ffffff"
                      className="font-sans"
                    >
                      {activeTooltip.value}
                    </text>
                  </g>
                );
              })()
            )}
          </svg>
        </div>
      </div>
    );
  };

  // 繪製血壓與平均壓合併趨勢圖的 SVG 元件 (支援時間間距比例與 SBP/MAP/DBP 三合一折線)
  const renderBpSparkline = (isLarge = false) => {
    const data = logs
      .filter(l => l.type === 'vitals')
      .map(l => {
        const s = Number(l.sbp) || 0;
        const d = Number(l.dbp) || 0;
        const m = Number(l.map) || Math.round(d + (s - d) / 3);
        return { sbp: s, dbp: d, map: m, time: new Date(l.timestamp) };
      })
      .filter(d => d.sbp > 0 && d.dbp > 0)
      .reverse(); // 舊到新排序

    if (data.length < 2) {
      return (
        <div className="bg-monitor-card border border-monitor-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs font-bold text-monitor-dim mb-1">血壓與平均壓 (NBP & MAP)</div>
          <div className="text-[11px] text-monitor-dim py-4">數據量不足以繪製趨勢圖 (至少需2筆記錄)</div>
        </div>
      );
    }

    const width = isLarge ? 480 : 320;
    const height = isLarge ? 200 : 105;
    const paddingX = isLarge ? 12 : 6;
    const paddingY = isLarge ? 24 : 16;

    const sbps = data.map(d => d.sbp);
    const dbps = data.map(d => d.dbp);
    const maps = data.map(d => d.map);
    const min = Math.min(...dbps) - 5;
    const max = Math.max(...sbps) + 5;
    const valRange = max - min || 1;

    const times = data.map(d => d.time.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    const points = data.map(d => {
      const timeRatio = (d.time.getTime() - minTime) / timeRange;
      const x = paddingX + timeRatio * (width - paddingX * 2);
      const ySbp = height - paddingY - (isLarge ? 15 : 10) - ((d.sbp - min) / valRange) * (height - paddingY * 2 - (isLarge ? 30 : 20));
      const yDbp = height - paddingY - (isLarge ? 15 : 10) - ((d.dbp - min) / valRange) * (height - paddingY * 2 - (isLarge ? 30 : 20));
      const yMap = height - paddingY - (isLarge ? 15 : 10) - ((d.map - min) / valRange) * (height - paddingY * 2 - (isLarge ? 30 : 20));
      return { x, ySbp, yDbp, yMap, sbp: d.sbp, dbp: d.dbp, map: d.map, time: d.time };
    });

    const pathSbp = `M ${points.map(p => `${p.x} ${p.ySbp}`).join(' L ')}`;
    const pathDbp = `M ${points.map(p => `${p.x} ${p.yDbp}`).join(' L ')}`;
    const pathMap = `M ${points.map(p => `${p.x} ${p.yMap}`).join(' L ')}`;

    const showLabelFlags = new Array(points.length).fill(false);
    if (points.length > 0) {
      showLabelFlags[points.length - 1] = true;
      let lastLabeledX = points[points.length - 1].x;
      for (let i = points.length - 2; i >= 0; i--) {
        if (lastLabeledX - points[i].x > (isLarge ? 45 : 30)) {
          showLabelFlags[i] = true;
          lastLabeledX = points[i].x;
        }
      }
    }

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-bold text-monitor-text">血壓與平均壓趨勢 (收縮壓/平均壓/舒張壓)</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-monitor-dim">
              最新: <strong className="text-monitor-red">{sbps[sbps.length - 1]}</strong>/<strong className="text-monitor-purple">{maps[maps.length - 1]}</strong>/<strong className="text-slate-700">{dbps[dbps.length - 1]}</strong> mmHg
            </span>
            {!isLarge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedChart({ type: 'bp' });
                }}
                className="p-1 hover:bg-slate-100 rounded-md text-monitor-dim hover:text-monitor-text transition"
                title="放大圖表"
              >
                <Maximize2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <svg className={isLarge ? "w-full h-48" : "w-full h-24"} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <line x1="0" y1={height/2 - 5} x2={width} y2={height/2 - 5} stroke="#f1f5f9" strokeDasharray="3 3" />
            
            {/* 時間軸垂直格線與時間標籤 */}
            {(() => {
              let lastLabelX = -999;
              const labelSpacing = isLarge ? 70 : 60;
              return points.map((p, i) => {
                const showLabel = p.x - lastLabelX > labelSpacing;
                if (showLabel) {
                  lastLabelX = p.x;
                }
                return showLabel ? (
                  <g key={`grid-bp-${i}`}>
                    <line x1={p.x} y1={paddingY - 6} x2={p.x} y2={height - paddingY - 2} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                    <text
                      x={p.x}
                      y={height - 2}
                      textAnchor="middle"
                      fontSize={isLarge ? "8.5" : "7.5"}
                      fill="#64748b"
                      className="font-mono font-bold"
                    >
                      {(() => {
                        const month = String(p.time.getMonth() + 1).padStart(2, '0');
                        const day = String(p.time.getDate()).padStart(2, '0');
                        const hour = String(p.time.getHours()).padStart(2, '0');
                        const minute = String(p.time.getMinutes()).padStart(2, '0');
                        return `${month}/${day} ${hour}:${minute}`;
                      })()}
                    </text>
                  </g>
                ) : null;
              });
            })()}

            {/* 收縮壓線 (紅) */}
            <path
              d={pathSbp}
              fill="none"
              stroke="#ef4444"
              strokeWidth={isLarge ? "2.5" : "2"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 平均壓線 (紫虛線) */}
            <path
              d={pathMap}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth={isLarge ? "2" : "1.5"}
              strokeDasharray="3 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 舒張壓線 (灰) */}
            <path
              d={pathDbp}
              fill="none"
              stroke="#475569"
              strokeWidth={isLarge ? "2.5" : "2"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                {/* SBP */}
                {activeTooltip && activeTooltip.chartId === 'bp' && activeTooltip.index === i && (
                  <circle cx={p.x} cy={p.ySbp} r={isLarge ? "6" : "4.5"} fill="#ef4444" stroke="#ffffff" strokeWidth={isLarge ? "2.5" : "2"} />
                )}
                {showLabelFlags[i] && (
                  <text x={p.x} y={p.ySbp - (isLarge ? 8 : 6)} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={isLarge ? "8.5" : "7.5"} fontWeight="bold" fill="#ef4444" className="font-mono">{p.sbp}</text>
                )}
                
                {/* MAP */}
                {activeTooltip && activeTooltip.chartId === 'bp' && activeTooltip.index === i && (
                  <circle cx={p.x} cy={p.yMap} r={isLarge ? "5" : "3.5"} fill="#8b5cf6" stroke="#ffffff" strokeWidth={isLarge ? "2" : "1.5"} />
                )}
                {showLabelFlags[i] && (
                  <text x={p.x} y={p.yMap - (isLarge ? 7 : 5)} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={isLarge ? "8" : "7"} fontWeight="bold" fill="#8b5cf6" className="font-mono">{p.map}</text>
                )}

                {/* DBP */}
                {activeTooltip && activeTooltip.chartId === 'bp' && activeTooltip.index === i && (
                  <circle cx={p.x} cy={p.yDbp} r={isLarge ? "6" : "4.5"} fill="#475569" stroke="#ffffff" strokeWidth={isLarge ? "2.5" : "2"} />
                )}
                {showLabelFlags[i] && (
                  <text x={p.x} y={p.yDbp + (isLarge ? 12 : 9)} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={isLarge ? "8.5" : "7.5"} fontWeight="bold" fill="#475569" className="font-mono">{p.dbp}</text>
                )}

                {/* 增加觸控/懸停感應區 (全高垂直切片，無死角) */}
                {(() => {
                  const leftX = i === 0 ? 0 : (points[i - 1].x + p.x) / 2;
                  const rightX = i === points.length - 1 ? width : (p.x + points[i + 1].x) / 2;
                  const sliceWidth = rightX - leftX;
                  return (
                    <rect
                      x={leftX}
                      y={0}
                      width={sliceWidth}
                      height={height}
                      fill="transparent"
                      className="cursor-pointer"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      onMouseEnter={() => {
                        if (IS_TOUCH_DEVICE) return;
                        const timeStr = p.time.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                                        p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        setActiveTooltip({
                          chartId: 'bp',
                          index: i,
                          x: p.x,
                          y: p.yMap,
                          time: timeStr,
                          value: `血壓: ${p.sbp}/${p.dbp} (MAP: ${p.map})`
                        });
                      }}
                      onMouseLeave={() => {
                        if (IS_TOUCH_DEVICE) return;
                        setActiveTooltip(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const isSame = activeTooltip && activeTooltip.chartId === 'bp' && activeTooltip.index === i;
                        if (isSame) {
                          setActiveTooltip(null);
                        } else {
                          const timeStr = p.time.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                                          p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          setActiveTooltip({
                            chartId: 'bp',
                            index: i,
                            x: p.x,
                            y: p.yMap,
                            time: timeStr,
                            value: `血壓: ${p.sbp}/${p.dbp} (MAP: ${p.map})`
                          });
                        }
                      }}
                    />
                  );
                })()}
              </g>
            ))}

            {/* 繪製浮動提示框 */}
            {activeTooltip && activeTooltip.chartId === 'bp' && (
              (() => {
                const tooltipWidth = 125;
                const tooltipHeight = 32;
                let tooltipX = activeTooltip.x - tooltipWidth / 2;
                if (tooltipX < 4) tooltipX = 4;
                if (tooltipX + tooltipWidth > width - 4) tooltipX = width - tooltipWidth - 4;

                let tooltipY = activeTooltip.y - tooltipHeight - 12;
                if (tooltipY < 4) {
                  tooltipY = activeTooltip.y + 14;
                }

                return (
                  <g key="tooltip-group-bp" style={{ pointerEvents: 'none' }}>
                    {/* 垂直引導線 */}
                    <line 
                      x1={activeTooltip.x} 
                      y1={paddingY - 6} 
                      x2={activeTooltip.x} 
                      y2={height - paddingY - 2} 
                      stroke="#94a3b8" 
                      strokeWidth="0.8" 
                      strokeDasharray="2 2" 
                    />
                    {/* 提示框背景 */}
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="5"
                      fill="#1e293b"
                      fillOpacity="0.9"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    {/* 時間 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 11}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill="#cbd5e1"
                      className="font-mono font-bold"
                    >
                      {activeTooltip.time}
                    </text>
                    {/* 數據內容 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 23}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="#ffffff"
                      className="font-sans"
                    >
                      {activeTooltip.value}
                    </text>
                  </g>
                );
              })()
            )}
          </svg>
        </div>
      </div>
    );
  };

  // 繪製尿量排泄紀錄的柱狀圖 SVG 元件 (支援時間間距比例與顏色對照)
  const renderUrineChart = (isLarge = false) => {
    const data = logs
      .filter(l => l.type === 'event' && l.eventType === 'urine')
      .map(l => ({ val: Number(l.volumeCc) || 0, time: new Date(l.timestamp), color: l.color }))
      .filter(d => d.val > 0)
      .reverse(); // 舊到新排序

    if (data.length < 1) {
      return (
        <div className="bg-monitor-card border border-monitor-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs font-bold text-monitor-cyan mb-1">尿量排泄紀錄 (Urine Output)</div>
          <div className="text-[11px] text-monitor-dim py-4">目前尚無尿量登錄紀錄</div>
        </div>
      );
    }

    const width = isLarge ? 480 : 320;
    const height = isLarge ? 180 : 95;
    const paddingX = isLarge ? 24 : 16;
    const paddingY = isLarge ? 24 : 16;

    const vals = data.map(d => d.val);
    const maxVal = Math.max(...vals, 100); // 至少 100 做比例
    
    const times = data.map(d => d.time.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    const points = data.map(d => {
      const timeRatio = data.length === 1 ? 0.5 : (d.time.getTime() - minTime) / timeRange;
      const x = paddingX + timeRatio * (width - paddingX * 2);
      const barHeight = (d.val / maxVal) * (height - paddingY * 2 - (isLarge ? 18 : 12));
      const y = height - paddingY - 2 - barHeight;
      return { x, y, val: d.val, time: d.time, barHeight, color: d.color };
    });

    // 尿色對應之填充顏色設定
    const getColorFill = (color) => {
      switch (color) {
        case 'clear_yellow': return '#fed7aa'; // light amber-200
        case 'dark_yellow': return '#f59e0b';  // amber-500
        case 'tea':
        case 'tea_brown': return '#b45309';    // amber-700
        case 'bright_red':
        case 'hematuria_red': return '#f87171'; // red-400 (血尿)
        default: return '#06b6d4';              // cyan-500
      }
    };

    const getUrineColorText = (color) => {
      switch (color) {
        case 'clear_yellow': return '清澈/淡黃';
        case 'dark_yellow': return '偏黃';
        case 'tea':
        case 'tea_brown': return '深茶色';
        case 'bright_red':
        case 'hematuria_red': return '鮮紅血尿';
        default: return '其他';
      }
    };

    const showLabelFlags = new Array(points.length).fill(false);
    if (points.length > 0) {
      showLabelFlags[points.length - 1] = true;
      let lastLabeledX = points[points.length - 1].x;
      for (let i = points.length - 2; i >= 0; i--) {
        if (lastLabeledX - points[i].x > (isLarge ? 45 : 30)) {
          showLabelFlags[i] = true;
          lastLabeledX = points[i].x;
        }
      }
    }

    const totalUrineVol = vals.reduce((sum, v) => sum + v, 0);
    const nowTime = new Date().getTime();
    const minTimeUrine = data.length > 0 ? Math.min(...data.map(d => d.time.getTime())) : nowTime;
    const elapsedHoursTotal = (nowTime - minTimeUrine) / (1000 * 60 * 60);
    const hoursForAvg = Math.max(1, elapsedHoursTotal);
    const avgHourlyUrine = (totalUrineVol / hoursForAvg).toFixed(1);

    const rates = points.map((p, i) => {
      let elapsedHours = 4; // 第一筆預設為 4 小時
      if (i > 0) {
        const diffMs = points[i].time.getTime() - points[i-1].time.getTime();
        elapsedHours = diffMs / (1000 * 60 * 60);
        if (elapsedHours < 0.5) elapsedHours = 0.5; // 防極端小區間
      }
      return p.val / elapsedHours;
    });

    const movingAverageRates = rates.map((r, i) => {
      const start = Math.max(0, i - 2);
      const subset = rates.slice(start, i + 1);
      const sum = subset.reduce((acc, val) => acc + val, 0);
      return sum / subset.length;
    });

    const maxRate = Math.max(...movingAverageRates, 10);
    const movingAverages = points.map((p, i) => {
      const avgRate = movingAverageRates[i];
      const rateHeight = (avgRate / maxRate) * (height - paddingY * 2 - (isLarge ? 18 : 12));
      const y = height - paddingY - 2 - Math.max(0, Math.min(height - paddingY * 2 - (isLarge ? 18 : 12), rateHeight));
      return { x: p.x, y, avgRate };
    });
    const pathD = `M ${movingAverages.map(ma => `${ma.x} ${ma.y}`).join(' L ')}`;

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1.5 text-xs">
          <span className="font-bold text-monitor-cyan flex items-center gap-1.5 flex-wrap">
            <span>💧 尿量排泄趨勢 (Urine Output)</span>
            <span className="text-[9px] font-normal text-slate-400 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <span className="inline-block w-2.5 h-0 border-t-2 border-dashed border-cyan-500 mr-1 align-middle"></span>
              每小時尿量 (3次移動平均)
            </span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-monitor-dim whitespace-nowrap">
              總量: <strong className="text-cyan-600 font-mono">{totalUrineVol}</strong> cc | 平均: <strong className="text-cyan-600 font-mono">{avgHourlyUrine}</strong> cc/hr
            </span>
            {!isLarge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedChart({ type: 'urine' });
                }}
                className="p-1 hover:bg-slate-100 rounded-md text-monitor-dim hover:text-monitor-text transition"
                title="放大圖表"
              >
                <Maximize2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <svg className={isLarge ? "w-full h-44" : "w-full h-22"} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <line x1="0" y1={height - paddingY - 2} x2={width} y2={height - paddingY - 2} stroke="#e2e8f0" strokeWidth="1" />
            
            {/* 時間軸垂直格線與時間標籤 */}
            {(() => {
              let lastLabelX = -999;
              const labelSpacing = isLarge ? 70 : 60;
              return points.map((p, i) => {
                const showLabel = p.x - lastLabelX > labelSpacing;
                if (showLabel) {
                  lastLabelX = p.x;
                }
                return showLabel ? (
                  <g key={`grid-urine-${i}`}>
                    <line x1={p.x} y1={paddingY - 6} x2={p.x} y2={height - paddingY - 2} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                    <text
                      x={p.x}
                      y={height - 2}
                      textAnchor="middle"
                      fontSize={isLarge ? "8.5" : "7.5"}
                      fill="#64748b"
                      className="font-mono font-bold"
                    >
                      {(() => {
                        const month = String(p.time.getMonth() + 1).padStart(2, '0');
                        const day = String(p.time.getDate()).padStart(2, '0');
                        const hour = String(p.time.getHours()).padStart(2, '0');
                        const minute = String(p.time.getMinutes()).padStart(2, '0');
                        return `${month}/${day} ${hour}:${minute}`;
                      })()}
                    </text>
                  </g>
                ) : null;
              });
            })()}

            {/* 繪製柱狀圖 */}
            {points.map((p, i) => {
              const barWidth = Math.max(isLarge ? 12 : 8, Math.min(isLarge ? 24 : 16, (isLarge ? 180 : 120) / (data.length || 10)));
              return (
                <g key={`bar-${i}`}>
                  <rect
                    x={p.x - barWidth / 2}
                    y={p.y}
                    width={barWidth}
                    height={p.barHeight}
                    fill={getColorFill(p.color)}
                    stroke={p.color === 'bright_red' || p.color === 'hematuria_red' ? '#ef4444' : '#0891b2'}
                    strokeWidth="0.5"
                    rx="1.5"
                  />
                  {showLabelFlags[i] && (
                    <text
                      x={p.x}
                      y={p.y - (isLarge ? 10 : 8)}
                      textAnchor="middle"
                      fontSize={isLarge ? "8.5" : "7.5"}
                      fontWeight="bold"
                      fill="#334155"
                      className="font-mono"
                    >
                      {p.val}
                    </text>
                  )}
                  
                  {/* 增加觸控/懸停感應區 (全高垂直切片，無死角) */}
                  {(() => {
                    const leftX = i === 0 ? 0 : (points[i - 1].x + p.x) / 2;
                    const rightX = i === points.length - 1 ? width : (p.x + points[i + 1].x) / 2;
                    const sliceWidth = rightX - leftX;
                    return (
                      <rect
                        x={leftX}
                        y={0}
                        width={sliceWidth}
                        height={height}
                        fill="transparent"
                        className="cursor-pointer"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        onMouseEnter={() => {
                          if (IS_TOUCH_DEVICE) return;
                          const timeStr = p.time.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                                          p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          setActiveTooltip({
                            chartId: 'urine',
                            index: i,
                            x: p.x,
                            y: p.y,
                            time: timeStr,
                            singleVal: `單次: ${p.val} cc (${getUrineColorText(p.color)})`,
                            avgVal: `平均: ${movingAverages[i].avgRate.toFixed(1)} cc/hr`
                          });
                        }}
                        onMouseLeave={() => {
                          if (IS_TOUCH_DEVICE) return;
                          setActiveTooltip(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const isSame = activeTooltip && activeTooltip.chartId === 'urine' && activeTooltip.index === i;
                          if (isSame) {
                            setActiveTooltip(null);
                          } else {
                            const timeStr = p.time.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + 
                                            p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                            setActiveTooltip({
                              chartId: 'urine',
                              index: i,
                              x: p.x,
                              y: p.y,
                              time: timeStr,
                              singleVal: `單次: ${p.val} cc (${getUrineColorText(p.color)})`,
                              avgVal: `平均: ${movingAverages[i].avgRate.toFixed(1)} cc/hr`
                            });
                          }
                        }}
                      />
                    );
                  })()}
                </g>
              );
            })}

            {/* 繪製 3次移動平均線 */}
            {movingAverages.length >= 2 && (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.2"
                  strokeDasharray="3.5 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {movingAverages.map((ma, i) => (
                  activeTooltip && activeTooltip.chartId === 'urine' && activeTooltip.index === i && (
                    <circle
                      key={`ma-dot-${i}`}
                      cx={ma.x}
                      cy={ma.y}
                      r={isLarge ? "5.5" : "4"}
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )
                ))}
              </>
            )}

            {/* 繪製浮動提示框 */}
            {activeTooltip && activeTooltip.chartId === 'urine' && (
              (() => {
                const tooltipWidth = 150;
                const tooltipHeight = 44;
                let tooltipX = activeTooltip.x - tooltipWidth / 2;
                if (tooltipX < 4) tooltipX = 4;
                if (tooltipX + tooltipWidth > width - 4) tooltipX = width - tooltipWidth - 4;

                let tooltipY = activeTooltip.y - tooltipHeight - 8;
                if (tooltipY < 4) {
                  tooltipY = activeTooltip.y + 14;
                }

                return (
                  <g key="tooltip-group-urine" style={{ pointerEvents: 'none' }}>
                    {/* 垂直引導線 */}
                    <line 
                      x1={activeTooltip.x} 
                      y1={paddingY - 6} 
                      x2={activeTooltip.x} 
                      y2={height - paddingY - 2} 
                      stroke="#94a3b8" 
                      strokeWidth="0.8" 
                      strokeDasharray="2 2" 
                    />
                    {/* 提示框背景 */}
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="5"
                      fill="#1e293b"
                      fillOpacity="0.9"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    {/* 時間 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 12}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill="#cbd5e1"
                      className="font-mono font-bold"
                    >
                      {activeTooltip.time}
                    </text>
                    {/* 單次尿量 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 23}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="#ffffff"
                      className="font-sans"
                    >
                      {activeTooltip.singleVal}
                    </text>
                    {/* 每小時平均 */}
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 34}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="#22d3ee"
                      className="font-sans"
                    >
                      {activeTooltip.avgVal}
                    </text>
                  </g>
                );
              })()
            )}
          </svg>
        </div>
      </div>
    );
  };

  // 繪製睡眠與清醒時間分佈圖卡
  const renderSleepTimeline = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 過去 24 小時

    // 篩選所有睡眠事件，並依時間由舊到新排序
    const sleepLogs = logs
      .filter(l => l.type === 'event' && l.eventType === 'care_request' && l.requestCategory === 'sleep')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // 找到 startTime 之前的最後一個睡眠狀態，作為起始狀態
    let initialStatus = 'awake';
    const logsBeforeStart = sleepLogs.filter(l => new Date(l.timestamp) < startTime);
    if (logsBeforeStart.length > 0) {
      initialStatus = logsBeforeStart[logsBeforeStart.length - 1].sleepStatus;
    } else if (sleepLogs.length > 0) {
      initialStatus = sleepLogs[0].sleepStatus === 'asleep' ? 'awake' : 'asleep';
    }

    // 篩選 startTime 到 now 之間的事件
    const logsInWindow = sleepLogs.filter(l => {
      const t = new Date(l.timestamp);
      return t >= startTime && t <= now;
    });

    const intervals = [];
    let currentStart = startTime;
    let currentStatus = initialStatus;

    logsInWindow.forEach(log => {
      const logTime = new Date(log.timestamp);
      if (logTime.getTime() > currentStart.getTime()) {
        intervals.push({
          start: currentStart,
          end: logTime,
          status: currentStatus
        });
      }
      currentStart = logTime;
      currentStatus = log.sleepStatus;
    });

    // 最後一段到目前時間
    if (now.getTime() > currentStart.getTime()) {
      intervals.push({
        start: currentStart,
        end: now,
        status: currentStatus
      });
    }

    // 計算累計時間
    let totalSleepMs = 0;
    let totalAwakeMs = 0;
    intervals.forEach(inv => {
      const dur = inv.end.getTime() - inv.start.getTime();
      if (inv.status === 'asleep') {
        totalSleepMs += dur;
      } else {
        totalAwakeMs += dur;
      }
    });

    const sleepHrs = Math.floor(totalSleepMs / (1000 * 60 * 60));
    const sleepMins = Math.round((totalSleepMs % (1000 * 60 * 60)) / (1000 * 60));
    const awakeHrs = Math.floor(totalAwakeMs / (1000 * 60 * 60));
    const awakeMins = Math.round((totalAwakeMs % (1000 * 60 * 60)) / (1000 * 60));

    // 時間格式化輔助
    const formatTime = (date) => {
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-4 shadow-sm space-y-4 animate-fade-in">
        <div className="flex flex-col gap-1.5 pb-2 border-b border-monitor-border">
          <div className="flex justify-between items-center flex-wrap gap-x-2 gap-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-monitor-dim flex items-center gap-1.5">
              <Moon size={14} className="text-monitor-indigo fill-monitor-indigo/10" /> 睡眠與清醒時間分佈
            </h3>
            <span className="text-[9px] font-normal text-slate-400 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              過去 24 小時
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-monitor-dim font-bold flex-wrap gap-x-2 gap-y-1">
            <span className="text-slate-400">狀態時數統計</span>
            <span>睡眠: {sleepHrs}小時{sleepMins}分 | 清醒: {awakeHrs}小時{awakeMins}分</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* 分段進度條 */}
          <div className="w-full h-7 rounded-lg overflow-hidden flex bg-slate-100 border border-slate-200 shadow-inner">
            {intervals.map((inv, idx) => {
              const pct = ((inv.end.getTime() - inv.start.getTime()) / (24 * 60 * 60 * 1000)) * 100;
              if (pct <= 0.01) return null; // 忽略極微小區間
              const isAsleep = inv.status === 'asleep';
              return (
                <div
                  key={idx}
                  className={`${isAsleep ? 'bg-monitor-indigo' : 'bg-amber-400'} h-full relative group transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${isAsleep ? '睡著' : '清醒'}: ${formatTime(inv.start)} - ${formatTime(inv.end)}`}
                >
                  {pct > 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm select-none">
                      {isAsleep ? '🛌' : '☀️'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 時間刻度標記 (每小時一個刻度，每 4 小時標註一次整點時間，防兩端重疊) */}
          <div className="relative h-7 pt-0.5 border-t border-slate-100 mt-1">
            {(() => {
              const ticks = [];
              const temp = new Date(startTime);
              temp.setMinutes(0, 0, 0);
              temp.setTime(temp.getTime() + 60 * 60 * 1000); // 確保在 startTime 之後的第一個整點
              while (temp < now) {
                ticks.push(new Date(temp));
                temp.setTime(temp.getTime() + 60 * 60 * 1000);
              }

              return ticks.map((tickTime, idx) => {
                const leftPercent = ((tickTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000)) * 100;
                const hour = tickTime.getHours();
                
                // 每 4 小時標註一次，且與首尾有足夠安全距離以防重疊
                const isTooClose = leftPercent < 6 || leftPercent > 94;
                const showLabel = (hour % 4 === 0) && !isTooClose;

                return (
                  <div 
                    key={`sleep-tick-${idx}`} 
                    className="absolute top-0 flex flex-col items-center"
                    style={{ 
                      left: `${leftPercent}%`, 
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`w-0.5 bg-slate-300/70 ${showLabel ? 'h-2' : 'h-1'}`} />
                    {showLabel && (
                      <span className="whitespace-nowrap font-mono text-[8px] font-bold text-monitor-dim mt-0.5">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    )}
                  </div>
                );
              });
            })()}

            {/* 兩端時間點標示 */}
            <div className="absolute left-0 top-0 flex flex-col items-start">
              <span className="h-1.5 w-0.5 bg-slate-400" />
              <span className="whitespace-nowrap font-mono text-[8px] font-bold text-monitor-dim mt-0.5">
                24h前 ({String(startTime.getHours()).padStart(2, '0')}:{String(startTime.getMinutes()).padStart(2, '0')})
              </span>
            </div>
            <div className="absolute right-0 top-0 flex flex-col items-end">
              <span className="h-1.5 w-0.5 bg-slate-400" />
              <span className="whitespace-nowrap font-mono text-[8px] font-bold text-monitor-dim mt-0.5">
                現在 ({String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')})
              </span>
            </div>
          </div>

          {/* 圖例 */}
          <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-600 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-monitor-indigo inline-block" /> 睡著中
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 清醒中
            </span>
          </div>
        </div>
      </div>
    );
  };

  // 繪製照護與給藥事件時間線列表 (支援正常與最大化模式)
  const renderTimelineList = (isExpanded = false) => {
    const allEventLogs = logs.filter(l => l.type === 'event' && (l.eventType === 'medication' || l.eventType === 'care_request'));
    const hasEvents = allEventLogs.length > 0;

    if (!hasEvents) {
      return (
        <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-lg text-xs text-monitor-dim">
          目前尚無照護與給藥事件紀錄
        </div>
      );
    }

    return (
      <div className={`space-y-2.5 ${!isExpanded ? 'mt-4 border-t border-monitor-border pt-3.5 animate-slide-up' : ''}`}>
        {!isExpanded && (
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">📋 照護與給藥事件時間線 (按時間降冪)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-monitor-dim font-normal">共 {allEventLogs.length} 筆</span>
              <button
                type="button"
                onClick={() => setIsLogTimelineExpanded(true)}
                className="p-1 hover:bg-slate-100 rounded-md text-monitor-dim hover:text-monitor-text transition flex items-center gap-0.5 text-[9px] font-bold border border-slate-200 bg-white active:scale-95 shadow-sm"
                title="全畫面檢視"
              >
                <Maximize2 size={11} />
                全螢幕
              </button>
            </div>
          </div>
        )}

        <div className={`space-y-1.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 overflow-y-auto no-scrollbar ${
          isExpanded ? 'max-h-[60vh]' : 'max-h-60'
        }`}>
          {allEventLogs.map((log) => {
            const logDate = new Date(log.timestamp);
            const logTimeStr = `${String(logDate.getMonth() + 1).padStart(2, '0')}/${String(logDate.getDate()).padStart(2, '0')} ${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')}`;
            const isMed = log.eventType === 'medication';
            const isSleep = log.requestCategory === 'sleep';
            
            return (
              <div key={log.id} className="text-[10px] bg-white border border-slate-200/60 p-2 rounded shadow-sm flex flex-col gap-1">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-1.5 min-w-0">
                    {isMed ? (
                      <span className="bg-monitor-purple/10 border border-monitor-purple/20 text-monitor-purple px-1.5 py-0.2 rounded text-[8px] font-bold uppercase whitespace-nowrap flex-shrink-0">
                        給藥處置
                      </span>
                    ) : isSleep ? (
                      <span className="bg-monitor-indigo/10 border border-monitor-indigo/20 text-monitor-indigo px-1.5 py-0.2 rounded text-[8px] font-bold uppercase whitespace-nowrap flex-shrink-0">
                        睡眠狀態
                      </span>
                    ) : (
                      <span className="bg-monitor-orange/10 border border-monitor-orange/20 text-monitor-orange px-1.5 py-0.2 rounded text-[8px] font-bold uppercase whitespace-nowrap flex-shrink-0">
                        照護需求
                      </span>
                    )}
                    <span className="font-bold text-slate-700 break-words min-w-0 flex-1 leading-normal">
                      {isMed ? log.medicationName : isSleep ? (log.sleepStatus === 'asleep' ? '進入睡眠 (睡著)' : '恢復清醒 (醒來)') : log.requestText}
                    </span>
                  </div>
                  <span className="font-mono text-slate-400 font-semibold text-[9px] flex-shrink-0 pt-0.5">
                    {logTimeStr}
                  </span>
                </div>
                {log.notes && (
                  <div className="text-[9px] text-slate-400 pl-1.5 border-l border-slate-200 mt-0.5 break-words">
                    備註: {log.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 繪製每日照護負荷與日夜時段統計區塊 (過去 7 天)
  const renderEventStatistics = () => {
    const now = new Date();
    // 取得過去 7 天的日期陣列（包含今天）
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push({
        dateStr,
        ymd,
        medCount: 0,
        careCount: 0,
        urineCount: 0,
        total: 0
      });
    }

    let totalInterventions = 0;
    let dayCount = 0;
    let nightCount = 0;

    logs.forEach(log => {
      // 統計生理數據以外的照護事件（給藥、照護需求、排泄尿量）
      if (log.type !== 'event') return;
      const logDate = new Date(log.timestamp);
      const logYmd = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      const hour = logDate.getHours();
      
      // 白班: 08:00 - 20:00, 大夜: 20:00 - 08:00
      const isDay = hour >= 8 && hour < 20;

      const dayData = dates.find(d => d.ymd === logYmd);
      if (dayData) {
        if (log.eventType === 'medication') {
          dayData.medCount++;
          dayData.total++;
          totalInterventions++;
          if (isDay) dayCount++; else nightCount++;
        } else if (log.eventType === 'care_request' && log.requestCategory !== 'sleep') {
          dayData.careCount++;
          dayData.total++;
          totalInterventions++;
          if (isDay) dayCount++; else nightCount++;
        } else if (log.eventType === 'urine') {
          dayData.urineCount++;
          dayData.total++;
          totalInterventions++;
          if (isDay) dayCount++; else nightCount++;
        }
      }
    });

    const maxTotal = Math.max(...dates.map(d => d.total), 5); // 確保 Y 軸最大值至少為 5
    const avgDaily = (totalInterventions / 7).toFixed(1);

    // SVG parameters
    const width = 320;
    const height = 135;
    const paddingLeft = 24;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 20;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const yBaseline = paddingTop + plotHeight;
    const colWidth = plotWidth / 7;
    const barWidth = 14;

    const dayPct = totalInterventions > 0 ? Math.round((dayCount / totalInterventions) * 100) : 0;
    const nightPct = totalInterventions > 0 ? Math.round((nightCount / totalInterventions) * 100) : 0;

    // 判定是否夜間照護負荷過重 (夜間大於 35% 或是次數過多)
    const isNightHeavy = totalInterventions > 0 && (nightCount / totalInterventions) > 0.35;

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-4 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-monitor-dim flex items-center gap-1.5 pb-2 border-b border-monitor-border">
          <Activity size={14} className="text-monitor-orange" /> 每日照護介入與時段分佈 (過去 7 天)
        </h3>

        <div className="space-y-4">
          {/* 趨勢圖表 */}
          <div>
            <div className="text-[10px] text-monitor-dim font-bold mb-1 flex justify-between items-center">
              <span>每日照護介入負荷 (給藥/需求/排泄疊加次數)</span>
              <span>Y軸最大值: {maxTotal}</span>
            </div>
            <div className="relative">
              <svg className="w-full h-[135px]" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* 輔助網格線 */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = yBaseline - ratio * plotHeight;
                  const val = Math.round(ratio * maxTotal);
                  return (
                    <g key={idx}>
                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                      <text x={paddingLeft - 6} y={y + 3} className="text-[8px] font-mono text-monitor-dim font-bold" textAnchor="end">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* 疊加柱狀圖 */}
                {dates.map((d, i) => {
                  const x = paddingLeft + i * colWidth + (colWidth - barWidth) / 2;
                  
                  // 各區段高度與 Y 軸位置
                  const urineHeight = (d.urineCount / maxTotal) * plotHeight;
                  const medHeight = (d.medCount / maxTotal) * plotHeight;
                  const careHeight = (d.careCount / maxTotal) * plotHeight;

                  const yUrine = yBaseline - urineHeight;
                  const yMed = yUrine - medHeight;
                  const yCare = yMed - careHeight;

                  return (
                    <g key={i}>
                      {/* 尿量排泄柱段 (Cyan) */}
                      {d.urineCount > 0 && (
                        <rect x={x} y={yUrine} width={barWidth} height={urineHeight} fill="#06b6d4" rx={1} />
                      )}
                      {/* 给藥處置柱段 (Purple) */}
                      {d.medCount > 0 && (
                        <rect x={x} y={yMed} width={barWidth} height={medHeight} fill="#8b5cf6" rx={1} />
                      )}
                      {/* 照護需求柱段 (Orange) */}
                      {d.careCount > 0 && (
                        <rect x={x} y={yCare} width={barWidth} height={careHeight} fill="#f97316" rx={1} />
                      )}

                      {/* X軸日期 */}
                      <text x={x + barWidth / 2} y={yBaseline + 14} className="text-[9px] font-mono text-monitor-dim font-bold" textAnchor="middle">
                        {d.dateStr}
                      </text>

                      {/* 頂部總數文字 */}
                      {d.total > 0 && (
                        <text x={x + barWidth / 2} y={yCare - 3} className="text-[8px] font-mono font-bold text-slate-600" textAnchor="middle">
                          {d.total}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 圖例說明 */}
          <div className="flex justify-center gap-4 text-[9px] font-bold text-slate-500 border-t border-slate-100 pt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-monitor-orange inline-block" /> 照護需求
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-monitor-purple inline-block" /> 給藥處置
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-monitor-cyan inline-block" /> 排泄記錄
            </span>
          </div>

          {/* 數據總結與日夜佔比 */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-[10px] font-bold text-monitor-dim border-b border-slate-200/50 pb-1.5">
              <span>照護介入統計</span>
              <span>7天總計: {totalInterventions} 次</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-[9px] text-monitor-dim font-bold">日均照顧負荷</div>
                <div className="text-sm font-bold text-slate-700 font-mono">{avgDaily} <span className="text-[10px]">次/天</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-monitor-dim font-bold">日夜時段佔比</div>
                <div className="text-[10px] font-bold text-slate-600">
                  ☀️ 日 {dayPct}% | 🌙 夜 {nightPct}%
                </div>
              </div>
            </div>

            {/* 進度條 */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex shadow-inner">
              <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${dayPct}%` }} title="白班 (08:00 - 20:00)" />
              <div className="bg-monitor-indigo h-full transition-all duration-500" style={{ width: `${nightPct}%` }} title="大夜 (20:00 - 08:00)" />
            </div>

            {/* 警示與提醒 */}
            {totalInterventions > 0 && (
              <div className={`p-2 rounded text-[10px] leading-normal flex items-start gap-1.5 font-bold ${
                isNightHeavy ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100/80 text-slate-600'
              }`}>
                <AlertCircle size={13} className={isNightHeavy ? "text-amber-700 flex-shrink-0 mt-0.5" : "text-monitor-dim flex-shrink-0 mt-0.5"} />
                <p>
                  {isNightHeavy 
                    ? '警示：近期夜間照護頻率偏高 (>35%)，長輩可能夜間睡眠不穩，主要照顧者請注意調配休息，防範照顧崩潰。'
                    : '提醒：目前日夜照護分佈符合正常生理節律，建議長輩夜間繼續保持安穩睡眠環境。'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 照護與給藥事件時間線 */}
        {renderTimelineList(false)}
      </div>
    );
  };

  // 儲存生理數據
  const handleAddVitals = (e) => {
    e.preventDefault();
    const sbpVal = Number(systolic) || 120;
    const dbpVal = Number(diastolic) || 80;
    const mapVal = Number(meanArterialPressure) || Math.round(dbpVal + (sbpVal - dbpVal) / 3);
    const newLog = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      type: 'vitals',
      hr: heartRate,
      spo2: oxygen,
      rr: respRate,
      sbp: sbpVal,
      dbp: dbpVal,
      map: mapVal,
      notes: noteText.trim() || undefined
    };
    setLogs(prev => [newLog, ...prev]);
    setNoteText('');
    setShowVitalsModal(false);
    
    // 同步到雲端 Google Sheets
    uploadLogToCloud(newLog);
  };

  // 儲存尿量事件
  const handleAddUrine = (e) => {
    e.preventDefault();
    const newLog = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      type: 'event',
      eventType: 'urine',
      volumeCc: Number(urineVolume) || 200,
      color: urineColor,
      notes: noteText.trim() || undefined
    };
    setLogs(prev => [newLog, ...prev]);
    setNoteText('');
    setShowUrineModal(false);
    
    // 同步到雲端 Google Sheets
    uploadLogToCloud(newLog);
  };

  // 儲存給藥處置
  const handleAddMed = (name) => {
    const finalMedName = name === 'custom' ? customMed : name;
    if (!finalMedName) return;

    const newLog = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      type: 'event',
      eventType: 'medication',
      medicationName: finalMedName,
      notes: noteText.trim() || undefined
    };
    setLogs(prev => [newLog, ...prev]);
    setNoteText('');
    setCustomMed('');
    setShowMedModal(false);
    
    // 同步到雲端 Google Sheets
    uploadLogToCloud(newLog);
  };

  // 儲存照護需求事件
  const handleAddCareRequest = (text, category = 'other') => {
    if (!text || !text.trim()) return;
    const newLog = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      type: 'event',
      eventType: 'care_request',
      requestCategory: category,
      requestText: text.trim(),
      notes: noteText.trim() || undefined
    };
    setLogs(prev => [newLog, ...prev]);
    setNoteText('');
    setCareRequestText('');
    setShowCareRequestModal(false);
    
    // 同步到雲端 Google Sheets
    uploadLogToCloud(newLog);
  };

  // 取得最新睡眠狀態
  const currentSleepStatus = useMemo(() => {
    const latestSleep = logs.find(l => l.type === 'event' && l.eventType === 'care_request' && l.requestCategory === 'sleep');
    return latestSleep ? latestSleep.sleepStatus : 'awake';
  }, [logs]);

  // 切換睡眠狀態
  const handleToggleSleepStatus = () => {
    const nextStatus = currentSleepStatus === 'asleep' ? 'awake' : 'asleep';
    
    // 計算前一次狀態持續時間
    let noteText = nextStatus === 'asleep' ? '睡著' : '醒來';
    const latestSleepLog = logs.find(l => l.type === 'event' && l.eventType === 'care_request' && l.requestCategory === 'sleep');
    if (latestSleepLog) {
      const lastTime = new Date(latestSleepLog.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - lastTime.getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const durationStr = hrs > 0 ? `${hrs} 小時 ${mins} 分` : `${mins} 分`;
      
      if (nextStatus === 'awake') {
        noteText = `睡著持續：${durationStr}`;
      } else {
        noteText = `清醒持續：${durationStr}`;
      }
    }

    const newLog = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      type: 'event',
      eventType: 'care_request',
      requestCategory: 'sleep',
      requestText: nextStatus === 'asleep' ? '睡著' : '醒來',
      sleepStatus: nextStatus,
      notes: noteText
    };
    setLogs(prev => [newLog, ...prev]);
    uploadLogToCloud(newLog);
  };

  const deleteLog = (id) => {
    if (window.confirm('確定要刪除此筆交班紀錄嗎？')) {
      // 將刪除的 ID 存入 localStorage，防止雲端同步時復活
      try {
        const existing = JSON.parse(localStorage.getItem('careflow_deleted_ids') || '[]');
        if (!existing.includes(id.toString())) {
          existing.push(id.toString());
          localStorage.setItem('careflow_deleted_ids', JSON.stringify(existing));
        }
      } catch (error) {
        console.error('Failed to update deleted IDs:', error);
      }
      setLogs(prev => prev.filter(l => l.id !== id));
      deleteLogFromCloud(id);
    }
  };

  // 雲端同步輔支函數 (新增資料)
  const uploadLogToCloud = async (newLog) => {
    const url = gasUrl;
    if (!url) return;
    
    const fields = { ...newLog };
    delete fields.id;
    delete fields.timestamp;
    delete fields.type;
    
    const encryptedData = encrypt(JSON.stringify(fields), password);
    
    setSyncStatus('syncing');
    try {
      await postToGas(url, {
        action: 'appendLog',
        log: {
          id: newLog.id,
          timestamp: newLog.timestamp,
          type: newLog.type,
          data: encryptedData
        }
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to upload log to cloud:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // 雲端同步輔助函數 (刪除資料)
  const deleteLogFromCloud = async (id) => {
    const url = gasUrl;
    if (!url) return;
    
    setSyncStatus('syncing');
    try {
      await postToGas(url, {
        action: 'deleteLog',
        id: id
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to delete log from cloud:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // 產生中文醫護交班報告
  const generateHandoverMarkdown = useCallback(() => {
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - reportDuration * 60 * 60 * 1000);
    
    // 篩選指定時間區間內的紀錄
    const windowLogs = logs.filter(l => new Date(l.timestamp) >= thresholdTime);
    
    // 依時間排序（舊到新），以完整呈現臨床病程進展
    const chronoLogs = [...windowLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (chronoLogs.length === 0) return `過去 ${reportDuration} 小時內無任何受測者紀錄。`;

    const vitalsLogs = chronoLogs.filter(l => l.type === 'vitals');
    
    // 取得最新生理數據
    const current = vitalsLogs[vitalsLogs.length - 1];
    const bpStr = current ? `${current.sbp}/${current.dbp}` : '暫無';
    const hrStr = current ? `${current.hr} bpm` : '暫無';
    const spo2Str = current ? `${current.spo2}%` : '暫無';
    const rrStr = current ? `${current.rr} rpm` : '暫無';
    const mapStr = current ? `${current.map} mmHg` : '暫無';

    // 格式化時間線臨床事件與警報
    const timeline = chronoLogs.map(l => {
      const timeStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      if (l.type === 'vitals') {
        let alerts = [];
        if (l.rr > 24) alerts.push(`呼吸急促 RR:${l.rr}`);
        if (l.hr > 100) alerts.push(`心搏過速 HR:${l.hr}`);
        if (l.spo2 < 95) alerts.push(`低血氧 SpO2:${l.spo2}%`);
        
        return alerts.length > 0 
          ? `[${timeStr}] ⚠️ 警報: ${alerts.join(', ')} (血壓: ${l.sbp}/${l.dbp})${l.notes ? ` - "${l.notes}"` : ''}`
          : null;
      } else if (l.type === 'event') {
        if (l.eventType === 'urine') {
          const colorName = l.color === 'bright_red' ? '肉眼血尿 (鮮紅)' : l.color === 'tea' ? '深茶色' : '清澈/淡黃';
          return `[${timeStr}] 💧 尿量記錄: ${l.volumeCc}cc, 顏色: ${colorName}${l.notes ? ` - "${l.notes}"` : ''}`;
        } else if (l.eventType === 'medication') {
          return `[${timeStr}] 💊 給藥處置: ${l.medicationName}${l.notes ? ` - "${l.notes}"` : ''}`;
        } else if (l.eventType === 'care_request') {
          return `[${timeStr}] 🤲 照護需求: ${l.requestText}${l.notes ? ` - "${l.notes}"` : ''}`;
        }
      }
      return null;
    }).filter(Boolean);

    // 統計照護需求
    const careRequests = chronoLogs.filter(l => l.eventType === 'care_request');
    
    // 按類別統計
    const categoryLabels = { nutrition: '飲食', position: '姿勢', environment: '環境', daily_care: '日常照護', other: '其他' };
    const categoryCounts = {};
    careRequests.forEach(l => {
      const cat = categoryLabels[l.requestCategory] || '其他';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const dateStr = now.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
    let report = `🏥 照護交班報告 (${dateStr} - ${reportDuration}小時內):\n\n`;
    report += `📈 最新生理 telemetry 指標:\n`;
    report += `- 心率 (HR): ${hrStr}\n- 血氧 (SpO2): ${spo2Str}\n- 呼吸 (RR): ${rrStr}\n- 血壓 (BP): ${bpStr} (平均壓 MAP: ${mapStr})\n\n`;
    
    // 尿量排泄統計
    const urineLogs = chronoLogs.filter(l => l.eventType === 'urine');
    if (urineLogs.length > 0) {
      const totalUrine = urineLogs.reduce((sum, l) => sum + (Number(l.volumeCc) || 0), 0);
      const avgUrinePerHour = (totalUrine / reportDuration).toFixed(1);
      
      report += `💧 尿量排泄統計 (${reportDuration}小時內):\n`;
      report += `- 總排尿量: ${totalUrine} cc (共 ${urineLogs.length} 次)\n`;
      report += `- 平均每小時排尿量: ${avgUrinePerHour} cc/hr\n`;
      
      const colorCounts = {};
      urineLogs.forEach(l => {
        const cText = l.color === 'bright_red' ? '鮮紅肉眼血尿' : l.color === 'tea' ? '深茶色' : '清澈淡黃';
        colorCounts[cText] = (colorCounts[cText] || 0) + 1;
      });
      const colorStr = Object.entries(colorCounts).map(([k, v]) => `${k} ${v}次`).join('、');
      report += `- 尿色性狀分佈: ${colorStr}\n\n`;
    }

    // 照護需求統計段落
    if (careRequests.length > 0) {
      report += `🤲 照護需求統計 (共 ${careRequests.length} 次):\n`;
      const catStr = Object.entries(categoryCounts).map(([k, v]) => `${k} ${v} 次`).join('、');
      report += `- 類別分佈: ${catStr}\n\n`;
    }

    report += `⏱️ 臨床事件與用藥時間線:\n`;
    if (timeline.length > 0) {
      report += timeline.map(line => `• ${line}`).join('\n');
    } else {
      report += `• 此區間內無特殊警報或分泌物事件。`;
    }
    
    return report;
  }, [logs, reportDuration]);

  const handoverReport = useMemo(() => generateHandoverMarkdown(), [generateHandoverMarkdown]);

  const handleCopyReport = () => {
    const text = handoverReport;
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('複製失敗: ', err);
        alert('請手動複製報告：\n\n' + text);
      });
  };

  if (isLocked) {
    const hasVerify = !!localStorage.getItem('careflow_verify');
    return (
      <PinScreen
        isSetup={!hasVerify}
        onUnlock={(pin, isNewSetup) => {
          if (isNewSetup) {
            // 1. 儲存驗證標記
            const token = encrypt('careflow_auth_ok', pin);
            localStorage.setItem('careflow_verify', token);
            localStorage.removeItem('careflow_no_pin'); // 移除無密碼標記

            // 2. 加密儲存目前的資料 (如果是明文則加密，如果為空則初始化)
            let currentLogs = INITIAL_LOGS;
            let currentPatient = {
              name: '受測者 S-001',
              age: '74',
              gender: '男',
              diagnosis: '轉移性攝護腺癌'
            };

            const rawLogs = localStorage.getItem('careflow_logs');
            const rawPatient = localStorage.getItem('careflow_patient');
            if (rawLogs && rawLogs.startsWith('[')) {
              try { currentLogs = JSON.parse(rawLogs); } catch { /* ignore parse error */ }
            }
            if (rawPatient && rawPatient.startsWith('{')) {
              try { currentPatient = JSON.parse(rawPatient); } catch { /* ignore parse error */ }
            }

            const encryptedLogs = encrypt(JSON.stringify(currentLogs), pin);
            const encryptedPatient = encrypt(JSON.stringify(currentPatient), pin);
            localStorage.setItem('careflow_logs', encryptedLogs);
            localStorage.setItem('careflow_patient', encryptedPatient);
            localStorage.setItem('careflow_initialized', 'true');

            // 3. 設定狀態並解鎖
            localStorage.setItem('careflow_session_pin', obfuscatePin(pin));
            setLogs(currentLogs);
            setPatient(currentPatient);
            setPassword(pin);
            setIsLocked(false);
            setIsDemo(false);
            return true;
          } else {
            // 解鎖模式
            const verifyToken = localStorage.getItem('careflow_verify');
            const decrypted = decrypt(verifyToken, pin);
            if (decrypted === 'careflow_auth_ok') {
              const savedLogs = localStorage.getItem('careflow_logs');
              let decryptedLogs = INITIAL_LOGS;
              if (savedLogs) {
                const dec = decrypt(savedLogs, pin);
                if (dec) {
                  try { decryptedLogs = JSON.parse(dec); } catch { /* ignore parse error */ }
                }
              }

              const savedPatient = localStorage.getItem('careflow_patient');
              let decryptedPatient = {
                name: '受測者 S-001',
                age: '74',
                gender: '男',
                diagnosis: '轉移性攝護腺癌'
              };
              if (savedPatient) {
                const dec = decrypt(savedPatient, pin);
                if (dec) {
                  try { decryptedPatient = JSON.parse(dec); } catch { /* ignore parse error */ }
                }
              }

              localStorage.setItem('careflow_session_pin', obfuscatePin(pin));
              setLogs(decryptedLogs);
              setPatient(decryptedPatient);
              setPassword(pin);
              setIsLocked(false);
              const hasInitialized = localStorage.getItem('careflow_initialized');
              setIsDemo(!hasInitialized);
              return true;
            } else {
              return false;
            }
          }
        }}
      />
    );
  }

  return (
    <div className="h-[100dvh] bg-monitor-bg flex flex-col font-sans max-w-md mx-auto relative border-x border-monitor-border overflow-hidden">
      
      {/* 1. 清爽型床邊數據標題欄 */}
      <header 
        onClick={(e) => {
          if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
          if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        className="bg-monitor-card border-b border-monitor-border px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-sm cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2.5">
          {/* LOGO 圖示放在最左上角 */}
          <img src="/logo.png" alt="CareFlow Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-200" />
          <div className="flex flex-col justify-center space-y-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h1 className="text-xs font-extrabold tracking-wide text-monitor-text uppercase leading-tight whitespace-nowrap" id="app-title">
                CareFlow
              </h1>
              <span className="text-[9px] text-monitor-dim font-bold whitespace-nowrap leading-tight">
                照護助理
              </span>
            </div>
            <div className="flex items-center gap-1">
              {gasUrl ? (() => {
                if (syncStatus === 'idle') {
                  return (
                    <span 
                      key="badge-idle"
                      className="inline-flex items-center gap-0.5 text-slate-400 text-[8px] font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-tight whitespace-nowrap"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse mr-0.5" />
                      <span>雲端連線</span>
                    </span>
                  );
                } else if (syncStatus === 'syncing') {
                  return (
                    <span 
                      key="badge-syncing"
                      className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded leading-tight whitespace-nowrap bg-amber-100 text-amber-700"
                    >
                      <span>同步中</span>
                    </span>
                  );
                } else if (syncStatus === 'success') {
                  return (
                    <span 
                      key="badge-success"
                      className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded leading-tight whitespace-nowrap bg-emerald-100 text-emerald-700"
                    >
                      <span>同步成功</span>
                    </span>
                  );
                } else {
                  return (
                    <span 
                      key="badge-error"
                      className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded leading-tight whitespace-nowrap bg-rose-100 text-rose-700"
                    >
                      <span>連線失敗</span>
                    </span>
                  );
                }
              })() : (
                <span key="local-badge" className="text-slate-400 text-[8px] font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-tight whitespace-nowrap">本地儲存</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* 重新整理按鈕 */}
          <button
            type="button"
            onClick={() => {
              if (syncStatus === 'syncing') return;
              if (gasUrl) {
                triggerSync(password);
              } else {
                window.location.reload();
              }
            }}
            className={`p-1.5 rounded-lg border transition active:scale-95 ${
              syncStatus === 'syncing' 
                ? 'bg-amber-100 border-amber-200 text-amber-700 cursor-not-allowed' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
            title="重新整理數據"
          >
            <RefreshCw size={15} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
          </button>

          {/* 密碼鎖定按鈕 */}
          <button
            type="button"
            onClick={() => {
              setIsLocked(true);
              setPassword('');
              localStorage.removeItem('careflow_session_pin');
            }}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition"
            title="鎖定畫面"
          >
            <Lock size={15} />
          </button>

          {/* 顯示設定按鈕 */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition"
            title="顯示與介面設定"
          >
            <Settings size={15} />
          </button>
          
          <HeaderClock />
        </div>
      </header>

      {/* 示範資料模式提示橫幅 */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-amber-800 flex-shrink-0">
          <span className="flex items-center gap-1.5 font-medium min-w-0">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
            <span className="truncate">目前正處於「示範資料模式」。</span>
          </span>
          <button
            onClick={handleStartFresh}
            className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded font-bold transition shadow-sm flex-shrink-0 text-[10px]"
          >
            清除示範，新建受測者
          </button>
        </div>
      )}

      {/* 主要操作區域 */}
      <main 
        ref={mainRef} 
        onClick={() => setActiveTooltip(null)} 
        className="flex-1 p-4 space-y-4 pb-28 overflow-y-auto no-scrollbar"
      >
        

        {/* 頁籤導覽按鈕 */}
        <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'vitals' 
                ? 'bg-white text-monitor-text shadow-sm border border-slate-200/40' 
                : 'text-monitor-dim hover:text-monitor-text'
            }`}
          >
            即時監控
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'trends' 
                ? 'bg-white text-monitor-text shadow-sm border border-slate-200/40' 
                : 'text-monitor-dim hover:text-monitor-text'
            }`}
          >
            歷史趨勢
          </button>
        </div>

        {/* 2. 生理數據區塊 (即時監控頁籤：即時數據網格) */}
        {activeTab === 'vitals' && (
          <div className="space-y-3 transition-opacity duration-300 animate-fade-in">
            {/* 睡眠狀態快捷切換卡片 */}
            <div className="bg-monitor-card border border-monitor-border rounded-xl p-3 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${currentSleepStatus === 'asleep' ? 'bg-monitor-indigo animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  目前狀態：{currentSleepStatus === 'asleep' ? '🛌 睡著中' : '☀️ 清醒中'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSleepStatus}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 ${
                  currentSleepStatus === 'asleep'
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200'
                    : 'bg-monitor-indigo/20 hover:bg-monitor-indigo/30 text-monitor-indigo border border-monitor-indigo/30'
                }`}
              >
                {currentSleepStatus === 'asleep' ? '切換為：醒來' : '切換為：睡著'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
            {/* 心率卡片 */}
            <button 
              id="hr-card"
              onClick={openVitalsModalWithLatest}
              className={`text-left focus:outline-none border transition-all rounded-xl p-4 hover:scale-[1.01] ${
                isHrAlert(latest.hr)
                  ? 'bg-rose-50/75 border-rose-200 hover:border-rose-300 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-slate-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex justify-between items-center text-monitor-dim">
                <span className="text-xs font-bold uppercase flex items-center gap-1">
                  <Heart size={13} className="text-monitor-green fill-monitor-green/10" /> 心率 (HR)
                </span>
                <span className="text-[9px] font-mono">bpm</span>
              </div>
              <div className={`text-4xl font-telemetry font-bold leading-none mt-2 ${
                isHrAlert(latest.hr) ? 'text-monitor-red' : 'text-monitor-green'
              }`}>
                {latest.hr}
              </div>
              <div className="mt-2 text-[9px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1 flex-wrap gap-1">
                <span className="whitespace-nowrap">警報: &gt;100</span>
                {isHrAlert(latest.hr) && latest.hr !== '--' && <span className="text-monitor-red font-bold animate-pulse whitespace-nowrap">心速快</span>}
              </div>
            </button>

            {/* 血氧卡片 */}
            <button 
              id="spo2-card"
              onClick={openVitalsModalWithLatest}
              className={`text-left focus:outline-none border transition-all rounded-xl p-4 hover:scale-[1.01] ${
                isSpo2Alert(latest.spo2)
                  ? 'bg-rose-50/75 border-rose-200 hover:border-rose-300 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-slate-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex justify-between items-center text-monitor-dim">
                <span className="text-xs font-bold uppercase flex items-center gap-1">
                  <Activity size={13} className="text-monitor-cyan" /> 血氧 (SpO₂)
                </span>
                <span className="text-[9px] font-mono">%</span>
              </div>
              <div className={`text-4xl font-telemetry font-bold leading-none mt-2 ${
                isSpo2Alert(latest.spo2) ? 'text-monitor-red' : 'text-monitor-cyan'
              }`}>
                {latest.spo2}
              </div>
              <div className="mt-2 text-[9px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1 flex-wrap gap-1">
                <span className="whitespace-nowrap">警報: &lt;95%</span>
                {isSpo2Alert(latest.spo2) && latest.spo2 !== '--' && <span className="text-monitor-red font-bold animate-pulse whitespace-nowrap">血氧低</span>}
              </div>
            </button>

            {/* 呼吸卡片 */}
            <button 
              id="rr-card"
              onClick={openVitalsModalWithLatest}
              className={`text-left focus:outline-none border transition-all rounded-xl p-4 hover:scale-[1.01] ${
                isRrAlert(latest.rr)
                  ? 'bg-rose-50/75 border-rose-200 hover:border-rose-300 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-slate-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex justify-between items-center text-monitor-dim">
                <span className="text-xs font-bold uppercase flex items-center gap-1">
                  <Wind size={13} className="text-monitor-yellow" /> 呼吸 (RR)
                </span>
                <span className="text-[9px] font-mono">rpm</span>
              </div>
              <div className={`text-4xl font-telemetry font-bold leading-none mt-2 ${
                isRrAlert(latest.rr) ? 'text-monitor-red' : 'text-monitor-yellow'
              }`}>
                {latest.rr}
              </div>
              <div className="mt-2 text-[9px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1 flex-wrap gap-1">
                <span className="whitespace-nowrap">警報: &gt;24</span>
                {isRrAlert(latest.rr) && latest.rr !== '--' && <span className="text-monitor-red font-bold animate-pulse whitespace-nowrap">急促</span>}
              </div>
            </button>

            {/* 血壓卡片 */}
            <button 
              id="bp-card"
              onClick={openVitalsModalWithLatest}
              className={`text-left focus:outline-none border transition-all rounded-xl p-4 hover:scale-[1.01] ${
                isBpAlert(latest.sbp, latest.dbp)
                  ? 'bg-rose-50/75 border-rose-200 hover:border-rose-300 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-slate-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex justify-between items-center text-monitor-dim">
                <span className="text-xs font-bold uppercase flex items-center gap-1">
                  <Activity size={13} className="text-monitor-red" /> 血壓 (BP)
                </span>
                <span className="text-[9px] font-mono">mmHg</span>
              </div>
              <div className={`text-3xl font-telemetry font-bold leading-none mt-2.5 ${
                isBpAlert(latest.sbp, latest.dbp) ? 'text-monitor-red' : 'text-monitor-text'
              }`}>
                {latest.bp}
              </div>
              <div className="mt-2 text-[9px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1 flex-wrap gap-1">
                <span className="whitespace-nowrap">平均 MAP: <strong className="text-monitor-text font-mono">{latest.map}</strong></span>
                {isBpAlert(latest.sbp, latest.dbp) && latest.sbp !== '--' && <span className="text-monitor-red font-bold animate-pulse whitespace-nowrap">異常</span>}
              </div>
            </button>
          </div>
          </div>
        )}

        {/* 3. 歷史趨勢圖表頁籤 */}
        {activeTab === 'trends' && (
          <div className="space-y-3 transition-opacity duration-300 animate-fade-in">
            {renderSparkline('hr', '#10b981', '心率趨勢 (Heart Rate)', 'bpm')}
            {renderSparkline('spo2', '#06b6d4', '血氧趨勢 (SpO₂)', '%')}
            {renderSparkline('rr', '#f59e0b', '呼吸趨勢 (Respiratory Rate)', 'rpm')}
            {renderBpSparkline()}
            {renderUrineChart()}
            {renderSleepTimeline()}
            {renderEventStatistics()}
          </div>
        )}


        {/* 4. 照護數據總結 (交班報告) */}
        <section className="bg-monitor-card border border-monitor-border rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-monitor-dim flex items-center gap-1.5">
              <Clipboard size={13} className="text-monitor-cyan" /> 照護數據總結 (交班報告)
            </h2>


            <div className="flex bg-monitor-bg border border-monitor-border rounded-md overflow-hidden p-0.5">
              <button
                type="button"
                onClick={() => setReportDuration(12)}
                className={`text-[9px] uppercase font-bold px-2 py-1 rounded ${reportDuration === 12 ? 'bg-monitor-cyan text-white' : 'text-monitor-dim'}`}
              >
                12小時
              </button>
              <button
                type="button"
                onClick={() => setReportDuration(24)}
                className={`text-[9px] uppercase font-bold px-2 py-1 rounded ${reportDuration === 24 ? 'bg-monitor-cyan text-white' : 'text-monitor-dim'}`}
              >
                24小時
              </button>
            </div>
          </div>

          {/* 報告內容框 */}
          <div className="relative">
            <pre 
              id="handover-raw"
              className="w-full text-[11px] font-mono text-monitor-text bg-monitor-bg border border-monitor-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto no-scrollbar"
            >
              {handoverReport}
            </pre>
            
            {/* 複製按鈕 */}
            <button
              id="copy-handover-btn"
              onClick={handleCopyReport}
              className={`absolute top-2 right-2 p-2 rounded-lg border transition shadow-sm ${
                copySuccess 
                  ? 'bg-monitor-green border-monitor-green text-white' 
                  : 'bg-white border-monitor-border hover:border-monitor-cyan text-monitor-cyan'
              }`}
              aria-label="複製報告"
            >
              {copySuccess ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-monitor-dim bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <AlertCircle size={14} className="text-monitor-cyan flex-shrink-0" />
            <p>報告可一鍵複製，以便透過 LINE/簡訊傳送給家人或在醫師巡房、換班時立即出示呈現。</p>
          </div>
        </section>

        {/* 5. telemetry 記錄串流歷史 */}
        {(() => {
          const filtered = logs.filter(log => {
            if (logFilter === 'all') return true;
            if (logFilter === 'vitals') return log.type === 'vitals';
            if (logFilter === 'urine') return log.type === 'event' && log.eventType === 'urine';
            if (logFilter === 'medication') return log.type === 'event' && log.eventType === 'medication';
            if (logFilter === 'care_request') return log.type === 'event' && log.eventType === 'care_request';
            return true;
          });

          return (
            <section className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-monitor-dim">
                  臨床監控歷史紀錄流
                </h2>
                {/* 全部展開 / 全部收合按鈕 */}
                {filtered.length > 0 && (
                  <div className="flex gap-2 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={handleExpandAllHours}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded transition active:scale-95 shadow-sm"
                    >
                      全部展開
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = [];
                        filtered.forEach(log => {
                          const date = new Date(log.timestamp);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hour = String(date.getHours()).padStart(2, '0');
                          allKeys.push(`${year}-${month}-${day} ${hour}:00`);
                        });
                        handleCollapseAllHours(allKeys);
                      }}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded transition active:scale-95 shadow-sm"
                    >
                      全部收合
                    </button>
                  </div>
                )}
              </div>

              {/* 分類篩選按鈕列 */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 px-1">
                {[
                  { label: '全部', value: 'all', count: logs.length },
                  { label: '生理數據', value: 'vitals', count: logs.filter(l => l.type === 'vitals').length },
                  { label: '排泄記錄', value: 'urine', count: logs.filter(l => l.type === 'event' && l.eventType === 'urine').length },
                  { label: '給藥處置', value: 'medication', count: logs.filter(l => l.type === 'event' && l.eventType === 'medication').length },
                  { label: '照護需求', value: 'care_request', count: logs.filter(l => l.type === 'event' && l.eventType === 'care_request').length }
                ].map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setLogFilter(tab.value)}
                    className={`py-1 px-2.5 rounded-full border text-[9px] font-bold transition flex items-center gap-1 flex-shrink-0 ${
                      logFilter === tab.value
                        ? 'bg-slate-700 border-slate-700 text-white shadow-sm font-bold'
                        : 'bg-white border-monitor-border text-monitor-dim hover:text-monitor-text hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[8px] px-1 rounded-full ${
                      logFilter === tab.value ? 'bg-slate-600 text-white font-normal' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {(() => {
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 bg-monitor-card border border-monitor-border rounded-lg text-xs text-monitor-dim">
                        目前無此分類的紀錄
                      </div>
                    );
                  }

                  // 按小時分群
                  const groupedByHour = {};
                  filtered.forEach(log => {
                    const date = new Date(log.timestamp);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hour = String(date.getHours()).padStart(2, '0');
                    const hourKey = `${year}-${month}-${day} ${hour}:00`;
                    
                    if (!groupedByHour[hourKey]) {
                      groupedByHour[hourKey] = [];
                    }
                    groupedByHour[hourKey].push(log);
                  });
                  
                  const hourKeys = Object.keys(groupedByHour).sort((a, b) => b.localeCompare(a));

                  return (
                    <div className="space-y-2.5">
                      {hourKeys.map(key => {
                        const logsInHour = groupedByHour[key];
                        const isCollapsed = !!collapsedHours[key];
                        const dateObj = new Date(logsInHour[0].timestamp);
                        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const dd = String(dateObj.getDate()).padStart(2, '0');
                        const hh = String(dateObj.getHours()).padStart(2, '0');
                        const displayLabel = `${mm}/${dd} ${hh}:00`;
                        
                        return (
                          <div key={key} className="space-y-1.5">
                            {/* 小時收合標頭 */}
                            <div 
                              onClick={() => {
                                setCollapsedHours(prev => ({
                                  ...prev,
                                  [key]: !prev[key]
                                }));
                              }}
                              className="flex items-center justify-between bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 rounded-lg px-3 py-1.5 cursor-pointer select-none transition"
                            >
                              <div className="flex items-center gap-2">
                                <Clock size={11} className="text-monitor-dim" />
                                <span className="font-bold text-slate-700 font-mono text-[10px]">{displayLabel}</span>
                                <span className="text-[9px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded-full font-bold">
                                  {logsInHour.length} 筆紀錄
                                </span>
                              </div>
                              <span className="text-[9px] text-monitor-cyan font-bold flex items-center gap-0.5">
                                {isCollapsed ? '展開' : '收合'}
                                {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                              </span>
                            </div>

                            {/* 該小時內的紀錄清單 */}
                            {!isCollapsed && (
                              <div className="space-y-1.5 pl-1.5 border-l-2 border-slate-200/60 ml-2.5">
                                {logsInHour.map((log) => {
                                  const date = new Date(log.timestamp);
                                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                  
                                  return (
                                    <div 
                                      key={log.id} 
                                      className="bg-monitor-card border border-monitor-border rounded-lg px-3 py-2 flex items-start justify-between gap-3 text-xs shadow-sm"
                                    >
                                      <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono font-semibold text-monitor-dim">
                                            {timeStr}
                                          </span>
                                          {log.type === 'vitals' ? (
                                            <span className="bg-monitor-green/10 border border-monitor-green/20 text-monitor-green px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider">
                                              生理數據
                                            </span>
                                          ) : log.eventType === 'care_request' ? (
                                            <span className="bg-monitor-orange/10 border border-monitor-orange/20 text-monitor-orange px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider">
                                              照護需求
                                            </span>
                                          ) : log.eventType === 'urine' ? (
                                            <span className="bg-monitor-cyan/10 border border-monitor-cyan/20 text-monitor-cyan px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider">
                                              排泄記錄
                                            </span>
                                          ) : (
                                            <span className="bg-monitor-purple/10 border border-monitor-purple/20 text-monitor-purple px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider">
                                              給藥處置
                                            </span>
                                          )}
                                        </div>
                                        
                                        {log.type === 'vitals' ? (
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 font-mono text-[10px] text-monitor-text">
                                            <div className="whitespace-nowrap">
                                              <span className="text-monitor-dim">心率:</span>{' '}
                                              <strong className={isHrAlert(log.hr) ? 'text-monitor-red' : 'text-monitor-green'}>{log.hr}</strong>
                                              <span className="text-[8px] text-monitor-dim ml-0.5">bpm</span>
                                            </div>
                                            <div className="whitespace-nowrap">
                                              <span className="text-monitor-dim">血氧:</span>{' '}
                                              <strong className={isSpo2Alert(log.spo2) ? 'text-monitor-red' : 'text-monitor-cyan'}>{log.spo2}%</strong>
                                            </div>
                                            <div className="whitespace-nowrap">
                                              <span className="text-monitor-dim">呼吸:</span>{' '}
                                              <strong className={isRrAlert(log.rr) ? 'text-monitor-red' : 'text-monitor-yellow'}>{log.rr}</strong>
                                              <span className="text-[8px] text-monitor-dim ml-0.5">rpm</span>
                                            </div>
                                            <div className="whitespace-nowrap">
                                              <span className="text-monitor-dim">血壓:</span>{' '}
                                              <strong className={isBpAlert(log.sbp, log.dbp) ? 'text-monitor-red' : 'text-monitor-text'}>{log.sbp}/{log.dbp}</strong>
                                              <span className="text-[8px] text-monitor-dim ml-0.5">mmHg</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-[10px] text-monitor-text pt-0.5">
                                            {log.eventType === 'urine' ? (
                                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="whitespace-nowrap">排出尿量: <strong className="text-monitor-cyan">{log.volumeCc} cc</strong></span>
                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                  <span>尿色:</span> 
                                                  <span className={`w-2 h-2 rounded-full border border-slate-300 inline-block ${
                                                    log.color === 'bright_red' ? 'bg-[#ef4444]' : log.color === 'tea' ? 'bg-[#8d6e63]' : 'bg-[#fef08a]'
                                                  }`} />
                                                  <strong className="text-monitor-text font-bold">
                                                    {log.color === 'bright_red' ? '鮮紅肉眼血尿' : log.color === 'tea' ? '深茶色' : '清澈淡黃'}
                                                  </strong>
                                                </span>
                                              </div>
                                            ) : log.eventType === 'care_request' ? (
                                              <div>
                                                照護需求: <strong className="text-monitor-orange">{log.requestText}</strong>
                                              </div>
                                            ) : (
                                              <div>
                                                給藥: <strong className="text-monitor-purple">{log.medicationName}</strong>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {log.notes && (
                                          <p className="text-[9px] text-monitor-dim italic border-l border-slate-200 pl-1.5 mt-0.5">
                                            「{log.notes}」
                                          </p>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => deleteLog(log.id)}
                                        className="text-monitor-dim hover:text-monitor-red p-1 rounded transition"
                                        title="刪除此筆紀錄"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </section>
          );
        })()}

      </main>

      {/* 底部固定操作欄 (Sticky Bottom Action Bar) */}
      <footer className="bg-white border-t border-monitor-border p-3 flex gap-2 z-30 flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={openVitalsModalWithLatest}
          className="flex-1 py-3 bg-monitor-green text-white font-extrabold rounded-xl hover:bg-monitor-green/90 active:scale-95 transition shadow-sm flex items-center justify-center gap-1 text-xs tracking-wider"
        >
          <Plus size={14} /> 生理數據
        </button>
        <button
          type="button"
          onClick={() => { setNoteText(''); setShowUrineModal(true); }}
          className="py-3 px-3 bg-monitor-cyan/10 border border-monitor-cyan/20 text-monitor-cyan font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 text-xs"
        >
          <Droplet size={13} className="fill-monitor-cyan/10" /> 尿量
        </button>

        <button
          type="button"
          onClick={() => { setNoteText(''); setShowMedModal(true); }}
          className="py-3 px-3 bg-monitor-purple/10 border border-monitor-purple/20 text-monitor-purple font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 text-xs"
        >
          <Pill size={13} /> 用藥
        </button>
        <button
          type="button"
          onClick={() => { setNoteText(''); setShowCareRequestModal(true); }}
          className="py-3 px-3 bg-monitor-orange/10 border border-monitor-orange/20 text-monitor-orange font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 text-xs"
        >
          <HandHeart size={13} /> 需求
        </button>
      </footer>

      {/* ================= 彈出式對話視窗 / 抽屜 ================= */}

      {/* 生理數據錄入對話框 */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 animate-fade-in" onClick={() => setShowVitalsModal(false)}>
          <div className="bg-monitor-card border-t-4 border-monitor-green rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
              <h3 className="text-sm font-bold text-monitor-green uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={16} /> 登錄生理 Telemetry 數據
              </h3>
              <button 
                onClick={() => setShowVitalsModal(false)}
                className="text-monitor-dim hover:text-monitor-text"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddVitals} className="space-y-4 text-xs">
              
              {/* 心率輸入 (大字大按鈕，便於單手操作) */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-monitor-green">心率 (Heart Rate)</span>
                  <span className="text-monitor-dim">{heartRate} bpm</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setHeartRate(Math.max(30, heartRate - 5))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -5
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setHeartRate(Math.max(30, heartRate - 1))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -1
                  </button>
                  <div className="w-16 text-center text-xl font-telemetry font-bold text-monitor-green py-1.5 bg-monitor-bg border border-monitor-border rounded-lg">
                    {heartRate}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setHeartRate(Math.min(220, heartRate + 1))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +1
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setHeartRate(Math.min(220, heartRate + 5))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* 血氧輸入 */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-monitor-cyan">血氧濃度 (SpO₂)</span>
                  <span className="text-monitor-dim">{oxygen}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setOxygen(Math.max(70, oxygen - 2))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -2
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setOxygen(Math.max(70, oxygen - 1))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -1
                  </button>
                  <div className="w-16 text-center text-xl font-telemetry font-bold text-monitor-cyan py-1.5 bg-monitor-bg border border-monitor-border rounded-lg">
                    {oxygen}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setOxygen(Math.min(100, oxygen + 1))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +1
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setOxygen(Math.min(100, oxygen + 2))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +2
                  </button>
                </div>
              </div>

              {/* 呼吸頻率輸入 */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-monitor-yellow">呼吸頻率 (Respiratory Rate)</span>
                  <span className="text-monitor-dim">{respRate} rpm</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setRespRate(Math.max(6, respRate - 2))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -2
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRespRate(Math.max(6, respRate - 1))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -1
                  </button>
                  <div className="w-16 text-center text-xl font-telemetry font-bold text-monitor-yellow py-1.5 bg-monitor-bg border border-monitor-border rounded-lg">
                    {respRate}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setRespRate(Math.min(60, respRate + 1))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +1
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRespRate(Math.min(60, respRate + 2))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +2
                  </button>
                </div>
              </div>

              {/* 血壓輸入 */}
              <div className="space-y-2">
                <div className="font-semibold text-monitor-red">無創血壓記錄 (NBP)</div>
                <div className="grid grid-cols-3 gap-2">
                  {/* 收縮壓 */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-monitor-dim block truncate" title="收縮壓 Systolic">收縮壓 SBP (mmHg)</label>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={() => setSystolic(Math.max(60, (Number(systolic) || 120) - 1))}
                        className="p-1 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100 text-xs w-7 h-8 flex items-center justify-center flex-shrink-0"
                        title="-1 mmHg"
                      >
                        -1
                      </button>
                      <input 
                        type="number" 
                        value={systolic} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setSystolic(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        onBlur={() => {
                          if (!systolic || systolic < 1) setSystolic(120);
                        }}
                        className="w-full text-center py-1.5 bg-monitor-bg border border-monitor-border rounded-md font-telemetry font-bold text-monitor-text focus:outline-none focus:border-monitor-red min-w-0 text-xs"
                      />
                      <button 
                        type="button" 
                        onClick={() => setSystolic(Math.min(260, (Number(systolic) || 120) + 1))}
                        className="p-1 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100 text-xs w-7 h-8 flex items-center justify-center flex-shrink-0"
                        title="+1 mmHg"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                  {/* 舒張壓 */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-monitor-dim block truncate" title="舒張壓 Diastolic">舒張壓 DBP (mmHg)</label>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={() => setDiastolic(Math.max(40, (Number(diastolic) || 80) - 1))}
                        className="p-1 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100 text-xs w-7 h-8 flex items-center justify-center flex-shrink-0"
                        title="-1 mmHg"
                      >
                        -1
                      </button>
                      <input 
                        type="number" 
                        value={diastolic} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setDiastolic(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        onBlur={() => {
                          if (!diastolic || diastolic < 1) setDiastolic(80);
                        }}
                        className="w-full text-center py-1.5 bg-monitor-bg border border-monitor-border rounded-md font-telemetry font-bold text-monitor-text focus:outline-none focus:border-monitor-red min-w-0 text-xs"
                      />
                      <button 
                        type="button" 
                        onClick={() => setDiastolic(Math.min(160, (Number(diastolic) || 80) + 1))}
                        className="p-1 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100 text-xs w-7 h-8 flex items-center justify-center flex-shrink-0"
                        title="+1 mmHg"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                  {/* 平均壓 */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-monitor-dim block truncate" title="平均動脈壓 Mean Arterial Pressure">平均壓 MAP (mmHg)</label>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={() => setCustomMap(Math.max(30, (Number(meanArterialPressure) || 93) - 1))}
                        className="p-1 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100 text-xs w-7 h-8 flex items-center justify-center flex-shrink-0"
                        title="-1 mmHg"
                      >
                        -1
                      </button>
                      <input 
                        type="number" 
                        value={meanArterialPressure} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomMap(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        onBlur={() => {
                          if (!meanArterialPressure || meanArterialPressure < 1) {
                            setCustomMap(null); // 重置為自動計算
                          }
                        }}
                        className="w-full text-center py-1.5 bg-monitor-bg border border-monitor-border rounded-md font-telemetry font-bold text-monitor-text focus:outline-none focus:border-monitor-red min-w-0 text-xs"
                      />
                      <button 
                        type="button" 
                        onClick={() => setCustomMap(Math.min(200, (Number(meanArterialPressure) || 93) + 1))}
                        className="p-1 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100 text-xs w-7 h-8 flex items-center justify-center flex-shrink-0"
                        title="+1 mmHg"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 備註欄 */}
              <div className="space-y-1">
                <label className="font-semibold text-monitor-dim block">臨床症狀觀察與備註 (選填)</label>
                <input 
                  type="text" 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="例如：主訴背痛、睡著休息中、心率稍快等..."
                  className="w-full py-2 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text focus:outline-none focus:border-monitor-cyan"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-monitor-green text-white font-extrabold uppercase rounded-lg hover:bg-emerald-600 transition text-xs tracking-wider"
              >
                確認儲存生理數據
              </button>

            </form>
          </div>
        </div>
      )}

      {/* 尿量記錄對話框 */}
      {showUrineModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 animate-fade-in" onClick={() => setShowUrineModal(false)}>
          <div className="bg-monitor-card border-t-4 border-monitor-cyan rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
              <h3 className="text-sm font-bold text-monitor-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Droplet size={16} /> 登錄排泄尿量與顏色
              </h3>
              <button 
                onClick={() => setShowUrineModal(false)}
                className="text-monitor-dim hover:text-monitor-text"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUrine} className="space-y-4 text-xs">
              
              {/* 尿量容量 (c.c. / mL) */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-monitor-cyan">尿液容量</span>
                  <span className="text-monitor-dim">{urineVolume || 0} cc</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setUrineVolume(Math.max(0, (Number(urineVolume) || 0) - 10))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -10
                  </button>
                  <div className="w-28 flex items-center bg-monitor-bg border border-monitor-border rounded-lg px-2">
                    <input 
                      type="number" 
                      value={urineVolume} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setUrineVolume(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                      }}
                      onBlur={() => {
                        if (!urineVolume || urineVolume < 0) setUrineVolume(200);
                      }}
                      className="w-full text-center text-xl font-telemetry font-bold text-monitor-cyan bg-transparent focus:outline-none min-w-0"
                    />
                    <span className="text-xs text-monitor-dim font-bold ml-1">ml</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setUrineVolume((Number(urineVolume) || 0) + 10)}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +10
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[100, 200, 300, 400].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setUrineVolume(v)}
                      className={`py-1.5 font-bold rounded bg-monitor-bg border transition-all ${urineVolume === v ? 'border-monitor-cyan text-monitor-cyan bg-cyan-50/50' : 'border-monitor-border text-monitor-dim'}`}
                    >
                      {v} cc
                    </button>
                  ))}
                </div>
              </div>

              {/* 尿色視覺選擇網格 */}
              <div className="space-y-2">
                <span className="font-semibold text-monitor-dim block uppercase">尿液顏色選擇</span>
                
                <div className="grid grid-cols-3 gap-2.5">
                  
                  {/* 清澈淡黃 */}
                  <button
                    type="button"
                    onClick={() => setUrineColor('clear_yellow')}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition text-center ${urineColor === 'clear_yellow' ? 'border-amber-400 bg-amber-50 text-amber-700 font-bold' : 'border-monitor-border bg-monitor-bg text-monitor-dim'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-[#fef08a] border border-slate-300" />
                    <span className="text-[10px]">清澈/淡黃</span>
                  </button>

                  {/* 深茶色 */}
                  <button
                    type="button"
                    onClick={() => setUrineColor('tea')}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition text-center ${urineColor === 'tea' ? 'border-[#8d6e63] bg-[#8d6e63]/15 text-[#8d6e63] font-bold' : 'border-monitor-border bg-monitor-bg text-monitor-dim'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-[#8d6e63] border border-slate-400" />
                    <span className="text-[10px]">深茶色</span>
                  </button>

                  {/* 鮮紅血尿 */}
                  <button
                    type="button"
                    onClick={() => setUrineColor('bright_red')}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition text-center ${urineColor === 'bright_red' ? 'border-monitor-red bg-rose-50 text-monitor-red font-bold' : 'border-monitor-border bg-monitor-bg text-monitor-dim'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-monitor-red border border-red-300 animate-pulse" />
                    <span className="text-[10px]">鮮紅肉眼血尿</span>
                  </button>

                </div>
              </div>

              {/* 備註欄 */}
              <div className="space-y-1">
                <label className="font-semibold text-monitor-dim block">觀察備註 (選填)</label>
                <input 
                  type="text" 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="例如：尿中有些許沉澱物、排尿伴隨痙攣等..."
                  className="w-full py-2 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text focus:outline-none focus:border-monitor-cyan"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-monitor-cyan text-white font-extrabold uppercase rounded-lg hover:bg-cyan-600 transition text-xs tracking-wider"
              >
                確認儲存尿量紀錄
              </button>

            </form>
          </div>
        </div>
      )}

      {/* 用藥/止痛處置記錄對話框 */}
      {showMedModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 animate-fade-in" onClick={() => setShowMedModal(false)}>
          <div className="bg-monitor-card border-t-4 border-monitor-purple rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
              <h3 className="text-sm font-bold text-monitor-purple uppercase tracking-wider flex items-center gap-1.5">
                <Pill size={16} /> 登錄疼痛處置與藥物記錄
              </h3>
              <button 
                onClick={() => setShowMedModal(false)}
                className="text-monitor-dim hover:text-monitor-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* 給藥快捷選項 */}
              <div className="space-y-2">
                <span className="font-semibold text-monitor-dim block uppercase">臨床常用突發痛/給藥處置</span>
                
                <div className="grid grid-cols-1 gap-2">
                  
                  {[
                    { name: '一般止痛藥 (如普拿疼)', type: '緩解輕度至中度疼痛/退燒' },
                    { name: '強效止痛藥 (嗎啡/貼片)', type: '緩解重度骨痛或突發劇痛' },
                    { name: '抗生素', type: '控制或預防感染' },
                    { name: '點滴/營養劑', type: '補充水分與電解質營養' },
                    { name: '胃腸/解痙/止吐藥', type: '緩解噁心嘔吐或腹部痙攣' },
                    { name: '鎮靜安眠藥', type: '協助入睡與安撫焦慮' }
                  ].map((med) => (
                    <button
                      key={med.name}
                      onClick={() => handleAddMed(med.name)}
                      className="flex justify-between items-center px-4 py-2.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-purple/40 text-left active:bg-slate-100 transition shadow-sm"
                    >
                      <div>
                        <span className="text-xs font-bold text-monitor-text block">{med.name}</span>
                        <span className="text-[9px] text-monitor-dim">{med.type}</span>
                      </div>
                      <Plus size={14} className="text-monitor-purple" />
                    </button>
                  ))}

                </div>
              </div>

              {/* 自訂輸入欄 */}
              <div className="border-t border-monitor-border/60 pt-3 space-y-2">
                <span className="font-semibold text-monitor-dim block uppercase">或輸入其他藥物與臨床處置</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="例如：普拿疼 1g 口服、生理食鹽水沖洗等..."
                    value={customMed}
                    onChange={(e) => setCustomMed(e.target.value)}
                    className="flex-1 py-2 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text focus:outline-none focus:border-monitor-purple"
                  />
                  <button
                    onClick={() => handleAddMed('custom')}
                    disabled={!customMed}
                    className="px-4 bg-monitor-purple text-white font-bold uppercase rounded-lg disabled:opacity-50"
                  >
                    儲存
                  </button>
                </div>
              </div>

              {/* 臨床症狀觀察 */}
              <div className="space-y-1">
                <label className="font-semibold text-monitor-dim block">用藥後觀察與備註 (選填)</label>
                <input 
                  type="text" 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="例如：用藥後痛評 4/10、已入睡、無明顯副作用..."
                  className="w-full py-2 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text focus:outline-none focus:border-monitor-purple"
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 照護需求快速記錄對話框 */}
      {showCareRequestModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 animate-fade-in" onClick={() => setShowCareRequestModal(false)}>
          <div className="bg-monitor-card border-t-4 border-monitor-orange rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
              <h3 className="text-sm font-bold text-monitor-orange uppercase tracking-wider flex items-center gap-1.5">
                <HandHeart size={16} /> 登錄照護需求
              </h3>
              <button 
                onClick={() => setShowCareRequestModal(false)}
                className="text-monitor-dim hover:text-monitor-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* 🥤 飲食需求 */}
              <div className="space-y-2">
                <span className="font-semibold text-monitor-orange block flex items-center gap-1.5">🥤 飲食需求</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { text: '想喝水', cat: 'nutrition' },
                    { text: '沾水潤唇', cat: 'nutrition' },
                    { text: '想喝果汁', cat: 'nutrition' },
                    { text: '想吃東西', cat: 'nutrition' }
                  ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => handleAddCareRequest(item.text, item.cat)}
                      className="flex items-center justify-between px-3 py-2.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-orange/40 text-left active:bg-monitor-orange/10 transition shadow-sm"
                    >
                      <span className="text-xs font-bold text-monitor-text">{item.text}</span>
                      <Plus size={12} className="text-monitor-orange/80" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 🛏️ 姿勢調整 */}
              <div className="space-y-2">
                <span className="font-semibold text-monitor-orange block flex items-center gap-1.5">🛏️ 姿勢調整</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { text: '翻身', cat: 'position' },
                    { text: '轉台', cat: 'position' },
                    { text: '調高床墊', cat: 'position' },
                    { text: '調低床墊', cat: 'position' },
                    { text: '抬高床頭', cat: 'position' },
                    { text: '放下床頭', cat: 'position' }
                  ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => handleAddCareRequest(item.text, item.cat)}
                      className="flex items-center justify-between px-3 py-2.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-orange/40 text-left active:bg-monitor-orange/10 transition shadow-sm"
                    >
                      <span className="text-xs font-bold text-monitor-text">{item.text}</span>
                      <Plus size={12} className="text-monitor-orange/80" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 🌡️ 環境舒適 */}
              <div className="space-y-2">
                <span className="font-semibold text-monitor-orange block flex items-center gap-1.5">🌡️ 環境舒適</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { text: '開燈', cat: 'environment' },
                    { text: '關燈', cat: 'environment' },
                    { text: '調高空調', cat: 'environment' },
                    { text: '調低空調', cat: 'environment' },
                    { text: '需要毛毯', cat: 'environment' },
                    { text: '拿走毛毯', cat: 'environment' }
                  ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => handleAddCareRequest(item.text, item.cat)}
                      className="flex items-center justify-between px-3 py-2.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-orange/40 text-left active:bg-monitor-orange/10 transition shadow-sm"
                    >
                      <span className="text-xs font-bold text-monitor-text">{item.text}</span>
                      <Plus size={12} className="text-monitor-orange/80" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 🧹 日常照護 */}
              <div className="space-y-2">
                <span className="font-semibold text-monitor-orange block flex items-center gap-1.5">🧹 日常照護</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { text: '擦澡', cat: 'daily_care' },
                    { text: '換尿布/看護墊', cat: 'daily_care' },
                    { text: '口腔清潔', cat: 'daily_care' },
                    { text: '更換衣物', cat: 'daily_care' }
                  ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => handleAddCareRequest(item.text, item.cat)}
                      className="flex items-center justify-between px-3 py-2.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-orange/40 text-left active:bg-monitor-orange/10 transition shadow-sm"
                    >
                      <span className="text-xs font-bold text-monitor-text">{item.text}</span>
                      <Plus size={12} className="text-monitor-orange/80" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 📝 自由輸入 */}
              <div className="border-t border-monitor-border/60 pt-3 space-y-2">
                <span className="font-semibold text-monitor-orange block flex items-center gap-1.5">📝 其他需求（自由輸入）</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="例如：想聽音樂、需要枕頭、想看電視..."
                    value={careRequestText}
                    onChange={(e) => setCareRequestText(e.target.value)}
                    className="flex-1 py-2 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text focus:outline-none focus:border-monitor-orange/70"
                  />
                  <button
                    onClick={() => handleAddCareRequest(careRequestText, 'other')}
                    disabled={!careRequestText.trim()}
                    className="px-4 bg-monitor-orange hover:bg-monitor-orange/90 text-white font-bold uppercase rounded-lg disabled:opacity-50 transition"
                  >
                    儲存
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        fontScale={fontScale}
        setFontScale={setFontScale}
        gasUrl={gasUrl}
        onGasUrlChange={(newUrl) => {
          const trimmed = newUrl.trim();
          setGasUrl(trimmed);
          if (trimmed) {
            localStorage.setItem('careflow_gas_url', trimmed);
          } else {
            localStorage.removeItem('careflow_gas_url');
          }
        }}
      />

      {/* 歷史趨勢圖表展開大圖對話框 */}
      {expandedChart && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 transition-opacity animate-fade-in" 
          onClick={() => setExpandedChart(null)}
        >
          <div 
            className="bg-monitor-card border border-monitor-border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-slide-up" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
              <h3 className="text-sm font-bold text-monitor-text flex items-center gap-1.5">
                {expandedChart.type === 'vitals' && `${expandedChart.label} 歷史趨勢大圖`}
                {expandedChart.type === 'bp' && '血壓與平均壓趨勢大圖'}
                {expandedChart.type === 'urine' && '尿量排泄趨勢大圖'}
              </h3>
              <button 
                type="button"
                onClick={() => setExpandedChart(null)}
                className="text-monitor-dim hover:text-monitor-text transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-2 bg-monitor-bg rounded-xl border border-monitor-border max-h-[70vh] overflow-y-auto no-scrollbar">
              {expandedChart.type === 'vitals' && renderSparkline(expandedChart.key, expandedChart.strokeColor, expandedChart.label, expandedChart.unit, true)}
              {expandedChart.type === 'bp' && renderBpSparkline(true)}
              {expandedChart.type === 'urine' && renderUrineChart(true)}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 照護與給藥事件時間線最大化對話框 */}
      {isLogTimelineExpanded && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 transition-opacity animate-fade-in" 
          onClick={() => setIsLogTimelineExpanded(false)}
        >
          <div 
            className="bg-monitor-card border border-monitor-border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-slide-up" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                📋 照護與給藥事件時間線 (全畫面檢視)
              </h3>
              <button 
                type="button"
                onClick={() => setIsLogTimelineExpanded(false)}
                className="text-monitor-dim hover:text-monitor-text transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-1">
              {renderTimelineList(true)}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsLogTimelineExpanded(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// 顯示設定對話框元件 (提供字型大小滑桿調整與快速預設)
function SettingsModal({ 
  show, 
  onClose, 
  fontScale,
  setFontScale,
  gasUrl,
  onGasUrlChange
}) {
  if (!show) return null;

  const presets = [
    { label: '最小', percent: '85%', value: 0.85 },
    { label: '適中', percent: '100%', value: 1.0 },
    { label: '放大', percent: '115%', value: 1.15 },
    { label: '加大', percent: '130%', value: 1.3 },
    { label: '最大', percent: '145%', value: 1.45 }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 transition-opacity animate-fade-in">
      <div className="bg-monitor-card border-t-4 border-slate-500 rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up">
        
        <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Settings size={16} /> 顯示與介面設定
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-monitor-dim hover:text-monitor-text"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* 介面字型大小設定 */}
          <div className="space-y-3 pt-1">
            <h4 className="font-bold text-slate-800 flex justify-between items-center font-sans">
              <span>介面顯示字型大小</span>
              <span className="text-xs font-mono font-extrabold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {Math.round(fontScale * 100)}%
              </span>
            </h4>
            
            {/* 滑桿調整 */}
            <div className="space-y-1 py-1">
              <input 
                type="range" 
                min="0.85" 
                max="1.45" 
                step="0.05" 
                value={fontScale} 
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700" 
              />
              <div className="flex justify-between text-[8px] text-monitor-dim font-mono font-bold px-0.5">
                <span>85% (最小)</span>
                <span>100% (預設)</span>
                <span>145% (最大)</span>
              </div>
            </div>

            {/* 快速預設按鈕 */}
            <div className="space-y-1.5">
              <div className="text-[9px] text-monitor-dim font-bold uppercase tracking-wider">快速比例選擇</div>
              <div className="grid grid-cols-5 gap-1">
                {presets.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFontScale(opt.value)}
                    className={`py-2 px-0.5 text-center rounded-lg border transition flex flex-col items-center justify-center ${
                      Math.abs(fontScale - opt.value) < 0.01
                        ? 'bg-slate-700 border-slate-700 text-white shadow-sm font-bold'
                        : 'bg-monitor-bg border-monitor-border text-monitor-dim hover:text-monitor-text hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-bold">{opt.label}</span>
                    <span className="text-[8px] font-mono opacity-80 leading-none mt-0.5">{opt.percent}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[9px] text-monitor-dim leading-relaxed">
              調整字型大小後，系統會自動配合原版面進行微調，確保在縮放時不會產生異常折行或超出螢幕框架。
            </p>
          </div>

          {/* 雲端同步設定 (僅在未設定系統環境變數時顯示) */}
          {!import.meta.env.VITE_GAS_URL && (
            <div className="border-t border-monitor-border/60 pt-4 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <span>☁️ 雲端同步 GAS 網址</span>
              </h4>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={gasUrl || ''}
                  onChange={(e) => onGasUrlChange(e.target.value)}
                  placeholder="請輸入 https://script.google.com/macros/s/.../exec"
                  className="w-full py-2 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-[10px] text-monitor-text focus:outline-none focus:border-slate-500 font-mono shadow-sm"
                />
                <p className="text-[9px] text-monitor-dim leading-relaxed">
                  這是您的 Google Apps Script Web App 同步網址。將此欄位留空則系統改為「本地儲存」模式。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 即時時鐘元件 (獨立渲染以優化效能，防止每秒全域 Re-render)
function HeaderClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right pl-1">
      <div className="text-xs font-mono font-extrabold text-monitor-text">
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
      </div>
    </div>
  );
}

export default App;
