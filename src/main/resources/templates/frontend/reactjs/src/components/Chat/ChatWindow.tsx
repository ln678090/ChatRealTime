import {BsCameraVideo, BsImage, BsInfoCircle, BsPersonDash, BsTelephone} from "react-icons/bs"
import {IoAddCircle} from "react-icons/io5"
import {PiSticker} from "react-icons/pi";
import {MdGif} from "react-icons/md";
import {AiFillLike} from "react-icons/ai";

import {useAuthStore} from "../../store/auth.store.ts";
import React, {useEffect, useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {chatService} from "../../services/chat.service.ts";
import {format} from "date-fns";
import {useChatStore} from "../../store/chat.store.ts";
import axiosClient from "../../services/api/axiosClient.ts";


const ChatWindow = () => {

    const {activeConversation} = useChatStore();
    const {user: currentUser} = useAuthStore();// Lấy user từ auth store để biết đâu là tin nhắn của mình
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const [showInfoMenu, setShowInfoMenu] = useState(false);
    // fech message
    const {data: messages} = useQuery({
        queryKey: ['messages', activeConversation?.id],
        queryFn: () => chatService.getMessages(activeConversation?.id!),
        enabled: !!activeConversation?.id, // fetch khi có id
        refetchInterval: 1000,
    });
    const unfriendMutation = useMutation({
        mutationFn: async () => {
            // Cần lấy ID của người đang chat cùng.
            // Lưu ý: activeConversation của bạn cần có field `otherUserId` hoặc bạn phải lấy từ Participants.
            // Giả sử API getMessages trả về senderId, bạn có thể lấy tạm từ đó hoặc update API getConversations trả về `otherUserId`.

            // Ví dụ: lấy otherUserId từ activeConversation (bạn cần update store/interface)
            if (!activeConversation?.otherUser?.id) return;

            return await axiosClient.post('/friends/unfriend', {
                targetUserId: activeConversation.otherUser.id
            });
        },
        onSuccess: () => {
            alert("Đã hủy kết bạn. Các tin nhắn tiếp theo sẽ vào mục Chờ.");
            // Refresh lại để cập nhật trạng thái (nếu có hiển thị status bạn bè)
            queryClient.invalidateQueries({queryKey: ['conversations']});
        }
    });
    const handleUnfriend = () => {
        if (window.confirm(`Bạn muốn hủy kết bạn với ${activeConversation?.chatName}?`)) {
            unfriendMutation.mutate();
        }
    }
    // Mutation gửi tin nhắn
    const sendMessageMutation = useMutation({
        mutationFn: (content: string) => {
            setMessageInput("");
            return chatService.sendMessage(activeConversation?.id!, content);


        },
        onSuccess: () => {

            console.log("send message success");
            // refetch tin nhắn mới
            queryClient.invalidateQueries({queryKey: ['messages', activeConversation?.id]});
            // Refresh lại list conversation để cập nhật tin nhắn cuối
            queryClient.invalidateQueries({queryKey: ['conversations']});
            messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
        },
        onError: (err) => {
            console.log("error send message" + err);

        }
    });

    // auto scroll go end page
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
    }, [messages, activeConversation]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault()

        if (!messageInput.trim() || !activeConversation) return;
        sendMessageMutation.mutate(messageInput);


    };

    if (!activeConversation) {
        return <div className="flex h-full items-center justify-center bg-white text-gray-500">Chọn một cuộc hội thoại
            để bắt đầu</div>;
    }
    return (
        <div
            onClick={() => setShowInfoMenu(false)}
            className="flex flex-col h-full bg-white">
            {/* Header */}
            <div
                className="h-[60px] px-4 flex items-center justify-between shadow-sm border-b border-gray-200 bg-white z-10">
                <div className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition">
                    <div className="relative mr-3">
                        <img src={activeConversation.otherUser?.avatar || "https://i.pravatar.cc/150?img=3"} alt="User"
                             className="w-10 h-10 rounded-full object-cover"/>
                        <span
                            className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-[17px] text-gray-900 leading-tight">{activeConversation.chatName}</h2>
                        <p className="text-xs text-gray-500">Đang hoạt động</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4 text-blue-600">
                    <BsTelephone className="w-6 h-6 cursor-pointer"/>
                    <BsCameraVideo className="w-6 h-6 cursor-pointer"/>
                    {/*<BsInfoCircle className="w-6 h-6 cursor-pointer"/>*/}
                    <div className="relative group/info">
                        <BsInfoCircle className="w-6 h-6 cursor-pointer"/>

                        {/* Simple Tooltip/Dropdown for Info */}
                        <div
                            className="absolute right-0 top-8  w-48 bg-white shadow-xl border rounded-lg z-50 p-1">
                            {!activeConversation.isGroup && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Chặn click lan ra ngoài
                                        setShowInfoMenu(!showInfoMenu);
                                        handleUnfriend
                                    }}
                                    // onClick={handleUnfriend}
                                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                >
                                    <BsPersonDash className="mr-2"/> Hủy kết bạn
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                {messages?.map((msg: any) => {
                    // Kiểm tra xem tin nhắn này có phải của mình không (cần logic so sánh ID)
                    // Giả sử API trả về senderId, so sánh với currentUser.id
                    // const isMyMessage = msg.senderId === currentUser?.id;
                    const isMyMessage = msg.isMyMessage;
                    const isGroup = activeConversation.isGroup;
                    return (
                        <div key={msg.id}
                             className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} space-y-1 mb-4`}>
                            {!isMyMessage && (
                                <div className="flex items-end max-w-[70%]">
                                    <img src={msg.senderAvatar} className="w-7 h-7 rounded-full mr-2 mb-1"/>
                                    <div className="flex flex-col">
                                        {/* Logic hiển thị tên: Chỉ hiện nếu là Group và không phải tin nhắn của mình */}
                                        {isGroup && (
                                            <span className="text-[11px] text-gray-500 ml-3 mb-0.5">
                                                {msg.senderName}
                                            </span>
                                        )}

                                        <div
                                            className="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-none text-[15px]">
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isMyMessage && (
                                <div className="max-w-[70%]">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-2xl rounded-br-none text-[15px]">
                                        {msg.content}
                                    </div>
                                    {/* Format giờ */}
                                    {msg.createdAt && (
                                        <p className="text-[10px] text-gray-400 pr-1 text-right mt-1">
                                            {format(new Date(msg.createdAt), "HH:mm")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef}/>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage}
                  className="p-3 bg-white flex items-center space-x-3 border-t border-gray-100">
                <IoAddCircle className="text-blue-600 w-7 h-7 cursor-pointer hover:opacity-80"/>
                <div className="flex space-x-3 text-blue-600">
                    <BsImage className="w-6 h-6 cursor-pointer"/>
                    <PiSticker className="w-6 h-6 cursor-pointer"/>
                    <MdGif
                        className="w-7 h-7 cursor-pointer border border-blue-600 rounded text-[10px] flex items-center justify-center"/>
                </div>

                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Aa"
                    className="w-full bg-gray-100 text-gray-900 rounded-full py-2 pl-4 pr-10 outline-none focus:ring-0 text-[15px]"
                />

                {messageInput ? (
                    <button type="submit" className="text-blue-600 font-semibold cursor-pointer">Gửi</button>
                ) : (
                    <AiFillLike className="text-blue-600 w-8 h-8 cursor-pointer hover:scale-110 transition-transform"/>
                )}
            </form>
        </div>
    );
};
export default ChatWindow