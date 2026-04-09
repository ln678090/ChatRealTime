import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminApi} from "../../services/api/admin.api.ts";
import {BsLockFill, BsPersonCircle, BsUnlockFill} from 'react-icons/bs';
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";

export const UsersPage = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');

    // Fetch Data
    const {data, isLoading} = useQuery({
        queryKey: ['admin-users', page, statusFilter],
        queryFn: () => adminApi.getUsers({page, size: 10, status: statusFilter}),
    });

    const lockMutation = useMutation({
        mutationFn: ({id, locked}: { id: string; locked: boolean }) => adminApi.toggleUserLock(id, locked),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['admin-users']}),
    });
    const MySwal = withReactContent(Swal);

    const handleToggleLock = (user: any) => {

        const isCurrentlyLocked = !user.enabled; // locked = enabled = false
        const actionText = isCurrentlyLocked ? 'MỞ KHÓA' : 'KHÓA';
        const actionColor = isCurrentlyLocked ? '#22c55e' : '#ef4444';

        MySwal.fire({
            title: 'Xác nhận',
            html: `
            Bạn có chắc muốn <b>${actionText}</b> tài khoản 
            <span style="color:#2563eb">${user.email}</span>?
        `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: actionColor,
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Đồng ý ${actionText.toLowerCase()}`,
            cancelButtonText: 'Huỷ bỏ',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                lockMutation.mutate({
                    id: user.id,
                    locked: !isCurrentlyLocked   // nếu đang active -> gửi locked=true
                });
            }
        });
    };
    // const handleToggleLock = (user: User) => {
    //     const isCurrentlyLocked = !user.enabled;
    //     if (window.confirm(`Bạn muốn ${isCurrentlyLocked ? 'MỞ KHÓA' : 'KHÓA'} tài khoản ${user.email}?`)) {
    //         lockMutation.mutate({id: user.id, locked: !isCurrentlyLocked});
    //     }
    // };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            {/* Header & Filter */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h3>
                    <p className="text-gray-500 text-sm mt-1">Danh sách thành viên trong hệ thống</p>
                </div>
                <div className="flex gap-3">
                    <select
                        className="border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-all shadow-sm"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Chỉ xem Đang hoạt động</option>
                        <option value="LOCKED">Chỉ xem Bị khóa</option>
                    </select>
                </div>
            </div>

            {/* Bảng Dữ Liệu */}
            <div className="flex-1 overflow-auto rounded-xl border border-gray-200">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                        Đang tải dữ liệu...
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="text-gray-600 text-sm font-semibold uppercase tracking-wider">
                            <th className="p-4 border-b border-gray-200">Người dùng</th>
                            <th className="p-4 border-b border-gray-200">Vai trò (Roles)</th>
                            <th className="p-4 border-b border-gray-200">Trạng thái</th>
                            <th className="p-4 border-b border-gray-200 text-right">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                        {data?.content?.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">Không tìm thấy người dùng
                                    nào.
                                </td>
                            </tr>
                        ) : (
                            data?.content.map((user) => (
                                <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="avatar"
                                                     className="w-10 h-10 rounded-full object-cover border border-gray-200"/>
                                            ) : (
                                                <BsPersonCircle className="w-10 h-10 text-gray-300"/>
                                            )}
                                            <div>
                                                <div className="font-semibold text-gray-900">{user.fullName}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(user.roles) && user.roles.length > 0 ? (
                                                user.roles.map(role => (
                                                    <span key={role}
                                                          className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold tracking-wide">
                                                            {role.replace('ROLE_', '')}
                                                        </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">Không có</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                                    user.enabled
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                <span
                                                    className={`w-2 h-2 rounded-full mr-2 ${user.enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {user.enabled ? 'HOẠT ĐỘNG' : 'BỊ KHÓA'}
                                            </span>
                                    </td>

                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleToggleLock(user)}
                                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                user.enabled
                                                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                                    : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                            }`}
                                        >
                                            {user.enabled ? (
                                                <><BsLockFill className="mr-1.5"/> Khóa TK</>
                                            ) : (
                                                <><BsUnlockFill className="mr-1.5"/> Mở khóa</>
                                            )}
                                        </button>
                                    </td>

                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Phân Trang (Pagination) */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 border-t pt-4">
                    <span className="text-sm text-gray-500">
                        Hiển thị trang <span
                        className="font-semibold text-gray-900">{data.number + 1}</span> / {data.totalPages}
                        (Tổng: {data.totalElements} user)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={data.number === 0}
                            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Trang trước
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={data.number >= data.totalPages - 1}
                            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Trang sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
