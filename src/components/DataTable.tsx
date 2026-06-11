/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  CircleAlert
} from 'lucide-react';
import { ParsedItem, Theme } from '../types';

interface DataTableProps {
  data: ParsedItem[];
  theme: Theme;
}

export const DataTable: React.FC<DataTableProps> = ({ data, theme }) => {
  const isDark = theme === 'dark';

  // State Management
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLETED' | 'OFF' | 'Ongoing'>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof ParsedItem | null>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Derive unique page list for the Page Name dropdown filter
  const uniquePages = useMemo(() => {
    const pages = new Set<string>();
    data.forEach(item => {
      if (item["Page Name"]) pages.add(item["Page Name"]);
    });
    return Array.from(pages).sort();
  }, [data]);

  // Reset all filters easily
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPageFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Sort Field Handler
  const handleSort = (field: keyof ParsedItem) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // -------------------------------------------------------------
  // ADVANCED FILTER ENGINE
  // -------------------------------------------------------------
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Search Box Fuzzy Match (Checks Name, Page, Remark, Status)
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        item["Page Name"].toLowerCase().includes(q) ||
        item["Ad Name/no"].toLowerCase().includes(q) ||
        item["Remark"].toLowerCase().includes(q) ||
        item["Number"].toString().includes(q) ||
        item["Status"].toLowerCase().includes(q);

      // Status Match
      const matchesStatus = statusFilter === 'all' || item["Status"] === statusFilter;

      // Page Name Droplist Match
      const matchesPage = pageFilter === 'all' || item["Page Name"] === pageFilter;

      // Date Range Match
      let matchesStartDate = true;
      let matchesEndDate = true;

      if (startDate) {
        const itemStart = new Date(item["Start Date"]);
        const filterStart = new Date(startDate);
        matchesStartDate = !isNaN(itemStart.getTime()) && itemStart >= filterStart;
      }

      if (endDate) {
        const itemEnd = new Date(item["End Date"]);
        const filterEnd = new Date(endDate);
        matchesEndDate = !isNaN(itemEnd.getTime()) && itemEnd <= filterEnd;
      }

      return matchesSearch && matchesStatus && matchesPage && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
      if (!sortField) return 0;
      
      let valA = a[sortField];
      let valB = b[sortField];

      // Safe numeric conversion
      if (typeof valA === 'string' && !isNaN(Number(valA))) valA = Number(valA);
      if (typeof valB === 'string' && !isNaN(Number(valB))) valB = Number(valB);

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, search, statusFilter, pageFilter, startDate, endDate, sortField, sortDirection]);

  // Pagination Calculus
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Adjust pagination safety index
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredData, totalPages, currentPage]);

  // -------------------------------------------------------------
  // EXPORT CURRENT FILTERED ROWS TO CSV (DYNAMIC CLIENT EXPORT)
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    // Define columns
    const headers = [
      'Number',
      'Page Name',
      'Ad Name/no',
      'Daily Budget',
      'Total Budget Limit',
      'Status',
      'Start Date',
      'End Date',
      'Total Spend',
      'Remark'
    ];

    // Build CSV Row content
    const csvContent = [
      headers.join(','), // Header row
      ...filteredData.map(item => [
        `"${item["Number"]}"`,
        `"${item["Page Name"].replace(/"/g, '""')}"`,
        `"${item["Ad Name/no"].replace(/"/g, '""')}"`,
        item["Daily Budget"],
        item["Total"],
        `"${item["Status"]}"`,
        `"${item["Start Date"]}"`,
        `"${item["End Date"]}"`,
        item["Total Spend"],
        `"${item["Remark"].replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // Trigger visual download file stream
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `meta_ads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="data_table_card" className="flex flex-col gap-6">
      
      {/* -------------------------------------------------------------
          FILTER BAR CONTROLS WITH GLASSMORPHISM STYLING
          ------------------------------------------------------------- */}
      <div
        id="filter_controls_wrapper"
        className={`rounded-2xl border p-5 shadow-sm transition-all duration-300
          ${isDark ? 'border-white/10 bg-slate-900/30' : 'border-slate-200/80 bg-white/50'}
        `}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2 border-b pb-3 border-dashed border-slate-700/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Filter className={`h-4.5 w-4.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h4 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Search & Filters
            </h4>
          </div>
          
          <button
            id="reset_filters_button"
            onClick={handleResetFilters}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200
              ${isDark 
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-slate-800' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-100'
              }
            `}
          >
            <RotateCcw className="h-3 w-3" />
            Clear Filters
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          
          {/* 1. Global Search query */}
          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Search Campaign / Page
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 shrink-0" />
              <input
                id="filter_search_input"
                type="text"
                placeholder="Type keyword..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm transition-all focus:outline-hidden focus:ring-2
                  ${isDark 
                    ? 'border-white/10 bg-slate-950/60 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500/20' 
                    : 'border-slate-250 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-600/10'
                  }
                `}
              />
            </div>
          </div>

          {/* 2. Status Select Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filter by Status
            </label>
            <select
              id="filter_status_select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-hidden focus:ring-2
                ${isDark 
                  ? 'border-white/10 bg-slate-950/60 text-slate-150 focus:border-indigo-500 focus:ring-indigo-500/20' 
                  : 'border-slate-250 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-600/10'
                }
              `}
            >
              <option value="all">🟢 Live Status: All</option>
              <option value="COMPLETED">✅ COMPLETED</option>
              <option value="OFF">🔴 OFF</option>
              <option value="Ongoing">🟠 Ongoing</option>
            </select>
          </div>

          {/* 3. Page Name Select Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filter by Facebook Page
            </label>
            <select
              id="filter_page_select"
              value={pageFilter}
              onChange={(e) => { setPageFilter(e.target.value); setCurrentPage(1); }}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-hidden focus:ring-2
                ${isDark 
                  ? 'border-white/10 bg-slate-950/60 text-slate-150 focus:border-indigo-500 focus:ring-indigo-500/20' 
                  : 'border-slate-250 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-600/10'
                }
              `}
            >
              <option value="all">📰 All Facebook Pages</option>
              {uniquePages.map(page => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
          </div>

          {/* 4. Start Date filter */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Runs on or after Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="filter_start_date"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm transition-all focus:outline-hidden focus:ring-2
                  ${isDark 
                    ? 'border-white/10 bg-slate-950/60 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500/20' 
                    : 'border-slate-250 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-600/10'
                  }
                `}
              />
            </div>
          </div>

          {/* 5. End Date filter */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Runs on or before Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="filter_end_date"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm transition-all focus:outline-hidden focus:ring-2
                  ${isDark 
                    ? 'border-white/10 bg-slate-950/60 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500/20' 
                    : 'border-slate-250 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-600/10'
                  }
                `}
              />
            </div>
          </div>

        </div>
      </div>

      {/* -------------------------------------------------------------
          TABLE & EXPORT EXECUTOR SECTION
          ------------------------------------------------------------- */}
      <div 
        className={`rounded-2xl border shadow-md overflow-hidden transition-all duration-300
          ${isDark ? 'border-white/10 bg-slate-900/40 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}
        `}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/10 dark:border-white/10 px-6 py-4.5">
          <div>
            <h3 id="table_card_main_heading" className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              Meta Campaigns Log
            </h3>
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-indigo-500">{filteredData.length}</span> entries match filters out of {data.length} total
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* CSV export activator */}
            <button
              id="export_csv_button"
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 shadow-sm
                ${filteredData.length === 0
                  ? 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-800'
                  : isDark
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700'
                }
              `}
            >
              <Download className="h-4 w-4" />
              Export filtered to CSV
            </button>
          </div>
        </div>

        {/* Scrollable responsive table framing */}
        <div className="overflow-x-auto w-full relative">
          <table id="google_sheets_data_table" className="w-full text-left border-collapse">
            {/* Sticky Table Header */}
            <thead className={`sticky top-0 z-10 select-none text-xs font-bold uppercase tracking-wider border-b border-slate-700/10 dark:border-white/15
              ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-500'}
            `}>
              <tr>
                <th 
                  onClick={() => handleSort('id')} 
                  className="px-5 py-4 cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    # <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Page Name')}
                  className="px-5 py-4 cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors min-w-[160px]"
                >
                  <div className="flex items-center gap-1.5">
                    Page Name <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Ad Name/no')}
                  className="px-5 py-4 cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors min-w-[150px]"
                >
                  <div className="flex items-center gap-1.5">
                    Ad Name / No <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Daily Budget')}
                  className="px-5 py-4 text-right cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Daily Budget <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Total')}
                  className="px-5 py-4 text-right cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Total Budget <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Status')}
                  className="px-5 py-4 cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Status <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Start Date')}
                  className="px-5 py-4 cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    Start Date <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('End Date')}
                  className="px-5 py-4 cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    End Date <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('Total Spend')}
                  className="px-5 py-4 text-right cursor-pointer hover:bg-slate-800/10 dark:hover:bg-white/5 transition-colors min-w-[120px]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Total Spend <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="px-5 py-4 min-w-[185px]">Remark</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-700/5 dark:divide-white/5">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500 dark:text-slate-450">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CircleAlert className="h-8 w-8 text-slate-400 shrink-0" />
                      <span className="font-semibold text-md">No records found</span>
                      <span className="text-xs text-slate-400">Try loosening your search filters or date boundaries above.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  return (
                    <tr 
                      key={item.id}
                      className={`text-sm transition-colors duration-150 group
                        ${isDark 
                          ? 'hover:bg-slate-800/50 text-slate-200' 
                          : 'hover:bg-slate-50 text-slate-800'
                        }
                      `}
                    >
                      {/* Number */}
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-450 group-hover:text-indigo-500 font-bold">
                        {item["Number"]}
                      </td>

                      {/* Page Name */}
                      <td className="px-5 py-3.5 font-medium min-w-[160px] truncate max-w-[200px]" title={item["Page Name"]}>
                        {item["Page Name"]}
                      </td>

                      {/* Ad Name/no */}
                      <td className="px-5 py-3.5 font-semibold font-mono text-xs tracking-tight text-slate-500 dark:text-slate-350 min-w-[150px]">
                        {item["Ad Name/no"]}
                      </td>

                      {/* Daily Budget */}
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-500 dark:text-emerald-450 font-semibold">
                        ${item["Daily Budget"].toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-3.5 text-right font-mono font-medium">
                        ${item["Total"].toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </td>

                      {/* Status badge trigger */}
                      <td className="px-5 py-3.5">
                        {item["Status"] === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20 shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            COMPLETED
                          </span>
                        )}
                        {item["Status"] === 'OFF' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-500 border border-rose-500/20 shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                            OFF
                          </span>
                        )}
                        {item["Status"] === 'Ongoing' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500 border border-amber-500/20 shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            Ongoing
                          </span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item["Start Date"] !== 'Invalid Date' ? item["Start Date"] : '-'}
                      </td>

                      {/* End Date */}
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item["End Date"] !== 'Invalid Date' ? item["End Date"] : '-'}
                      </td>

                      {/* Total Spend */}
                      <td className="px-5 py-3.5 text-right font-mono text-indigo-500 dark:text-indigo-400 font-extrabold text-sm">
                        ${item["Total Spend"].toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </td>

                      {/* Remark */}
                      <td className={`px-5 py-3.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} italic min-w-[185px] leading-snug`}>
                        {item["Remark"] || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* -------------------------------------------------------------
            PAGINATION & FOOTER CONFIG
            ------------------------------------------------------------- */}
        <div className={`flex flex-wrap items-center justify-between gap-4 border-t px-6 py-4.5 text-sm font-semibold select-none
          ${isDark ? 'border-white/10 bg-slate-950/20' : 'border-slate-100 bg-slate-50/50'}
        `}>
          <div className="flex items-center gap-4 text-slate-500">
            {/* Rows Limit Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Show</span>
              <select
                id="pagination_limit_select"
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors
                  ${isDark 
                    ? 'border-white/10 bg-slate-900 text-slate-200' 
                    : 'border-slate-200 bg-white text-slate-800'
                  }
                `}
              >
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={20}>20 Rows</option>
                <option value={50}>50 Rows</option>
              </select>
            </div>

            <span className="text-xs font-semibold">
              Rows {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
            </span>
          </div>

          {/* Current Index Controls */}
          <div className="flex items-center gap-1.5">
            <button
              id="pagination_prev_button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`flex items-center justify-center h-9 w-9 rounded-xl border transition-colors shadow-xs
                ${currentPage === 1
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : isDark
                    ? 'border-white/10 text-white hover:bg-slate-800'
                    : 'border-slate-250 text-slate-800 hover:bg-slate-100'
                }
              `}
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>

            {/* Loop render individual page numerical circles (limit to 5 visual circles) */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const pg = i + 1;
              const isSelected = pg === currentPage;

              // Simple bounding box logic so we don't display 100 pages inside the bar
              if (totalPages > 5 && Math.abs(pg - currentPage) > 2 && pg !== 1 && pg !== totalPages) {
                if (pg === 2 || pg === totalPages - 1) {
                  return <span key={pg} className="px-1 text-slate-500 text-xs font-medium">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={pg}
                  id={`pagination_page_circle_${pg}`}
                  onClick={() => setCurrentPage(pg)}
                  className={`h-9 w-9 rounded-xl text-xs font-bold transition-all duration-150
                    ${isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }
                  `}
                >
                  {pg}
                </button>
              );
            })}

            <button
              id="pagination_next_button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center h-9 w-9 rounded-xl border transition-colors shadow-xs
                ${currentPage === totalPages
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : isDark
                    ? 'border-white/10 text-white hover:bg-slate-800'
                    : 'border-slate-250 text-slate-800 hover:bg-white/95'
                }
              `}
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
