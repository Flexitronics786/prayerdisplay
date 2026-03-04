
import { Phone } from "lucide-react";

const PhoneReminder = ({ isTVMode = false }: { isTVMode?: boolean }) => {
  return (
    <div className={`${isTVMode ? 'mt-1 mb-1' : 'mt-2'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="rounded-lg flex items-center justify-center gap-2 py-1.5 px-3 shadow-md tv-phone-reminder"
          style={{ background: 'linear-gradient(135deg, #be123c, #e11d48)' }}
        >
          <Phone className={`${isTVMode ? 'w-3 h-3' : 'w-4 h-4'} text-rose-200`} />
          <p className={`font-semibold text-white ${isTVMode ? 'text-sm' : 'text-xs sm:text-sm'}`}>
            Please ensure your mobile phones are switched off or on silent mode
          </p>
          <Phone className={`${isTVMode ? 'w-3 h-3' : 'w-4 h-4'} text-rose-200`} />
        </div>
      </div>
    </div>
  );
};

export default PhoneReminder;
