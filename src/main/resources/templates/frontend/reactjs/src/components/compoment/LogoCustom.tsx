import {FaFacebookMessenger} from "react-icons/fa";

const LogoCustom = () => (
    <>
        <svg width="0" height="0">
            <defs>
                <linearGradient id="messengerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ec4899">
                        <animate
                            attributeName="stop-color"
                            values="#ec4899;#8b5cf6;#3b82f6;#ec4899"
                            dur="4s"
                            repeatCount="indefinite"
                        />
                    </stop>
                    <stop offset="50%" stopColor="#ef4444">
                        <animate
                            attributeName="stop-color"
                            values="#ef4444;#22c55e;#facc15;#ef4444"
                            dur="4s"
                            repeatCount="indefinite"
                        />
                    </stop>
                    <stop offset="100%" stopColor="#eab308">
                        <animate
                            attributeName="stop-color"
                            values="#eab308;#ec4899;#8b5cf6;#eab308"
                            dur="4s"
                            repeatCount="indefinite"
                        />
                    </stop>
                </linearGradient>
            </defs>
        </svg>

        <FaFacebookMessenger
            className="w-16 h-16 mx-auto transition-all duration-700 ease-in-out
             hover:rotate-[360deg] hover:scale-110"
            style={{fill: "url(#messengerGradient)"}}
        />

    </>
);

export default LogoCustom;
