/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  value: number;
  format?: 'number' | 'currency';
  iconName: keyof typeof Icons;
  gradientClass: string;
  progressPercentage?: number;
  subtitle?: string;
  theme: 'light' | 'dark';
}

/**
 * Animated statistics counter component that tweens values smoothly
 */
const AnimatedCounter: React.FC<{ value: number; format?: 'number' | 'currency' }> = ({
  value,
  format = 'number',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;
    const duration = 1000; // 1 second animation duration

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Quadratic out easing function
      const easeOutQuad = progress * (2 - progress);
      const currentVal = Math.floor(easeOutQuad * (endValue - startValue) + startValue);
      
      setDisplayValue(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  if (format === 'currency') {
    return <span>${displayValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>;
  }
  return <span>{displayValue.toLocaleString('en-US')}</span>;
};

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  format = 'number',
  iconName,
  gradientClass,
  progressPercentage,
  subtitle,
  theme,
}) => {
  const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl
        ${
          theme === 'dark'
            ? 'border-white/10 bg-slate-900/40 text-slate-100 placeholder-slate-400 shadow-slate-950/50 backdrop-blur-md'
            : 'border-slate-200/80 bg-white/60 text-slate-800 placeholder-slate-400 shadow-slate-100/50 backdrop-blur-md'
        }
      `}
    >
      {/* Decorative colored glow bubble in the background */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-2xl ${gradientClass}`}></div>

      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {title}
          </p>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${gradientClass} text-white shadow-md shadow-orange-500/10`}>
            {IconComponent && <IconComponent className="h-6 w-6" />}
          </div>
        </div>

        <div className="mt-4">
          <h3 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
            <AnimatedCounter value={value} format={format} />
          </h3>
          
          {subtitle && (
            <p className={`mt-1.5 text-xs ${theme === 'dark' ? 'text-slate-400/80' : 'text-slate-500/80'}`}>
              {subtitle}
            </p>
          )}

          {progressPercentage !== undefined && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Utilization Rate</span>
                <span className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}>
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>
              <div className={`mt-1.5 h-1.5 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-linear-to-r from-indigo-500 to-sky-400"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
