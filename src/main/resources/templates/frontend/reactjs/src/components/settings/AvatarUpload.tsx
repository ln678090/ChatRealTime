// src/components/Settings/AvatarUpload.tsx
import React, {useRef, useState} from "react";
import {IKContext, IKUpload} from "imagekitio-react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuthStore} from "../../store/auth.store";
import axiosClient from "../../services/api/axiosClient";
// import {imagekitConfig} from "../../config/imagekit.config";
import {IoCamera, IoCheckmarkCircle, IoCloseCircle} from "react-icons/io5";
import {imagekitConfig} from "../../config/imagekit.config.ts";

interface AvatarUploadProps {
    currentAvatar?: string;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({currentAvatar}) => {
    const {user, setUser} = useAuthStore();
    const queryClient = useQueryClient();
    const uploadRef = useRef<any>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Custom authenticator function
    const authenticator = async () => {
        try {
            const response = await axiosClient.get('/uploads/auth');
            const {token, signature, expire} = response.data;

            return {token, signature, expire};
        } catch (error) {
            console.error("Authentication failed:", error);
            throw error;
        }
    };

    // Save avatar mutation
    const saveAvatarMutation = useMutation({
        mutationFn: async (url: string) => {
            const res = await axiosClient.post('/users/me/avatar', {url});
            return res.data.data;
        },
        onSuccess: (data) => {
            if (user) {
                setUser({...user, avatar: data.avatar});
            }
            queryClient.invalidateQueries({queryKey: ["current-user"]});
            queryClient.invalidateQueries({queryKey: ["conversations-paged"]});
        },
    });

    const onError = (err: any) => {
        setUploadStatus('error');
        setErrorMessage(err.message || "Upload failed");
        console.error("Upload error:", err);

        // Reset after 3s
        setTimeout(() => {
            setUploadStatus('idle');
            setUploadProgress(0);
            setPreview(null);
        }, 3000);
    };

    const onSuccess = (res: any) => {
        setUploadStatus('success');
        setUploadProgress(100);

        // Save to backend
        saveAvatarMutation.mutate(res.url);

        // Reset after 2s
        setTimeout(() => {
            setUploadStatus('idle');
            setUploadProgress(0);
            setPreview(null);
        }, 2000);
    };

    const onUploadProgress = (progress: any) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(percent);
    };

    const onUploadStart = (evt: any) => {
        setUploadStatus('uploading');
        setUploadProgress(0);
        setErrorMessage("");

        // Create preview
        const file = evt.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateFile = (file: File) => {
        // Check file type
        if (!file.type.startsWith('image/')) {
            setErrorMessage("Chỉ chấp nhận file ảnh");
            return false;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("Kích thước ảnh tối đa 5MB");
            return false;
        }

        return true;
    };

    const handleAvatarClick = () => {
        if (uploadStatus === 'idle' && uploadRef.current) {
            uploadRef.current.click();
        }
    };

    return (
        <div className="flex flex-col items-center">
            <IKContext
                publicKey={imagekitConfig.publicKey}
                urlEndpoint={imagekitConfig.urlEndpoint}
                authenticator={authenticator}
            >
                <div className="relative group">
                    <img
                        src={preview || currentAvatar || "https://i.pravatar.cc/150?img=11"}
                        alt="Avatar"
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-lg"
                    />

                    {/* Upload Progress Overlay */}
                    {uploadStatus === 'uploading' && (
                        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-white font-bold text-lg">{uploadProgress}%</div>
                                <div className="w-20 h-1 bg-gray-300 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{width: `${uploadProgress}%`}}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Overlay */}
                    {uploadStatus === 'success' && (
                        <div
                            className="absolute inset-0 rounded-full bg-green-500/80 flex items-center justify-center animate-fade-in">
                            <IoCheckmarkCircle size={48} className="text-white"/>
                        </div>
                    )}

                    {/* Error Overlay */}
                    {uploadStatus === 'error' && (
                        <div
                            className="absolute inset-0 rounded-full bg-red-500/80 flex items-center justify-center animate-fade-in">
                            <IoCloseCircle size={48} className="text-white"/>
                        </div>
                    )}

                    {/* Camera Overlay (only when idle) */}
                    {uploadStatus === 'idle' && (
                        <div
                            onClick={handleAvatarClick}
                            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center"
                        >
                            <IoCamera size={32} className="text-white"/>
                        </div>
                    )}
                </div>

                {/* Hidden ImageKit Upload Component */}
                <IKUpload
                    ref={uploadRef}
                    fileName="avatar.jpg"
                    folder="/avatars"
                    tags={["avatar"]}
                    useUniqueFileName={true}
                    isPrivateFile={false}
                    onError={onError}
                    onSuccess={onSuccess}
                    onUploadProgress={onUploadProgress}
                    onUploadStart={onUploadStart}
                    validateFile={validateFile}
                    style={{display: 'none'}}
                />
            </IKContext>

            {/* Error Message */}
            {errorMessage && (
                <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">{errorMessage}</p>
                </div>
            )}

            {/* Helper Text */}
            {uploadStatus === 'idle' && !errorMessage && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                    Click vào ảnh để thay đổi<br/>
                    Kích thước tối đa: 5MB<br/>
                    Định dạng: JPG, PNG, GIF
                </p>
            )}

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default AvatarUpload;
