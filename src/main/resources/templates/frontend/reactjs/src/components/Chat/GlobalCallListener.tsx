import React, {useEffect, useRef, useState} from 'react';
import {useGlobalSocket} from "../../context/WebSocketContext";
import {useWebRTC} from "../../hooks/useWebRTC";
import VideoCallModal from "./VideoCallModal";
import {useCallStore} from "../../store/call.store";
import {useAuthStore} from "../../store/auth.store.ts";

export const GlobalCallListener: React.FC = () => {
    const {subscribe} = useGlobalSocket();

    const currentUser = useAuthStore(state => (state as any).user || (state as any).id);
    const currentUserId = currentUser?.id || currentUser;

    const outgoingCall = useCallStore(state => state.outgoingCall);
    const clearOutgoingCall = useCallStore(state => state.clearOutgoingCall);

    const [callData, setCallData] = useState<{
        conversationId: string | number;
        otherUserId: string;
        otherUserName: string;
        sdpOffer: any;
        callType: string;
    } | null>(null);

    useEffect(() => {
        return subscribe((msg: any) => {
            // Khi có OFFER (20) từ người khác gọi tới
            if (msg.messageType === 20 && msg.senderId !== currentUserId) {
                if (outgoingCall) clearOutgoingCall();

                const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;

                setCallData({
                    conversationId: msg.conversationId,
                    otherUserId: msg.senderId,
                    otherUserName: msg.senderName || "Người dùng",
                    sdpOffer: content.sdp,
                    callType: content.callType || 'video'
                });
            }
        });
    }, [subscribe, currentUserId, outgoingCall, clearOutgoingCall]);

    if (!currentUserId) return null;

    if (outgoingCall) {
        return (
            <OutgoingSession
                conversationId={outgoingCall.conversationId}
                otherUserId={outgoingCall.otherUserId}
                currentUserId={currentUserId}
                isVideo={outgoingCall.isVideo}
                onEnd={clearOutgoingCall}
            />
        );
    }

    if (callData) {
        return (
            <CallSession
                conversationId={callData.conversationId}
                otherUserId={callData.otherUserId}
                currentUserId={currentUserId}
                remoteUserName={callData.otherUserName}
                sdpOffer={callData.sdpOffer}
                callType={callData.callType}
                onEnd={() => setCallData(null)}
            />
        );
    }

    return null;
};

// ==========================================
// COMPONENT: PHIÊN NHẬN CUỘC GỌI TỚI
// ==========================================
const CallSession = ({conversationId, otherUserId, currentUserId, remoteUserName, sdpOffer, callType, onEnd}: any) => {
    const rtc = useWebRTC({conversationId, otherUserId, currentUserId});
    const hasInitOffer = useRef(false);

    useEffect(() => {
        if (!hasInitOffer.current && sdpOffer && rtc.receiveOffer) {
            hasInitOffer.current = true;
            rtc.receiveOffer(sdpOffer, callType);
        }
    }, [sdpOffer, callType, rtc]);

    useEffect(() => {
        if (rtc.callStatus === 'ended' || (!rtc.isCallActive && rtc.callStatus !== 'idle' && rtc.callStatus !== 'ringing')) {
            const timer = setTimeout(() => {
                rtc.hangUp();
                onEnd();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [rtc.isCallActive, rtc.callStatus, onEnd, rtc]);


    return (
        <VideoCallModal
            localVideoRef={rtc.localVideoRef}
            remoteVideoRef={rtc.remoteVideoRef}
            isIncomingCall={rtc.isIncomingCall} // <--- SỬA LẠI THÀNH DÒNG NÀY (Đừng để là 'true')
            callStatus={rtc.callStatus}
            onAnswer={rtc.answerCall}
            onReject={() => {
                rtc.rejectCall();
                onEnd();
            }}
            onHangup={() => {
                rtc.hangUp();
                onEnd();
            }}
            remoteUserName={remoteUserName}
            isMicOn={rtc.isMicOn}
            isCamOn={rtc.isCamOn}
            toggleAudio={rtc.toggleAudio}
            toggleVideo={rtc.toggleVideo}
        />
    );
};

// ==========================================
// COMPONENT: PHIÊN GỌI ĐI
// ==========================================
const OutgoingSession = ({conversationId, otherUserId, currentUserId, isVideo, onEnd}: any) => {
    const rtc = useWebRTC({conversationId, otherUserId, currentUserId});
    const startCallAttempted = useRef(false);

    useEffect(() => {
        if (!startCallAttempted.current) {
            startCallAttempted.current = true;
            setTimeout(() => {
                rtc.startCall(isVideo);
            }, 100);
        }
    }, [isVideo, rtc]);

    useEffect(() => {
        if (rtc.callStatus === 'ended') {
            const timer = setTimeout(() => {
                rtc.hangUp();
                onEnd();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [rtc.callStatus, onEnd, rtc]);


    return (
        <VideoCallModal
            localVideoRef={rtc.localVideoRef}
            remoteVideoRef={rtc.remoteVideoRef}
            isIncomingCall={false}
            callStatus={rtc.callStatus}
            onAnswer={rtc.answerCall}
            onReject={rtc.rejectCall}
            onHangup={() => {
                rtc.hangUp();
            }}
            remoteUserName={"Đang gọi..."}
            isMicOn={rtc.isMicOn}
            isCamOn={rtc.isCamOn}
            toggleAudio={rtc.toggleAudio}
            toggleVideo={rtc.toggleVideo}
        />
    );
};
