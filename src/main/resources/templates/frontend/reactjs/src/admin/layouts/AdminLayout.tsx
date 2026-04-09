import {Link, Outlet, useLocation} from "react-router-dom";
import {BsBell, BsBoxArrowLeft, BsLayoutTextWindowReverse, BsPeople, BsShieldSlash} from "react-icons/bs";
import {useMemo} from "react";

export const AdminLayout = () => {
    const location = useLocation();

    const navItems = [
        {path: '/admin/dashboard', label: 'Tổng quan', icon: <BsLayoutTextWindowReverse className="w-5 h-5"/>},
        {path: '/admin/users', label: 'Quản lý Người dùng', icon: <BsPeople className="w-5 h-5"/>},
        {path: '/admin/blacklist', label: 'Từ khóa cấm', icon: <BsShieldSlash className="w-5 h-5"/>},
    ];

    // Tự động tìm tiêu đề trang dựa trên URL hiện tại
    const currentPageTitle = useMemo(() => {
        const currentItem = navItems.find(item => location.pathname.includes(item.path));
        return currentItem ? currentItem.label : 'Bảng điều khiển';
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-[#F3F4F6] font-sans selection:bg-indigo-500 selection:text-white">

            {/* Sidebar - Dark/Indigo Theme */}
            <aside
                className="w-72 bg-gradient-to-b from-indigo-900 to-slate-900 text-white flex flex-col shadow-2xl relative z-20">
                {/* Logo Area */}
                <div className="h-20 flex items-center px-8 border-b border-white/10">
                    <div
                        className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mr-4">
                        <span className="text-xl font-bold text-white tracking-tighter">CR</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                        ChatAdmin
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="px-4 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-4">
                        Menu chính
                    </p>
                    {navItems.map((item) => {
                        const isActive = location.pathname.includes(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                                    isActive
                                        ? 'text-white bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                                        : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {/* Cột active indicator */}
                                {isActive && (
                                    <span
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-400 rounded-r-full shadow-[0_0_10px_rgba(129,140,248,0.7)]"/>
                                )}

                                <span
                                    className={`transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-300' : 'group-hover:scale-110'}`}>
                                    {item.icon}
                                </span>
                                <span className="font-medium tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer/Logout Area */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <Link
                        to="/"
                        className="flex items-center justify-center space-x-3 w-full py-3.5 px-4 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/10"
                    >
                        <BsBoxArrowLeft className="w-5 h-5"/>
                        <span className="font-medium">Quay lại App Chat</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">

                {/* Modern Header (Glassmorphism) */}
                <header
                    className="h-20 bg-white/70 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                            {currentPageTitle}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Notification Bell */}
                        <button
                            className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-gray-100 hover:bg-indigo-50 rounded-full">
                            <BsBell className="w-5 h-5"/>
                            <span
                                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        {/* Admin Avatar */}
                        <div className="flex items-center space-x-3 pl-6 border-l border-gray-200 cursor-pointer group">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Admin
                                    User</p>
                                <p className="text-xs text-gray-500">Super Admin</p>
                            </div>
                            <div
                                className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-[2px]">
                                <div
                                    className="w-full h-full rounded-full bg-white flex items-center justify-center border border-white">
                                    <img
                                        src="https://ui-avatars.com/api/?name=Admin&background=random&color=fff"
                                        alt="Admin Avatar"
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Render Content */}
                    <div className="max-w-7xl mx-auto">
                        <Outlet/>
                    </div>
                </div>
            </main>

            {/* Optional: Add custom scrollbar styling globally in your index.css or tailwind config */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(107, 114, 128, 0.8);
                }
            `
            }}/>
        </div>
    );
};
