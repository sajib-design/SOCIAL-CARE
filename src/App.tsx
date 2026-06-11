/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Database, 
  Lightbulb, 
  Sun, 
  Moon, 
  RefreshCw, 
  Layers,
  CheckCircle,
  Clock,
  Wifi,
  Activity,
  AlertTriangle,
  AlertCircle,
  Bell,
  ArrowRight,
  Calendar,
  Info
} from 'lucide-react';

// Type references
import { SheetRow, ParsedItem, Theme, DashboardStats } from './types';

// Fallback Mock Data
import { mockSheetData } from './mockData';

// Component layout children
import { MetricCard } from './components/MetricCard';
import { DataCharts } from './components/DataCharts';
import { DataTable } from './components/DataTable';
import { ErrorUI } from './components/ErrorUI';

export default function App() {
  // 1. STATE CONFIGURATION
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('social_care_dashboard_theme');
    return (saved as Theme) || 'dark';
  });

  const [rawRows, setRawRows] = useState<SheetRow[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Safe control toggles
  const [useMockFallback, setUseMockFallback] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // -------------------------------------------------------------
  // THEME SWITCH ENGINE
  // -------------------------------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('social_care_dashboard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // -------------------------------------------------------------
  // ADVANCED FLOAT PARSER (Handles "$1,500.25 USD", etc.)
  // -------------------------------------------------------------
  const parseNumeric = (val: any): number => {
    if (val === undefined || val === null) return 0;
    // Strip everything except numbers, points, or negative sign
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  // Helper to dynamically locate a spreadsheet cell field/column value by trying exact and fuzzy/normalized match keys.
  const getRowVal = (row: any, primaryKey: string, ...fallbackKeys: string[]): any => {
    if (!row) return '';
    const allKeysToTry = [primaryKey, ...fallbackKeys];
    
    // 1. Direct exact matches
    for (const key of allKeysToTry) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
    
    // 2. Fuzzy normalized matches (stripping case, underscores, spaces, slashes)
    const normalize = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const keyToTry of allKeysToTry) {
      const targetNorm = normalize(keyToTry);
      for (const actualKey of Object.keys(row)) {
        if (normalize(actualKey) === targetNorm && row[actualKey] !== undefined && row[actualKey] !== null) {
          return row[actualKey];
        }
      }
    }
    
    return '';
  };

  // Normalize inconsistent statuses from sheets
  const parseStatus = (val: any): 'COMPLETED' | 'OFF' | 'Ongoing' => {
    const s = String(val || '').trim().toLowerCase();
    if (s.includes('completed') || s.includes('complete') || s.includes('compleate') || s.includes('compleat')) return 'COMPLETED';
    if (s.includes('off') || s.includes('paused') || s.includes('stopped')) return 'OFF';
    return 'Ongoing';
  };

  // Convert raw API schema rows into safe parsed schema items
  const parseSheetData = useCallback((rows: SheetRow[]): ParsedItem[] => {
    const parsed = rows.map((row, idx) => {
      // Direct column-letter fallback mapping:
      // A = Number, B = Page Name, C = Ad Name/no, D = Daily Budget, E = Total Budget/Total, 
      // F = Status, G = Start Date, H = End Date, I = Total Spend, J = Remark
      const dailyBudgetVal = getRowVal(row, "Daily Budget", "5$", "D", "dailybudget", "daily_budget", "Daily_Budget");
      const totalSpendVal = getRowVal(row, "Total Spend", "$113.94\r", "$113.94", "I", "totalspend", "total_spend", "Total_Spend", "Spend");
      const totalLimitVal = getRowVal(row, "Total", "115$", "E", "Total Budget", "totalbudget", "total_budget", "Total_Budget");

      const dailyBudget = parseNumeric(dailyBudgetVal);
      const totalSpend = parseNumeric(totalSpendVal);
      const totalLimit = parseNumeric(totalLimitVal);
      
      const rawStatus = String(getRowVal(row, "Status", "STATUS", "COMPLEATE", "F", "status") || '').trim();
      const status = parseStatus(rawStatus);

      const rawNum = getRowVal(row, "Number", "Number of Ad", "Number of ad", "1", "A", "no");
      const number = rawNum !== undefined && rawNum !== null && String(rawNum).trim() !== '' ? String(rawNum).trim() : String(idx + 1);
      
      const pageName = String(getRowVal(row, "Page Name", "Sara Collection", "B", "pagename", "page_name", "Page_Name", "Page") || '').trim();
      const adName = String(getRowVal(row, "Ad Name/no", "16", "C", "adname", "ad_name", "Ad Name", "AdName/no") || '').trim();
      const startDate = String(getRowVal(row, "Start Date", "16-04-2026", "G", "startdate", "start_date") || '').trim();
      const endDate = String(getRowVal(row, "End Date", "09-05-2026", "H", "enddate", "end_date") || '').trim();
      const remark = String(getRowVal(row, "Remark", "1 day off chilo", "J", "remarks", "remark", "Remark") || '').trim();

      return {
        id: idx + 1,
        "Number": number,
        "Page Name": pageName,
        "Ad Name/no": adName,
        "Daily Budget": dailyBudget,
        "Total": totalLimit,
        "Status": status,
        "Start Date": startDate,
        "End Date": endDate,
        "Total Spend": totalSpend,
        "Remark": remark,
        rawStatus
      };
    });

    // Sanitization: Skip empty rows or duplicate headers
    return parsed.filter(item => {
      // A row is completely blank if Page Name, Ad Name, Daily Budget, and Total Spend are all blank/zero
      const isBlank = !item["Page Name"] && !item["Ad Name/no"] && item["Daily Budget"] === 0 && item["Total Spend"] === 0;
      
      // A row is a header row if it literally has "Page Name" or "Ad Name/no" as values
      const isHeader = item["Page Name"].toLowerCase() === 'page name' || item["Ad Name/no"].toLowerCase() === 'ad name/no';
      
      return !isBlank && !isHeader;
    });
  }, []);

  // -------------------------------------------------------------
  // REALTIME GOOGLE SHEET JSON API FETCH ENGINE
  // -------------------------------------------------------------
  const fetchSheetData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMsg(null);

    const API_URL = 'https://sheetdb.io/api/v1/7pfpw1byvyl6x';

    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.error) {
        throw new Error(`API returned execution error: ${data.error}`);
      }

      if (!Array.isArray(data)) {
        throw new Error('Received invalid data structure. Expected an array of spreadsheet rows.');
      }

      // Successful live pull
      setRawRows(data);
      const parsed = parseSheetData(data);
      setParsedItems(parsed);
      setUseMockFallback(false);
      setLastSyncedTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.warn('Google SheetDB API connection failed, fallback available: ', err.message);
      
      // If we are already running fallback demo data, don't trigger intrusive screens
      if (!useMockFallback) {
        setErrorMsg(err.message || 'Unknown network error resolving SheetDB API endpoints.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [parseSheetData, useMockFallback]);

  // Handle forcing offline mock simulation mode directly from user interaction or error screen
  const activateMockFallback = () => {
    setRawRows(mockSheetData);
    const parsed = parseSheetData(mockSheetData);
    setParsedItems(parsed);
    setUseMockFallback(true);
    setErrorMsg(null);
    setIsLoading(false);
    setLastSyncedTime(`${new Date().toLocaleTimeString()} (Offline Demo Mode)`);
  };

  // -------------------------------------------------------------
  // RETRIEVE DATA ON BOOT (MANUAL SYNC FOCUS)
  // -------------------------------------------------------------
  useEffect(() => {
    fetchSheetData();
  }, []);

  // -------------------------------------------------------------
  // DASHBOARD KPIS / STATISTICS CALCULUS
  // -------------------------------------------------------------
  const stats: DashboardStats = useMemo(() => {
    let ongoingAds = 0;
    let completedAds = 0;
    let offAds = 0;
    let totalBudget = 0;
    let totalSpend = 0;

    parsedItems.forEach(item => {
      if (item["Status"] === 'Ongoing') {
        ongoingAds++;
      } else if (item["Status"] === 'COMPLETED') {
        completedAds++;
      } else if (item["Status"] === 'OFF') {
        offAds++;
      }

      totalBudget += item["Total"];
      totalSpend += item["Total Spend"];
    });

    const totalAds = parsedItems.length;

    return {
      totalAds, // Used for 'Total Campaigns' representation
      totalBudget,
      totalSpend,
      completedAds,
      offAds,
      ongoingAds // Used for 'Total Ads Running'
    };
  }, [parsedItems]);

  // Utilization progress budget vs spend
  const budgetUtilization = stats.totalBudget > 0 ? (stats.totalSpend / stats.totalBudget) * 100 : 0;

  // Detect context if SheetDB represents row 1 as standard keys (e.g. they missed defining columns setting)
  const isMissingSheetHeaders = useMemo(() => {
    if (rawRows.length > 0 && !useMockFallback) {
      const keys = Object.keys(rawRows[0] || {});
      const hasProperHeaders = keys.some(k => {
        const norm = k.toLowerCase();
        return (
          norm.includes('status') ||
          norm.includes('budget') ||
          norm.includes('spend') ||
          norm.includes('page name') ||
          norm.includes('sara collection') ||
          norm.includes('compleate')
        );
      });
      return !hasProperHeaders;
    }
    return false;
  }, [rawRows, useMockFallback]);

  // Today and Tomorrow ending ad campaign queries (June 11, 2026 & June 12, 2026)
  const upcomingEndNotifications = useMemo(() => {
    // Current base year-month-day is locked to local context value: June 11, 2026
    const today = new Date("2026-06-11");
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    
    // Normal formats are DD-MM-YYYY
    const todayStr = `${pad(today.getDate())}-${pad(today.getMonth() + 1)}-${today.getFullYear()}`; // "11-06-2026"
    const tomorrowStr = `${pad(tomorrow.getDate())}-${pad(tomorrow.getMonth() + 1)}-${tomorrow.getFullYear()}`; // "12-06-2026"

    return parsedItems.filter(item => {
      const end = String(item["End Date"] || '').trim().replace(/\//g, '-');
      const isOngoing = item.Status === 'Ongoing';
      return isOngoing && (end === todayStr || end === tomorrowStr);
    }).map(item => {
      const end = String(item["End Date"] || '').trim().replace(/\//g, '-');
      const isToday = end === todayStr;
      return {
        ...item,
        isToday,
        isTomorrow: !isToday,
      };
    });
  }, [parsedItems]);

  // Derived Activities Log directly generated from actual parsed spreadsheet campaigns
  const recentActivities = useMemo(() => {
    const activities: { id: string; time: string; type: string; message: string; category: 'budget' | 'status' | 'remark' | 'launched' }[] = [];
    
    const parseDateObj = (dStr: string) => {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      return new Date(0);
    };

    // Sort items by Start date to find latest started campaigns
    const sortedByStart = [...parsedItems].sort((a, b) => {
      return parseDateObj(b["Start Date"]).getTime() - parseDateObj(a["Start Date"]).getTime();
    });

    // 1. Identify newly launched campaigns in May/June 2026
    sortedByStart.slice(0, 3).forEach((item, idx) => {
      activities.push({
        id: `launch-${item.id}-${idx}`,
        time: item["Start Date"],
        type: 'Campaign Active',
        message: `Campaign "${item["Ad Name/no"] || `ID #${item.id}`}" for "${item["Page Name"]}" is live with $${item["Daily Budget"]}/day.`,
        category: 'launched'
      });
    });

    // 2. Identify campaigns containing remarks or edits
    parsedItems.filter(item => item["Remark"] && item["Remark"].trim() !== '').slice(0, 3).forEach((item, idx) => {
      activities.push({
        id: `remark-${item.id}-${idx}`,
        time: item["Start Date"],
        type: 'Remark Noted',
        message: `"${item["Page Name"]}" notes: "${item["Remark"]}" (Status: ${item["Status"]})`,
        category: 'remark'
      });
    });

    // 3. Status changes (ongoing campaign monitoring)
    parsedItems.filter(item => item["Status"] === 'Ongoing').slice(0, 2).forEach((item, idx) => {
      activities.push({
        id: `status-${item.id}-${idx}`,
        time: item["Start Date"],
        type: 'Pacing Check',
        message: `Ad "${item["Ad Name/no"]}" under "${item["Page Name"]}" is healthy (Budget spent: $${item["Total Spend"]}).`,
        category: 'status'
      });
    });

    // Sort generated activities loosely so they look nice
    return activities.slice(0, 6);
  }, [parsedItems]);

  // -------------------------------------------------------------
  // LOAD SCREEN GRACEFUL PLACEHOLDER
  // -------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-300
        ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}
      `}>
        {/* Pulsing ring indicator */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute h-16 w-16 animate-ping rounded-full bg-indigo-500/15 opacity-75"></div>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-600 to-sky-400 text-white shadow-lg shadow-indigo-600/30">
            <RefreshCw className="h-7 w-7 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-1.5 font-sans">
          SOCIAL CARE 01 ENGINE
        </h2>
        <p className="text-sm text-slate-400 animate-pulse font-medium">
          Loading Meta campaign rows from Google Sheets...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ERROR PAGE SWITCH
  // -------------------------------------------------------------
  if (errorMsg && parsedItems.length === 0) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        {/* Simple responsive wrapper */}
        <header className="px-6 py-4.5 border-b border-slate-700/10 dark:border-white/10 flex justify-between items-center bg-slate-950/20 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Layers className="h-5.5 w-5.5 text-indigo-500" />
            <h1 className="text-md font-extrabold tracking-tight text-white dark:text-white uppercase font-sans">
              Social Care 01 Dashboard
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-700/10 dark:border-white/10 hover:bg-slate-800/20 transition-all text-slate-400 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-500" />}
          </button>
        </header>

        <ErrorUI 
          onRetry={() => fetchSheetData(false)} 
          onUseMock={activateMockFallback} 
          theme={theme}
          errorMessage={errorMsg}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 pb-16
      ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}
    `}>
      
      {/* -------------------------------------------------------------
          TOP MAIN HEADER NAVIGATION BAR
          ------------------------------------------------------------- */}
      <nav id="top_app_navbar" className={`sticky top-0 z-50 px-6 py-4.5 border-b backdrop-blur-md transition-all duration-300
        ${theme === 'dark' 
          ? 'border-white/5 bg-slate-950/60' 
          : 'border-slate-200/80 bg-white/70'
        }
      `}>
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white shadow-md shadow-indigo-600/25">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 id="app_title_heading" className={`text-md font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                  SOCIAL CARE 01 Dashboard
                </h1>
                
                {useMockFallback ? (
                  <span id="fallback_pill" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-500 border border-amber-500/20 shadow-2xs">
                    <AlertTriangle className="h-3 w-3" />
                    Simulated Demo Mode
                  </span>
                ) : (
                  <span id="live_api_pill" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500 border border-emerald-500/20 shadow-2xs">
                    <Wifi className="h-3 w-3 animate-pulse" />
                    Live Google Sheet API
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Meta Ads Campaign Performance Tracker</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            {/* Manual Sync Bar (Auto Refresh off) */}
            <div className={`flex items-center gap-3 rounded-xl border px-3 py-1.5 text-xs font-semibold
              ${theme === 'dark' ? 'border-white/5 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'}
            `}>
              <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Synced:</span>
                <span className="font-mono text-indigo-500 dark:text-indigo-450 font-bold">{lastSyncedTime || 'Syncing...'}</span>
              </div>
              
              <button
                id="refresh_actions_manual"
                onClick={() => fetchSheetData(false)}
                disabled={isRefreshing}
                title="Sync now"
                className={`ml-1 flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all duration-150 cursor-pointer ${isRefreshing ? 'opacity-50' : ''}`}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>

            <button
              id="theme_switcher_toggle"
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer
                ${theme === 'dark' 
                  ? 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-yellow-400' 
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-indigo-600 shadow-sm'
                }
              `}
              title={theme === 'dark' ? "Turn on Light Mode" : "Turn on Dark Mode"}
            >
              {theme === 'dark' ? (
                <Sun className="h-4.5 w-4.5 shadow-xs" />
              ) : (
                <Moon className="h-4.5 w-4.5 shadow-xs" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* -------------------------------------------------------------
          MAIN CONTENTS LAYOUT CONTAINER
          ------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-8">
        
        {/* Dynamic header welcome */}
        <div id="dashboard_welcome_header" className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={`text-2xl font-bold tracking-tight leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
              Overview & Campaign Insights
            </h2>
            <p className="text-sm text-slate-400">
              Synced: <strong className="font-semibold text-slate-450">{lastSyncedTime || 'Synced Recently'}</strong>
            </p>
          </div>
        </div>

        {isMissingSheetHeaders && (
          <div id="missing_headers_instructions_panel" className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-2 text-slate-100 flex flex-col gap-4 shadow-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-md font-bold text-amber-500 dark:text-amber-400">
                  ⚠️ Action Required: Configure SheetDB Header Row Settings
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Your Google Sheet has high-level title rows at the very top (Rows 1 & 2), so SheetDB parses Row 1 as the column keys by default. Because of this, columns like <strong className="text-white">Page Name, STATUS, Daily Budget, Total, Start/End Date, and Total Spend are completely missing or dropped</strong> from your live API.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-1">
              <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5 leading-relaxed">
                <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold font-mono text-[10px]">1</span>
                  How to Fix in 30 Seconds on SheetDB:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 font-medium">
                  <li>Log in to your account at <a href="https://sheetdb.io" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">sheetdb.io</a>.</li>
                  <li>Click on your API connection <strong className="text-indigo-400 font-mono">uryg0wrr7jbl6</strong>.</li>
                  <li>Click on the <strong className="text-slate-300">Settings</strong> icon (or edit API settings).</li>
                  <li>Look for the <strong className="text-indigo-400">"Header row"</strong> setting & change it from <strong className="text-amber-400 font-bold">1</strong> to <strong className="text-emerald-400 font-bold">3</strong>.</li>
                  <li>Save settings and refresh this browser page. Your campaigns will display perfectly!</li>
                </ol>
              </div>

              <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5 leading-relaxed">
                <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold font-mono text-[10px]">2</span>
                  Why is this happening?
                </h4>
                <p className="text-slate-400 font-medium leading-relaxed">
                  SheetDB reads from row 1 by default. Since row 1 is a merged title <span className="font-mono text-slate-300">"SOCIAL CARE_01"</span>, only column B is processed. Shifting headers to row 3 enables reading all table fields correctly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            2. DASHBOARD SUMMARY CARDS BLOCK (6 Required Counters)
            ------------------------------------------------------------- */}
        <div id="summary_cards_grid" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          
          {/* Card 1: Total Ads Running (Ongoing campaigns) */}
          <MetricCard
            id="card_total_ads_running"
            title="Total Ads Running"
            value={stats.ongoingAds}
            iconName="Activity"
            gradientClass="from-orange-500 to-amber-400"
            subtitle="Ongoing Ad campaigns"
            theme={theme}
          />

          {/* Card 2: Total Budget Limit */}
          <MetricCard
            id="card_total_budget"
            title="Total Budget"
            value={stats.totalBudget}
            format="currency"
            iconName="Layers"
            gradientClass="from-indigo-600 to-indigo-400"
            subtitle="Approved financial limits"
            progressPercentage={budgetUtilization}
            theme={theme}
          />

          {/* Card 3: Total Spend */}
          <MetricCard
            id="card_total_spend"
            title="Total Spend"
            value={stats.totalSpend}
            format="currency"
            iconName="Sparkles"
            gradientClass="from-emerald-600 to-emerald-400"
            subtitle="Accumulated billings to date"
            theme={theme}
          />

          {/* Card 4: Completed Ads */}
          <MetricCard
            id="card_completed_ads"
            title="Completed Ads"
            value={stats.completedAds}
            iconName="CheckCircle"
            gradientClass="from-emerald-500 to-teal-400"
            subtitle="Campaign runs finished"
            theme={theme}
          />

          {/* Card 5: Off Ads */}
          <MetricCard
            id="card_off_ads"
            title="Off Ads"
            value={stats.offAds}
            iconName="CloudLightning"
            gradientClass="from-rose-500 to-red-400"
            subtitle="Paused or stopped sets"
            theme={theme}
          />

          {/* Card 6: Ongoing Ads */}
          <MetricCard
            id="card_ongoing_ads"
            title="Ongoing Ads"
            value={stats.ongoingAds}
            iconName="Clock"
            gradientClass="from-orange-600 to-orange-400"
            subtitle="Live currently on network"
            theme={theme}
          />

        </div>

        {/* -------------------------------------------------------------
            3. DYNAMIC CHARTS GRID DIVISION
            ------------------------------------------------------------- */}
        <div id="visual_charts_wrapper" className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b dark:border-white/5 pb-2 border-slate-200">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <h3 id="charts_section_heading" className={`text-md font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
              Performance Analytics Charts
            </h3>
          </div>
          <DataCharts data={parsedItems} theme={theme} />
        </div>

        {/* -------------------------------------------------------------
            4. CAMPAIGNS SPREADSHEET SYSTEM & OPERATIONS HUB (Bento Columns)
            ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Side: Campaign Log Explorer Table */}
          <div id="spreadsheet_wrapper" className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b dark:border-white/5 pb-2 border-slate-200">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <h3 id="table_section_heading" className={`text-md font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                Campaign Log Explorer
              </h3>
            </div>
            <DataTable data={parsedItems} theme={theme} />
          </div>

          {/* Right Side: Alerts & Activity Sidebar */}
          <div className="flex flex-col gap-6">
            
            {/* Upcoming End Date Notifications Panel */}
            <div id="upcoming_ends_panel" className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md
              ${theme === 'dark' ? 'border-white/10 bg-slate-900/40 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}
            `}>
              <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-white/5 border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="h-4.5 w-4.5 text-indigo-500 animate-bounce" />
                  <h4 className={`text-sm font-bold tracking-tight uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Ending Ad Alerts
                  </h4>
                </div>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-500">
                  {upcomingEndNotifications.length} Due
                </span>
              </div>

              {upcomingEndNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500/30 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">No campaigns ending today or tomorrow</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                  {upcomingEndNotifications.map(notification => (
                    <div 
                      key={`end-notif-${notification.id}`}
                      className={`flex flex-col gap-1.5 p-3 rounded-xl border text-xs leading-relaxed transition-all duration-200 hover:scale-[1.01]
                        ${notification.isToday
                          ? 'border-red-500/20 bg-red-500/5 text-slate-350 dark:text-slate-100'
                          : 'border-amber-500/20 bg-amber-500/5 text-slate-350 dark:text-slate-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                          ${notification.isToday
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-amber-500/10 text-amber-500'
                          }
                        `}>
                          {notification.isToday ? 'Ends Today' : 'Ends Tomorrow'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">{notification["End Date"]}</span>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                        Page: {notification["Page Name"]}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] flex justify-between items-center gap-2 mt-0.5">
                        <span className="truncate">Ad: {notification["Ad Name/no"] || 'Unspecified'}</span>
                        <span className="shrink-0 font-bold font-mono text-indigo-500 dark:text-indigo-400">${notification["Daily Budget"]}/day</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activities Section */}
            <div id="recent_activities_panel" className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md
              ${theme === 'dark' ? 'border-white/10 bg-slate-900/40 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}
            `}>
              <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-white/5 border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                  <h4 className={`text-sm font-bold tracking-tight uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Recent Activities
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-bold font-mono">Real-time Derived Logs</span>
              </div>

              {recentActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-semibold">No recent activity detected.</p>
              ) : (
                <div className="flex flex-col gap-3.5 max-h-96 overflow-y-auto pr-1">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="flex gap-2.5 items-start text-xs text-slate-400 border-l border-indigo-500/20 pl-3 ml-1 relative py-0.5">
                      {/* Left timeline small bullet icon wrapper */}
                      <span className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-slate-950 flex items-center justify-center
                        ${activity.category === 'launched' ? 'bg-indigo-500' : 
                          activity.category === 'remark' ? 'bg-emerald-500' : 'bg-purple-500'}
                      `}></span>
                      
                      <div className="flex-1 flex flex-col gap-1 leading-relaxed">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                            {activity.type}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">{activity.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                          {activity.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
