/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  WifiOff, 
  RefreshCcw, 
  Database, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { Theme } from '../types';

interface ErrorUIProps {
  onRetry: () => void;
  onUseMock: () => void;
  theme: Theme;
  errorMessage?: string;
}

export const ErrorUI: React.FC<ErrorUIProps> = ({ 
  onRetry, 
  onUseMock, 
  theme,
  errorMessage 
}) => {
  const isDark = theme === 'dark';

  return (
    <div 
      id="error_screen_container"
      className={`min-h-[70vh] flex items-center justify-center p-6`}
    >
      <div 
        id="error_card"
        className={`max-w-md w-full rounded-2xl border p-8 shadow-xl text-center relative overflow-hidden backdrop-blur-lg transition-all duration-300
          ${isDark 
            ? 'border-white/10 bg-slate-900/60 shadow-slate-950/40 text-slate-100' 
            : 'border-slate-200/80 bg-white/80 shadow-slate-200/50 text-slate-800'
          }
        `}
      >
        {/* Decorative alert color bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-orange-400 to-rose-500"></div>

        {/* Warning Icon with double pulsating bubble */}
        <div className="relative flex justify-center mb-6">
          <div className="absolute h-16 w-16 animate-ping rounded-full bg-rose-500/10 opacity-75"></div>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20">
            <WifiOff className="h-8 w-8" />
          </div>
        </div>

        {/* Header and Details */}
        <h3 className={`text-xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>
          Direct Google Sheets Connection Unresolved
        </h3>
        
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-6 leading-relaxed`}>
          The remote API server is currently unresponsive or the SheetDB trial credentials may have exceeded their standard monthly request threshold.
        </p>

        {errorMessage && (
          <div className={`text-xs font-mono rounded-lg p-3 text-left mb-6 break-all leading-normal
            ${isDark ? 'bg-slate-950/60 text-rose-400 border border-white/5' : 'bg-rose-50 text-rose-800'}
          `}>
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-500">
              <AlertTriangle className="h-3 w-3" />
              ERROR STATUS
            </div>
            {errorMessage}
          </div>
        )}

        {/* Actions Partition */}
        <div className="flex flex-col gap-3">
          
          <button
            id="error_retry_fetch_button"
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm px-4 py-3 rounded-xl transition-all duration-150 shadow-sm shadow-indigo-600/10 cursor-pointer"
          >
            <RefreshCcw className="h-4 w-4 animate-spin-reverse" />
            Re-Fetch Realtime Sheet
          </button>

          <div className="flex items-center my-1.5">
            <div className={`flex-1 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}></div>
            <span className="px-3 text-xs uppercase font-bold tracking-wider text-slate-400">Or</span>
            <div className={`flex-1 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}></div>
          </div>

          <button
            id="error_use_mock_button"
            onClick={onUseMock}
            className={`w-full flex items-center justify-center gap-2 border font-bold text-sm px-4 py-3 rounded-xl transition-all duration-150 cursor-pointer
              ${isDark 
                ? 'border-white/10 bg-slate-800/40 text-indigo-400 hover:bg-slate-800 hover:text-indigo-300' 
                : 'border-slate-200 bg-slate-50 text-indigo-600 hover:bg-slate-100'
              }
            `}
          >
            <Database className="h-4 w-4 text-indigo-400" />
            Switch to Offline Demo
          </button>
        </div>

        {/* Info panel */}
        <div className={`mt-6 pt-5 border-t flex items-start gap-2 text-left text-xs
          ${isDark ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-500'}
        `}>
          <HelpCircle className="h-4 w-4 text-slate-450 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Selecting <strong className="font-semibold text-slate-450">Offline Demo</strong> boots simulated campaign streams with complete charting, interactive table calculations, and dynamic filters utilizing local offline data.
          </p>
        </div>

      </div>
    </div>
  );
};
