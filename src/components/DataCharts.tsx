/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { ParsedItem, Theme } from '../types';

// Register all Chart.js controllers and elements needed
Chart.register(...registerables);

interface DataChartsProps {
  data: ParsedItem[];
  theme: Theme;
}

export const DataCharts: React.FC<DataChartsProps> = ({ data, theme }) => {
  // Chart Canvas References
  const spendChartRef = useRef<HTMLCanvasElement | null>(null);
  const budgetChartRef = useRef<HTMLCanvasElement | null>(null);
  const statusChartRef = useRef<HTMLCanvasElement | null>(null);
  const adsCountChartRef = useRef<HTMLCanvasElement | null>(null);

  // Chart Instances
  const spendChartInstance = useRef<Chart | null>(null);
  const budgetChartInstance = useRef<Chart | null>(null);
  const statusChartInstance = useRef<Chart | null>(null);
  const adsCountChartInstance = useRef<Chart | null>(null);

  // Constants for color schemes based on the active theme
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipTextColor = isDark ? '#f8fafc' : '#0f172a';

  useEffect(() => {
    // -------------------------------------------------------------
    // DATA AGGREGATION & WRANGLING
    // -------------------------------------------------------------

    // 1. Group Spend and Budgets by Page Name
    const pageAggregation: Record<string, { spend: number; budget: number; count: number }> = {};
    
    // Group individual items by Ad Name to show granular charts
    const adLabels = data.slice(0, 10).map(item => item["Ad Name/no"]);
    const adSpends = data.slice(0, 10).map(item => item["Total Spend"]);
    const adBudgets = data.slice(0, 10).map(item => item["Daily Budget"]);

    data.forEach(item => {
      const page = item["Page Name"] || 'Unknown Page';
      if (!pageAggregation[page]) {
        pageAggregation[page] = { spend: 0, budget: 0, count: 0 };
      }
      pageAggregation[page].spend += item["Total Spend"];
      pageAggregation[page].budget += item["Daily Budget"];
      pageAggregation[page].count += 1;
    });

    const pageLabels = Object.keys(pageAggregation);
    const pageSpends = pageLabels.map(p => pageAggregation[p].spend);
    const pageBudgets = pageLabels.map(p => pageAggregation[p].budget);
    const pageCounts = pageLabels.map(p => pageAggregation[p].count);

    // 2. Count statuses
    let completedCount = 0;
    let offCount = 0;
    let ongoingCount = 0;

    data.forEach(item => {
      if (item["Status"] === 'COMPLETED') completedCount++;
      else if (item["Status"] === 'OFF') offCount++;
      else ongoingCount++;
    });

    // -------------------------------------------------------------
    // 1. SPEND CHART (Bar Chart showing Spends by Ad Campaign)
    // -------------------------------------------------------------
    if (spendChartRef.current) {
      if (spendChartInstance.current) spendChartInstance.current.destroy();

      const ctx = spendChartRef.current.getContext('2d');
      if (ctx) {
        // Create an elegant gradient for spend
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#10b981'); // Emerald 500
        gradient.addColorStop(1, '#059669'); // Emerald 600

        spendChartInstance.current = new Chart(spendChartRef.current, {
          type: 'bar',
          data: {
            labels: adLabels.length > 0 ? adLabels : ['No Data'],
            datasets: [
              {
                label: 'Total Spend ($)',
                data: adSpends.length > 0 ? adSpends : [0],
                backgroundColor: gradient,
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: tooltipTextColor,
                bodyColor: tooltipTextColor,
                usePointStyle: true,
                callbacks: {
                  label: (context) => ` Spend: $${context.parsed.y.toLocaleString()}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Inter' } },
              },
              y: {
                grid: { color: gridColor },
                border: { dash: [4, 4] },
                ticks: {
                  color: textColor,
                  font: { family: 'Inter' },
                  callback: (value) => `$${Number(value).toLocaleString()}`,
                },
              },
            },
          },
        });
      }
    }

    // -------------------------------------------------------------
    // 2. BUDGET CHART (Line Chart showing Daily Budgets per Ad)
    // -------------------------------------------------------------
    if (budgetChartRef.current) {
      if (budgetChartInstance.current) budgetChartInstance.current.destroy();

      const ctx = budgetChartRef.current.getContext('2d');
      if (ctx) {
        // Create line gradient
        const lineGradient = ctx.createLinearGradient(0, 0, 0, 300);
        lineGradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)'); // Indigo 500
        lineGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        budgetChartInstance.current = new Chart(budgetChartRef.current, {
          type: 'line',
          data: {
            labels: adLabels.length > 0 ? adLabels : ['No Data'],
            datasets: [
              {
                label: 'Daily Budget ($)',
                data: adBudgets.length > 0 ? adBudgets : [0],
                borderColor: '#6366f1',
                borderWidth: 3,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: isDark ? '#0f172a' : '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                backgroundColor: lineGradient,
                tension: 0.35,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: tooltipTextColor,
                bodyColor: tooltipTextColor,
                callbacks: {
                  label: (context) => ` Daily Budget: $${context.parsed.y.toLocaleString()}/day`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Inter' } },
              },
              y: {
                grid: { color: gridColor },
                border: { dash: [4, 4] },
                ticks: {
                  color: textColor,
                  font: { family: 'Inter' },
                  callback: (value) => `$${value}`,
                },
              },
            },
          },
        });
      }
    }

    // -------------------------------------------------------------
    // 3. STATUS PIE CHART (Doughnut representing Ad Statuses)
    // -------------------------------------------------------------
    if (statusChartRef.current) {
      if (statusChartInstance.current) statusChartInstance.current.destroy();

      statusChartInstance.current = new Chart(statusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'Off', 'Ongoing'],
          datasets: [
            {
              data: [completedCount, offCount, ongoingCount],
              backgroundColor: ['#10b981', '#f43f5e', '#f97316'], // green, red, orange
              borderWidth: isDark ? 3 : 2,
              borderColor: isDark ? '#0f172a' : '#ffffff',
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColor,
                padding: 18,
                font: { family: 'Inter', size: 12, weight: 500 },
                usePointStyle: true,
                pointStyle: 'circle',
              },
            },
            tooltip: {
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderWidth: 1,
              titleColor: tooltipTextColor,
              bodyColor: tooltipTextColor,
            },
          },
        },
      });
    }

    // -------------------------------------------------------------
    // 4. ADS COUNT BY PAGE NAME (Horizontal Bar Chart)
    // -------------------------------------------------------------
    if (adsCountChartRef.current) {
      if (adsCountChartInstance.current) adsCountChartInstance.current.destroy();

      const ctx = adsCountChartRef.current.getContext('2d');
      if (ctx) {
        const horizGradient = ctx.createLinearGradient(0, 0, 300, 0);
        horizGradient.addColorStop(0, '#a855f7'); // Purple 500
        horizGradient.addColorStop(1, '#ec4899'); // Pink 500

        adsCountChartInstance.current = new Chart(adsCountChartRef.current, {
          type: 'bar',
          data: {
            labels: pageLabels.length > 0 ? pageLabels : ['No Pages'],
            datasets: [
              {
                label: 'Number of Campaigns',
                data: pageCounts.length > 0 ? pageCounts : [0],
                backgroundColor: horizGradient,
                borderRadius: 6,
                borderSkipped: false,
                barPercentage: 0.5,
              },
            ],
          },
          options: {
            indexAxis: 'y', // Convert to horizontal bar
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: tooltipTextColor,
                bodyColor: tooltipTextColor,
              },
            },
            scales: {
              x: {
                grid: { color: gridColor },
                border: { dash: [4, 4] },
                ticks: {
                  color: textColor,
                  font: { family: 'Inter' },
                  stepSize: 1,
                },
              },
              y: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
              },
            },
          },
        });
      }
    }

    // Cleanup all instances on unmount/update to prevent canvas overlays
    return () => {
      if (spendChartInstance.current) spendChartInstance.current.destroy();
      if (budgetChartInstance.current) budgetChartInstance.current.destroy();
      if (statusChartInstance.current) statusChartInstance.current.destroy();
      if (adsCountChartInstance.current) adsCountChartInstance.current.destroy();
    };
  }, [data, theme, isDark, textColor, gridColor, tooltipBg, tooltipBorder, tooltipTextColor]);

  return (
    <div id="dashboard_charts_container" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Spend Chart widget */}
      <div
        id="spend_chart_card"
        className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg
          ${isDark ? 'border-white/10 bg-slate-900/40 text-slate-150' : 'border-slate-200/80 bg-white/60 text-slate-800'}
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 id="spend_chart_title" className={`text-md font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Total Spend per Active Ad
            </h4>
            <p className="text-xs text-slate-400">Total accumulated budget spent on top Meta Ads</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
            Total Spend
          </span>
        </div>
        <div className="relative h-64 w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No data available</div>
          ) : (
            <canvas id="spend_chart_canvas" ref={spendChartRef}></canvas>
          )}
        </div>
      </div>

      {/* 2. Budget Chart widget */}
      <div
        id="budget_chart_card"
        className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg
          ${isDark ? 'border-white/10 bg-slate-900/40 text-slate-150' : 'border-slate-200/80 bg-white/60 text-slate-800'}
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 id="budget_chart_title" className={`text-md font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Daily Budget Allocation
            </h4>
            <p className="text-xs text-slate-400">Pacing trends of daily limit assignments</p>
          </div>
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-500">
            Daily Budget
          </span>
        </div>
        <div className="relative h-64 w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No data available</div>
          ) : (
            <canvas id="budget_chart_canvas" ref={budgetChartRef}></canvas>
          )}
        </div>
      </div>

      {/* 3. Status Pie Chart widget */}
      <div
        id="status_pie_card"
        className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg
          ${isDark ? 'border-white/10 bg-slate-900/40 text-slate-150' : 'border-slate-200/80 bg-white/60 text-slate-800'}
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 id="status_pie_title" className={`text-md font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Campaign Status Breakdown
            </h4>
            <p className="text-xs text-slate-400">Distribution ratio of ongoing, off, and completed ads</p>
          </div>
          <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-500 font-mono">
            Ratio
          </span>
        </div>
        <div className="relative h-64 w-full flex items-center justify-center">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No data available</div>
          ) : (
            <div className="relative w-full h-[220px]">
              <canvas id="status_chart_canvas" ref={statusChartRef}></canvas>
            </div>
          )}
        </div>
      </div>

      {/* 4. Ads Count by Page Name widget */}
      <div
        id="ads_count_card"
        className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg
          ${isDark ? 'border-white/10 bg-slate-900/40 text-slate-150' : 'border-slate-200/80 bg-white/60 text-slate-800'}
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 id="ads_count_title" className={`text-md font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Campaign Count by Facebook Page
            </h4>
            <p className="text-xs text-slate-400 font-medium">Volume distribution across social profiles and pages</p>
          </div>
          <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-500">
            Pages
          </span>
        </div>
        <div className="relative h-64 w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No data available</div>
          ) : (
            <canvas id="ads_count_canvas" ref={adsCountChartRef}></canvas>
          )}
        </div>
      </div>
    </div>
  );
};
