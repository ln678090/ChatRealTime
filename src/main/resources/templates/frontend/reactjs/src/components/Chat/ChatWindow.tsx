import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useChatStore} from '../../store/chat.store';
import {axiosClientchatbe} from '../../services/api/axiosClientchatbe';
import {chatService} from '../../services/chat.service';
import {useGlobalSocket} from '../../context/WebSocketContext';
import {BsCameraVideoFill, BsPersonDash} from 'react-icons/bs';
import {useAuthStore} from '../../store/auth.store';
import FileAttachment from './FileAttachment';
import FileUploadButton from './FileUploadButton';
import {useCallStore} from '../../store/call.store'; // IMPORT STORE GỌI

type MessageUI = {
    id: string;
    serverId?: string | number;
    clientMsgId?: string;
    content: string;
    createdAt?: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    isMyMessage?: boolean;
    status?: 'sending' | 'sent' | 'failed';
    anim?: 'send' | 'in';
    messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentType?: string;
};

const FRIENDEVENTCODE = 7;

const ChatWindow: React.FC = () => {
    const {activeConversation, setActiveConversation} = useChatStore();
    const auth = useAuthStore();
    const currentUserId = (auth as any)?.user?.id ?? (auth as any)?.id ?? (auth as any)?.userId;

    // SỬ DỤNG HÀM GỌI TỪ GLOBAL STORE
    const startOutgoingCall = useCallStore(state => state.startOutgoingCall);

    const {isConnected, sendMessage, subscribe} = useGlobalSocket();
    const queryClient = useQueryClient();

    const [pendingFile, setPendingFile] = useState<any>(null);
    const [messageInput, setMessageInput] = useState('');
    const [liveMessages, setLiveMessages] = useState<MessageUI[]>([]);
    const [showInfoMenu, setShowInfoMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);

    const convId = (activeConversation as any)?.id;
    const status = (activeConversation as any)?.friendshipStatus ?? 'NONE';
    const canMessage = (activeConversation as any)?.canMessage ?? true;
    const inputDisabled = !canMessage || status === 'BLOCKED';
    const isGroup = (activeConversation as any)?.isGroup ?? false;

    const toId = (v: any) => (v === null || v === undefined) ? undefined : String(v);

    const handleFileUploaded = (fileData: any) => {
        console.log('File uploaded, auto-sending:', fileData);
        if (!isConnected) {
            console.error('WebSocket not connected, waiting...');
            setTimeout(() => {
                if (!isConnected) {
                    console.log('Kết nối bị gián đoạn, vui lòng thử lại');
                    return;
                }
                handleFileUploaded(fileData);
            }, 1000);
            return;
        }

        const clientMsgId = crypto.randomUUID();
        const messageTypeMap: Record<string, string> = {
            'image': 'IMAGE',
            'video': 'VIDEO',
            'audio': 'AUDIO',
            'non-image': 'FILE',
        };
        const messageType = messageTypeMap[fileData.type] || 'FILE';

        setLiveMessages(prev => [...prev, {
            id: clientMsgId,
            clientMsgId,
            content: '',
            createdAt: new Date().toISOString(),
            senderId: currentUserId,
            isMyMessage: true,
            status: 'sending',
            anim: 'send',
            messageType: messageType as any,
            attachmentUrl: fileData.url,
            attachmentName: fileData.name,
            attachmentSize: fileData.size,
            attachmentType: fileData.type,
        }]);

        const fileMessageContent = `FILE|${fileData.url}|${fileData.name}|${fileData.size}|${messageType}`;
        console.log('Sending file message:', fileMessageContent);

        try {
            sendMessage(convId, fileMessageContent, clientMsgId);
            setIsUserScrolling(false);
            void queryClient.invalidateQueries({queryKey: ['conversations']});
        } catch (error) {
            console.error('Send failed:', error);
            setLiveMessages(prev => prev.map(m => m.id === clientMsgId ? {...m, status: 'failed'} : m));
        }
    };

    const pickPeerId = (conv: any, meIdRaw: any) => {
        const meId = toId(meIdRaw);
        const direct = conv?.otherUser?.id ?? conv?.otherUserId ?? conv?.peerUserId ?? conv?.receiverId ?? conv?.targetUserId;
        if (direct) return toId(direct);

        const arrays = [conv?.participants, conv?.members, conv?.users, conv?.userList].filter(Array.isArray);
        for (const arr of arrays) {
            for (const p of arr) {
                const id = p?.userId ?? p?.id ?? p?.user?.id ?? p?.account?.id;
                const sid = toId(id);
                if (sid && sid !== meId) return sid;
            }
        }
        return undefined;
    };

    const otherUserId = useMemo(() => pickPeerId((activeConversation as any), currentUserId), [activeConversation, currentUserId]);

    const safe = (e: React.SyntheticEvent, fn: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
    };

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useInfiniteQuery({
        queryKey: ['messages-paged', convId],
        queryFn: ({pageParam = 0}) => chatService.getMessagesPaged(convId!, pageParam, 50),
        getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.currentPage + 1 : undefined,
        initialPageParam: 0,
        enabled: !!convId,
        staleTime: 30000,
    });

    const fetchedMessages = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages
            .slice()
            .reverse()
            .flatMap(page => page.items.map((m: any) => {
                let processedMessage = {...m};
                if (m.content && m.content.startsWith('FILE|')) {
                    try {
                        const fileData = m.content.substring(5);
                        const [url, name, size, type] = fileData.split('|');
                        let msgType = type;
                        if (type && type.toLowerCase() === 'image') msgType = 'IMAGE';
                        else if (type && type.toLowerCase() === 'video') msgType = 'VIDEO';

                        processedMessage = {
                            ...m,
                            content: '',
                            messageType: msgType || 'FILE',
                            attachmentUrl: url,
                            attachmentName: name,
                            attachmentSize: parseInt(size) || 0,
                            attachmentType: type,
                        };
                    } catch (e) {
                        console.error('Failed to parse legacy file message', m.content);
                    }
                }
                return {
                    id: String(processedMessage.id),
                    serverId: processedMessage.id,
                    content: processedMessage.content ?? '',
                    createdAt: processedMessage.createdAt,
                    senderId: processedMessage.senderId,
                    senderName: processedMessage.senderName,
                    senderAvatar: processedMessage.senderAvatar,
                    isMyMessage: processedMessage.senderId === currentUserId,
                    status: 'sent',
                    messageType: processedMessage.messageType as any,
                    attachmentUrl: processedMessage.attachmentUrl,
                    attachmentName: processedMessage.attachmentName,
                    attachmentSize: processedMessage.attachmentSize,
                    attachmentType: processedMessage.attachmentType,
                };
            }));
    }, [data, currentUserId]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const {scrollTop, scrollHeight, clientHeight} = container;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsUserScrolling(!isAtBottom);

            if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
                const previousHeight = scrollHeight;
                fetchNextPage().then(() => {
                    setTimeout(() => {
                        if (container) {
                            const newHeight = container.scrollHeight;
                            container.scrollTop = newHeight - previousHeight;
                        }
                    }, 100);
                });
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        if (!convId) return;
        const unsubscribe = subscribe((payload: any) => {
            const isFriendEvent = payload?.messageType === FRIENDEVENTCODE || payload?.messageType === 'FRIENDEVENT';
            if (isFriendEvent) {
                void queryClient.invalidateQueries({queryKey: ['conversations']});
                const newStatus = String(payload?.uiStatus ?? 'NONE');
                const actorId = String(payload?.actorId ?? '');
                const targetId = String(payload?.targetId ?? '');
                if (otherUserId && (otherUserId === actorId || otherUserId === targetId)) {
                    if (activeConversation) {
                        setActiveConversation({...activeConversation as any, friendshipStatus: newStatus as any});
                    }
                }
                return;
            }

            if (!payload?.conversationId || String(payload?.conversationId) !== String(convId)) return;

            setLiveMessages(prev => {
                if (payload.clientMsgId) {
                    const idx = prev.findIndex(m => m.clientMsgId === payload.clientMsgId);
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = {
                            ...copy[idx],
                            serverId: payload.messageId ?? copy[idx].serverId,
                            createdAt: payload.createdAt ?? copy[idx].createdAt,
                            status: 'sent',
                        };
                        return copy;
                    }
                }
                const serverId = payload.messageId ?? payload.id;
                if (serverId && prev.some(m => m.serverId === serverId)) return prev;

                let messageType = 'TEXT';
                if (typeof payload.contentType === 'string') messageType = payload.contentType as any;
                else if (typeof payload.contentType === 'number') {
                    const typeMap: Record<number, any> = {0: 'TEXT', 1: 'IMAGE', 2: 'VIDEO', 3: 'AUDIO', 4: 'FILE'};
                    messageType = typeMap[payload.contentType] || 'TEXT';
                }

                return [...prev, {
                    id: String(serverId ?? crypto.randomUUID()),
                    serverId,
                    clientMsgId: payload.clientMsgId,
                    content: payload.content ?? '',
                    createdAt: payload.createdAt,
                    senderId: payload.senderId,
                    senderName: payload.senderName,
                    senderAvatar: payload.senderAvatar,
                    status: 'sent',
                    anim: 'in',
                    messageType: messageType as any,
                    attachmentUrl: payload.attachmentUrl,
                    attachmentName: payload.attachmentName,
                    attachmentSize: payload.attachmentSize,
                    attachmentType: payload.attachmentType,
                }];
            });
        });
        return () => unsubscribe();
    }, [subscribe, convId, queryClient, otherUserId, activeConversation, setActiveConversation]);

    // HÀM TRIGGER GỌI ĐI TỪ ZUSTAND STORE
    const handleCallClick = () => {
        if (!otherUserId) return;
        if (!activeConversation) return;
        startOutgoingCall(activeConversation.id, otherUserId, true); // true = Video Call
    };

    const mergedMessages = useMemo(() => {
        const map = new Map<string | number, MessageUI>();
        (fetchedMessages as any).forEach((m: any) => {
            const serverId = m.id;
            map.set(serverId, {...m, id: String(serverId), serverId, status: 'sent'});
        });
        liveMessages.forEach(m => {
            const key = m.serverId ?? m.id;
            map.set(key, {...m});
        });
        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ta - tb;
        });
        return arr;
    }, [fetchedMessages, liveMessages]);

    useEffect(() => {
        if (!convId) return;
        setLiveMessages([]);
        setMessageInput('');
        setShowInfoMenu(false);
        setIsUserScrolling(false);
        setTimeout(() => {
            if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({behavior: 'auto'});
        }, 100);
    }, [convId]);

    useEffect(() => {
        if (!isUserScrolling && messagesEndRef.current) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior: 'smooth'}), 50);
        }
    }, [mergedMessages, isUserScrolling]);

    useEffect(() => {
        if (data?.pages && data.pages.length === 1 && messagesEndRef.current) {
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 200);
        }
    }, [data?.pages]);

    const requestFriendMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClientchatbe.post('/friends/add', {targetUserId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ['conversations']});
            if (activeConversation) setActiveConversation({
                ...activeConversation as any,
                friendshipStatus: 'PENDING_OUT' as any
            });
        },
        onError: (err: any) => alert(err?.response?.data?.message ?? 'Gửi lời mời kết bạn thất bại.')
    });

    const cancelRequestMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClientchatbe.post('/friends/cancel', {targetUserId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ['conversations']});
            if (activeConversation) setActiveConversation({
                ...activeConversation as any,
                friendshipStatus: 'NONE' as any
            });
        }
    });

    const acceptFriendMutation = useMutation({
        mutationFn: (requesterId: string) => axiosClientchatbe.post('/friends/accept', {requesterId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ['conversations']});
            if (activeConversation) setActiveConversation({
                ...activeConversation as any,
                friendshipStatus: 'FRIEND' as any
            });
        }
    });

    const unfriendMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClientchatbe.post('/friends/unfriend', {targetUserId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ['conversations']});
            if (activeConversation) setActiveConversation({
                ...activeConversation as any,
                friendshipStatus: 'NONE' as any
            });
        }
    });

    const doRequestFriend = () => otherUserId && requestFriendMutation.mutate(otherUserId);
    const doCancelFriend = () => otherUserId && cancelRequestMutation.mutate(otherUserId);
    const doAcceptFriend = () => otherUserId && acceptFriendMutation.mutate(otherUserId);
    const doUnfriend = () => otherUserId && unfriendMutation.mutate(otherUserId);

    if (!activeConversation || !convId) {
        return <div className="h-full flex items-center justify-center text-gray-500">Chọn một cuộc hội thoại để bắt
            đầu</div>;
    }

    const bannerText = status === 'PENDING_OUT' ? 'Bạn đã gửi lời mời kết bạn.'
        : status === 'PENDING_IN' ? 'Người này đã gửi lời mời kết bạn.'
            : status === 'BLOCKED' ? 'Bạn không thể nhắn tin với người này.'
                : status !== 'FRIEND' ? 'Bạn đang nhắn tin khi chưa kết bạn.' : null;

    const canUnfriend = !isGroup && status === 'FRIEND';
    const canCancelRequest = !isGroup && status === 'PENDING_OUT';
    const canAccept = !isGroup && status === 'PENDING_IN';
    const canAddFriend = !isGroup && status === 'NONE';

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputDisabled) return;
        if (!messageInput.trim() && !pendingFile) return;

        const clientMsgId = crypto.randomUUID();
        if (pendingFile) return; // File upload is handled separately

        setLiveMessages(prev => [...prev, {
            id: clientMsgId,
            clientMsgId,
            content: messageInput,
            createdAt: new Date().toISOString(),
            senderId: currentUserId,
            isMyMessage: true,
            status: 'sending',
            anim: 'send',
        }]);

        if (!isConnected) {
            setLiveMessages(prev => prev.map(m => m.id === clientMsgId ? {...m, status: 'failed'} : m));
            return;
        }

        sendMessage(convId, messageInput, clientMsgId);
        setMessageInput('');
        setPendingFile(null);
        setIsUserScrolling(false);
        void queryClient.invalidateQueries({queryKey: ['conversations']});
    };

    const formatTime = (iso?: string) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } catch {
            return '';
        }
    };

    return (
        <div className="relative flex flex-col h-full bg-white" onPointerDownCapture={(e) => {
            if (e.target === e.currentTarget) setShowInfoMenu(false);
        }}>
            {/* Header */}
            <div className="h-[64px] px-4 flex items-center justify-between border-b bg-white">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                        <img src={(activeConversation as any).avatar || `https://i.pravatar.cc/150?img=11`}
                             className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" alt=""/>
                        <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                    </div>
                    <div className="min-w-0">
                        <div
                            className="font-semibold text-[15px] text-gray-900 truncate">{(activeConversation as any).chatName}</div>
                        <div className="text-[12px] text-gray-500 flex items-center gap-2">
                            {isConnected ? (
                                <span className="inline-flex items-center gap-1"><span
                                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang hoạt động</span>
                            ) : (
                                <span className="inline-flex items-center gap-2">Đang kết nối <span
                                    className="inline-flex gap-1"><span
                                    className="dot w-1.5 h-1.5 rounded-full bg-amber-500"></span><span
                                    className="dot w-1.5 h-1.5 rounded-full bg-amber-500"></span><span
                                    className="dot w-1.5 h-1.5 rounded-full bg-amber-500"></span></span></span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* CHỈ GỌI START CALL KHI CLICK - KHÔNG KHỞI TẠO WEBRTC HOOK Ở ĐÂY NỮA */}
                    {!isGroup && canMessage && isConnected && (
                        <button onClick={handleCallClick}
                                className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                                title="Gọi Video">
                            <BsCameraVideoFill size={20}/>
                        </button>
                    )}
                    <button type="button" onPointerDown={(e) => safe(e, () => setShowInfoMenu(v => !v))}
                            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
                            title="Tuỳ chọn">
                        <span className="text-2xl leading-none text-gray-700">⋮</span>
                    </button>
                </div>

                {/* Dropdown Options */}
                {showInfoMenu && (
                    <div
                        className="absolute right-4 top-[72px] w-60 bg-white shadow-2xl border border-gray-100 rounded-2xl z-50 overflow-hidden"
                        onPointerDown={(e) => e.stopPropagation()}>
                        {canUnfriend && <button type="button" onPointerDown={(e) => safe(e, doUnfriend)}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm flex items-center gap-2">
                            <BsPersonDash/> Hủy kết bạn</button>}
                        {canCancelRequest && <button type="button" onPointerDown={(e) => safe(e, doCancelFriend)}
                                                     className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm">Hủy
                            lời mời</button>}
                        {canAccept && <button type="button" onPointerDown={(e) => safe(e, doAcceptFriend)}
                                              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm">Chấp nhận
                            kết bạn</button>}
                        {canAddFriend && <button type="button" onPointerDown={(e) => safe(e, doRequestFriend)}
                                                 className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm">Kết
                            bạn</button>}
                    </div>
                )}
            </div>

            {/* Banner trạng thái kết bạn */}
            {!isGroup && bannerText && (
                <div
                    className="px-3 py-2 border-b bg-amber-50 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {bannerText}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'NONE' && <button type="button"
                                                      className="px-2.5 py-1 rounded-full bg-amber-200 hover:bg-amber-300 transition"
                                                      onPointerDown={(e) => safe(e, doRequestFriend)}>Kết bạn</button>}
                        {status === 'PENDING_OUT' && <button type="button"
                                                             className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                                                             onPointerDown={(e) => safe(e, doCancelFriend)}>Hủy</button>}
                        {status === 'PENDING_IN' && <button type="button"
                                                            className="px-2.5 py-1 rounded-full bg-green-100 hover:bg-green-200 transition"
                                                            onPointerDown={(e) => safe(e, doAcceptFriend)}>Xác
                            nhận</button>}
                    </div>
                </div>
            )}

            {/* Message List */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pb-8 chat-bg">
                {isFetchingNextPage && (
                    <div className="flex justify-center py-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                )}
                {!hasNextPage && mergedMessages.length > 20 && (
                    <div className="text-center py-2 text-xs text-gray-400">Đầu cuộc hội thoại</div>
                )}
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : mergedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">Chưa có tin nhắn</div>
                ) : (
                    mergedMessages.map((msg) => {
                        const isMy = msg.isMyMessage === true || msg.senderId === currentUserId;
                        const animClass = msg.anim === 'send' ? 'msg-send' : msg.anim === 'in' ? 'msg-in' : '';
                        const time = formatTime(msg.createdAt);

                        return (
                            <div key={msg.serverId ?? msg.id}
                                 className={`mb-3 flex ${isMy ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] ${animClass}`}>
                                    {!isMy ? (
                                        <div className="flex items-end gap-2">
                                            <img
                                                src={msg.senderAvatar || (activeConversation as any).avatar || `https://i.pravatar.cc/150?img=11`}
                                                className="w-7 h-7 rounded-full object-cover shadow-sm" alt=""/>
                                            <div className="relative group">
                                                {isGroup && <div
                                                    className="text-[11px] text-gray-500 ml-1 mb-0.5">{msg.senderName || 'Unknown'}</div>}
                                                <div
                                                    className="relative px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/70 backdrop-blur border border-white/50 shadow-[0_8px_20px_rgba(15,23,42,0.08)] text-gray-900 text-sm leading-relaxed hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition">
                                                    {msg.content}
                                                    {msg.messageType && msg.messageType !== 'TEXT' && msg.attachmentUrl && (
                                                        <FileAttachment messageType={msg.messageType}
                                                                        attachmentUrl={msg.attachmentUrl}
                                                                        attachmentName={msg.attachmentName}
                                                                        attachmentSize={msg.attachmentSize}
                                                                        attachmentType={msg.attachmentType}/>
                                                    )}
                                                </div>
                                                {time && <div
                                                    className="pointer-events-none absolute -bottom-5 left-2 text-[10px] text-gray-500 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition whitespace-nowrap">{time}</div>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative group flex flex-col items-end">
                                            <div
                                                className={`relative px-3.5 py-2.5 rounded-2xl rounded-br-md text-white text-sm leading-relaxed shadow-[0_10px_22px_rgba(37,99,235,0.25)] transition ${msg.status === 'failed' ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600'}`}>
                                                <span
                                                    className="pointer-events-none absolute inset-0 rounded-2xl rounded-br-md opacity-30"
                                                    style={{background: 'linear-gradient(120deg, rgba(255,255,255,.28), transparent 30%, transparent 70%, rgba(255,255,255,.18))'}}></span>
                                                <span className="relative">{msg.content}</span>
                                                {(msg.status === 'sending' || msg.status === 'failed') && (
                                                    <div className="mt-1 flex items-center justify-end gap-2">
                                                        {msg.status === 'sending' && <span
                                                            className="inline-flex items-center gap-1 text-[10px] text-white/80">Đang gửi...</span>}
                                                        {msg.status === 'failed' &&
                                                            <span className="text-[10px] text-white/90">Gửi lỗi</span>}
                                                    </div>
                                                )}
                                                {msg.messageType && msg.messageType !== 'TEXT' && msg.attachmentUrl && (
                                                    <FileAttachment messageType={msg.messageType}
                                                                    attachmentUrl={msg.attachmentUrl}
                                                                    attachmentName={msg.attachmentName}
                                                                    attachmentSize={msg.attachmentSize}
                                                                    attachmentType={msg.attachmentType}/>
                                                )}
                                            </div>
                                            {time && <div
                                                className="pointer-events-none absolute -bottom-5 right-2 text-[10px] text-gray-500 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition whitespace-nowrap">{time}</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef}></div>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} onPointerDown={(e) => e.stopPropagation()}
                  className="p-3 border-t bg-white">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <FileUploadButton onFileUploaded={handleFileUploaded} conversationId={convId}/>
                        <input value={messageInput} disabled={inputDisabled}
                               onChange={(e) => setMessageInput(e.target.value)}
                               placeholder={inputDisabled ? 'Bạn không thể nhắn tin' : 'Aa'}
                               className="w-full bg-gray-100 rounded-full py-2.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-300 transition"/>
                    </div>
                    <button type="submit" disabled={inputDisabled || !isConnected || messageInput.trim().length === 0}
                            className={`px-4 py-2.5 rounded-full font-semibold text-sm transition active:scale-[.98] ${inputDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white hover:opacity-95'}`}
                            title={!isConnected ? 'Đang kết nối WebSocket...' : 'Gửi'}>Gửi
                    </button>
                </div>
                {!isConnected &&
                    <div className="mt-2 text-[11px] text-gray-500">WebSocket đang kết nối, bạn có thể đợi 1-2s rồi
                        gửi.</div>}
            </form>
        </div>
    );
};

export default ChatWindow;
