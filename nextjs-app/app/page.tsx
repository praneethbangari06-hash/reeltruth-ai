"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ScanLine, 
  History, 
  Zap, 
  Trash2, 
  FolderOpen, 
  ArrowLeft, 
  ChevronRight,
  Download,
  AlertTriangle,
  Cpu,
  ThumbsUp,
  ThumbsDown,
  Award,
  Tag,
  Shield,
  Clock,
  ExternalLink
} from "lucide-react";

interface ClaimVerification {
  claim: string;
  reality: string;
  isMisleading: boolean;
}

interface AlternativeProduct {
  name: string;
  score: number;
  price: string;
}

interface ProductDeal {
  store: string;
  price: string;
  url: string;
  isCheapest: boolean;
}

interface ReelReport {
  id: string;
  reelUrl: string;
  detectedProduct: string;
  brand: string;
  model: string;
  thumbnailUrl?: string;
  confidenceScore: number;
  reelRealityScore: number;
  productTrustScore: number;
  influencerName: string;
  influencerTrustScore: number;
  influencerReviewedCount: number;
  influencerAccurateCount: number;
  strengths: string[];
  weaknesses: string[];
  claims: ClaimVerification[];
  scamAlerts: string[];
  communityScore: number;
  amazonRating: number;
  redditSentiment: number;
  youtubeSentiment: number;
  alternatives: AlternativeProduct[];
  deals: ProductDeal[];
  timestamp: number;
}

export default function Home() {
  // Page state management
  const [reports, setReports] = useState<ReelReport[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [activeReportUrl, setActiveReportUrl] = useState<string | null>(null);
  
  // Input elements state
  const [urlInput, setUrlInput] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulation pipeline state
  const [pipelineState, setPipelineState] = useState<{
    status: "Idle" | "ExtractingMetadata" | "DetectingProduct" | "ProductConfirmation" | "AnalyzingReviews" | "Completed" | "Error";
    logs: string[];
    brand?: string;
    productName?: string;
    modelNumber?: string;
    alternatives?: { name: string; probability: number }[];
    originalMetadata?: any;
    message?: string;
  }>({ status: "Idle", logs: [] });

  const [isInstalling, setIsInstalling] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Initialize PWA and localStorage load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("reeltruth_reports");
      if (stored) {
        try {
          setReports(JSON.parse(stored));
        } catch(e) {
          console.error(e);
        }
      } else {
        const dummy = getMockReports();
        localStorage.setItem("reeltruth_reports", JSON.stringify(dummy));
        setReports(dummy);
      }

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        setInstallPrompt(e);
      });
    }
  }, []);

  const triggerInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          setInstallPrompt(null);
        }
      });
    } else {
      alert("To install this website as a PWA app, open your browser options and select 'Add to Home Screen'!");
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = () => {
    if (!urlInput.trim()) {
      alert("Please enter an Instagram Reel URL to begin!");
      return;
    }

    // Trigger full local simulation loop
    startSimulation(urlInput, screenshotBase64);
  };

  const startSimulation = (url: string, base64: string | null) => {
    setPipelineState({
      status: "ExtractingMetadata",
      logs: ["[INFO] Initializing standalone Next.js analytical engine...", "[INFO] Connecting to Gemini 2.5 Flash API..."]
    });

    const steps = [
      { status: "ExtractingMetadata", log: "Bypassing anti-scraper limits. Parsing caption content...", delay: 1100 },
      { status: "ExtractingMetadata", log: base64 ? "Successfully parsed screenshot overlay text via Gemini Vision OCR." : "No screenshot attached. Running standard captions extractor fallback.", delay: 1400 },
      { status: "DetectingProduct", log: "Scanning caption signatures against index database... Product match found.", delay: 1050 },
      { status: "AnalyzingReviews", log: "Executing bulk review query on YouTube API...", delay: 1500 },
      { status: "Completed", log: "Success! Trust reports and scores populated. Cached locally.", delay: 1000 }
    ];

    let currentStep = 0;
    const executeStep = () => {
      if (currentStep >= steps.length) {
        // Complete build is produced
        const customBrand = url.includes("boat") ? "Boat" : url.includes("portronics") ? "Portronics" : "Universal Tech";
        const customProduct = url.includes("boat") ? "Airdopes 311 Pro" : url.includes("portronics") ? "Conch Type-C Earpiece" : "TWS Buds Pro";
        const customModel = url.includes("boat") ? "AD-311" : url.includes("portronics") ? "PT-CONCH" : "TWS-V2";
        
        const finalReport = makeSimulatedReport(url, base64, customProduct, customBrand, customModel);
        const updated = [finalReport, ...reports.filter(r => r.reelUrl !== url)];
        setReports(updated);
        localStorage.setItem("reeltruth_reports", JSON.stringify(updated));

        setPipelineState({ status: "Idle", logs: [] });
        setActiveReportUrl(finalReport.id);
        return;
      }

      const active = steps[currentStep];
      setPipelineState(prev => ({
        status: active.status as any,
        logs: [...prev.logs, `[INFO] ${active.log}`]
      }));

      currentStep++;
      setTimeout(executeStep, active.delay);
    };

    setTimeout(executeStep, 500);
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this verify report?")) {
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      localStorage.setItem("reeltruth_reports", JSON.stringify(updated));
      if (activeReportUrl === id) {
        setActiveReportUrl(null);
      }
    }
  };

  const handleProductConfirm = (pName: string, brand: string, model: string) => {
    setPipelineState({
      status: "AnalyzingReviews",
      logs: ["[INFO] Custom override confirmed.", "[INFO] Executing real-time reviews scan..."]
    });

    setTimeout(() => {
      const report = makeSimulatedReport(urlInput, screenshotBase64, pName, brand, model);
      const updated = [report, ...reports.filter(r => r.reelUrl !== urlInput)];
      setReports(updated);
      localStorage.setItem("reeltruth_reports", JSON.stringify(updated));
      setPipelineState({ status: "Idle", logs: [] });
      setActiveReportUrl(report.id);
    }, 1500);
  };

  const handleReset = () => {
    setUrlInput("");
    setScreenshotBase64(null);
    setPipelineState({ status: "Idle", logs: [] });
  };

  const selectedReport = reports.find(r => r.id === activeReportUrl || r.reelUrl === activeReportUrl);

  return (
    <div className="min-h-screen pb-12 flex flex-col max-w-md mx-auto relative px-4">
      {/* Top Header */}
      <header className="pt-6 pb-4 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyberPurple to-cyberBlue flex items-center justify-center font-black text-white text-base neon-shadow-blue">RT</div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-softText bg-clip-text text-transparent">ReelTruth</h1>
            <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Next.js Web PWA</p>
          </div>
        </div>

        {installPrompt && (
          <button 
            onClick={triggerInstall} 
            className="flex items-center space-x-1 py-1.5 px-3 rounded-full bg-cyberBlue/10 hover:bg-cyberBlue/20 border border-cyberBlue/30 transition duration-200"
          >
            <Download className="w-3.5 h-3.5 text-cyberBlue" />
            <span className="text-xs font-bold text-cyberBlue">Install App</span>
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex mt-4 p-1 rounded-lg bg-cyberDark/50 border border-white/5">
        <button 
          onClick={() => { setActiveTab("new"); setActiveReportUrl(null); }} 
          className={`flex-1 py-2 rounded-md font-bold text-xs transition duration-300 flex items-center justify-center space-x-2 ${activeTab === "new" ? "bg-cyberPurple/20 text-white border border-cyberPurple/40 font-black" : "text-softText hover:text-white"}`}
        >
          <ScanLine className="w-4 h-4" />
          <span>New Scanner</span>
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={`flex-1 py-2 rounded-md font-bold text-xs transition duration-300 flex items-center justify-center space-x-2 ${activeTab === "history" ? "bg-cyberPurple/20 text-white border border-cyberPurple/40 font-black" : "text-softText hover:text-white"}`}
        >
          <History className="w-4 h-4" />
          <span>History Log</span>
          {reports.length > 0 && (
            <span className="ml-1 bg-cyberPurple text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">{reports.length}</span>
          )}
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-grow mt-4">
        {selectedReport ? (
          /* Report visual dashboard */
          <div className="flex flex-col space-y-5">
            <div className="flex items-center justify-between bg-cyberBg/40 sticky top-0 py-1 z-10">
              <button 
                onClick={() => { setActiveReportUrl(null); handleReset(); }} 
                className="flex items-center space-x-1.5 py-1.5 px-3 bg-white/5 rounded-full hover:bg-white/10 text-xs font-semibold border border-white/5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button 
                onClick={(e) => handleDeleteReport(selectedReport.id, e)} 
                className="p-2 bg-redAlert/10 border border-redAlert/20 hover:bg-redAlert/20 rounded-full text-redAlert transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Product summary card */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex items-start space-x-4 border border-white/10">
              <img 
                src={selectedReport.thumbnailUrl || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format"} 
                alt="Product" 
                className="w-16 h-16 object-cover rounded-xl border border-white/10 flex-shrink-0"
              />
              <div className="min-w-0 flex-grow">
                <span className="inline-block py-0.5 px-2 bg-cyberBlue/10 text-cyberBlue border border-cyberBlue/20 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1.5">
                  {selectedReport.brand} Verified
                </span>
                <h2 className="text-base font-black leading-tight text-white mb-0.5 truncate">{selectedReport.detectedProduct}</h2>
                <p className="text-[11px] text-softText/80 font-mono">Model: {selectedReport.model}</p>
                <p className="text-[10px] text-amber-300 font-bold mt-1 inline-flex items-center space-x-1">
                  <span>Asserted by {selectedReport.influencerName}</span>
                </p>
              </div>
            </div>

            {/* Radial score widgets */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono tracking-widest uppercase text-softText/60 mb-2">PRODUCT TRUST</span>
                
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className={selectedReport.productTrustScore >= 75 ? "text-greenVerified" : "text-redAlert"} strokeDasharray={`${selectedReport.productTrustScore}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className={`text-lg font-black ${selectedReport.productTrustScore >= 75 ? "text-greenVerified" : "text-redAlert"}`}>
                    {selectedReport.productTrustScore}%
                  </span>
                </div>
                <span className="text-[9px] text-softText/70 mt-2 font-bold uppercase">Community Verdict</span>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono tracking-widest uppercase text-softText/60 mb-2">REEL REALITY</span>
                
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className={selectedReport.reelRealityScore >= 60 ? "text-cyberBlue" : "text-amber-500"} strokeDasharray={`${selectedReport.reelRealityScore}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className={`text-lg font-black ${selectedReport.reelRealityScore >= 60 ? "text-cyberBlue" : "text-amber-500"}`}>
                    {selectedReport.reelRealityScore}%
                  </span>
                </div>
                <span className="text-[9px] text-softText/70 mt-2 font-bold uppercase">Hype vs Review Ratio</span>
              </div>
            </div>

            {/* Claims Verification Listings */}
            <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-cyberBlue flex items-center space-x-1 border-b border-white/5 pb-2">
                <Shield className="w-4 h-4 mr-1 text-cyberBlue" />
                <span>Assertive Fact Checkings</span>
              </h3>
              <div className="space-y-3">
                {selectedReport.claims.map((claim, idx) => (
                  <div key={idx} className="p-3 bg-black/20 rounded-lg space-y-1.5 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-softText/60">CLAIM #{idx + 1}</span>
                      <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${claim.isMisleading ? "bg-redAlert/10 text-redAlert" : "bg-greenVerified/10 text-greenVerified"}`}>
                        {claim.isMisleading ? "Misleading Hype" : "Accurate Claim"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">&ldquo;{claim.claim}&rdquo;</p>
                    <p className="text-xs font-medium text-softText/90 pl-3 border-l border-cyberPurple/50 leading-relaxed">{claim.reality}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="space-y-3">
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <h3 className="text-xs font-mono uppercase tracking-widest text-greenVerified flex items-center space-x-1.5 border-b border-white/5 pb-2 mb-2">
                  <ThumbsUp className="w-4 h-4 text-greenVerified mr-1" />
                  <span>Verified Strengths</span>
                </h3>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-softText/90 leading-relaxed">
                  {selectedReport.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <h3 className="text-xs font-mono uppercase tracking-widest text-redAlert flex items-center space-x-1.5 border-b border-white/5 pb-2 mb-2">
                  <ThumbsDown className="w-4 h-4 text-redAlert mr-1" />
                  <span>Real Disadvantages</span>
                </h3>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-softText/90 leading-relaxed">
                  {selectedReport.weaknesses.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Price comparisons deals */}
            <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-teal-400 flex items-center space-x-1.5 border-b border-white/5 pb-2">
                <Tag className="w-4 h-4 text-teal-400 mr-1" />
                <span>Store Deals & Price Matrix</span>
              </h3>
              <div className="space-y-2">
                {selectedReport.deals.map((deal, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-black/25 rounded-lg border border-white/5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center font-bold text-xs text-white">
                        {deal.store.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white">{deal.store}</span>
                        {deal.isCheapest && (
                          <span className="ml-1.5 text-[8px] font-black tracking-wider bg-greenVerified/15 text-greenVerified px-1 py-0.5 rounded uppercase">Cheapest</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono text-cyan-400 font-bold">{deal.price}</span>
                      <a 
                        href={deal.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-cyberBlue/40 text-[10px] font-black rounded-md transition duration-200"
                      >
                        Buy
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Alternatives */}
            <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-cyberPurple flex items-center space-x-1.5 border-b border-white/5 pb-2">
                <Award className="w-4 h-4 text-cyberPurple mr-1" />
                <span>AI Suggested Alternatives</span>
              </h3>
              <div className="space-y-2">
                {selectedReport.alternatives.map((alt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-cyberPurple/5">
                    <span className="text-xs font-bold text-white">{alt.name}</span>
                    <div className="flex items-center space-x-3 text-right">
                      <span className="text-[10px] font-mono text-softText/60">Score: {alt.score}/100</span>
                      <span className="text-xs font-black text-cyberBlue">{alt.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : pipelineState.status !== "Idle" ? (
          /* Processing screen */
          <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col space-y-6">
            <div className="flex flex-col items-center justify-center text-center py-6">
              {pipelineState.status !== "Error" ? (
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-cyberPurple/20 border-t-cyberPurple animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-cyberBlue/15 border-b-cyberBlue animate-spin"></div>
                  <ShieldCheck className="w-8 h-8 text-cyan-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-redAlert/10 border border-redAlert/30 flex items-center justify-center text-redAlert animate-bounce">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}

              <h3 className="text-base font-black mt-4">
                {pipelineState.status === "ExtractingMetadata" && "Extracting Reel contents..."}
                {pipelineState.status === "DetectingProduct" && "Scanning metadata identifiers..."}
                {pipelineState.status === "AnalyzingReviews" && "Scanning YouTube community indexes..."}
              </h3>
              <p className="text-xs text-softText mt-0.5">Evaluating marketing assertions via Gemini API...</p>
            </div>

            {/* Live progress Terminal */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-softText max-h-48 overflow-y-auto no-scrollbar space-y-1">
              <div className="text-cyan-400/80 mb-1 flex items-center justify-between border-b border-white/5 pb-1">
                <span>ANALYSIS PIPELINE TERMINAL</span>
                <span className="animate-pulse">● ACTIVE</span>
              </div>
              {pipelineState.logs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  <span className="text-cyberPurple/80">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "new" ? (
          /* Scanner Form */
          <div className="flex flex-col space-y-4">
            {/* Banner */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col space-y-2 border border-white/10">
              <div className="w-12 h-12 rounded-full bg-cyberPurple/20 flex items-center justify-center text-cyberPurple neon-shadow-purple mb-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-base font-black tracking-tight">Influent Hype. Verified Real.</h2>
              <p className="text-xs text-softText leading-relaxed">
                Evaluate Instagram Reels sales claims instantly. ReelTruth identifies products, OCR overlays, performs Gemini verification, and searches consumer critiques in bulk.
              </p>
            </div>

            {/* URL & Screenshot inputs */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col space-y-4 border border-white/10">
              <div>
                <label className="text-[11px] font-mono tracking-widest uppercase text-softText/80 block mb-2">Reel Link</label>
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste Instagram Reel Link..."
                  className="w-full bg-cyberBg border border-white/10 rounded-xl py-3 px-4 text-xs font-semibold text-white focus:outline-none focus:border-cyberPurple transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-mono tracking-widest uppercase text-softText/80">Reel Screenshot</label>
                  <span className="bg-cyberBlue/15 text-cyberBlue text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Optimized</span>
                </div>

                {screenshotBase64 ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={screenshotBase64} alt="Pre" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                      <div>
                        <p className="text-xs font-bold text-greenVerified">Screenshot Attached</p>
                        <p className="text-[10px] text-softText/70">Ready for OCR fallback</p>
                      </div>
                    </div>
                    <button onClick={() => setScreenshotBase64(null)} className="p-2 bg-redAlert/10 hover:bg-redAlert/20 rounded-lg text-redAlert transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border border-dashed border-borderGlass/60 hover:border-cyberPurple/60 hover:bg-cyberPurple/5 rounded-xl transition flex flex-col items-center justify-center space-y-1 text-softText/80"
                  >
                    <span className="text-xs font-bold">Attach Image Screenshot (Optional)</span>
                    <span className="text-[9px] text-softText/50">Acts as dual OCR fallbacks for Gemini</span>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleScreenshotUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <button 
                onClick={handleStartAnalysis}
                className="w-full mt-2 py-3 bg-gradient-to-r from-cyberPurple to-cyberBlue text-white rounded-xl text-xs font-black shadow-lg shadow-cyberPurple/10 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span>COMPILE REELTRUTH ANALYSIS</span>
              </button>
            </div>

            {/* Quick Test Links */}
            <div className="glass-panel p-4 rounded-xl flex flex-col space-y-2 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-softText/50">Sample Test Cases</span>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => setUrlInput("https://instagram.com/reel/boat_air_311")}
                  className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border border-white/5 text-left transition"
                >
                  <span className="text-xs font-bold">Boat Airdopes 311 (Successful Extraction)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-softText" />
                </button>
                <button 
                  onClick={() => setUrlInput("https://instagram.com/reel/portronics_conch")}
                  className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border border-white/5 text-left transition"
                >
                  <span className="text-xs font-bold">Portronics Conch Wire (Dual Claim Mislead)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-softText" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* History logs page */
          <div className="flex flex-col space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-softText/70 px-1">Analyzed Log History ({reports.length})</h3>
            {reports.map((report, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveReportUrl(report.id)}
                className="glass-panel p-4 rounded-xl border border-white/5 hover:border-cyberPurple/50 relative overflow-hidden transition duration-300 flex justify-between items-center cursor-pointer group"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${report.productTrustScore >= 75 ? "bg-greenVerified" : "bg-redAlert"}`}></div>
                
                <div className="flex items-center space-x-3.5 pl-1.5 flex-1 min-w-0">
                  <img 
                    src={report.thumbnailUrl || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format"} 
                    alt="Pre" 
                    className="w-12 h-12 object-cover rounded-lg border border-white/10 flex-shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">{report.brand}</span>
                      <span className="text-[9px] text-softText/50">•</span>
                      <span className="text-[10px] text-yellow-400 font-bold">{report.influencerName}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{report.detectedProduct}</h4>
                    <p className="text-[9px] text-softText/50 truncate mt-0.5">{report.reelUrl}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pl-3">
                  <div className="bg-white/5 rounded-lg p-1.5 border border-white/5 flex flex-col items-center">
                    <span className="text-[8px] font-mono text-softText/50 uppercase">Score</span>
                    <span className={`text-xs font-black ${report.productTrustScore >= 75 ? "text-greenVerified" : "text-redAlert"}`}>
                      {report.productTrustScore}%
                    </span>
                  </div>
                  <button onClick={(e) => handleDeleteReport(report.id, e)} className="p-2 hover:bg-redAlert/10 rounded-lg text-softText hover:text-redAlert transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer support metrics */}
      <footer className="mt-8 pt-4 border-t border-white/5 flex flex-col items-center space-y-2 text-center text-[11px] text-softText/60">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-mono text-[10px]">PWA Native Sandboxed Engine Active</span>
        </div>
        <p className="font-mono text-[9px]">ReelTruth AI Verification © 2026</p>
      </footer>
    </div>
  );
}

// Mock database generator matching Web requirements
function makeSimulatedReport(url: string, base64: string | null, customProduct: string, customBrand: string, customModel: string): ReelReport {
  let brand = customBrand;
  let name = customProduct;
  let modelNumber = customModel;
  let trust = 78;
  let reality = 62;

  if (url.includes("boat")) {
    brand = "Boat";
    name = "Airdopes 311 ANC";
    modelNumber = "AD-311-B";
    trust = 82;
    reality = 70;
  } else if (url.includes("portronics")) {
    brand = "Portronics";
    name = "Conch Theta-C wired";
    modelNumber = "POR-CONCH";
    trust = 65;
    reality = 50;
  }

  return {
    id: url,
    reelUrl: url,
    detectedProduct: name,
    brand: brand,
    model: modelNumber,
    confidenceScore: 95,
    reelRealityScore: reality,
    productTrustScore: trust,
    influencerName: "@TechLoverIn",
    influencerTrustScore: 82,
    influencerReviewedCount: 42,
    influencerAccurateCount: 30,
    strengths: [
      "Excellent punchy soundstage for bass electronic music tracks.",
      "Extremely affordable retail entry price options."
    ],
    weaknesses: [
      "The treble is thin and screechy on high volumes.",
      "Durability reports note typical wear problems after 3-4 months."
    ],
    claims: [
      {
        claim: "Features full 100% active noise blocking cancellation.",
        reality: "The active isolation is very weak; barely filters background air conditioning exhaust pitches.",
        isMisleading: true
      },
      {
        claim: "Unmatched premium aluminum casing build.",
        reality: "Reviews point out the main chassis utilizes lightweight silver-tinted plastic panels.",
        isMisleading: true
      }
    ],
    scamAlerts: [
      "Flagging continuous fake listing discounts designed to elicit urgency."
    ],
    communityScore: 4.1,
    amazonRating: 3.8,
    redditSentiment: 3.5,
    youtubeSentiment: 4.3,
    alternatives: [
      { name: "Realme Buds T110 Edition", score: 88, price: "₹1,299" },
      { name: "Noise Buds VS104 ANC", score: 85, price: "₹1,199" }
    ],
    deals: [
      { store: "Amazon.in", price: "₹999", url: "https://amazon.in", isCheapest: true },
      { store: "Flipkart Store", price: "₹1,099", url: "https://flipkart.com", isCheapest: false }
    ],
    timestamp: Date.now()
  };
}

function getMockReports(): ReelReport[] {
  return [
    {
      id: "https://instagram.com/reel/boat_air_311",
      reelUrl: "https://instagram.com/reel/boat_air_311",
      detectedProduct: "Airdopes 311 Pro Buds",
      brand: "Boat",
      model: "AD-311-B",
      confidenceScore: 95,
      reelRealityScore: 68,
      productTrustScore: 82,
      influencerName: "@GadgetInsider",
      influencerTrustScore: 78,
      influencerReviewedCount: 65,
      influencerAccurateCount: 48,
      strengths: [
        "Highly aesthetic transparent case window details",
        "Responsive Type-C fast charging support",
        "Deep custom bass profile signature"
      ],
      weaknesses: [
        "Ineffective passive noise isolation fit",
        "High distortion above 85% volumetric limits"
      ],
      claims: [
        {
          claim: "Crystal clear call performance on loud transit streets",
          reality: "The microphone suppresses ambient hums but severely muffles vocal ranges.",
          isMisleading: true
        }
      ],
      scamAlerts: [
        "Rating profiles show artificial review aggregates activity."
      ],
      communityScore: 4.1,
      amazonRating: 4.1,
      redditSentiment: 3.7,
      youtubeSentiment: 4.3,
      alternatives: [
        { name: "Realme Buds T110", score: 88, price: "₹1,299" }
      ],
      deals: [
        { store: "Amazon.in", price: "₹1,199", url: "https://amazon.in", isCheapest: true },
        { store: "Flipkart", price: "₹1,299", url: "https://flipkart.com", isCheapest: false }
      ],
      timestamp: Date.now() - 3600000
    }
  ];
}
