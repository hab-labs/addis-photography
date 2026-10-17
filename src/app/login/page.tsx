import React, { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { MapPin, Phone } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="font-referenceSans grid min-h-[960px] bg-white lg:grid-cols-2">
      <section className="flex flex-col items-center justify-between bg-white px-8 py-10 sm:px-12 lg:items-stretch lg:px-16 lg:py-12">
        <div className="flex h-7 w-full items-center gap-3 border-l-[3px] border-[#D51E25] pl-3 text-[14px] font-normal leading-[17px] text-[#2B2B2B]">
          Addis Photography
        </div>

        <div className="mx-auto w-full max-w-[472px]">
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading login form…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="flex h-[13px] w-full items-center justify-between text-[11px] font-normal leading-[13px] text-black">
          <span>Studio Management System</span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-black" />
            Authorized studio access
          </span>
        </div>
      </section>

      <section className="relative hidden min-h-[960px] overflow-hidden bg-black px-8 py-12 pb-10 text-white after:absolute after:inset-y-0 after:left-0 after:w-[3px] after:bg-[#D51E25] lg:flex lg:flex-col lg:justify-between lg:px-16">
        <div className="relative z-10 flex h-[190px] w-full items-start justify-between">
          <div className="h-[190px] w-[220px] shrink-0 overflow-hidden">
            <img
              src="/addis-photography-logo.png"
              alt="Addis Photography logo"
              className="block h-[190px] w-[220px] object-contain object-left-top"
            />
          </div>
          <div className="flex w-[228px] flex-col items-start gap-4 pt-[50px]">
            <div className="h-0.5 w-9 bg-[#D51E25]" />
            <span className="text-[11px] font-medium leading-[19px] text-white">STUDIO MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <div className="relative z-10 flex w-full flex-col gap-8">
          <div className="relative flex h-[350px] w-full items-start overflow-hidden rounded-[10px]">
            
            <img
              src="/login-camera.jpg"
              alt="Camera on a dark studio surface"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute bottom-4 left-[18px] flex items-center gap-2 text-[10px] leading-3 text-white">
              <span className="h-px w-4 bg-[#F8F5EF]" />
              THE ART OF THE MOMENT
            </span>
          </div>
          <div className="flex h-[129px] flex-col items-start gap-[18px]">
            <h2 className="font-referenceSerif text-[44px] font-normal leading-[53px] text-white">Addis Photography</h2>
            <p className="w-[500px] max-w-full text-[16px] font-normal leading-[29px] text-white">
              Capturing authentic moments with precision, speed, and seamless client delivery.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex h-[41px] w-full flex-col gap-6">
          <div className="h-px w-full bg-white" />
          <div className="flex h-4 w-full items-center justify-between text-[13px] leading-4">
            <span className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-[#D51E25]" /> Jimma · Tsinat Building</span>
            <span className="flex items-center gap-2.5 text-[#F8F5EF]"><Phone className="h-4 w-4 text-[#D51E25]" /> +251 973 679 744</span>
          </div>
        </div>
      </section>
    </div>
  );
}