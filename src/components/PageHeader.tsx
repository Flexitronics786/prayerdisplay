
import React from "react";
import DigitalClock from "@/components/DigitalClock";

interface PageHeaderProps {
  currentDate: string;
  isTV: boolean;
}

const PageHeader = ({ currentDate, isTV }: PageHeaderProps) => {
  return (
    <header className={`${isTV ? 'mb-1' : 'mb-4'}`}>
      <div className="gold-border p-2 sm:p-3 bg-gradient-to-b from-amber-50/90 to-white/90 backdrop-blur-sm shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1fr_auto_1fr] gap-2 lg:gap-4 items-center">
          <div className="text-center md:text-left order-2 md:order-1 flex items-center justify-center md:justify-start md:pl-4">
            <div className="text-lg sm:text-xl md:text-2xl text-black font-semibold">
              {currentDate}
            </div>
          </div>

          <div className="text-center order-1 md:order-2 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
              <img
                src="/Logo 1.jpg"
                alt="Minhaj-Ul-Quran Logo"
                className={`${isTV ? 'h-16 w-16' : 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20'} rounded-full object-cover shadow-md border-2 border-amber-200 shrink-0`}
              />
              <div className="flex flex-col items-start text-left">
                <h1 className={`${isTV ? 'text-2xl lg:text-3xl' : 'text-xl sm:text-2xl md:text-2xl lg:text-3xl'} font-bold text-black mb-0 font-serif whitespace-nowrap tracking-tight`}>
                  MINHAJ-UL-QURAN INT. DUNDEE
                </h1>
                <h2 className={`${isTV ? 'text-xl' : 'text-base sm:text-lg lg:text-xl'} text-black font-medium whitespace-nowrap`}>
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
