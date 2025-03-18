
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
          <div className="text-left md:pl-4 order-2 md:order-1">
            <div className="text-lg sm:text-xl md:text-2xl text-black">
              {currentDate}
            </div>
          </div>
          
          <div className="text-center order-1 md:order-2">
            <h1 className={`${isTV ? 'text-2xl' : 'text-xl sm:text-2xl md:text-3xl'} font-bold gold-gradient-text mb-1 font-serif`}>
              MINHAJ-UL-QURAN INT. DUNDEE
            </h1>
            <h2 className={`${isTV ? 'text-lg' : 'text-base sm:text-xl'} text-black mb-1`}>
              JAMIA MASJID BILAL
            </h2>
            <div className="h-0.5 w-24 sm:w-48 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mx-auto rounded-full"></div>
          </div>
          
          <div className="order-3 md:pr-4">
            <DigitalClock showDate={false} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
