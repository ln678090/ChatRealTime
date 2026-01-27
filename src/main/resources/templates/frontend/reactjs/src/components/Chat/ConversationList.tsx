import {BsThreeDots, BsTrash} from "react-icons/bs";
import {BiEdit} from "react-icons/bi";
import IconButton from '../ui/IconButton';
import {IoSearch} from "react-icons/io5";
import {useChatStore} from "../../store/chat.store";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {chatService} from "../../services/chat.service";
import {formatDistanceToNow} from "date-fns";
import {vi} from "date-fns/locale";
import React, {useState} from "react";
import axiosClient from "../../services/api/axiosClient.ts";
import NewChatModal from "./NewChatModal.tsx";

const ConversationList = () => {

    // const conversations: [] = [
    //     { id: 1, name: "Nguyễn Phúc Lâm", msg: "Bạn: mmmm :)", time: "17 giờ", img: "https://i.pravatar.cc/150?img=3", active: true },
    //     { id: 2, name: "Tùng Anh Dương", msg: "Đã bày tỏ cảm xúc ❤️ về tin...", time: "6 ngày", img: "https://i.pravatar.cc/150?img=68" },
    //     { id: 3, name: "Lớp 12A4", msg: "Đào Công đã rời khỏi nhóm.", time: "5 tuần", img: "https://i.pravatar.cc/150?img=8", isGroup: true },
    //     { id: 4, name: "Kiến trúc cảnh quan", msg: "Xin chào Lâm! Bạn có thắc mắc...", time: "10 tuần", img: "https://i.pravatar.cc/150?img=12" },
    //     { id: 5, name: "Ocean Edu Hòa Mạc", msg: "Chào Lâm! Chúng tôi có thể...", time: "10 tuần", img: "https://i.pravatar.cc/150?img=15" },
    //     { id: 6, name: "SÓC STORE ĐỒNG VĂN", msg: "Xin chào Lâm! Bạn có...", time: "10 tuần", img: "https://i.pravatar.cc/150?img=20" },
    // ];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {activeConversation, setActiveConversation} = useChatStore();

    const {data: conversations, isLoading} = useQuery({
        queryKey: ['conversations'],
        queryFn: chatService.getConversations,
        refetchInterval: 1000 // auto fech on 1s or websoket
    });
    // State quản lý menu 3 chấm
    // Lưu ID của cuộc hội thoại đang mở menu. Nếu null nghĩa là không mở cái nào.
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const deleteChatMutation = useMutation({
        mutationFn: async (conversationId: number) => {
            return await axiosClient.delete(`/conversations/${conversationId}`);
        },
        onSuccess: () => {

            queryClient.invalidateQueries({queryKey: ['conversations']});
            // Nếu đang chat với người vừa xóa -> Reset màn hình chat
            setActiveConversation(null);
            // close menu
            setOpenMenuId(null);
        }
    })

    const handleDeleteChat = (e: React.MouseEvent, conversationId: number) => {
        e.stopPropagation(); // chan su kien click item chat

        if (window.confirm("Bạn chắc chắn muốn xóa cuộc trò chuyện này?")) {
            deleteChatMutation.mutate(conversationId);
        }

    };
    // toggle menu
    const toggleMenu = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };


    const queryClient = useQueryClient();

    const handleSelectChat = (chat: any, conversationId: number) => {
        // map data api => format store
        setActiveConversation({
            id: chat.conversationId,
            chatName: chat.chatName,
            isGroup: chat.isGroup,
            avatar: chat.avatar
        });
    };

    return (
        <div
            onClick={() => setOpenMenuId(null)} // click ngoai dong menu
            className="flex flex-col h-full">
            {/* header */}
            <div className="px-4 pt-3 pb-2">
                <div className="flex justify-between  items-center mb-4 ">
                    <h1 className="text-2xl font-bold text-gray-900 ">Đoạn chat</h1>
                    <div className="flex space-x-2">
                        <IconButton
                            icon={<BsThreeDots size={20}/>}
                        />
                        {/*<IconButton icon={<BiEdit size={20}/>}/>*/}
                        <div onClick={() => setIsModalOpen(true)}>
                            <IconButton icon={<BiEdit size={20}/>}/>
                        </div>
                    </div>
                </div>
                {/* search  bar*/}
                <div className="">
                    <IoSearch className="absolute  left-3   top-1/2 -translate-y-1/2 text-gray-500 text-lg"/>
                    <input type="text"
                           placeholder="Search on Mess"
                           className="w-full bg-gray-100 text-gray-700 pl-10 pr-4 py-2  rounded-full outline-none focus:ring-1 focus:ring-blue-300 transition-all text-[15px]"
                    />
                </div>
            </div>
            {/* list  */}
            <div className="flex-1 overflow-y-auto  px-2 space-y-1  mt-2 custom-scrollbar">
                {isLoading ? (
                    <div className="text-center mt-5 text-gray-500 ">Đang tải ...</div>
                ) : (conversations?.map((chat: any) => {
                        const isActive = activeConversation?.id === chat.conversationId;
                        return (
                            <div key={chat.conversationId} onClick={() => handleSelectChat(chat, chat.conversationId)}
                                 className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors group 
                                ${isActive ? 'bg-blue-50 ' : 'hover:bg-gray-100'} `}
                            >
                                <div className="relative flex-flex-shrink-0 mr-3 ">
                                    <img src={chat.avatar || "https://i.pravatar.cc/150?img=3"} alt=""
                                         className="w-12 h-12 rounded-full object-cover"/>

                                    {chat.active && <span
                                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-white border-2 rounded-full"></span>}
                                </div>
                                <div className="flex-1 win-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className={`text-[15px] truncate ${chat.active ? 'font-semibold' : 'text-gray-900'}`}>{chat.chatName}</h3>
                                    </div>

                                    <div className="flex items-center text-[13px] text-gray-500 truncate">
                                    <span className="text-[11px] text-gray-500 ml-2 flex-shrink-0">
                                        {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), {
                                            addSuffix: false,
                                            locale: vi
                                        }) : ''}
                                    </span>
                                    </div>
                                    <div className="flex items-center text-[13px] text-gray-500 truncate">
                                    <span className={`truncate ${isActive ? 'font-medium text-gray-800' : ''}`}>
                                        {chat.lastMessage}
                                    </span>
                                    </div>
                                </div>

                                {/* Blue dot for unread (mock) */}
                                {!chat.active && Math.random() > 0.7 && (
                                    <div className="w-3 h-3 bg-blue-600 rounded-full ml-2"></div>
                                )}

                                {/*   3 cham and dropdowm menu */}
                                <div className="relative ml-2">
                                    <div
                                        onClick={(e) => toggleMenu(e, chat.conversationId)}
                                        className="p-2 hover:bg-gray-200 rounded-full text-gray-500
                                        opacity-0 group-hover:opacity-100 transition-opacity">
                                        <BsThreeDots size={20}/>
                                    </div>
                                    {/*     dropdowm menu*/}
                                    {openMenuId === chat.conversationId && (
                                        <div
                                            className="absolute right-0 top-8 w-48 bg-white shadow-xl border border-gray-100 rounded-lg z-50 overflow-hidden">
                                            <div // Đổi từ button sang div để tránh xung đột style mặc định của browser
                                                onClick={(e) => handleDeleteChat(e, chat.conversationId)}
                                                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer"
                                            >
                                                <BsTrash className="mr-2"/> Xóa đoạn chat
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )
                    })

                )}
            </div>
            {isModalOpen && (
                <NewChatModal onClose={() => setIsModalOpen(false)}/>
            )}
        </div>
    );

};

export default ConversationList