import Link from 'next/link';

export default function Home() {
  return (
    <div className="h-screen w-full flex flex-col justify-between bg-[#07080d] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.22),rgba(255,255,255,0))] text-slate-100 overflow-hidden relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f111a_1px,transparent_1px),linear-gradient(to_bottom,#0f111a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

      {/* Header */}
      <header className="h-16 w-full max-w-7xl mx-auto flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-indigo-500/20">
            LF
          </div>
          <span className="font-bold text-base text-white">LeadForge AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs font-semibold text-slate-300 hover:text-white transition duration-200">
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-200 cursor-pointer"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto z-10 py-4 sm:py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] sm:text-xs font-semibold text-indigo-400 mb-4 tracking-wide uppercase">
          🚀 AI-Powered CRM & Outreach Platform
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Find Leads. Analyze Businesses.<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Personalize Outreach.
          </span>
        </h1>
        
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          LeadForge AI is the next-generation sales automation suite. Scrape local leads from Google Maps, run deep business SEO audits, and generate custom cold emails utilizing advanced AI.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center w-full max-w-sm">
          <Link
            href="/register"
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-5 rounded-lg shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            Start for Free
          </Link>
          <Link
            href="/login"
            className="flex-1 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-white font-semibold py-3 px-5 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            Access Dashboard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 w-full max-w-7xl mx-auto flex items-center justify-center border-t border-slate-900 px-6 text-[10px] sm:text-xs text-slate-500 z-10 shrink-0">
        &copy; {new Date().getFullYear()} LeadForge AI. All rights reserved. Built for high-conversion outreach.
      </footer>
    </div>
  );
}

