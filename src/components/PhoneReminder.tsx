
import { Phone } from "lucide-react";

const PhoneReminder = ({ isTVMode = false }: { isTVMode?: boolean }) => {
  return (
    <div className={`${isTVMode ? 'mt-1 mb-1' : 'mt-3'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="red-card rounded-lg flex items-center justify-center gap-2 py-1 px-2 shadow-lg tv-phone-reminder">
          <Phone className={`${isTVMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <p className={`font-semibold ${isTVMode ? 'text-sm' : 'text-sm sm:text-base'}`}>
            Please ensure your mobile phones are switched off or on silent mode
          </p>
          <Phone className={`${isTVMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </div>
      </div>
    </div>
  );
};

export default PhoneReminder;
