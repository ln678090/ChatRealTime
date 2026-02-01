import LogoCustom from "../components/compoment/LogoCustom"
import {GoHomeFill} from "react-icons/go";
import {HiOutlineVideoCamera} from "react-icons/hi";
import {BsShop} from "react-icons/bs";
import {RiArchiveDrawerLine} from "react-icons/ri";
import NavItem from "../components/compoment/NavItem";
import {FaCog} from "react-icons/fa";
import ConversationList from "../components/Chat/ConversationList";
import ChatWindow from "../components/Chat/ChatWindow";

import '../assets/CustomScrollbar.css';
import {useChatStore} from "../store/chat.store.ts";
import {useAuthStore} from "../store/auth.store.ts";
import {useState} from "react";
import {BiLogOut} from "react-icons/bi";
import SettingsModal from "../components/settings/SettingsModal.tsx";

const MessengerPage = () => {
    const {activeConversation} = useChatStore();
    const {user, logout} = useAuthStore();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleLogout = () => {
        if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
            logout();
        }
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden"
             onClick={() => setShowUserMenu(false)}
        >
            {/* thanh dieu huong left */}
            <nav
                onClick={(e) => e.stopPropagation()}
                className="w-[72px] flex flex-col items-center py-4 border-r border-gray-200 h-full z-20 shadow-sm bg-white justify-between relative"
            >
                {/* top icon */}
                <div className="flex flex-col items-center space-y-6 w-full">
                    {/* logo */}
                    <div className="mb-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                        <LogoCustom/>
                    </div>
                    {/* nav item */}
                    <div className="flex flex-col space-y-2 w-full px-2">
                        <NavItem icon={<GoHomeFill size={26}/>} active={true}/>
                        <NavItem icon={<HiOutlineVideoCamera size={26}/>}/>
                        <NavItem icon={<BsShop size={24}/>}/>
                        <NavItem icon={<RiArchiveDrawerLine size={24}/>}/>
                    </div>
                </div>

                {/* (Avatar & Settings) */}
                <div className="flex flex-col items-center space-y-5 pb-4 relative">

                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSettings(true);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 cursor-pointer text-gray-500 transition"
                        title="Cài đặt"
                    >
                        <FaCog size={24}/>
                    </div>

                    {/* Avatar User (Click để mở menu) */}
                    <div
                        className="relative cursor-pointer group"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowUserMenu(!showUserMenu);
                        }}
                    >
                        <img
                            src={user?.avatar || "https://i.pravatar.cc/150?img=11"}
                            alt={user?.fullName || "User"}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 hover:ring-2 hover:ring-blue-500 transition"
                        />

                        {/* Status online */}
                        <span
                            className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>

                    {/* MENU ĐĂNG XUẤT */}
                    {showUserMenu && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 left-14 w-60 bg-white shadow-2xl border border-gray-100 rounded-xl z-50 overflow-hidden animate-fade-in-up">
                            {/* Header User Info */}
                            <div className="px-4 py-3 border-b bg-gray-50">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.fullName || "Người dùng"}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email || "Chưa cập nhật email"}</p>
                            </div>

                            {/* Actions */}
                            <div className="py-1">

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSettings(true);
                                        setShowUserMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                    <FaCog size={18}/>
                                    Cài đặt tài khoản
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <BiLogOut size={18}/>
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* danh sach chat */}
            <div className="flex-1 h-screen flex">
                <aside className="w-[380px] h-screen border-r bg-white">
                    <ConversationList/>
                </aside>

                <main className="flex-1 h-screen bg-gray-50">
                    <ChatWindow/>
                </main>
            </div>


            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
};

export default MessengerPage;
