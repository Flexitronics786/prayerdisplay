
import { Phone } from "lucide-react";

const PhoneReminder = ({ isTVMode = false }: { isTVMode?: boolean }) => {
  return (
    <div className={`${isTVMode ? 'mt-4' : 'mt-3'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="red-card rounded-lg flex items-center justify-center gap-3 py-2 shadow-lg">
          <Phone className="w-5 h-5" />
          <p className={`font-semibold ${isTVMode ? 'text-xl' : 'text-sm sm:text-base'}`}>
            Please ensure your mobile phones are switched off or on silent mode
          </p>
          <Phone className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default PhoneReminder;
