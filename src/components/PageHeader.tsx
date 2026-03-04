
import React from "react";
import DigitalClock from "@/components/DigitalClock";
import NotificationBell from "@/components/NotificationBell";

interface PageHeaderProps {
  currentDate: string;
  isTV: boolean;
}

const PageHeader = ({ currentDate, isTV }: PageHeaderProps) => {
  return (
    <header className={`${isTV ? 'mb-1' : 'mb-3'}`}>
      <div className="gold-border p-2 sm:p-3 bg-gradient-to-br from-white/95 via-amber-50/90 to-white/95 backdrop-blur-sm shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1fr_auto_1fr] gap-2 lg:gap-4 items-center">
          <div className="text-center md:text-left order-2 md:order-1 flex items-center justify-center md:justify-start md:pl-4 gap-2">
            <div className="inline-flex items-center gap-2 bg-amber-100/60 rounded-full px-4 py-1.5 border border-amber-200/50">
              <span className="text-amber-700">📅</span>
              <span className="text-base sm:text-lg md:text-xl text-amber-900 font-semibold tracking-tight">
                {currentDate}
              </span>
            </div>
            {!isTV && <NotificationBell />}
          </div>

          <div className="text-center order-1 md:order-2 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
              <img
                src="/Logo 1.jpg"
                alt="Minhaj-Ul-Quran Logo"
                className={`${isTV ? 'h-16 w-16' : 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20'} rounded-full object-cover shadow-lg border-3 border-amber-300 shrink-0 ring-2 ring-amber-200/50`}
              />
              <div className="flex flex-col items-start text-left">
                <h1 className={`${isTV ? 'text-2xl lg:text-3xl' : 'text-xl sm:text-2xl md:text-2xl lg:text-3xl'} font-extrabold text-slate-800 mb-0 tracking-tight`}>
                  MINHAJ-UL-QURAN INT. DUNDEE
                </h1>
                <h2 className={`${isTV ? 'text-lg' : 'text-sm sm:text-base lg:text-lg'} text-slate-600 font-semibold tracking-wide uppercase`}>
                  JAMIA MASJID BILAL
                </h2>
              </div>
            </div>
          </div>

          <div className="order-3 flex items-center justify-center md:justify-end md:pr-4">
            <DigitalClock showDate={false} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
