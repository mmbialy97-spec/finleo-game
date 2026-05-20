import Link from "next/link";
import { TickerTape } from "@/components/ticker-tape";
import { ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Top scrolling ticker tape */}
      <div className="absolute inset-x-0 top-0 z-10 border-b border-arena-border bg-arena-panel/60 backdrop-blur">
        <TickerTape />
      </div>

      {/* Grid backdrop */}
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden />

      {/* Glow accents */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-arena-user/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-arena-oracle/10 blur-3xl" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-arena-border bg-arena-panel/70 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-arena-dim animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-arena-oracle" />
          <span>Finelo · Arena</span>
        </div>

        <h1 className="font-mono text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl animate-slide-up">
          <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
            Step into
          </span>
          <br />
          <span className="bg-gradient-to-br from-arena-user via-cyan-300 to-arena-oracle bg-clip-text text-transparent">
            the Arena.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-balance text-base text-arena-dim md:text-lg animate-fade-in">
          60 seconds. 30 seconds. You vs. The Oracle. Real backtest. Real lesson.
        </p>

        <Link
          href="/duel"
          className="group mt-12 inline-flex items-center gap-3 rounded-full border border-arena-user/40 bg-arena-user/10 px-8 py-4 text-base font-medium text-arena-user shadow-[0_0_40px_-10px_rgba(0,240,255,0.6)] transition-all hover:scale-[1.02] hover:bg-arena-user/15 hover:shadow-[0_0_50px_-5px_rgba(0,240,255,0.7)] active:scale-100"
        >
          <span className="font-mono uppercase tracking-[0.18em]">Enter the Arena</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>

        <div className="mt-16 grid grid-cols-3 gap-8 text-left text-xs uppercase tracking-widest text-arena-dim md:text-sm">
          <div>
            <div className="text-arena-user">01</div>
            <div className="mt-1">Duel the Oracle</div>
          </div>
          <div>
            <div className="text-arena-oracle">02</div>
            <div className="mt-1">Backtest your trades</div>
          </div>
          <div>
            <div className="text-white">03</div>
            <div className="mt-1">Keep the lesson</div>
          </div>
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-6 z-10 text-center text-[10px] uppercase tracking-[0.3em] text-arena-dim/60">
        Synthetic data · Fictional character · For demonstration only
      </footer>
    </main>
  );
}
