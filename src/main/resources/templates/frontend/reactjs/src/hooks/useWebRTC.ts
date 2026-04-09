import {Packr} from "msgpackr";
import {useCallback, useEffect, useRef, useState} from 'react';
import {useGlobalSocket} from "../context/WebSocketContext";
import toast from "react-hot-toast";

const packer = new Packr({structuredClone: false, variableMapSize: true});

interface UseWebRTCProps {
    conversationId: number | string;
    otherUserId: string;
    currentUserId: string;
}

export const useWebRTC = ({conversationId, otherUserId}: UseWebRTCProps) => {
    const {subscribe, getSocket} = useGlobalSocket();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isIncomingCall, setIsIncomingCall] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    const pendingCandidatesRef = useRef<any[]>([]);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const inboundStreamRef = useRef<MediaStream | null>(null);
    const currentStreamRef = useRef<MediaStream | null>(null);

    const iceServers = {
        iceServers: [
            {urls: 'stun:stun.l.google.com:19302'},
            {urls: 'stun:stun1.l.google.com:19302'},
        ],
    };

    const stopMediaTracks = useCallback((streamToStop?: MediaStream | null) => {
        const stream = streamToStop || currentStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => {
                track.enabled = false;
                track.stop();
            });
        }
    }, []);

    const toggleAudio = useCallback(() => {
        if (!currentStreamRef.current) return;
        const audioTrack = currentStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMicOn(audioTrack.enabled);
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (!currentStreamRef.current) return;
        const videoTrack = currentStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsCamOn(videoTrack.enabled);
        }
    }, []);

    const sendWebRTCMessage = useCallback((messageType: number, data: any) => {
        const socket = getSocket();
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const payloadArray = [
            messageType,
            Number(conversationId),
            String(otherUserId),
            JSON.stringify(data)
        ];
        try {
            socket.send(packer.pack(payloadArray));
        } catch (e) {
            console.error("WebRTC Send Error:", e);
        }
    }, [conversationId, otherUserId, getSocket]);

    const cleanupCall = useCallback(() => {
        stopMediaTracks();

        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

        if (peerConnectionRef.current) {
            // FIX: Đảm bảo PC không bị đóng 2 lần gây lỗi báo console
            if (peerConnectionRef.current.signalingState !== 'closed') {
                peerConnectionRef.current.close();
            }
            peerConnectionRef.current = null;
        }

        currentStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        inboundStreamRef.current = null;
        pendingCandidatesRef.current = [];

        setIsCallActive(false);
        setIsIncomingCall(false);
        setCallStatus('ended');

        setTimeout(() => setCallStatus('idle'), 1000);
    }, [stopMediaTracks]);

    const createPeerConnection = useCallback(() => {
        // FIX: Nếu PC hiện tại bị closed, tạo mới luôn
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
            return peerConnectionRef.current;
        }

        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendWebRTCMessage(22, {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                });
            }
        };

        pc.ontrack = (event) => {
            let stream = event.streams[0];
            if (!stream) {
                if (!inboundStreamRef.current) inboundStreamRef.current = new MediaStream();
                inboundStreamRef.current.addTrack(event.track);
                stream = inboundStreamRef.current;
            }

            setRemoteStream(stream);

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(() => {
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') setCallStatus('connected');
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                cleanupCall();
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    }, [sendWebRTCMessage, cleanupCall, iceServers]);

    const startCall = useCallback(async (isVideo: boolean = true) => {
        try {
            stopMediaTracks();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideo ? {width: 640, height: 480} : false,
                audio: true,
            });

            currentStreamRef.current = stream;
            setLocalStream(stream);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
                localVideoRef.current.play().catch(() => {
                });
            }

            const pc = createPeerConnection();
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            setIsCallActive(true);
            setCallStatus('calling');
            setCallType(isVideo ? 'video' : 'audio');

            sendWebRTCMessage(20, {
                sdp: offer.sdp,
                type: offer.type,
                callType: isVideo ? 'video' : 'audio',
            });
        } catch (err) {
            console.error('Start call failed:', err);
            toast.error("Không thể truy cập Camera/Mic", {position: 'top-right'});
            cleanupCall();
        }
    }, [createPeerConnection, sendWebRTCMessage, cleanupCall, stopMediaTracks]);

    const receiveOffer = useCallback(async (sdp: any, type: string) => {
        try {
            const pc = createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription({type: 'offer', sdp}));

            for (const c of pendingCandidatesRef.current) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch {
                }
            }
            pendingCandidatesRef.current = [];

            setCallType(type as any || 'video');
            setIsIncomingCall(true);
            setIsCallActive(true);
            setCallStatus('ringing');
        } catch (err) {
            console.error("Lỗi setRemoteDescription:", err);
            cleanupCall();
        }
    }, [createPeerConnection, cleanupCall]);

    const answerCall = useCallback(async () => {
        try {
            stopMediaTracks();

            const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video' ? {width: 640, height: 480} : false,
                audio: true,
            });

            currentStreamRef.current = stream;
            setLocalStream(stream);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
                localVideoRef.current.play().catch(() => {
                });
            }

            const pc = peerConnectionRef.current;

            // FIX: Tránh lỗi InvalidStateError khi pc đã bị đóng
            if (!pc || pc.signalingState === 'closed') {
                console.error('Không thể Answer: PC đã bị đóng.');
                cleanupCall();
                return;
            }

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setIsIncomingCall(false);
            setCallStatus('connected');

            sendWebRTCMessage(21, {
                sdp: answer.sdp,
                type: answer.type,
            });
        } catch (err) {
            console.error('Answer call failed:', err);
            cleanupCall();
        }
    }, [callType, sendWebRTCMessage, cleanupCall, stopMediaTracks]);

    const handleWebRTCSignal = useCallback(async (type: number, data: any, senderId: string) => {
        if (senderId !== otherUserId) return;
        try {
            const pc = peerConnectionRef.current || createPeerConnection();

            switch (type) {
                case 20:
                    break;
                case 21:
                    await pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: data.sdp}));
                    for (const c of pendingCandidatesRef.current) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(c));
                        } catch {
                        }
                    }
                    pendingCandidatesRef.current = [];
                    setCallStatus('connected');
                    break;

                case 22:
                    if (data.candidate) {
                        if (pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(data));
                        } else {
                            pendingCandidatesRef.current.push(data);
                        }
                    }
                    break;

                case 23:
                case 24:
                    cleanupCall();
                    break;
            }
        } catch (e) {
            console.error("Signaling Error:", e);
        }
    }, [createPeerConnection, otherUserId, cleanupCall]);

    useEffect(() => {
        return subscribe((msg: any) => {
            if (msg.messageType >= 20 && msg.messageType <= 24) {
                const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
                handleWebRTCSignal(msg.messageType, content, msg.senderId);
            }
        });
    }, [subscribe, handleWebRTCSignal]);

    useEffect(() => {
        const el = localVideoRef.current;
        if (!el || !localStream) return;
        el.srcObject = localStream;
        el.muted = true;
        el.playsInline = true;
        el.play().catch(() => {
        });
    }, [localStream, callStatus]);

    useEffect(() => {
        const el = remoteVideoRef.current;
        if (!el || !remoteStream) return;
        el.srcObject = remoteStream;
        el.playsInline = true;
        el.play().catch(() => {
        });
    }, [remoteStream, callStatus]);

    // BỎ useEffect dọn dẹp chứa stopMediaTracks và pc.close()
    // Lý do: Nếu người dùng click vào trang khác, họ vẫn có thể nghe được tiếng.
    // Nếu họ cúp máy, hàm cleanupCall() hoặc tín hiệu 23/24 sẽ đảm nhận việc dọn dẹp.
    // Điều này ngăn chặn việc StrictMode hủy ngang cuộc gọi.

    return {
        localStream, remoteStream,
        isCallActive, isIncomingCall, callStatus, callType,
        startCall, answerCall, receiveOffer,
        hangUp: () => {
            sendWebRTCMessage(23, {});
            cleanupCall();
        },
        rejectCall: () => {
            sendWebRTCMessage(24, {});
            cleanupCall();
        },
        localVideoRef, remoteVideoRef,
        isMicOn, isCamOn,
        toggleAudio, toggleVideo,
    };
};
