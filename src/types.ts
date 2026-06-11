/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SheetRow {
  Number: string | number;
  "Page Name": string;
  "Ad Name/no": string;
  "Daily Budget": string | number;
  Total?: string | number;
  "Total Budget"?: string | number;
  Status: string;
  "Start Date": string;
  "End Date": string;
  "Total Spend": string | number;
  Remark: string;
}

export interface ParsedItem {
  id: number;
  "Number": string;
  "Page Name": string;
  "Ad Name/no": string;
  "Daily Budget": number;
  "Total": number;
  "Status": 'COMPLETED' | 'OFF' | 'Ongoing';
  "Start Date": string;
  "End Date": string;
  "Total Spend": number;
  "Remark": string;
  rawStatus: string;
}

export type Theme = 'light' | 'dark';

export interface FilterState {
  searchQuery: string;
  status: 'all' | 'COMPLETED' | 'OFF' | 'Ongoing';
  startDate: string;
  endDate: string;
  pageName: string;
}

export interface DashboardStats {
  totalAds: number;
  totalBudget: number;
  totalSpend: number;
  completedAds: number;
  offAds: number;
  ongoingAds: number;
}
