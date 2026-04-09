// src/PrivateRoute.tsx
import {Navigate} from 'react-router-dom';
import {useAuthStore} from './store/auth.store';

const PrivateRoute = ({children}: { children: React.ReactNode }) => {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authReady = useAuthStore((s) => s.authReady);

    // ⏳ Chưa bootstrap xong -> Hiển thị loading, KHÔNG redirect
    if (!authReady) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="text-gray-400 text-sm">Đang khởi động...</span>
            </div>
        );
    }

    //  Bootstrap xong, không có token -> Redirect về login
    if (!accessToken) {
        return <Navigate to="/authfd" replace/>;
    }

    return <>{children}</>;
};

export default PrivateRoute;
