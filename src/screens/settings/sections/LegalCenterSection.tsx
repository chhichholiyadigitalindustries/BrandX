import React, { useState, useEffect } from 'react';
import {
  LEGAL_DOCUMENTS,
  LEGAL_DISCLAIMER_NOTICE,
  LEGAL_DISCLAIMER_NOTICE_HINDI,
  LegalDocument,
} from '../../../data/legalDocuments';
import { useLanguage } from '../../../context/LanguageContext';

interface LegalCenterSectionProps {
  initialDocId?: string;
}

export const LegalCenterSection: React.FC<LegalCenterSectionProps> = ({ initialDocId = 'terms' }) => {
  const { isHindi } = useLanguage();
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (initialDocId && LEGAL_DOCUMENTS[initialDocId]) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  const docList = Object.values(LEGAL_DOCUMENTS);
  const currentDoc: LegalDocument = LEGAL_DOCUMENTS[selectedDocId] || LEGAL_DOCUMENTS.terms;

  const filteredSections = searchQuery.trim()
    ? currentDoc.sections.filter(
        (sec) =>
          sec.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (Array.isArray(sec.body)
            ? sec.body.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()))
            : sec.body.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : currentDoc.sections;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <span className="material-symbols-outlined text-[30px]">gavel</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'कानूनी केंद्र (Legal Center)' : 'BrandX Legal Center'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'नियम, शर्तें, गोपनीयता नीति और वैधानिक अनुपालन से संबंधित आधिकारिक दस्तावेज़।'
                : 'Official platform agreements, operational policies, and compliance documents.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-3 py-1 rounded-full shrink-0">
          {docList.length} Versioned Docs
        </span>
      </div>

      {/* 2. Mandatory Statutory Legal Disclaimer Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-400 text-[22px] shrink-0 mt-0.5">info</span>
        <div className="space-y-1 text-xs">
          <strong className="block text-white font-bold">
            {isHindi ? 'वैधानिक अस्वीकरण (Legal Disclaimer):' : 'Statutory Legal Notice:'}
          </strong>
          <p className="text-blue-100/90 leading-relaxed">
            &ldquo;{isHindi ? LEGAL_DISCLAIMER_NOTICE_HINDI : LEGAL_DISCLAIMER_NOTICE}&rdquo;
          </p>
        </div>
      </div>

      {/* 3. Document Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {docList.map((doc) => (
          <button
            key={doc.id}
            onClick={() => {
              setSelectedDocId(doc.id);
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedDocId === doc.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>{isHindi && doc.titleHindi ? doc.titleHindi : doc.title}</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                selectedDocId === doc.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-950 text-slate-500'
              }`}
            >
              v{doc.version}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Active Document Card */}
      <div className="p-4 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
        {/* Document Header & Metadata */}
        <div className="pb-5 border-b border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isHindi && currentDoc.titleHindi ? currentDoc.titleHindi : currentDoc.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isHindi && currentDoc.summaryHindi ? currentDoc.summaryHindi : currentDoc.summary}
              </p>
            </div>

            {/* Version Metadata Tag */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 text-[10px] font-mono text-slate-400 shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-cyan-300 font-bold border border-blue-500/30">
                v{currentDoc.version}
              </span>
              <span>Effective: {currentDoc.effectiveDate}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
            <span>Last Updated: {currentDoc.lastUpdated}</span>
            <span>
              Support Desk: <a href={`mailto:${currentDoc.contactEmail}`} className="text-blue-400 hover:underline">{currentDoc.contactEmail}</a>
            </span>
          </div>

          {/* Quick Search in Active Doc */}
          <div className="relative pt-2">
            <span className="material-symbols-outlined absolute left-3 top-4.5 text-slate-500 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHindi ? 'इस दस्तावेज़ में खोजें...' : 'Search within this document...'}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Document Body Sections */}
        <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
          {filteredSections.length > 0 ? (
            filteredSections.map((section, idx) => (
              <section key={idx} className="space-y-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-blue-500 inline-block" />
                  <span>{section.heading}</span>
                </h3>
                <div className="pl-3.5 space-y-2 text-slate-300">
                  {Array.isArray(section.body) ? (
                    section.body.map((para, pIdx) => (
                      <p key={pIdx} className="leading-relaxed">
                        {para}
                      </p>
                    ))
                  ) : (
                    <p className="leading-relaxed">{section.body}</p>
                  )}
                </div>
              </section>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 space-y-1">
              <span className="material-symbols-outlined text-[32px] text-slate-600 block">search_off</span>
              <span>No matching clauses found for &quot;{searchQuery}&quot;</span>
            </div>
          )}
        </div>

        {/* Document Footer */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            <span>Governing Jurisdiction: New Delhi, Republic of India</span>
          </div>
          <div>
            <a
              href={`mailto:${currentDoc.contactEmail}?subject=Inquiry%20regarding%20${encodeURIComponent(currentDoc.title)}`}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">mail</span>
              <span>Inquire about this policy</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
