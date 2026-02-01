import React, {useEffect, useMemo, useRef, useState} from "react";
import {useInfiniteQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {useChatStore} from "../../store/chat.store";
import axiosClient from "../../services/api/axiosClient";
import {chatService} from "../../services/chat.service";
import {useGlobalSocket} from "../../context/WebSocketContext";
import {BsPersonDash} from "react-icons/bs";
import {useAuthStore} from "../../store/auth.store";
import FileAttachment from "./FileAttachment.tsx";
import FileUploadButton from "./FileUploadButton.tsx";

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
    status?: "sending" | "sent" | "failed";
    anim?: "send" | "in";

    messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentType?: string;
};

const FRIEND_EVENT_CODE = 7;

const ChatWindow: React.FC = () => {
    const {activeConversation, setActiveConversation} = useChatStore();
    const auth = useAuthStore();
    const currentUserId = (auth as any)?.user?.id ?? (auth as any)?.id ?? (auth as any)?.userId;

    const {isConnected, sendMessage, subscribe} = useGlobalSocket();
    const queryClient = useQueryClient();

    const [pendingFile, setPendingFile] = useState<any>(null);

    const [messageInput, setMessageInput] = useState("");
    const [liveMessages, setLiveMessages] = useState<MessageUI[]>([]);
    const [showInfoMenu, setShowInfoMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);

    const convId = (activeConversation as any)?.id;
    const status = (activeConversation as any)?.friendshipStatus ?? "NONE";
    const canMessage = (activeConversation as any)?.canMessage ?? true;
    const inputDisabled = !canMessage || status === "BLOCKED";
    const isGroup = (activeConversation as any)?.isGroup ?? false;

    const toId = (v: any) => (v === null || v === undefined ? undefined : String(v));

    // const handleFileUploaded = (fileData: any) => {
    //     setPendingFile(fileData);
    // };
    // const handleFileUploaded = (fileData: any) => {
    //     console.log('File uploaded, auto-sending:', fileData);
    //
    //     const clientMsgId = crypto.randomUUID();
    //
    //     // Create optimistic message
    //     setLiveMessages((prev) => [
    //         ...prev,
    //         {
    //             id: clientMsgId,
    //             clientMsgId,
    //             content: "", // No text, just file
    //             createdAt: new Date().toISOString(),
    //             senderId: currentUserId,
    //             isMyMessage: true,
    //             status: "sending",
    //             anim: "send",
    //
    //             //  File data
    //             messageType: fileData.messageType as any,
    //             attachmentUrl: fileData.url,
    //             attachmentName: fileData.name,
    //             attachmentSize: fileData.size,
    //             attachmentType: fileData.type,
    //         },
    //     ]);
    //
    //     if (!isConnected) {
    //         setLiveMessages((prev) =>
    //             prev.map((m) =>
    //                 m.id === clientMsgId ? {...m, status: "failed"} : m
    //             )
    //         );
    //         return;
    //     }
    //
    //     //  Send file message via WebSocket
    //     const fileMessageContent = JSON.stringify({
    //         text: "",
    //         file: {
    //             type: fileData.messageType,
    //             url: fileData.url,
    //             name: fileData.name,
    //             size: fileData.size,
    //         }
    //     });
    //
    //     sendMessage(convId, fileMessageContent, clientMsgId);
    //
    //     setIsUserScrolling(false);
    //     void queryClient.invalidateQueries({queryKey: ["conversations"]});
    // };
    // const handleFileUploaded = (fileData: any) => {
    //     console.log('📎 File uploaded, auto-sending:', fileData);
    //
    //     const clientMsgId = crypto.randomUUID();
    //
    //     //  Create optimistic message
    //     setLiveMessages((prev) => [
    //         ...prev,
    //         {
    //             id: clientMsgId,
    //             clientMsgId,
    //             content: "", // No text, just file
    //             createdAt: new Date().toISOString(),
    //             senderId: currentUserId,
    //             isMyMessage: true,
    //             status: "sending",
    //             anim: "send",
    //
    //             //  File data
    //             messageType: fileData.messageType as any,
    //             attachmentUrl: fileData.url,
    //             attachmentName: fileData.name,
    //             attachmentSize: fileData.size,
    //             attachmentType: fileData.type,
    //         },
    //     ]);
    //
    //     if (!isConnected) {
    //         console.error(' WebSocket not connected');
    //         setLiveMessages((prev) =>
    //             prev.map((m) =>
    //                 m.id === clientMsgId ? {...m, status: "failed"} : m
    //             )
    //         );
    //         return;
    //     }
    //
    //     //  Send ONLY TEXT (backend will handle parsing)
    //     // Format: "FILE:url|name|size|type"
    //     const fileMessageContent = `FILE:${fileData.url}|${fileData.name}|${fileData.size}|${fileData.messageType}`;
    //
    //     console.log('Sending file message:', fileMessageContent);
    //
    //     try {
    //         sendMessage(convId, fileMessageContent, clientMsgId);
    //     } catch (error) {
    //         console.error(' Send failed:', error);
    //         setLiveMessages((prev) =>
    //             prev.map((m) =>
    //                 m.id === clientMsgId ? {...m, status: "failed"} : m
    //             )
    //         );
    //     }
    //
    //     setIsUserScrolling(false);
    //     void queryClient.invalidateQueries({queryKey: ["conversations"]});
    // };

    //  Map type to messageType code
    const handleFileUploaded = (fileData: any) => {
        console.log('📎 File uploaded, auto-sending:', fileData);

        //  Check connection first
        if (!isConnected) {
            console.error(' WebSocket not connected, waiting...');

            // Retry after 1 second
            setTimeout(() => {
                if (!isConnected) {
                    console.log('Kết nối bị gián đoạn, vui lòng thử lại');
                    return;
                }
                handleFileUploaded(fileData); // Retry
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

        setLiveMessages((prev) => [
            ...prev,
            {
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
            },
        ]);

        const fileMessageContent = `FILE:${fileData.url}|${fileData.name}|${fileData.size}|${messageType}`;

        console.log(' Sending file message:', fileMessageContent);

        try {
            sendMessage(convId, fileMessageContent, clientMsgId);
            setIsUserScrolling(false);
            void queryClient.invalidateQueries({queryKey: ['conversations']});
        } catch (error) {
            console.error(' Send failed:', error);
            setLiveMessages((prev) =>
                prev.map((m) => (m.id === clientMsgId ? {...m, status: 'failed'} : m))
            );
        }
    };

    const pickPeerId = (conv: any, meIdRaw: any) => {
        const meId = toId(meIdRaw);

        const direct =
            conv?.otherUser?.id ??
            conv?.otherUserId ??
            conv?.peerUserId ??
            conv?.receiverId ??
            conv?.targetUserId;

        if (direct) return toId(direct);

        const arrays = [conv?.participants, conv?.members, conv?.users, conv?.userList].filter(Array.isArray);

        for (const arr of arrays) {
            for (const p of arr) {
                const id = p?.userId ?? p?.id ?? p?.user?.id ?? p?.account?.id;
                const sid = toId(id);
                if (sid && sid !== meId) return sid;
            }
        }

        const pairs: Array<[any, any]> = [
            [conv?.user1Id, conv?.user2Id],
            [conv?.senderId, conv?.receiverId],
            [conv?.fromUserId, conv?.toUserId],
            [conv?.requesterId, conv?.addresseeId],
            [conv?.requesterId, conv?.targetUserId],
        ];

        for (const [a, b] of pairs) {
            const A = toId(a);
            const B = toId(b);
            if (A && B) {
                if (A === meId) return B;
                if (B === meId) return A;
            }
        }

        return undefined;
    };

    const otherUserId = useMemo(
        () => pickPeerId(activeConversation as any, currentUserId),
        [activeConversation, currentUserId]
    );

    const safe = (e: React.SyntheticEvent, fn: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
    };


    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ["messages-paged", convId],
        queryFn: ({pageParam = 0}) => chatService.getMessagesPaged(convId!, pageParam, 50),
        getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.currentPage + 1 : undefined,
        initialPageParam: 0,
        enabled: !!convId,
        staleTime: 30000,
    });


    // const fetchedMessages = useMemo(() => {
    //     if (!data?.pages) return [];
    //     // Pages: mới nhất -> cũ nhất, items trong page: cũ -> mới
    //     // Reverse pages để có: cũ nhất -> mới nhất
    //     return [...data.pages].reverse().flatMap(page => page.items);
    // }, [data]);


    const fetchedMessages = useMemo(() => {
        if (!data?.pages) return [];

        return data.pages
            .slice()
            .reverse()
            .flatMap((page) =>
                page.items.map((m: any) => {
                    let processedMessage = {...m};


                    if (m.content && m.content.startsWith('FILE:')) {
                        try {
                            const fileData = m.content.substring(5);
                            const [url, name, size, type] = fileData.split('|');

                            // Map "image" -> "IMAGE"
                            let msgType = type;
                            if (type && type.toLowerCase() === 'image') msgType = 'IMAGE';
                            else if (type && type.toLowerCase() === 'video') msgType = 'VIDEO';

                            processedMessage = {
                                ...m,
                                content: '', // Hide raw text
                                messageType: msgType || 'FILE',
                                attachmentUrl: url,
                                attachmentName: name,
                                attachmentSize: parseInt(size) || 0,
                                attachmentType: type,
                            };
                        } catch (e) {
                            console.error(' Failed to parse legacy file message:', m.content);
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

                        //  Use processed fields
                        messageType: processedMessage.messageType as any,
                        attachmentUrl: processedMessage.attachmentUrl,
                        attachmentName: processedMessage.attachmentName,
                        attachmentSize: processedMessage.attachmentSize,
                        attachmentType: processedMessage.attachmentType,
                    };
                })
            );
    }, [data, currentUserId]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const {scrollTop, scrollHeight, clientHeight} = container;

            // Detect if user is scrolling (not at bottom)
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsUserScrolling(!isAtBottom);

            // Load older messages when scroll to top
            if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
                const previousHeight = scrollHeight;

                fetchNextPage().then(() => {
                    // Keep scroll position after loading
                    setTimeout(() => {
                        if (container) {
                            const newHeight = container.scrollHeight;
                            container.scrollTop = newHeight - previousHeight;
                        }
                    }, 100);
                });
            }
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


    // ChatWindow.tsx - Update subscribe callback
    // useEffect(() => {
    //     if (!convId) return;
    //
    //     const unsubscribe = subscribe((payload: any) => {
    //         // FRIEND EVENT
    //         const isFriendEvent =
    //             payload?.messageType === FRIEND_EVENT_CODE ||
    //             payload?.messageType === "FRIEND_EVENT";
    //
    //         if (isFriendEvent) {
    //
    //             void queryClient.invalidateQueries({queryKey: ["conversations"]});
    //
    //
    //             const newStatus = String(payload?.uiStatus ?? "NONE");
    //             const actorId = String(payload?.actorId ?? "");
    //             const targetId = String(payload?.targetId ?? "");
    //
    //
    //             if (otherUserId && (otherUserId === actorId || otherUserId === targetId)) {
    //                 if (activeConversation) {
    //                     setActiveConversation({
    //                         ...(activeConversation as any),
    //                         friendshipStatus: newStatus
    //                     } as any);
    //                 }
    //             }
    //
    //             return; // Don't process as chat message
    //         }
    //
    //         // CHAT MESSAGE
    //         if (!payload?.conversationId) return;
    //         if (String(payload?.conversationId) !== String(convId)) return;
    //
    //         setLiveMessages((prev) => {
    //             // Ack optimistic
    //             if (payload.clientMsgId) {
    //                 const idx = prev.findIndex((m) => m.clientMsgId === payload.clientMsgId);
    //                 if (idx !== -1) {
    //                     const copy = [...prev];
    //                     copy[idx] = {
    //                         ...copy[idx],
    //                         serverId: payload.messageId ?? copy[idx].serverId,
    //                         createdAt: payload.createdAt ?? copy[idx].createdAt,
    //                         status: "sent",
    //                     };
    //                     return copy;
    //                 }
    //             }
    //
    //             // Dedupe
    //             const serverId = payload.messageId ?? payload.id;
    //             if (serverId && prev.some((m) => m.serverId === serverId)) return prev;
    //
    //             return [
    //                 ...prev,
    //                 {
    //                     id: String(serverId ?? crypto.randomUUID()),
    //                     serverId,
    //                     clientMsgId: payload.clientMsgId,
    //                     content: payload.content ?? "",
    //                     createdAt: payload.createdAt,
    //                     senderId: payload.senderId,
    //                     senderName: payload.senderName,
    //                     senderAvatar: payload.senderAvatar,
    //                     status: "sent",
    //                     anim: "in",
    //
    //
    //                     messageType: payload.contentType || 'TEXT',
    //                     attachmentUrl: payload.attachmentUrl,
    //                     attachmentName: payload.attachmentName,
    //                     attachmentSize: payload.attachmentSize,
    //                     attachmentType: payload.attachmentType,
    //                 },
    //             ];
    //         });
    //     });
    //
    //     return unsubscribe;
    // }, [subscribe, convId, queryClient, otherUserId, activeConversation, setActiveConversation]);
// ChatWindow.tsx - Line ~130
    useEffect(() => {
        if (!convId) return;

        const unsubscribe = subscribe((payload: any) => {
            // FRIEND EVENT
            const isFriendEvent =
                payload?.messageType === FRIEND_EVENT_CODE ||
                payload?.messageType === "FRIEND_EVENT";

            if (isFriendEvent) {
                void queryClient.invalidateQueries({queryKey: ["conversations"]});

                const newStatus = String(payload?.uiStatus ?? "NONE");
                const actorId = String(payload?.actorId ?? "");
                const targetId = String(payload?.targetId ?? "");

                if (otherUserId && (otherUserId === actorId || otherUserId === targetId)) {
                    if (activeConversation) {
                        setActiveConversation({
                            ...(activeConversation as any),
                            friendshipStatus: newStatus
                        } as any);
                    }
                }

                return; // Don't process as chat message
            }

            // CHAT MESSAGE
            if (!payload?.conversationId) return;
            if (String(payload?.conversationId) !== String(convId)) return;

            setLiveMessages((prev) => {
                // Ack optimistic
                if (payload.clientMsgId) {
                    const idx = prev.findIndex((m) => m.clientMsgId === payload.clientMsgId);
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = {
                            ...copy[idx],
                            serverId: payload.messageId ?? copy[idx].serverId,
                            createdAt: payload.createdAt ?? copy[idx].createdAt,
                            status: "sent",
                        };
                        return copy;
                    }
                }

                // Dedupe
                const serverId = payload.messageId ?? payload.id;
                if (serverId && prev.some((m) => m.serverId === serverId)) return prev;

                //  Parse contentType string to messageType
                let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' = 'TEXT';
                if (typeof payload.contentType === 'string') {
                    messageType = payload.contentType as any;
                } else if (typeof payload.contentType === 'number') {
                    // Map number to string
                    const typeMap: Record<number, any> = {
                        0: 'TEXT',
                        1: 'IMAGE',
                        2: 'VIDEO',
                        3: 'AUDIO',
                        4: 'FILE',
                    };
                    messageType = typeMap[payload.contentType] || 'TEXT';
                }

                return [
                    ...prev,
                    {
                        id: String(serverId ?? crypto.randomUUID()),
                        serverId,
                        clientMsgId: payload.clientMsgId,
                        content: payload.content ?? "",
                        createdAt: payload.createdAt,
                        senderId: payload.senderId,
                        senderName: payload.senderName,
                        senderAvatar: payload.senderAvatar,
                        status: "sent",
                        anim: "in",

                        messageType,
                        attachmentUrl: payload.attachmentUrl,
                        attachmentName: payload.attachmentName,
                        attachmentSize: payload.attachmentSize,
                        attachmentType: payload.attachmentType,
                    },
                ];
            });
        });

        return unsubscribe;
    }, [subscribe, convId, queryClient, otherUserId, activeConversation, setActiveConversation]);

    const mergedMessages = useMemo(() => {
        const map = new Map<string | number, MessageUI>();

        // 1. Duyệt tin nhắn tải từ API (fetchedMessages)
        (fetchedMessages as any[]).forEach((m) => {
            const serverId = m.id;


            map.set(serverId, {
                ...m,
                id: String(serverId),
                serverId,
                status: "sent",
            });
        });

        // 2. Duyệt tin nhắn realtime (liveMessages)
        liveMessages.forEach((m) => {
            const key = m.serverId ?? m.id;


            map.set(key, {...m});
        });

        // 3. Convert ra mảng và sắp xếp theo thời gian
        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ta - tb;
        });

        return arr;
    }, [fetchedMessages, liveMessages]);

    // const mergedMessages = useMemo(() => {
    //     const map = new Map<string | number, MessageUI>();
    //
    //     (fetchedMessages as any[]).forEach((m) => {
    //         const serverId = m.id;
    //         map.set(serverId, {
    //             id: String(serverId),
    //             serverId,
    //             content: m.content ?? "",
    //             createdAt: m.createdAt,
    //             senderId: m.senderId,
    //             senderName: m.senderName,
    //             senderAvatar: m.senderAvatar,
    //             isMyMessage: m.isMyMessage,
    //             status: "sent",
    //         });
    //     });
    //
    //     liveMessages.forEach((m) => {
    //         const key = m.serverId ?? m.id;
    //         map.set(key, m);
    //     });
    //
    //     const arr = Array.from(map.values());
    //     arr.sort((a, b) => {
    //         const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    //         const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    //         return ta - tb;
    //     });
    //     return arr;
    // }, [fetchedMessages, liveMessages]);


    // useEffect(() => {
    //     if (!isUserScrolling && messagesEndRef.current) {
    //         messagesEndRef.current.scrollIntoView({behavior: "smooth"});
    //     }
    // }, [mergedMessages.length, isUserScrolling]);
    //
    //
    // useEffect(() => {
    //     setLiveMessages([]);
    //     setMessageInput("");
    //     setShowInfoMenu(false);
    //     setIsUserScrolling(false);
    // }, [convId]);
//  Scroll to bottom when conversation changes (initial load)
    useEffect(() => {
        if (!convId) return;

        // Reset scroll state
        setLiveMessages([]);
        setMessageInput("");
        setShowInfoMenu(false);
        setIsUserScrolling(false);

        //  Scroll to bottom after data loads (small delay for DOM)
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({behavior: 'auto'}); // instant scroll
            }
        }, 100);
    }, [convId]);

//  Scroll to bottom when messages change (only if not user scrolling)
    useEffect(() => {
        if (!isUserScrolling && messagesEndRef.current) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
            }, 50);
        }
    }, [mergedMessages, isUserScrolling]);
//  Force scroll after data loads (first page)
    useEffect(() => {
        if (data?.pages && data.pages.length === 1 && messagesEndRef.current) {
            // First load: scroll to bottom immediately
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 200);
        }
    }, [data?.pages]);


    const requestFriendMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClient.post("/friends/add", {targetUserId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ["conversations"]});
            if (activeConversation) {
                setActiveConversation({...(activeConversation as any), friendshipStatus: "PENDING_OUT"} as any);
            }
        },
        onError: (err: any) => {
            console.error("friends/request error:", err?.response?.status, err?.response?.data || err);
            alert(err?.response?.data?.message ?? "Gửi lời mời kết bạn thất bại.");
        },
    });

    const cancelRequestMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClient.post("/friends/cancel", {targetUserId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ["conversations"]});
            if (activeConversation) {
                setActiveConversation({...(activeConversation as any), friendshipStatus: "NONE"} as any);
            }
        },
        onError: (err: any) => {
            console.error("friends/cancel error:", err?.response?.status, err?.response?.data || err);
            alert(err?.response?.data?.message ?? "Hủy lời mời thất bại.");
        },
    });

    const acceptFriendMutation = useMutation({
        mutationFn: (requesterId: string) => axiosClient.post("/friends/accept", {requesterId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ["conversations"]});
            if (activeConversation) {
                setActiveConversation({...(activeConversation as any), friendshipStatus: "FRIEND"} as any);
            }
        },
        onError: (err: any) => {
            console.error("friends/accept error:", err?.response?.status, err?.response?.data || err);
            alert(err?.response?.data?.message ?? "Chấp nhận kết bạn thất bại.");
        },
    });

    const unfriendMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClient.post("/friends/unfriend", {targetUserId}),
        onSuccess: () => {
            void queryClient.invalidateQueries({queryKey: ["conversations"]});
            if (activeConversation) {
                setActiveConversation({...(activeConversation as any), friendshipStatus: "NONE"} as any);
            }
        },
        onError: (err: any) => {
            console.error("friends/unfriend error:", err?.response?.status, err?.response?.data || err);
            alert(err?.response?.data?.message ?? "Hủy kết bạn thất bại.");
        },
    });

    const doRequestFriend = () => {
        if (!otherUserId) return alert("Không xác định được người nhận.");
        requestFriendMutation.mutate(otherUserId);
    };
    const doCancelFriend = () => {
        if (!otherUserId) return alert("Không xác định được người nhận.");
        cancelRequestMutation.mutate(otherUserId);
    };
    const doAcceptFriend = () => {
        if (!otherUserId) return alert("Không xác định được người gửi lời mời.");
        acceptFriendMutation.mutate(otherUserId);
    };
    const doUnfriend = () => {
        if (!otherUserId) return alert("Không xác định được người cần hủy kết bạn.");
        unfriendMutation.mutate(otherUserId);
    };


    if (!activeConversation || !convId) {
        return <div className="h-full flex items-center justify-center text-gray-500">Chọn một cuộc hội thoại để bắt
            đầu</div>;
    }

    const bannerText =
        status === "PENDING_OUT"
            ? "Bạn đã gửi lời mời kết bạn."
            : status === "PENDING_IN"
                ? "Người này đã gửi lời mời kết bạn."
                : status === "BLOCKED"
                    ? "Bạn không thể nhắn tin với người này."
                    : status !== "FRIEND"
                        ? "Bạn đang nhắn tin khi chưa kết bạn."
                        : null;

    const canUnfriend = !isGroup && status === "FRIEND";
    const canCancelRequest = !isGroup && status === "PENDING_OUT";
    const canAccept = !isGroup && status === "PENDING_IN";
    const canAddFriend = !isGroup && status === "NONE";
    // ChatWindow.tsx - handleSendMessage
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputDisabled) return;

        if (!messageInput.trim() && !pendingFile) return;

        const clientMsgId = crypto.randomUUID();


        if (pendingFile) {
            // TODO: Upload file first, get URL
            console.log('File upload not implemented yet');
            return;
        }


        setLiveMessages((prev) => [
            ...prev,
            {
                id: clientMsgId,
                clientMsgId,
                content: messageInput,
                createdAt: new Date().toISOString(),
                senderId: currentUserId,
                isMyMessage: true,
                status: "sending",
                anim: "send",
            },
        ]);

        if (!isConnected) {
            setLiveMessages((prev) =>
                prev.map((m) =>
                    m.id === clientMsgId ? {...m, status: "failed"} : m
                )
            );
            return;
        }


        sendMessage(convId, messageInput, clientMsgId);

        // Clear input
        setMessageInput("");
        setPendingFile(null);
        setIsUserScrolling(false);

        void queryClient.invalidateQueries({queryKey: ["conversations"]});
    };

    // const handleSendMessage = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if (inputDisabled) return;
    //
    //     if (!messageInput.trim() && !pendingFile) return;
    //
    //     const clientMsgId = crypto.randomUUID();
    //
    //     //  Nếu có file: upload trước
    //     let uploadedFileData: any = null;
    //     if (pendingFile) {
    //         try {
    //             // Show uploading status
    //             setLiveMessages((prev) => [
    //                 ...prev,
    //                 {
    //                     id: clientMsgId,
    //                     clientMsgId,
    //                     content: messageInput.trim() || "📎 Đang gửi file...",
    //                     createdAt: new Date().toISOString(),
    //                     senderId: currentUserId,
    //                     isMyMessage: true,
    //                     status: "sending",
    //                     anim: "send",
    //                 },
    //             ]);
    //
    //             // Upload file via REST API
    //             const formData = new FormData();
    //             formData.append('file', pendingFile.file); //  raw File object
    //             formData.append('conversationId', convId);
    //
    //             const response = await axiosClient.post('/api/messages/upload', formData, {
    //                 headers: {'Content-Type': 'multipart/form-data'},
    //             });
    //
    //             uploadedFileData = response.data; // { url, name, size, type, messageType }
    //
    //         } catch (error: any) {
    //             console.error('File upload failed:', error);
    //
    //             // Mark as failed
    //             setLiveMessages((prev) =>
    //                 prev.map((m) =>
    //                     m.id === clientMsgId
    //                         ? {...m, status: "failed", content: "❌ Upload file thất bại"}
    //                         : m
    //                 )
    //             );
    //             return; // Stop execution
    //         }
    //     }
    //
    //     // Send message via WebSocket (with file URL if exists)
    //     const messageData = {
    //         conversationId: convId,
    //         content: messageInput.trim() || null,
    //         clientMsgId,
    //
    //         // File metadata (if uploaded)
    //         messageType: uploadedFileData ? uploadedFileData.messageType : 'TEXT',
    //         attachmentUrl: uploadedFileData?.url,
    //         attachmentName: uploadedFileData?.name,
    //         attachmentSize: uploadedFileData?.size,
    //         attachmentType: uploadedFileData?.type,
    //     };
    //
    //     // If NOT uploading file, create optimistic UI
    //     if (!pendingFile) {
    //         setLiveMessages((prev) => [
    //             ...prev,
    //             {
    //                 id: clientMsgId,
    //                 clientMsgId,
    //                 content: messageInput,
    //                 createdAt: new Date().toISOString(),
    //                 senderId: currentUserId,
    //                 isMyMessage: true,
    //                 status: "sending",
    //                 anim: "send",
    //             },
    //         ]);
    //     } else {
    //         // Update with file data
    //         setLiveMessages((prev) =>
    //             prev.map((m) =>
    //                 m.id === clientMsgId
    //                     ? {
    //                         ...m,
    //                         content: messageInput.trim() || "",
    //                         messageType: uploadedFileData.messageType,
    //                         attachmentUrl: uploadedFileData.url,
    //                         attachmentName: uploadedFileData.name,
    //                         attachmentSize: uploadedFileData.size,
    //                         attachmentType: uploadedFileData.type,
    //                     }
    //                     : m
    //             )
    //         );
    //     }
    //
    //     if (!isConnected) {
    //         setLiveMessages((prev) => prev.map((m) => (m.id === clientMsgId ? {...m, status: "failed"} : m)));
    //         return;
    //     }
    //
    //     // Send to WebSocket (now with full data)
    //     sendMessage(convId, JSON.stringify(messageData), clientMsgId);
    //
    //     // Clear input
    //     setMessageInput("");
    //     setPendingFile(null);
    //     setIsUserScrolling(false);
    //
    //     void queryClient.invalidateQueries({queryKey: ["conversations"]});
    // };

    const formatTime = (iso?: string) => {
        if (!iso) return "";
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
        } catch {
            return "";
        }
    };

    return (
        <div
            className="relative flex flex-col h-full bg-white"
            onPointerDownCapture={(e) => {
                if (e.target === e.currentTarget) setShowInfoMenu(false);
            }}
        >
            <style>{`
        .chat-bg {
          background:
            radial-gradient(600px 300px at 20% 0%, rgba(99,102,241,0.10), transparent 60%),
            radial-gradient(500px 260px at 85% 20%, rgba(236,72,153,0.10), transparent 60%),
            linear-gradient(to bottom, rgba(248,250,252,1), rgba(255,255,255,1));
        }
        @keyframes popIn { from { opacity: 0; transform: translateY(10px) scale(.98);} to { opacity:1; transform: translateY(0) scale(1);} }
        @keyframes sendPop { 0%{opacity:.6;transform: translateY(10px) scale(.96);} 60%{opacity:1;transform: translateY(-2px) scale(1.02);} 100%{opacity:1;transform: translateY(0) scale(1);} }
        .msg-in { animation: popIn 180ms ease-out; }
        .msg-send { animation: sendPop 220ms ease-out; }
        @keyframes dots { 0%,80%,100%{transform: translateY(0); opacity:.5;} 40%{transform: translateY(-3px); opacity:1;} }
        .dot { animation: dots 1s infinite; }
        .dot:nth-child(2){ animation-delay:.15s; }
        .dot:nth-child(3){ animation-delay:.30s; }
      `}</style>


            <div className="h-[64px] px-4 flex items-center justify-between border-b bg-white">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                        <img
                            src={(activeConversation as any).avatar || "https://i.pravatar.cc/150?img=11"}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                            alt=""
                        />
                        <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                isConnected ? "bg-emerald-500" : "bg-amber-400"
                            }`}
                        />
                    </div>

                    <div className="min-w-0">
                        <div
                            className="font-semibold text-[15px] text-gray-900 truncate">{(activeConversation as any).chatName}</div>
                        <div className="text-[12px] text-gray-500 flex items-center gap-2">
                            {isConnected ? (
                                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                  Đang hoạt động
                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2">
                  Đang kết nối
                  <span className="inline-flex gap-1">
                    <span className="dot w-1.5 h-1.5 rounded-full bg-amber-500"/>
                    <span className="dot w-1.5 h-1.5 rounded-full bg-amber-500"/>
                    <span className="dot w-1.5 h-1.5 rounded-full bg-amber-500"/>
                  </span>
                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onPointerDown={(e) => safe(e, () => setShowInfoMenu((v) => !v))}
                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
                    title="Tuỳ chọn"
                >
                    <span className="text-2xl leading-none text-gray-700">⋯</span>
                </button>
            </div>


            {showInfoMenu && (
                <div
                    className="absolute right-4 top-[72px] w-60 bg-white shadow-2xl border border-gray-100 rounded-2xl z-50 overflow-hidden"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {canUnfriend && (
                        <button
                            type="button"
                            onPointerDown={(e) => safe(e, doUnfriend)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                        >
                            <BsPersonDash/> Hủy kết bạn
                        </button>
                    )}
                    {canCancelRequest && (
                        <button
                            type="button"
                            onPointerDown={(e) => safe(e, doCancelFriend)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm"
                        >
                            Hủy lời mời
                        </button>
                    )}
                    {canAccept && (
                        <button
                            type="button"
                            onPointerDown={(e) => safe(e, doAcceptFriend)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm"
                        >
                            Chấp nhận kết bạn
                        </button>
                    )}
                    {canAddFriend && (
                        <button
                            type="button"
                            onPointerDown={(e) => safe(e, doRequestFriend)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm"
                        >
                            Kết bạn
                        </button>
                    )}
                </div>
            )}


            {!isGroup && bannerText && (
                <div
                    className="px-3 py-2 border-b bg-amber-50 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>
                {bannerText}
            </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {status === "NONE" && (
                            <button
                                type="button"
                                className="px-2.5 py-1 rounded-full bg-amber-200 hover:bg-amber-300 transition"
                                onPointerDown={(e) => safe(e, doRequestFriend)}
                            >
                                Kết bạn
                            </button>
                        )}
                        {status === "PENDING_OUT" && (
                            <button
                                type="button"
                                className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                                onPointerDown={(e) => safe(e, doCancelFriend)}
                            >
                                Hủy
                            </button>
                        )}
                        {status === "PENDING_IN" && (
                            <button
                                type="button"
                                className="px-2.5 py-1 rounded-full bg-green-100 hover:bg-green-200 transition"
                                onPointerDown={(e) => safe(e, doAcceptFriend)}
                            >
                                Xác nhận
                            </button>
                        )}
                    </div>
                </div>
            )}


            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pb-8 chat-bg">

                {isFetchingNextPage && (
                    <div className="flex justify-center py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            Đang tải tin nhắn cũ...
                        </div>
                    </div>
                )}


                {!hasNextPage && mergedMessages.length > 20 && (
                    <div className="text-center py-2 text-xs text-gray-400">
                        — Đầu cuộc hội thoại —
                    </div>
                )}


                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
                    </div>
                ) : mergedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Chưa có tin nhắn
                    </div>
                ) : (
                    <>
                        {mergedMessages.map((msg) => {
                            const isMy = msg.isMyMessage === true ||
                                (msg.senderId && currentUserId && msg.senderId === currentUserId);

                            const animClass = msg.anim === "send" ? "msg-send" : msg.anim === "in" ? "msg-in" : "";
                            const time = formatTime(msg.createdAt);

                            return (
                                <div key={msg.serverId ?? msg.id}
                                     className={`mb-3 flex ${isMy ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[78%] ${animClass}`}>
                                        {/* OTHER USER MESSAGE */}
                                        {!isMy && (
                                            <div className="flex items-end gap-2">
                                                <img
                                                    src={msg.senderAvatar || (activeConversation as any).avatar || "https://i.pravatar.cc/150?img=11"}
                                                    className="w-7 h-7 rounded-full object-cover shadow-sm"
                                                    alt=""
                                                />

                                                <div className="relative group">
                                                    {isGroup && (
                                                        <div className="text-[11px] text-gray-500 ml-1 mb-0.5">
                                                            {msg.senderName || "Unknown"}
                                                        </div>
                                                    )}

                                                    <div
                                                        className="relative px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/70 backdrop-blur border border-white/50 shadow-[0_8px_20px_rgba(15,23,42,0.08)] text-gray-900 text-sm leading-relaxed hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition">
                                                        {msg.content}


                                                        {msg.messageType && msg.messageType !== 'TEXT' && msg.attachmentUrl && (
                                                            <FileAttachment
                                                                messageType={msg.messageType}
                                                                attachmentUrl={msg.attachmentUrl}
                                                                attachmentName={msg.attachmentName}
                                                                attachmentSize={msg.attachmentSize}
                                                                attachmentType={msg.attachmentType}
                                                            />
                                                        )}
                                                    </div>

                                                    {time && (
                                                        <div
                                                            className="pointer-events-none absolute -bottom-5 left-2 text-[10px] text-gray-500 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition whitespace-nowrap">
                                                            {time}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* MY MESSAGE */}
                                        {isMy && (
                                            <div className="relative group flex flex-col items-end">
                                                <div
                                                    className={`relative px-3.5 py-2.5 rounded-2xl rounded-br-md text-white text-sm leading-relaxed shadow-[0_10px_22px_rgba(37,99,235,0.25)] transition ${
                                                        msg.status === "failed"
                                                            ? "bg-gradient-to-r from-rose-500 to-red-600"
                                                            : "bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600"
                                                    }`}>
                            <span className="pointer-events-none absolute inset-0 rounded-2xl rounded-br-md opacity-30"
                                  style={{
                                      background: "linear-gradient(120deg, rgba(255,255,255,.28), transparent 30%, transparent 70%, rgba(255,255,255,.18))",
                                  }}
                            />
                                                    <span className="relative">{msg.content}</span>

                                                    {/* Status indicators */}
                                                    {(msg.status === "sending" || msg.status === "failed") && (
                                                        <div className="mt-1 flex items-center justify-end gap-2">
                                                            {msg.status === "sending" && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] text-white/80">
                                            Đang gửi
                                            <span className="inline-flex gap-1">
                                                <span className="dot w-1.5 h-1.5 rounded-full bg-white/80"/>
                                                <span className="dot w-1.5 h-1.5 rounded-full bg-white/80"/>
                                                <span className="dot w-1.5 h-1.5 rounded-full bg-white/80"/>
                                            </span>
                                        </span>
                                                            )}
                                                            {msg.status === "failed" && (
                                                                <span
                                                                    className="text-[10px] text-white/90">Gửi lỗi</span>
                                                            )}
                                                        </div>
                                                    )}


                                                    {msg.messageType && msg.messageType !== 'TEXT' && msg.attachmentUrl && (
                                                        <FileAttachment
                                                            messageType={msg.messageType}
                                                            attachmentUrl={msg.attachmentUrl}
                                                            attachmentName={msg.attachmentName}
                                                            attachmentSize={msg.attachmentSize}
                                                            attachmentType={msg.attachmentType}
                                                        />
                                                    )}
                                                </div>

                                                {time && (
                                                    <div
                                                        className="pointer-events-none absolute -bottom-5 right-2 text-[10px] text-gray-500 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition whitespace-nowrap">
                                                        {time}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef}/>
                    </>
                )}
            </div>


            <form onSubmit={handleSendMessage} onPointerDown={(e) => e.stopPropagation()}
                  className="p-3 border-t bg-white">
                <div className="flex items-center gap-3">
                    {/*<div className="flex-1 relative">*/}
                    {/*    <FileUploadButton onFileUploaded={handleFileUploaded} conversationId={convId}/>*/}
                    {/*    <input*/}
                    {/*        value={messageInput}*/}
                    {/*        disabled={inputDisabled}*/}
                    {/*        onChange={(e) => setMessageInput(e.target.value)}*/}
                    {/*        placeholder={inputDisabled ? "Bạn không thể nhắn tin" : "Aa"}*/}
                    {/*        className={`w-full bg-gray-100 rounded-full py-2.5 px-4 outline-none focus:ring-2 focus:ring-indigo-300 transition ${*/}
                    {/*            inputDisabled ? "opacity-60 cursor-not-allowed" : ""*/}
                    {/*        }`}*/}
                    {/*    />*/}

                    {/*    <span*/}
                    {/*        className="pointer-events-none absolute inset-0 rounded-full opacity-0 focus-within:opacity-100 transition"*/}
                    {/*        style={{boxShadow: "0 0 0 6px rgba(99,102,241,.12)"}}*/}
                    {/*    />*/}
                    {/*</div>*/}
                    <div className="flex-1 relative">
                        <FileUploadButton onFileUploaded={handleFileUploaded} conversationId={convId}/>

                        <input
                            value={messageInput}
                            disabled={inputDisabled}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={inputDisabled ? "Bạn không thể nhắn tin" : "Aa"}
                            className={`w-full bg-gray-100 rounded-full py-2.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-300 transition ${
                                inputDisabled ? "opacity-60 cursor-not-allowed" : ""
                            }`}

                        />

                        <span
                            className="pointer-events-none absolute inset-0 rounded-full opacity-0 focus-within:opacity-100 transition"
                            style={{boxShadow: "0 0 0 6px rgba(99,102,241,.12)"}}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inputDisabled || (!isConnected && messageInput.trim().length > 0)}
                        className={`px-4 py-2.5 rounded-full font-semibold text-sm transition active:scale-[.98] ${
                            inputDisabled
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white hover:opacity-95"
                        }`}
                        title={!isConnected ? "Đang kết nối WebSocket..." : "Gửi"}
                    >
                        Gửi
                    </button>
                </div>

                {!isConnected &&
                    <div className="mt-2 text-[11px] text-gray-500">WebSocket đang kết nối… bạn có thể đợi 1–2s rồi
                        gửi.</div>}
            </form>
        </div>
    );
};

export default ChatWindow;
