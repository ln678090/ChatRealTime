// src/components/Settings/SettingsModal.tsx
import React, {useEffect, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";


import {IoClose} from "react-icons/io5";
import {BiMap, BiUser} from "react-icons/bi";
import {useAuthStore} from "../../store/auth.store.ts";
import {type UpdateProfileReq, userService} from "../../services/user.service.ts";
import AvatarUpload from "./AvatarUpload.tsx";
import toast from "react-hot-toast";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({isOpen, onClose}) => {
    const {user: authUser, setUser} = useAuthStore();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<UpdateProfileReq>({
        fullName: "",
        address: "",
    });

    const [errors, setErrors] = useState<Partial<Record<keyof UpdateProfileReq, string>>>({});

    // Fetch current user data
    const {data: userData, isLoading} = useQuery({
        queryKey: ["current-user"],
        queryFn: userService.getCurrentUser,
        enabled: isOpen,
    });

    // Initialize form when user data loaded
    useEffect(() => {
        if (userData) {
            setFormData({
                fullName: userData.fullName || "",
                address: userData.address || "",
            });
        }
    }, [userData]);

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof UpdateProfileReq, string>> = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = "Họ và tên không được để trống";
        }

        if (!formData.address.trim()) {
            newErrors.address = "Địa chỉ không được để trống";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: userService.updateProfile,
        onSuccess: (data) => {
            // Update zustand store
            if (authUser) {
                setUser({
                    ...authUser,
                    fullName: data.fullName,
                    address: data.address,
                });
            }

            queryClient.invalidateQueries({queryKey: ["current-user"]});
            queryClient.invalidateQueries({queryKey: ["conversations-paged"]});

            toast.success("Cập nhật thông tin thành công!");
            onClose();
        },
        onError: (error: any) => {
            const apiErrors = error?.response?.data?.data;

            // Nếu backend trả về validation errors dạng {fullName: "...", address: "..."}
            if (apiErrors && typeof apiErrors === "object") {
                setErrors(apiErrors);
            } else {
                toast.error(error?.response?.data?.message || "Cập nhật thất bại");
            }
        },
    });

    const handleSaveProfile = () => {
        if (!validateForm()) return;

        updateProfileMutation.mutate(formData);
    };

    const handleChange = (field: keyof UpdateProfileReq, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));

        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({...prev, [field]: undefined}));
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-scale-in">
                {/* HEADER */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
                    <h2 className="text-xl font-bold text-white">Cài đặt tài khoản</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/20 transition text-white"
                    >
                        <IoClose size={24}/>
                    </button>
                </div>

                {/* BODY */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* AVATAR DISPLAY (Read-only for now) */}
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    {/*<img*/}
                                    {/*    src={userData?.avatar || "https://i.pravatar.cc/150?img=11"}*/}
                                    {/*    alt="Avatar"*/}
                                    {/*    className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 shadow-lg"*/}
                                    {/*/>*/}
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Ảnh đại diện</h3>
                                        <AvatarUpload currentAvatar={userData?.avatar}/>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    @{userData?.username}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {/*Chức năng đổi avatar đang phát triển*/}
                                </p>
                            </div>

                            <div className="border-t"></div>

                            {/* PROFILE FORM */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Thông tin cá nhân
                                </h3>

                                {/* Full Name */}
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <BiUser size={18}/>
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => handleChange("fullName", e.target.value)}
                                        placeholder="Nhập họ và tên"
                                        className={`w-full px-4 py-2.5 border rounded-lg outline-none transition ${
                                            errors.fullName
                                                ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                                : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        }`}
                                    />
                                    {errors.fullName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                                    )}
                                </div>

                                {/* Address */}
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <BiMap size={18}/>
                                        Địa chỉ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleChange("address", e.target.value)}
                                        placeholder="Nhập địa chỉ"
                                        className={`w-full px-4 py-2.5 border rounded-lg outline-none transition ${
                                            errors.address
                                                ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                                : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        }`}
                                    />
                                    {errors.address && (
                                        <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                                    )}
                                </div>

                                {/* Info box */}
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Lưu ý:</strong> Thông tin này sẽ được hiển thị cho người dùng khác.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={updateProfileMutation.isPending}
                        className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending || !formData.fullName.trim() || !formData.address.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 font-medium disabled:opacity-50 transition"
                    >
                        {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </div>

            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scale-in {
                    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SettingsModal;
