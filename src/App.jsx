import { useState, useEffect } from 'react';
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
  Minus, 
  Clock, 
  X, 
  Pill,
  Trash2,
  Settings,
  Edit2,
  Lock,
  Unlock
} from 'lucide-react';

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

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) {
        setTimeout(() => handlePinComplete(newPin), 200);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handlePinComplete = (enteredPin) => {
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
  };

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
  }, [pin, step, tempPin]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto border-x border-slate-800 font-sans">
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 my-auto animate-pulse-slow">
        {/* Logo 和標題 */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10 border-2 border-slate-700 overflow-hidden">
            <img src="/logo.png" alt="家康記 Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-widest uppercase text-emerald-400">CareFlow 密碼鎖</h1>
            <p className="text-xs text-slate-400 mt-1">健康與生理數值紀錄系統</p>
          </div>
        </div>

        {/* 提示訊息 */}
        <div className="text-center space-y-1 px-4">
          <h2 className="text-base font-bold">
            {step === 'unlock' && '請輸入 4 位數密碼解鎖'}
            {step === 'enter' && '建立家庭專屬密碼鎖'}
            {step === 'confirm' && '請再次輸入以確認密碼'}
          </h2>
          <p className="text-xs text-slate-500">
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
              className={`w-4 h-4 rounded-full border-2 border-slate-700 transition-all duration-150 ${
                index < pin.length ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-md shadow-emerald-400/30' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg flex items-center gap-1.5 animate-bounce">
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
              className="h-14 bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-600/60 border border-slate-800 text-xl font-semibold rounded-xl flex items-center justify-center transition focus:outline-none"
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
            className="text-[10px] text-slate-500 hover:text-slate-400 font-bold active:scale-95 transition flex items-center justify-center px-1"
          >
            重設系統
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-600/60 border border-slate-800 text-xl font-semibold rounded-xl flex items-center justify-center transition focus:outline-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 bg-slate-800/60 hover:bg-slate-700/60 active:bg-slate-600/60 border border-slate-800 text-lg rounded-xl flex items-center justify-center transition focus:outline-none text-slate-400"
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
  const maskName = (name) => {
    if (!name) return '';
    if (name.length <= 1) return '*';
    if (name.length === 2) return name[0] + '*';
    if (name.startsWith('受測者')) {
      return '受測者 *' + name.slice(-2);
    }
    const first = name[0];
    const last = name[name.length - 1];
    return `${first}${'*'.repeat(name.length - 2)}${last}`;
  };

  const [isLocked, setIsLocked] = useState(() => {
    const hasVerify = !!localStorage.getItem('careflow_verify');
    if (!hasVerify) return true;
    
    // 檢查是否有儲存的 session pin，若有且正確，免解鎖
    const savedPin = localStorage.getItem('careflow_session_pin');
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
    return localStorage.getItem('careflow_session_pin') || '';
  });
  const [gasUrl, setGasUrl] = useState(() => {
    const saved = localStorage.getItem('careflow_gas_url');
    if (saved === null) {
      const defaultUrl = 'https://script.google.com/macros/s/AKfycbzKklSVbjRHFG601Z0tpXZyJCFZED5JAJSpiuSRcu9PgO3skBPFC1O2VzyYcshNzJdG/exec';
      localStorage.setItem('careflow_gas_url', defaultUrl);
      return defaultUrl;
    }
    return saved;
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'

  const [isDemo, setIsDemo] = useState(() => {
    return !localStorage.getItem('careflow_initialized');
  });

  const [logs, setLogs] = useState(() => {
    const savedPin = localStorage.getItem('careflow_session_pin');
    if (savedPin) {
      const verifyToken = localStorage.getItem('careflow_verify');
      const decrypted = decrypt(verifyToken, savedPin);
      if (decrypted === 'careflow_auth_ok') {
        const savedLogs = localStorage.getItem('careflow_logs');
        if (savedLogs) {
          const dec = decrypt(savedLogs, savedPin);
          if (dec) {
            try { return JSON.parse(dec); } catch(e){}
          }
        }
        return INITIAL_LOGS;
      }
    }
    return []; // 未解鎖前先不載入資料
  });

  const [patient, setPatient] = useState(() => {
    const savedPin = localStorage.getItem('careflow_session_pin');
    if (savedPin) {
      const verifyToken = localStorage.getItem('careflow_verify');
      const decrypted = decrypt(verifyToken, savedPin);
      if (decrypted === 'careflow_auth_ok') {
        const savedPatient = localStorage.getItem('careflow_patient');
        if (savedPatient) {
          const dec = decrypt(savedPatient, savedPin);
          if (dec) {
            try { return JSON.parse(dec); } catch(e){}
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
  const [reportDuration, setReportDuration] = useState(24); // 預設 24 小時區間
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' or 'trends'
  
  // 表單欄位狀態
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [heartRate, setHeartRate] = useState(80);
  const [oxygen, setOxygen] = useState(98);
  const [respRate, setRespRate] = useState(16);
  const [urineVolume, setUrineVolume] = useState(200);
  const [urineColor, setUrineColor] = useState('clear_yellow');
  const [medName, setMedName] = useState('一般止痛藥 (如普拿疼)');
  const [customMed, setCustomMed] = useState('');
  const [noteText, setNoteText] = useState('');

  // 從雲端 GAS 拉取最新資料並在裝置解密的非同步函數 (支援離線快取優先)
  const triggerSync = async (pinKey) => {
    const url = localStorage.getItem('careflow_gas_url');
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
          } catch(e){}
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
            } catch(e){}
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
  };

  // 當解鎖狀態、密碼或雲端網址變更時，自動觸發雲端同步
  useEffect(() => {
    if (!isLocked && password && gasUrl) {
      triggerSync(password);
    }
  }, [isLocked, password, gasUrl]);

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
      const url = localStorage.getItem('careflow_gas_url');
      if (url) {
        setSyncStatus('syncing');
        try {
          await postToGas(url, { action: 'clearAll' });
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (e) {
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
        }
      }
    }
  };

  // 取得最新生理數據
  const getLatestVitals = () => {
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
  };

  const latest = getLatestVitals();

  // 生理數據警報值判定
  const isHrAlert = (hr) => hr > 100 || hr < 50;
  const isSpo2Alert = (spo2) => spo2 < 95;
  const isRrAlert = (rr) => rr > 24;
  const isBpAlert = (sbp, dbp) => sbp > 140 || dbp > 90 || sbp < 90 || dbp < 55;

  // 繪製趨勢圖的 SVG 元件
  const renderSparkline = (key, strokeColor, label, unit) => {
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

    const width = 320;
    const height = 70;
    const paddingX = 16;
    const paddingY = 12;
    
    const vals = data.map(d => d.val);
    const min = Math.min(...vals) - 2;
    const max = Math.max(...vals) + 2;
    const valRange = max - min || 1;

    const points = data.map((d, index) => {
      const x = paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((d.val - min) / valRange) * (height - paddingY * 2);
      return { x, y, val: d.val, time: d.time };
    });

    const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-monitor-text">{label}</span>
          <span className="text-[10px] text-monitor-dim">
            最新: <strong className="text-monitor-text">{vals[vals.length - 1]}</strong> {unit} (區間: {Math.round(min)}-{Math.round(max)})
          </span>
        </div>
        <div className="relative">
          <svg className="w-full h-16" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f1f5f9" strokeDasharray="3 3" />
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {(i === points.length - 1 || i === 0) && (
                  <text
                    x={p.x}
                    y={p.y - 6}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="bold"
                    fill="#334155"
                    className="font-mono"
                  >
                    {p.val}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between text-[8px] text-monitor-dim font-mono">
          <span>{points[0].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <span>{points[points.length - 1].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        </div>
      </div>
    );
  };

  const renderBpSparkline = () => {
    const data = logs
      .filter(l => l.type === 'vitals')
      .map(l => ({ sbp: l.sbp, dbp: l.dbp, time: new Date(l.timestamp) }))
      .filter(d => d.sbp !== null && d.dbp !== null)
      .reverse(); // 舊到新排序

    if (data.length < 2) {
      return (
        <div className="bg-monitor-card border border-monitor-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-xs font-bold text-monitor-dim mb-1">血壓 (BP)</div>
          <div className="text-[11px] text-monitor-dim py-4">數據量不足以繪製趨勢圖 (至少需2筆記錄)</div>
        </div>
      );
    }

    const width = 320;
    const height = 75;
    const paddingX = 16;
    const paddingY = 12;

    const sbps = data.map(d => d.sbp);
    const dbps = data.map(d => d.dbp);
    const min = Math.min(...dbps) - 5;
    const max = Math.max(...sbps) + 5;
    const valRange = max - min || 1;

    const points = data.map((d, index) => {
      const x = paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
      const ySbp = height - paddingY - ((d.sbp - min) / valRange) * (height - paddingY * 2);
      const yDbp = height - paddingY - ((d.dbp - min) / valRange) * (height - paddingY * 2);
      return { x, ySbp, yDbp, sbp: d.sbp, dbp: d.dbp, time: d.time };
    });

    const pathSbp = `M ${points.map(p => `${p.x} ${p.ySbp}`).join(' L ')}`;
    const pathDbp = `M ${points.map(p => `${p.x} ${p.yDbp}`).join(' L ')}`;

    return (
      <div className="bg-monitor-card border border-monitor-border rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-monitor-text">血壓趨勢 (收縮壓/舒張壓)</span>
          <span className="text-[10px] text-monitor-dim">
            最新: <strong className="text-monitor-red">{sbps[sbps.length - 1]}</strong>/<strong className="text-slate-700">{dbps[dbps.length - 1]}</strong> mmHg
          </span>
        </div>
        <div className="relative">
          <svg className="w-full h-16" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f1f5f9" strokeDasharray="3 3" />
            <path
              d={pathSbp}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathDbp}
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.ySbp} r="3" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" />
                {(i === points.length - 1 || i === 0) && (
                  <text x={p.x} y={p.ySbp - 5} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ef4444" className="font-mono">{p.sbp}</text>
                )}
                <circle cx={p.x} cy={p.yDbp} r="3" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
                {(i === points.length - 1 || i === 0) && (
                  <text x={p.x} y={p.yDbp + 9} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#475569" className="font-mono">{p.dbp}</text>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between text-[8px] text-monitor-dim font-mono">
          <span>{points[0].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <span>{points[points.length - 1].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        </div>
      </div>
    );
  };

  // 儲存生理數據
  const handleAddVitals = (e) => {
    e.preventDefault();
    const calculatedMap = Math.round(diastolic + (systolic - diastolic) / 3);
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'vitals',
      hr: heartRate,
      spo2: oxygen,
      rr: respRate,
      sbp: systolic,
      dbp: diastolic,
      map: calculatedMap,
      notes: noteText.trim() || undefined
    };
    setLogs([newLog, ...logs]);
    setNoteText('');
    setShowVitalsModal(false);
    
    // 同步到雲端 Google Sheets
    uploadLogToCloud(newLog);
  };

  // 儲存尿量事件
  const handleAddUrine = (e) => {
    e.preventDefault();
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'event',
      eventType: 'urine',
      volumeCc: urineVolume,
      color: urineColor,
      notes: noteText.trim() || undefined
    };
    setLogs([newLog, ...logs]);
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
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'event',
      eventType: 'medication',
      medicationName: finalMedName,
      notes: noteText.trim() || undefined
    };
    setLogs([newLog, ...logs]);
    setNoteText('');
    setCustomMed('');
    setShowMedModal(false);
    
    // 同步到雲端 Google Sheets
    uploadLogToCloud(newLog);
  };

  const deleteLog = (id) => {
    if (window.confirm('確定要刪除此筆交班紀錄嗎？')) {
      setLogs(logs.filter(l => l.id !== id));
      deleteLogFromCloud(id);
    }
  };

  // 雲端同步輔助函數 (新增資料)
  const uploadLogToCloud = async (newLog) => {
    const url = localStorage.getItem('careflow_gas_url');
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
    } catch (e) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // 雲端同步輔助函數 (刪除資料)
  const deleteLogFromCloud = async (id) => {
    const url = localStorage.getItem('careflow_gas_url');
    if (!url) return;
    
    setSyncStatus('syncing');
    try {
      await postToGas(url, {
        action: 'deleteLog',
        id: id
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // 產生中文醫護交班報告
  const generateHandoverMarkdown = () => {
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
        }
      }
      return null;
    }).filter(Boolean);

    const dateStr = now.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
    let report = `🏥 照護交班報告 (${dateStr} - ${reportDuration}小時內):\n\n`;
    report += `📈 最新生理 telemetry 指標:\n`;
    report += `- 心率 (HR): ${hrStr}\n- 血氧 (SpO2): ${spo2Str}\n- 呼吸 (RR): ${rrStr}\n- 血壓 (BP): ${bpStr} (平均壓 MAP: ${mapStr})\n\n`;
    report += `⏱️ 臨床事件與用藥時間線:\n`;
    if (timeline.length > 0) {
      report += timeline.map(line => `• ${line}`).join('\n');
    } else {
      report += `• 此區間內無特殊警報或分泌物事件。`;
    }
    
    return report;
  };

  const handleCopyReport = () => {
    const text = generateHandoverMarkdown();
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
              try { currentLogs = JSON.parse(rawLogs); } catch(e){}
            }
            if (rawPatient && rawPatient.startsWith('{')) {
              try { currentPatient = JSON.parse(rawPatient); } catch(e){}
            }

            const encryptedLogs = encrypt(JSON.stringify(currentLogs), pin);
            const encryptedPatient = encrypt(JSON.stringify(currentPatient), pin);
            localStorage.setItem('careflow_logs', encryptedLogs);
            localStorage.setItem('careflow_patient', encryptedPatient);
            localStorage.setItem('careflow_initialized', 'true');

            // 3. 設定狀態並解鎖
            localStorage.setItem('careflow_session_pin', pin);
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
                  try { decryptedLogs = JSON.parse(dec); } catch(e){}
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
                  try { decryptedPatient = JSON.parse(dec); } catch(e){}
                }
              }

              localStorage.setItem('careflow_session_pin', pin);
              setLogs(decryptedLogs);
              setPatient(decryptedPatient);
              setPassword(pin);
              setIsLocked(false);
              const hasInitialized = localStorage.getItem('careflow_initialized');
              setIsDemo(!hasInitialized);
              
              // 啟動雲端同步
              triggerSync(pin);
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
    <div className="min-h-screen bg-monitor-bg flex flex-col font-sans max-w-md mx-auto relative border-x border-monitor-border">
      
      {/* 1. 清爽型床邊數據標題欄 */}
      <header className="bg-monitor-card border-b border-monitor-border px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          {/* LOGO 圖示放在最左上角 */}
          <img src="/logo.png" alt="CareFlow Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-200" />
          <div>
            <h1 className="text-sm font-extrabold tracking-widest text-monitor-text uppercase" id="app-title">
              CareFlow 照護助理
            </h1>
            <p className="text-[9px] text-monitor-dim tracking-wider font-mono flex items-center gap-1.5">
              {gasUrl ? (
                <span className={`inline-flex items-center gap-0.5 font-bold ${
                  syncStatus === 'syncing' ? 'text-amber-500 animate-pulse' :
                  syncStatus === 'success' ? 'text-emerald-500' :
                  syncStatus === 'error' ? 'text-rose-500 animate-bounce' :
                  'text-slate-400'
                }`}>
                  雲端{syncStatus === 'syncing' ? '同步中' : syncStatus === 'success' ? '連線成功' : syncStatus === 'error' ? '連線失敗' : '連線'}
                </span>
              ) : (
                <span>本地單機模式</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">

          
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
          
          <div className="text-right pl-1">
            <div className="text-xs font-mono font-bold text-monitor-text">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
            <div className="text-[8px] text-monitor-green font-bold uppercase tracking-wider">生理指標監控中</div>
          </div>
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
      <main className="flex-1 p-4 space-y-4 pb-28 overflow-y-auto no-scrollbar">
        
        {/* 受測者卡片 */}
        <div className="bg-monitor-card border border-monitor-border rounded-xl p-3 flex justify-between items-center text-xs shadow-sm gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <strong className="text-monitor-text font-bold">已啟用去識別化隱私防護</strong>
            </div>
            <p className="text-[10px] text-monitor-dim mt-1">
              本裝置與雲端試算表皆不會記錄任何姓名、年齡、性別或診斷等個人特徵。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-monitor-dim hover:text-monitor-text rounded-lg transition"
            title="系統設定或重設系統"
          >
            <Settings size={14} />
          </button>
        </div>

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
            歷史趨勢圖表
          </button>
        </div>

        {/* 2. 生理數據區塊 (即時網格 vs 歷史趨勢) */}
        {activeTab === 'vitals' ? (
          <div className="grid grid-cols-2 gap-3 transition-opacity duration-300">
            {/* 心率卡片 */}
            <button 
              id="hr-card"
              onClick={() => {
                setHeartRate(latest.hr !== '--' ? latest.hr : 80);
                setShowVitalsModal(true);
              }}
              className={`monitor-card text-left focus:outline-none border transition-all shadow-sm hover:scale-[1.01] ${
                isHrAlert(latest.hr)
                  ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                  : 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200'
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
              <div className="mt-2 text-[10px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1">
                <span>警報門檻: &gt;100</span>
                {isHrAlert(latest.hr) && latest.hr !== '--' && <span className="text-monitor-red font-bold animate-pulse">心速快</span>}
              </div>
            </button>

            {/* 血氧卡片 */}
            <button 
              id="spo2-card"
              onClick={() => {
                setOxygen(latest.spo2 !== '--' ? latest.spo2 : 98);
                setShowVitalsModal(true);
              }}
              className={`monitor-card text-left focus:outline-none border transition-all shadow-sm hover:scale-[1.01] ${
                isSpo2Alert(latest.spo2)
                  ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                  : 'bg-cyan-50/40 border-cyan-100 hover:border-cyan-200'
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
              <div className="mt-2 text-[10px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1">
                <span>警報門檻: &lt;95%</span>
                {isSpo2Alert(latest.spo2) && latest.spo2 !== '--' && <span className="text-monitor-red font-bold animate-pulse">血氧低</span>}
              </div>
            </button>

            {/* 呼吸卡片 */}
            <button 
              id="rr-card"
              onClick={() => {
                setRespRate(latest.rr !== '--' ? latest.rr : 16);
                setShowVitalsModal(true);
              }}
              className={`monitor-card text-left focus:outline-none border transition-all shadow-sm hover:scale-[1.01] ${
                isRrAlert(latest.rr)
                  ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                  : latest.rr > 20
                  ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                  : 'bg-amber-50/30 border-amber-100 hover:border-amber-200'
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
              <div className="mt-2 text-[10px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1">
                <span>警報門檻: &gt;24</span>
                {isRrAlert(latest.rr) && latest.rr !== '--' && <span className="text-monitor-red font-bold animate-pulse">急促</span>}
              </div>
            </button>

            {/* 血壓卡片 */}
            <button 
              id="bp-card"
              onClick={() => {
                if (latest.bp && latest.bp !== '--/--') {
                  const parts = latest.bp.split('/');
                  setSystolic(parseInt(parts[0]));
                  setDiastolic(parseInt(parts[1]));
                } else {
                  setSystolic(120);
                  setDiastolic(80);
                }
                setShowVitalsModal(true);
              }}
              className={`monitor-card text-left focus:outline-none border transition-all shadow-sm hover:scale-[1.01] ${
                isBpAlert(latest.sbp, latest.dbp)
                  ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                  : 'bg-slate-50 border-slate-100 hover:border-slate-200'
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
              <div className="mt-2 text-[10px] text-monitor-dim flex items-center justify-between border-t border-slate-200/50 pt-1">
                <span>平均壓 MAP: <strong className="text-monitor-text font-mono">{latest.map}</strong></span>
                {isBpAlert(latest.sbp, latest.dbp) && latest.sbp !== '--' && <span className="text-monitor-red font-bold animate-pulse">異常</span>}
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-3 transition-opacity duration-300">
            {renderSparkline('hr', '#10b981', '心率趨勢 (Heart Rate)', 'bpm')}
            {renderSparkline('spo2', '#06b6d4', '血氧趨勢 (SpO₂)', '%')}
            {renderSparkline('rr', '#f59e0b', '呼吸趨勢 (Respiratory Rate)', 'rpm')}
            {renderBpSparkline()}
          </div>
        )}

        {/* 3. 事件與排泄記錄區 */}
        <section className="bg-monitor-card border border-monitor-border rounded-xl p-4 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-monitor-dim flex items-center gap-1.5">
            <Clock size={12} className="text-monitor-cyan" /> 排泄與用藥事件快速記錄
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {/* 尿量記錄按鈕 */}
            <button
              id="log-urine-btn"
              onClick={() => setShowUrineModal(true)}
              className="flex items-center justify-between px-3 py-3.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-cyan/40 transition active:bg-slate-100 text-left shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Droplet size={15} className="text-monitor-cyan fill-monitor-cyan/10" />
                <div>
                  <div className="text-xs font-bold text-monitor-text">尿量記錄</div>
                  <div className="text-[9px] text-monitor-dim">c.c.與顏色選單</div>
                </div>
              </div>
              <Plus size={14} className="text-monitor-dim" />
            </button>

            {/* 給藥記錄按鈕 */}
            <button
              id="log-med-btn"
              onClick={() => setShowMedModal(true)}
              className="flex items-center justify-between px-3 py-3.5 bg-monitor-bg border border-monitor-border rounded-lg hover:border-monitor-purple/40 transition active:bg-slate-100 text-left shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Pill size={15} className="text-monitor-purple" />
                <div>
                  <div className="text-xs font-bold text-monitor-text">疼痛與給藥</div>
                  <div className="text-[9px] text-monitor-dim">突發痛止痛處置</div>
                </div>
              </div>
              <Plus size={14} className="text-monitor-dim" />
            </button>
          </div>
        </section>

        {/* 4. 交班報告產生器 */}
        <section className="bg-monitor-card border border-monitor-border rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-monitor-dim flex items-center gap-1.5">
              <Clipboard size={13} className="text-monitor-cyan" /> 醫護交班報告
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
              {generateHandoverMarkdown()}
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
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-monitor-dim px-1">
            臨床監控歷史紀錄流 (最新優先)
          </h2>
          <div className="space-y-2">
            {logs.map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              const dateStr = date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
              
              return (
                <div 
                  key={log.id} 
                  className="bg-monitor-card border border-monitor-border rounded-lg px-3 py-2.5 flex items-start justify-between gap-3 text-xs shadow-sm"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold text-monitor-dim">
                        {dateStr} {timeStr}
                      </span>
                      {log.type === 'vitals' ? (
                        <span className="bg-emerald-50 border border-emerald-100 text-monitor-green px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider">
                          生理數據
                        </span>
                      ) : (
                        <span className="bg-purple-50 border border-purple-100 text-monitor-purple px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider">
                          {log.eventType === 'urine' ? '排泄記錄' : '給藥處置'}
                        </span>
                      )}
                    </div>
                    
                    {log.type === 'vitals' ? (
                      <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[11px] text-monitor-text">
                        <div><span className="text-monitor-dim">心率:</span> <strong className={isHrAlert(log.hr) ? 'text-monitor-red' : 'text-monitor-green'}>{log.hr}</strong></div>
                        <div><span className="text-monitor-dim">血氧:</span> <strong className={isSpo2Alert(log.spo2) ? 'text-monitor-red' : 'text-monitor-cyan'}>{log.spo2}%</strong></div>
                        <div><span className="text-monitor-dim">呼吸:</span> <strong className={isRrAlert(log.rr) ? 'text-monitor-red' : 'text-monitor-yellow'}>{log.rr}</strong></div>
                        <div><span className="text-monitor-dim">血壓:</span> <strong className={isBpAlert(log.sbp, log.dbp) ? 'text-monitor-red' : 'text-monitor-text'}>{log.sbp}/{log.dbp}</strong></div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-monitor-text pt-0.5">
                        {log.eventType === 'urine' ? (
                          <div className="flex items-center gap-2">
                            <span>排出尿量: <strong className="text-monitor-cyan">{log.volumeCc} cc</strong></span>
                            <span className="flex items-center gap-1.5">
                              尿色: 
                              <span className={`w-2.5 h-2.5 rounded-full border border-slate-300 ${
                                log.color === 'bright_red' ? 'bg-[#ef4444]' : log.color === 'tea' ? 'bg-[#8d6e63]' : 'bg-[#fef08a]'
                              }`} />
                              <strong className="text-monitor-text font-normal">
                                {log.color === 'bright_red' ? '鮮紅肉眼血尿' : log.color === 'tea' ? '深茶色' : '清澈淡黃'}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div>
                            給藥: <strong className="text-monitor-purple">{log.medicationName}</strong>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {log.notes && (
                      <p className="text-[10px] text-monitor-dim italic border-l-2 border-slate-200 pl-2 mt-1">
                        「{log.notes}」
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-monitor-dim hover:text-monitor-red p-1 rounded transition"
                    title="刪除此筆紀錄"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* 懸浮動作按鈕 (快速登錄生理數據) */}
      <div className="absolute bottom-6 right-6 z-30">
        <button
          id="quick-log-float-btn"
          onClick={() => {
            setHeartRate(latest.hr !== '--' ? latest.hr : 80);
            setOxygen(latest.spo2 !== '--' ? latest.spo2 : 98);
            setRespRate(latest.rr !== '--' ? latest.rr : 16);
            if (latest.bp && latest.bp !== '--/--') {
              const parts = latest.bp.split('/');
              setSystolic(parseInt(parts[0]));
              setDiastolic(parseInt(parts[1]));
            }
            setShowVitalsModal(true);
          }}
          className="w-14 h-14 bg-monitor-green text-white font-bold rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-white focus:outline-none"
          title="快速記錄生理數據"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* ================= 彈出式對話視窗 / 抽屜 ================= */}

      {/* 生理數據錄入對話框 */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 transition-opacity">
          <div className="bg-monitor-card border-t-4 border-monitor-green rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            
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
                <div className="grid grid-cols-2 gap-4">
                  {/* 收縮壓 */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-monitor-dim block">收縮壓 Systolic (mmHg)</label>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setSystolic(Math.max(60, systolic - 5))}
                        className="p-2 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100"
                      >
                        -5
                      </button>
                      <input 
                        type="number" 
                        value={systolic} 
                        onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                        className="w-full text-center py-1.5 bg-monitor-bg border border-monitor-border rounded-md font-telemetry font-bold text-monitor-text focus:outline-none focus:border-monitor-red"
                      />
                      <button 
                        type="button" 
                        onClick={() => setSystolic(Math.min(260, systolic + 5))}
                        className="p-2 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                  {/* 舒張壓 */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-monitor-dim block">舒張壓 Diastolic (mmHg)</label>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setDiastolic(Math.max(40, diastolic - 5))}
                        className="p-2 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100"
                      >
                        -5
                      </button>
                      <input 
                        type="number" 
                        value={diastolic} 
                        onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                        className="w-full text-center py-1.5 bg-monitor-bg border border-monitor-border rounded-md font-telemetry font-bold text-monitor-text focus:outline-none focus:border-monitor-red"
                      />
                      <button 
                        type="button" 
                        onClick={() => setDiastolic(Math.min(160, diastolic + 5))}
                        className="p-2 bg-monitor-bg border border-monitor-border rounded-md font-bold active:bg-slate-100"
                      >
                        +5
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 transition-opacity">
          <div className="bg-monitor-card border-t-4 border-monitor-cyan rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            
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
                  <span className="text-monitor-dim">{urineVolume} cc</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setUrineVolume(Math.max(0, urineVolume - 50))}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    -50
                  </button>
                  <div className="w-24 text-center text-xl font-telemetry font-bold text-monitor-cyan py-1.5 bg-monitor-bg border border-monitor-border rounded-lg">
                    {urineVolume} ml
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setUrineVolume(urineVolume + 50)}
                    className="flex-1 py-3 bg-monitor-bg border border-monitor-border rounded-lg text-monitor-text font-bold active:bg-slate-100"
                  >
                    +50
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 transition-opacity">
          <div className="bg-monitor-card border-t-4 border-monitor-purple rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            
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

      {/* 設定與受測者資訊編輯對話框 */}
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        patient={patient}
        setPatient={setPatient}
        logs={logs}
        setPassword={setPassword}
        handleStartFresh={handleStartFresh}
        setIsLocked={setIsLocked}
        gasUrl={gasUrl}
        setGasUrl={setGasUrl}
        syncStatus={syncStatus}
        triggerSync={triggerSync}
        password={password}
      />

    </div>
  );
}

// 系統設定與受測者資料編輯對話框元件 (獨立 State 管理，避免 App 內部狀態過於混亂)
function SettingsModal({ 
  show, 
  onClose, 
  patient, 
  setPatient, 
  logs, 
  setPassword, 
  handleStartFresh, 
  setIsLocked,
  gasUrl,
  setGasUrl,
  syncStatus,
  triggerSync,
  password
}) {
  const [modalGasUrl, setModalGasUrl] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  // 每次開啟或病患資料更新時，重置輸入欄位與暫存狀態
  useEffect(() => {
    if (show) {
      setModalGasUrl(gasUrl || '');
      setNewPin('');
      setConfirmNewPin('');
      setChangePinError('');
      setChangePinSuccess(false);
    }
  }, [show, gasUrl]);

  if (!show) return null;

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (newPin.length !== 4 || confirmNewPin.length !== 4) {
      setChangePinError('密碼必須為 4 位數數字！');
      return;
    }
    if (newPin !== confirmNewPin) {
      setChangePinError('兩次輸入的新密碼不一致！');
      return;
    }
    
    try {
      // 1. 儲存新的驗證標記
      const newToken = encrypt('careflow_auth_ok', newPin);
      localStorage.setItem('careflow_verify', newToken);
      localStorage.removeItem('careflow_no_pin'); // 確保移除無密碼標記
      
      // 2. 使用新密碼重新加密目前的資料
      const encryptedLogs = encrypt(JSON.stringify(logs), newPin);
      const encryptedPatient = encrypt(JSON.stringify(patient), newPin);
      localStorage.setItem('careflow_logs', encryptedLogs);
      localStorage.setItem('careflow_patient', encryptedPatient);
      
      // 3. 同步新密碼加密的資料至 Google Sheets 雲端
      if (gasUrl) {
        setChangePinError('正在同步雲端新密碼加密資料，請稍候...');
        await postToGas(gasUrl, { action: 'clearAll' });
        await postToGas(gasUrl, { action: 'setPatient', encrypted_data: encryptedPatient });
        for (const log of logs) {
          const fields = { ...log };
          delete fields.id;
          delete fields.timestamp;
          delete fields.type;
          await postToGas(gasUrl, {
            action: 'appendLog',
            log: {
              id: log.id,
              timestamp: log.timestamp,
              type: log.type,
              data: encrypt(JSON.stringify(fields), newPin)
            }
          });
        }
      }

      // 4. 更新父元件的 password
      localStorage.setItem('careflow_session_pin', newPin);
      setPassword(newPin);
      setChangePinSuccess(true);
      setNewPin('');
      setConfirmNewPin('');
      setChangePinError('');
    } catch (e) {
      console.error(e);
      setChangePinError('修改密碼或同步雲端時發生錯誤！');
    }
  };



  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 transition-opacity">
      <div className="bg-monitor-card border-t-4 border-slate-500 rounded-t-2xl w-full max-w-md p-5 pb-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
        
        <div className="flex justify-between items-center pb-2 border-b border-monitor-border">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Settings size={16} /> 系統設定與受測者個資編輯
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
          

          {/* Google Sheets 雲端同步設定 */}
          <div className="space-y-3 pt-2 border-t border-slate-150">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between items-center">
              <span>Google Sheets 雲端資料同步</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                syncStatus === 'syncing' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                syncStatus === 'success' ? 'bg-emerald-100 text-emerald-700' :
                syncStatus === 'error' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {syncStatus === 'syncing' ? '同步中...' : syncStatus === 'success' ? '連線成功' : syncStatus === 'error' ? '連線失敗' : '已就緒'}
              </span>
            </h4>
            <div className="space-y-1">
              <label className="font-semibold text-monitor-dim block">Google Apps Script Web App API 網址</label>
              <input 
                type="text" 
                value={modalGasUrl}
                onChange={(e) => setModalGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full py-1.5 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-[10px] text-monitor-text focus:outline-none focus:border-slate-500 font-mono"
              />
              <p className="text-[9px] text-monitor-dim">將您在 Google Sheet 擴充功能中部署的網頁應用程式 API 網址貼於此處以開啟同步。</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const cleanedUrl = modalGasUrl.trim();
                  localStorage.setItem('careflow_gas_url', cleanedUrl);
                  setGasUrl(cleanedUrl);
                  alert('API 網址已儲存！現在將測試連線並拉取雲端最新資料。');
                  if (cleanedUrl) {
                    triggerSync(password);
                  }
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition text-center"
              >
                儲存並測試連線
              </button>
              {gasUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('確定要中斷與此雲端試算表的同步連結嗎？中斷後資料將僅儲存於本機裝置。')) {
                      localStorage.setItem('careflow_gas_url', '');
                      setGasUrl('');
                      setModalGasUrl('');
                      alert('已中斷雲端連線，改為本地單機模式。');
                    }
                  }}
                  className="py-2 px-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold rounded-lg transition text-center"
                >
                  中斷連結
                </button>
              )}
            </div>
          </div>

          {/* 2. 修改密碼鎖 (PIN) */}
          <form onSubmit={handleChangePin} className="space-y-3 pt-2 border-t border-slate-150">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 font-sans">修改密碼鎖 (4 位數 PIN)</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-monitor-dim block">新 4 位數密碼</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewPin(val);
                    setChangePinError('');
                    setChangePinSuccess(false);
                  }}
                  placeholder="新 PIN 碼"
                  className="w-full py-1.5 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text text-center tracking-widest font-mono focus:outline-none focus:border-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-monitor-dim block">確認新密碼</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={confirmNewPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setConfirmNewPin(val);
                    setChangePinError('');
                    setChangePinSuccess(false);
                  }}
                  placeholder="再次輸入"
                  className="w-full py-1.5 px-3 bg-monitor-bg border border-monitor-border rounded-lg text-xs text-monitor-text text-center tracking-widest font-mono focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {changePinError && (
              <div className="text-[10px] text-rose-500 font-bold bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-md">
                ⚠️ {changePinError}
              </div>
            )}
            
            {changePinSuccess && (
              <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-md">
                ✓ 密碼修改成功！已套用新密碼進行數據加密。
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition"
            >
              確認修改密碼鎖
            </button>
          </form>

          {/* 3. 危險區域 */}
          <div className="space-y-2 pt-2 border-t border-slate-150">
            <h4 className="font-bold text-rose-600">危險區域</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStartFresh}
                className="w-full py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold rounded-lg transition text-[11px]"
              >
                重設受測者與清除資料
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
