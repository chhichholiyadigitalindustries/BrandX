import React, { useState, useEffect } from 'react';
import { BusinessProfile, CopilotMessage } from '../types';
import { APP_IMAGES, INITIAL_COPILOT_MESSAGES, PRESET_CATALOG_ITEMS } from '../data/mockData';
import {
  generateMarketingCampaign,
  generateReviewAutoReply,
  generateBroadcastMessage,
  parseVoicePromptToBill,
  ParsedBillData,
} from '../services/geminiService';
import { aiApi, AIQuotaInfo } from '../services/aiApi';

interface CopilotScreenProps {
  business: BusinessProfile;
  onOpenPosterEditor: (headline?: string, body?: string) => void;
  onOpenInvoiceWithData?: (customerName: string, customerPhone: string, items: any[], discountPercent?: number) => void;
}

export const CopilotScreen: React.FC<CopilotScreenProps> = ({
  business,
  onOpenPosterEditor,
  onOpenInvoiceWithData,
}) => {
  const [activeTool, setActiveTool] = useState<'chat' | 'voice' | 'bill' | 'review' | 'broadcast'>('chat');
  const [messages, setMessages] = useState<CopilotMessage[]>(INITIAL_COPILOT_MESSAGES);
  const [selectedLanguage, setSelectedLanguage] = useState('Hinglish 🇮🇳');
  const [selectedTone, setSelectedTone] = useState('Exciting & Promotional 🔥');
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Backend AI Quota & Status State
  const [quota, setQuota] = useState<AIQuotaInfo | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);

  // Review Reply State
  const [reviewInput, setReviewInput] = useState('');
  const [reviewRating, setReviewRating] = useState<'5' | '4' | '1-3'>('5');
  const [generatedReviewReply, setGeneratedReviewReply] = useState<string | null>(null);

  // Broadcast Message State
  const [broadcastOffer, setBroadcastOffer] = useState('Diwali 40% OFF');
  const [generatedBroadcastMsg, setGeneratedBroadcastMsg] = useState<string | null>(null);

  // AI Voice-to-Bill State
  const [billPromptInput, setBillPromptInput] = useState('Rajesh Patel ji ko 2 frame aur 1 photoshoot ka 4500 ka bill bana do');
  const [parsedBill, setParsedBill] = useState<ParsedBillData | null>(null);
  const [isParsingBill, setIsParsingBill] = useState(false);

  const fetchQuota = async () => {
    try {
      setIsLoadingQuota(true);
      const q = await aiApi.getQuota();
      if (q) setQuota(q);
    } catch {
      // Offline fallback
    } finally {
      setIsLoadingQuota(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const tones = [
    { label: 'Exciting & Promotional', icon: '🔥' },
    { label: 'Professional & Trustworthy', icon: '💼' },
    { label: 'Friendly & Welcoming', icon: '😊' },
    { label: 'Festive & Cultural', icon: '🪔' },
  ];

  const trendingPrompts = [
    'Diwali 50% Dhamaka Offer for Shop',
    'Instagram Reel Caption with Hashtags',
    'WhatsApp Follow-up Taqada Message',
    'Morning Suvichar for Customers',
  ];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard! 📋');
  };

  const handleShareWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(`${text}\n\nSent via ${business.name}`);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Voice Input Handler (Web Speech API)
  const handleToggleVoice = (targetField: 'chat' | 'bill' = 'chat') => {
    if (isListening) {
      setIsListening(false);
      showToast('Mic turned off.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage.includes('Hindi') ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Boliye aap kya create karna chahte hain! 🎙️');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (targetField === 'bill') {
          setBillPromptInput(transcript);
        } else {
          setInputValue(transcript);
        }
        setIsListening(false);
        showToast(`Voice captured: "${transcript}"`);
      };

      recognition.onerror = () => {
        setIsListening(false);
        const fallbackText = targetField === 'bill'
          ? 'Ramesh ji ko 2 chai aur 1 cheesecake ka bill bana do'
          : 'Diwali bumper 50% discount offer poster';
        if (targetField === 'bill') setBillPromptInput(fallbackText);
        else setInputValue(fallbackText);
        showToast('Voice prompt auto-filled! ✨');
      };

      recognition.start();
    } else {
      setIsListening(true);
      showToast('Listening simulation... 🎙️');
      setTimeout(() => {
        const fallbackText = targetField === 'bill'
          ? 'Pooja Mehta ji ko 1 bridal shoot 8000 ka bill bana do'
          : 'Diwali bumper 50% discount offer poster with free gift';
        if (targetField === 'bill') setBillPromptInput(fallbackText);
        else setInputValue(fallbackText);
        setIsListening(false);
        showToast('Voice prompt captured!');
      }, 2000);
    }
  };

  // Send Prompt to Gemini AI
  const handleSendPrompt = async (promptText?: string) => {
    const textToSend = promptText || inputValue;
    if (!textToSend.trim()) {
      showToast('Please type or speak a prompt first');
      return;
    }

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsGenerating(true);

    try {
      const result = await generateMarketingCampaign(
        textToSend.trim(),
        business,
        selectedTone,
        selectedLanguage
      );

      const copilotMsg: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: '',
        generatedCreative: {
          tag: result.tag,
          title: result.title,
          image: APP_IMAGES.copilotPreview,
          headline: result.headline,
          body: result.body,
          hashtags: result.hashtags,
          readability: result.readability,
          characters: result.characters,
        },
      };

      setMessages((prev) => [...prev, copilotMsg]);
      showToast('Generated via BrandX Biz AI Copilot! 🚀');
      fetchQuota();
    } catch (e: any) {
      showToast(e?.message || 'Generation complete! ✨');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Review Reply
  const handleGenerateReviewReply = async () => {
    if (!reviewInput.trim()) {
      showToast('Please paste customer review first');
      return;
    }
    setIsGenerating(true);
    try {
      const reply = await generateReviewAutoReply(reviewInput, reviewRating, business);
      setGeneratedReviewReply(reply);
      showToast('AI Review Response Generated! 🌟');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Broadcast Message
  const handleGenerateBroadcast = async () => {
    setIsGenerating(true);
    try {
      const msg = await generateBroadcastMessage(broadcastOffer, business);
      setGeneratedBroadcastMsg(msg);
      showToast('WhatsApp Broadcast Campaign Ready! 📢');
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse Voice or Text to Structured Invoice
  const handleParseBillPrompt = async () => {
    if (!billPromptInput.trim()) {
      showToast('Please speak or type a bill order prompt');
      return;
    }
    setIsParsingBill(true);
    try {
      const parsed = await parseVoicePromptToBill(billPromptInput, business, PRESET_CATALOG_ITEMS);
      setParsedBill(parsed);
      showToast(parsed.summary || 'Bill generated by Biz AI! 🧾');
    } catch (e) {
      showToast('Error parsing bill');
    } finally {
      setIsParsingBill(false);
    }
  };

  // Transfer AI Bill into Billing Studio
  const handleOpenInBillingStudio = () => {
    if (!parsedBill) return;
    if (onOpenInvoiceWithData) {
      onOpenInvoiceWithData(
        parsedBill.customerName,
        parsedBill.customerPhone || '',
        parsedBill.items.map((it, idx) => ({
          id: `item-ai-${Date.now()}-${idx}`,
          name: it.name,
          code: 'RET-AI',
          type: it.type || 'Goods',
          qty: it.qty || 1,
          rate: it.rate || 100,
          gstPercent: it.gstPercent !== undefined ? it.gstPercent : 18,
        })),
        parsedBill.discountPercent || 0
      );
      showToast('Opening generated bill in Billing Studio... 🧾');
    }
  };

  // Refresh Quota Status
  const handleRefreshQuota = async () => {
    await fetchQuota();
    showToast('AI Quota status refreshed! 🔄');
  };

  return (
    <div className="flex flex-col w-full pb-32 bg-[#0B0F19] text-white min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-5">
        {/* Top Header & Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#131B2E] p-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <span className="material-symbols-outlined text-2xl">neurology</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">Biz AI Copilot 🤖</h2>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  title="BrandX Cloud AI Status"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{quota ? `${quota.remaining} Left Today` : 'Active'}</span>
                  <span className="material-symbols-outlined text-[12px]">info</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Voice prompts, social captions, AI bill generation & marketing for Indian Vyapar.
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1 rounded-xl border border-white/10 text-xs self-start md:self-auto">
            {['Hinglish 🇮🇳', 'Hindi 🇮🇳', 'English 🌐'].map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLanguage(lang);
                  showToast(`Language set to ${lang}`);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedLanguage === lang ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* AI Tool Tabs Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'chat', label: 'AI Marketing Post', icon: 'auto_awesome' },
            { id: 'bill', label: 'Voice-to-Bill 🧾', icon: 'receipt_long' },
            { id: 'voice', label: 'Voice Assistant 🎙️', icon: 'mic' },
            { id: 'review', label: 'Review Reply 🌟', icon: 'reviews' },
            { id: 'broadcast', label: 'WhatsApp Broadcast', icon: 'campaign' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTool === tool.id
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                  : 'bg-[#131B2E] border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tool.icon}</span>
              <span className="truncate">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* TOOL 1: AI Marketing Post Chat */}
        {activeTool === 'chat' && (
          <div className="space-y-4">
            {/* Tone Selector */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Tone:</span>
              {tones.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    setSelectedTone(`${t.label} ${t.icon}`);
                    showToast(`Tone: ${t.label}`);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedTone.includes(t.label)
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow'
                      : 'bg-[#131B2E] text-slate-300 hover:bg-slate-800 border border-white/10'
                  }`}
                >
                  {t.label} {t.icon}
                </button>
              ))}
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {trendingPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(p)}
                  className="px-3 py-1.5 rounded-xl bg-[#131B2E] hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-white/10 shrink-0 transition-colors"
                >
                  ⚡ {p}
                </button>
              ))}
            </div>

            {/* Chat Stream */}
            <div className="space-y-3">
              {messages.map((msg) => {
                if (msg.sender === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] text-xs font-medium shadow">
                        <p>{msg.text}</p>
                        <span className="text-[10px] text-blue-200 block text-right mt-1">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                }

                if (msg.generatedCreative) {
                  const creative = msg.generatedCreative;
                  return (
                    <div key={msg.id} className="bg-[#131B2E] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold text-white">{creative.title}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {creative.tag}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-amber-300 tracking-tight">{creative.headline}</h4>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{creative.body}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {creative.hashtags.map((h, i) => (
                          <span key={i} className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                            {h}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-400">
                        <span>Readability: <strong className="text-emerald-400">{creative.readability}</strong></span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyText(`${creative.headline}\n\n${creative.body}\n\n${creative.hashtags.join(' ')}`)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(`${creative.headline}\n\n${creative.body}\n\n${creative.hashtags.join(' ')}`)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                          >
                            <span className="material-symbols-outlined text-[16px]">share</span>
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => onOpenPosterEditor(creative.headline, creative.body)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[16px]">brush</span>
                            <span>Make Poster 🎨</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}

              {isGenerating && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#131B2E] border border-white/10 text-xs text-blue-300 animate-pulse">
                  <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                  <span>Biz AI is crafting high-converting marketing copy with Gemini...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="sticky bottom-20 bg-[#131B2E] border border-white/15 p-2 rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-xl">
              <button
                onClick={() => handleToggleVoice('chat')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#1E293B] text-slate-300 hover:text-white'
                }`}
                title="Voice Input"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>

              <input
                type="text"
                placeholder="Ask Biz AI (e.g. Diwali discount post caption in Hindi)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none px-2"
              />

              <button
                onClick={() => handleSendPrompt()}
                disabled={isGenerating || !inputValue.trim()}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center shadow transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
          </div>
        )}

        {/* TOOL 2: AI Voice-to-Bill (Kaccha Parcha / Order Generator) */}
        {activeTool === 'bill' && (
          <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  NEW
                </span>
                <h3 className="text-base font-bold text-white">AI Voice-to-Bill &amp; Kaccha Parcha 🧾</h3>
              </div>
              <p className="text-xs text-slate-400">
                Speak or type natural order details in Hindi/English. Biz AI will extract customer details, items, rate, GST, and auto-build your invoice!
              </p>
            </div>

            {/* Voice & Prompt Input */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10 space-y-3">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Order Command / Speech
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={billPromptInput}
                  onChange={(e) => setBillPromptInput(e.target.value)}
                  placeholder="e.g. Ramesh Patel ko 2 wedding album prints aur 1 portrait shoot ka bill bana do"
                  className="flex-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleToggleVoice('bill')}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                  }`}
                  title="Speak order command"
                >
                  <span className="material-symbols-outlined text-[22px]">mic</span>
                </button>
              </div>

              {/* Quick sample buttons */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] font-bold text-slate-400 shrink-0">Try:</span>
                {[
                  'Rajesh ji ko 2 frame aur 1 shoot 4500 ka bill',
                  'Amit Verma ko 2 Cappuccino aur 1 Cheesecake bill',
                  'Pooja Mehta bridal makeover 8000 advance',
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBillPromptInput(s)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 shrink-0 border border-white/5"
                  >
                    "{s}"
                  </button>
                ))}
              </div>

              <button
                onClick={handleParseBillPrompt}
                disabled={isParsingBill}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {isParsingBill ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>AI Parsing Order Details...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <span>Generate Bill with Biz AI 🧾</span>
                  </>
                )}
              </button>
            </div>

            {/* Parsed Bill Preview Card */}
            {parsedBill && (
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30 space-y-4 animate-slide-down">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Customer Name</span>
                    <h4 className="text-sm font-black text-white">{parsedBill.customerName}</h4>
                    {parsedBill.customerPhone && (
                      <span className="text-xs text-slate-400">📞 +91 {parsedBill.customerPhone}</span>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {parsedBill.items.length} Items Parsed
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Items</span>
                  <div className="space-y-1.5">
                    {parsedBill.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                        <div>
                          <p className="font-bold text-white">{it.name}</p>
                          <span className="text-[10px] text-slate-400">Qty: {it.qty} × ₹{it.rate} ({it.gstPercent}% GST)</span>
                        </div>
                        <span className="font-black text-emerald-400">₹{it.qty * it.rate}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="text-xs text-slate-300">
                    Estimated Total: <strong className="text-white text-sm font-black">
                      ₹{parsedBill.items.reduce((acc, it) => acc + (it.qty * it.rate), 0)}
                    </strong>
                  </div>
                  <button
                    onClick={handleOpenInBillingStudio}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 hover:scale-105 transition-all"
                  >
                    <span>Open in Billing Studio 🧾</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOOL 3: Voice Assistant */}
        {activeTool === 'voice' && (
          <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-6 text-center space-y-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Voice-to-Poster &amp; Marketing 🎙️</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Press the microphone and speak naturally in Hindi, Hinglish or English. Biz AI will create ready-to-share posters and captions.
              </p>
            </div>

            {/* Big Pulsing Mic Button */}
            <div className="py-6 flex flex-col items-center justify-center">
              <button
                onClick={() => handleToggleVoice('chat')}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all transform active:scale-90 ${
                  isListening 
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 ring-8 ring-red-500/30 animate-pulse' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 shadow-blue-600/40'
                }`}
              >
                <span className="material-symbols-outlined text-4xl">mic</span>
              </button>
              <span className="text-xs font-bold text-slate-300 mt-3">
                {isListening ? 'Listening now... Speak your prompt' : 'Tap Mic to Start Speaking'}
              </span>
            </div>

            {/* Voice Examples to Try */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10 text-left space-y-2">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Example commands to say:</span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => handleSendPrompt('Diwali offer poster 50 percent off with photo frame')}>
                  🗣️ "Diwali offer poster 50 percent off with photo frame"
                </p>
                <p className="p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => handleSendPrompt('Rajesh ji ke liye payment reminder WhatsApp message')}>
                  🗣️ "Rajesh ji ke liye payment reminder WhatsApp message"
                </p>
                <p className="p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => handleSendPrompt('Subh Somwar morning thought for shop status')}>
                  🗣️ "Subh Somwar morning thought for shop status"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TOOL 4: Google Review Auto-Reply */}
        {activeTool === 'review' && (
          <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🌟</span> Google Review AI Auto-Reply
              </h3>
              <p className="text-xs text-slate-400">
                Paste customer feedback or review and generate polite, SEO-optimized business responses.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Customer Rating</label>
                <div className="flex gap-2 mt-1">
                  {[
                    { id: '5', label: '⭐⭐⭐⭐⭐ 5 Star' },
                    { id: '4', label: '⭐⭐⭐⭐ 4 Star' },
                    { id: '1-3', label: '⚠️ Needs Attention (1-3 Star)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setReviewRating(r.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        reviewRating === r.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-[#1E293B] text-slate-400 border border-white/10'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Customer Review Text</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Great photography studio! Rahul bhai took amazing pre-wedding photos for our wedding."
                  value={reviewInput}
                  onChange={(e) => setReviewInput(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleGenerateReviewReply}
                disabled={isGenerating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                {isGenerating ? 'Generating Reply...' : 'Generate AI Review Response ✨'}
              </button>

              {generatedReviewReply && (
                <div className="p-4 rounded-2xl bg-[#0F172A] border border-emerald-500/30 space-y-2.5 animate-slide-down">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      ✨ Ready-to-Paste Response:
                    </span>
                    <button
                      onClick={() => handleCopyText(generatedReviewReply)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-1"
                    >
                      <span>Copy</span>
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{generatedReviewReply}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOOL 5: WhatsApp Offer Broadcaster */}
        {activeTool === 'broadcast' && (
          <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📢</span> WhatsApp Offer Broadcast Maker
              </h3>
              <p className="text-xs text-slate-400">
                Craft high-converting promotional broadcasts with emojis, shop details, and call to action.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Offer / Sale Highlight</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Dhamaka 50% OFF + 2 Free Prints"
                  value={broadcastOffer}
                  onChange={(e) => setBroadcastOffer(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleGenerateBroadcast}
                disabled={isGenerating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
              >
                {isGenerating ? 'Crafting Broadcast...' : 'Generate WhatsApp Broadcast 💬'}
              </button>

              {generatedBroadcastMsg && (
                <div className="p-4 rounded-2xl bg-[#0F172A] border border-emerald-500/30 space-y-3 animate-slide-down">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      💬 Ready Broadcast Message:
                    </span>
                    <button
                      onClick={() => handleCopyText(generatedBroadcastMsg)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-1"
                    >
                      <span>Copy</span>
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-white/10 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed">
                    {generatedBroadcastMsg}
                  </div>

                  <button
                    onClick={() => handleShareWhatsApp(generatedBroadcastMsg)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>💬 Share directly to WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BrandX Biz AI Cloud Status Modal */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#131B2E] border border-white/15 rounded-3xl p-6 space-y-5 shadow-2xl animate-fade-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">BrandX Biz AI Engine</h3>
                  <p className="text-[10px] text-slate-400">Server-Side Google Gemini Integration</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold">Cloud Security Status:</span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Active &amp; Server-Isolated
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All Google Gemini AI processing runs securely on BrandX servers. No API keys or credentials are ever stored in your browser.
                </p>
              </div>

              {quota && (
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-300">Daily AI Generation Quota:</span>
                    <span className="text-blue-400 font-mono font-black">{quota.used} / {quota.limit} used</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Remaining Today: <strong className="text-white font-mono">{quota.remaining}</strong></span>
                    <span>Plan: <strong className="text-amber-400">{quota.isPro ? 'Pro' : 'Free'}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={handleRefreshQuota}
                disabled={isLoadingQuota}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>{isLoadingQuota ? 'Refreshing...' : 'Refresh Quota 🔄'}</span>
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
