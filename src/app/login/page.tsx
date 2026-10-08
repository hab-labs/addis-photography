import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-white">
      {/* Left Column: Form with Layered Modern Background */}
      <div className="relative flex flex-col justify-between p-6 sm:p-10 overflow-hidden bg-white">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-40  pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(#111827 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Soft ambient lighting glow behind the form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Studio Header */}
        <div className="relative z-10  flex items-center gap-2.5 font-semibold tracking-tight text-foreground">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-black shadow-sm">
            <img src="/addis-photography-logo.png" alt="" className="h-9 w-9 object-contain" />
          </div>
          <span className="text-xl font-semibold text-black">Addis Photography</span>
        </div>

        {/* Center: Frosted Glass Form Card */}
        <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col justify-center py-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/10 sm:p-8">
            <LoginForm />
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 text-xs text-muted-foreground">
          <span>Jimma, Tsinat Building · +251 973 679 744</span>
        </div>
      </div>

      {/* Right Column: Studio Darkroom Visual */}
      <div className="relative hidden overflow-hidden border-l-8 border-red-600 bg-black p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.16),_transparent_46%)]" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-red-600/20" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />

        <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
          <img
            src="/addis-photography-logo.png"
            alt="Addis Photography logo"
            className="h-72 w-72 object-contain drop-shadow-[0_0_35px_rgba(220,38,38,0.28)]"
          />
          <div className="mt-8 h-px w-24 bg-red-600" />
          <h2 className="mt-6 text-2xl font-bold tracking-[0.2em] text-white">
            ADDIS PHOTOGRAPHY
          </h2>
          <p className="mt-3 text-sm uppercase tracking-[0.3em] text-red-500">
            Studio Management System
          </p>
          <p className="mt-8 max-w-sm text-sm leading-6 text-slate-400">
            Capturing authentic moments with precision, speed, and seamless client delivery.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            Jimma · Tsinat Building · +251 973 679 744
          </div>
        </div>
      </div>
    </div>
  );
}