import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminApi, type BlacklistWord} from "../../services/api/admin.api.ts";
import {FiEdit2, FiPlus, FiSearch, FiTrash2} from 'react-icons/fi';
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";

export const BlacklistPage = () => {
    const queryClient = useQueryClient();

    // --- States cho Lọc & Phân trang ---
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");

    // --- State cho Modal Thêm/Sửa ---
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({keyword: "", severity: "1", active: true});

    // --- Lấy dữ liệu ---
    const {data, isLoading} = useQuery({
        queryKey: ['admin-blacklist', page, size, searchQuery],
        queryFn: () => adminApi.getBlacklist({
            page,
            size,
            query: searchQuery || undefined
        }),
    });

    const blacklistData = data?.content || [];
    const totalPages = data?.totalPages || 0;

    // --- Mutations CRUD ---
    const saveMutation = useMutation({
        mutationFn: (payload: { id: string | null; data: Partial<BlacklistWord> }) => {
            if (payload.id) return adminApi.updateBlacklistWord(payload.id, payload.data);
            return adminApi.createBlacklistWord(payload.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin-blacklist']});
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: adminApi.softDeleteBlacklistWord,
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['admin-blacklist']})
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({id, isActive}: { id: string; isActive: boolean }) =>
            adminApi.toggleActiveBlacklistWord(id, isActive),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['admin-blacklist']})
    });

    // --- Handlers ---
    const openAddModal = () => {
        setEditingId(null);
        setFormData({keyword: "", severity: "1", active: true});
        setShowModal(true);
    };

    const openEditModal = (item: BlacklistWord) => {
        setEditingId(item.id);
        setFormData({keyword: item.keyword, severity: String(item.severity), active: item.isActive});
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.keyword.trim()) return;


        const payloadData = {
            keyword: formData.keyword,
            severity: parseInt(formData.severity, 10),
            active: formData.active
        };

        saveMutation.mutate({id: editingId, data: payloadData});
    };

    const MySwal = withReactContent(Swal);
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[80vh]">
            {/* Header & Thêm mới */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-2xl font-bold text-gray-800">Quản lý Từ khóa cấm</h3>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <FiPlus/> Thêm từ khóa
                </button>
            </div>

            {/* Bộ lọc Tìm kiếm */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input
                        type="text"
                        placeholder="Tìm kiếm từ khóa..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(0);
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                        <th className="px-6 py-4 font-medium">Từ khóa</th>
                        <th className="px-6 py-4 font-medium">Mức độ</th>
                        <th className="px-6 py-4 font-medium">Bật/Tắt</th>
                        <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Đang tải dữ liệu...</td>
                        </tr>
                    ) : blacklistData.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Không tìm thấy từ khóa
                                nào.
                            </td>
                        </tr>
                    ) : (
                        blacklistData.map((item: BlacklistWord) => (
                            <tr key={item.id}
                                className={`hover:bg-gray-50/50 transition-colors ${item.isDeleted ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4 font-medium text-gray-900">{item.keyword}</td>
                                <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                            String(item.severity) === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                String(item.severity) === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-blue-100 text-blue-700'
                                        }`}>
                                            {item.severity}
                                        </span>
                                </td>
                                <td className="px-6 py-4">
                                    {/* Toggle Switch (Bật/Tắt) */}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={item.isActive}
                                            disabled={item.isDeleted}
                                            onChange={(e) => toggleActiveMutation.mutate({
                                                id: item.id,
                                                isActive: e.target.checked
                                            })}
                                        />
                                        <div
                                            className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {!item.isDeleted && (
                                        <>
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Sửa"
                                            >
                                                <FiEdit2 size={18}/>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    MySwal.fire({
                                                        title: 'Xác nhận xóa',
                                                        text: "Bạn có chắc chắn muốn xóa từ khóa này?",
                                                        icon: 'warning',
                                                        showCancelButton: true,
                                                        confirmButtonColor: '#d33', // Màu đỏ cho nút đăng xuất
                                                        cancelButtonColor: '#3085d6', // Màu xám/xanh cho nút huỷ
                                                        confirmButtonText: 'Có, xóa!',
                                                        cancelButtonText: 'Huỷ'
                                                    }).then((result) => {
                                                        if (result.isConfirmed) {

                                                            deleteMutation.mutate(item.id);
                                                        }
                                                    });
                                                    // if (window.confirm('Xóa từ khóa này?')) deleteMutation.mutate(item.id);
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Xóa"
                                            >
                                                <FiTrash2 size={18}/>
                                            </button>
                                        </>
                                    )}
                                    {item.isDeleted && <span className="text-xs text-red-500 italic mt-2">Đã xóa</span>}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-2">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                        Trước
                    </button>
                    <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                        Sau
                    </button>
                </div>
            )}

            {/* Modal Thêm/Sửa */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h4 className="text-xl font-bold text-gray-800 mb-4">
                            {editingId ? 'Sửa từ khóa' : 'Thêm từ khóa'}
                        </h4>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ khóa</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.keyword}
                                        onChange={e => setFormData({...formData, keyword: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nhập từ cấm..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ nghiêm
                                        trọng</label>
                                    <select
                                        value={formData.severity}
                                        onChange={e => setFormData({...formData, severity: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={1}>Mức 1</option>
                                        <option value={2}>Mức 2</option>
                                        <option value={3}>Mức 3</option>
                                        <option value={4}>Mức 4</option>
                                        <option value={5}>Mức 5</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-70"
                                >
                                    {saveMutation.isPending ? 'Đang lưu...' : 'Lưu lại'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
