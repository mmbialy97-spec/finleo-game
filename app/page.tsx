export default function Home() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
          Finleo is live
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">
          Learn money by playing the game.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
          Finleo turns financial literacy into a simple, fun experience for the next generation of money-smart players.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="mailto:hello@finleo.app"
            className="rounded-full bg-emerald-400 px-7 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Contact us
          </a>
          <a
            href="#status"
            className="rounded-full border border-white/15 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
          >
            View status
          </a>
        </div>

        <div id="status" className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-bold">01</p>
            <p className="mt-2 text-sm text-slate-300">App shell deployed</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-bold">02</p>
            <p className="mt-2 text-sm text-slate-300">Homepage route working</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-bold">03</p>
            <p className="mt-2 text-sm text-slate-300">Ready for game build</p>
          </div>
        </div>
      </section>
    </main>
  );
}
