import React from "react";
import {
    BsCameraVideoFill,
    BsCameraVideoOffFill,
    BsMicFill,
    BsMicMuteFill,
    BsTelephoneFill,
    BsTelephoneXFill
} from "react-icons/bs";

interface VideoCallModalProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    isIncomingCall: boolean;
    callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
    onAnswer: () => void;
    onReject: () => void;
    onHangup: () => void;
    remoteUserName: string;
    // New props for controls
    isMicOn?: boolean;
    isCamOn?: boolean;
    toggleAudio?: () => void;
    toggleVideo?: () => void;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
                                                           localVideoRef,
                                                           remoteVideoRef,
                                                           isIncomingCall,
                                                           callStatus,
                                                           onAnswer,
                                                           onReject,
                                                           onHangup,
                                                           remoteUserName,
                                                           isMicOn = true,
                                                           isCamOn = true,
                                                           toggleAudio,
                                                           toggleVideo,
                                                       }) => {

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="relative w-full h-full max-w-5xl max-h-screen flex flex-col">

                {/* --- REMOTE VIDEO AREA --- */}
                <div
                    className="flex-1 relative bg-gray-900 rounded-2xl overflow-hidden m-4 border border-gray-800 shadow-2xl">
                    {callStatus === 'connected' ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center animate-pulse">
                            <div
                                className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg mb-4">
                                {remoteUserName.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">{remoteUserName}</h3>
                            <p className="text-gray-400">
                                {isIncomingCall ? "Đang gọi cho bạn..." : "Đang kết nối..."}
                            </p>
                        </div>
                    )}

                    {/* --- LOCAL VIDEO (PIP) --- */}
                    {callStatus !== 'idle' && (
                        <div
                            className="absolute bottom-6 right-6 w-32 h-48 md:w-48 md:h-36 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-10 transition-transform hover:scale-105">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover scale-x-[-1] ${!isCamOn ? 'hidden' : ''}`}
                            />
                            {/*<video*/}
                            {/*    ref={remoteVideoRef}*/}
                            {/*    autoPlay*/}
                            {/*    playsInline*/}
                            {/*    className={`w-full h-full object-contain ${callStatus === 'connected' ? '' : 'hidden'}`}*/}
                            {/*/>*/}
                            {!isCamOn && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <BsCameraVideoOffFill className="text-gray-500 text-3xl"/>
                                </div>
                            )}
                            {callStatus !== 'connected' && (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center animate-pulse">
                                    ...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- CONTROL BAR --- */}
                <div className="h-24 flex items-center justify-center gap-6 pb-6">
                    {isIncomingCall ? (
                        <>
                            <button onClick={onAnswer} className="flex flex-col items-center gap-1 group">
                                <div
                                    className="p-4 bg-green-500 rounded-full text-white shadow-lg shadow-green-500/30 group-hover:scale-110 transition">
                                    <BsTelephoneFill size={28}/>
                                </div>
                                <span className="text-xs text-white/80">Trả lời</span>
                            </button>
                            <button onClick={onReject} className="flex flex-col items-center gap-1 group">
                                <div
                                    className="p-4 bg-red-500 rounded-full text-white shadow-lg shadow-red-500/30 group-hover:scale-110 transition">
                                    <BsTelephoneXFill size={28}/>
                                </div>
                                <span className="text-xs text-white/80">Từ chối</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={toggleAudio}
                                    className={`p-4 rounded-full transition ${isMicOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-900'}`}>
                                {isMicOn ? <BsMicFill size={24}/> : <BsMicMuteFill size={24}/>}
                            </button>

                            <button onClick={onHangup}
                                    className="p-5 bg-red-600 rounded-full text-white shadow-xl shadow-red-600/40 hover:bg-red-700 transition hover:scale-105 mx-4">
                                <BsTelephoneXFill size={32}/>
                            </button>

                            <button onClick={toggleVideo}
                                    className={`p-4 rounded-full transition ${isCamOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-900'}`}>
                                {isCamOn ? <BsCameraVideoFill size={24}/> : <BsCameraVideoOffFill size={24}/>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoCallModal;
