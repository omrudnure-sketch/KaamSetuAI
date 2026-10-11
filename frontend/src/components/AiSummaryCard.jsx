import React from 'react';
import { Sparkles, AlertTriangle, Info, Clock, CheckCircle2, RotateCw } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    title: 'AI Project Summary',
    workerTitle: 'AI Work History Summary',
    disclaimer: 'AI-generated summary — verify against the original records.',
    keyPoints: 'Key Recorded Facts',
    blockers: 'Active Blockers Reported',
    missingInfo: 'Missing / Unrecorded Information',
    generatedAt: 'Generated',
    sourceUpdated: 'Source Records Updated',
    loading: 'Generating AI summary from verified records...',
    empty: 'No summary data available.',
    refresh: 'Refresh Summary',
  },
  mr: {
    title: 'AI प्रकल्प सारांश (Project Summary)',
    workerTitle: 'AI कामाचा इतिहास सारांश (Work History)',
    disclaimer: 'AI-द्वारे तयार केलेला सारांश — मूळ नोंदी तपासून खात्री करा.',
    keyPoints: 'नोंदवलेले महत्त्वाचे मुद्दे (Key Facts)',
    blockers: 'नोंदवलेले अडथळे (Blockers)',
    missingInfo: 'अनुपलब्ध / अपूर्ण माहिती (Missing Info)',
    generatedAt: 'तयार केले',
    sourceUpdated: 'मूळ माहिती अपडेट',
    loading: 'प्रकल्प नोंदींवरून AI सारांश तयार करत आहे...',
    empty: 'सारांश उपलब्ध नाही.',
    refresh: 'रिफ्रेश करा',
  },
  hi: {
    title: 'AI परियोजना सारांश (Project Summary)',
    workerTitle: 'AI कार्य इतिहास सारांश (Work History)',
    disclaimer: 'AI-जनित सारांश — मूल रिकॉर्ड से सत्यापित करें।',
    keyPoints: 'मुख्य दर्ज तथ्य (Key Facts)',
    blockers: 'सक्रिय बाधाएं (Active Blockers)',
    missingInfo: 'लापता / अनिर्धारित जानकारी (Missing Info)',
    generatedAt: 'उत्पन्न',
    sourceUpdated: 'स्रोत रिकॉर्ड अपडेट',
    loading: 'परियोजना रिकॉर्ड से AI सारांश उत्पन्न हो रहा है...',
    empty: 'कोई सारांश उपलब्ध नहीं है।',
    refresh: 'रिफ्रेश करें',
  },
};

export const AiSummaryCard = ({
  summaryData,
  loading = false,
  error = null,
  onRefresh,
  lang = 'en',
  type = 'project', // 'project' | 'worker' | 'employer' | 'complaint' | 'dispute'
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-primary font-medium">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  const { summary, keyPoints = [], blockers = [], missingInformation = [], generatedAt, sourceUpdatedAt } = summaryData;

  const cardTitle = type === 'worker' ? t.workerTitle : t.title;

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
      {/* Top Banner & Mandatory AI Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{cardTitle}</h3>
            <p className="text-[11px] font-medium text-slate-500 tracking-tight">
              {t.disclaimer}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title={t.refresh}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors self-start sm:self-auto"
          >
            <RotateCw className="w-3 h-3 text-slate-600" />
            <span>{t.refresh}</span>
          </button>
        )}
      </div>

      {/* Summary Paragraph */}
      <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        {summary}
      </div>

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            {t.keyPoints}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {keyPoints.map((point, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blockers (if any) */}
      {blockers.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            {t.blockers}
          </span>
          <div className="space-y-1.5">
            {blockers.map((b, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Information (if any) */}
      {missingInformation.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {t.missingInfo}
          </span>
          <div className="space-y-1">
            {missingInformation.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 italic">
                <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {t.generatedAt}: {generatedAt ? new Date(generatedAt).toLocaleTimeString() : 'Just now'}
        </span>
        {sourceUpdatedAt && (
          <span>
            {t.sourceUpdated}: {new Date(sourceUpdatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default AiSummaryCard;
