import {useAuth} from "../../auth.useAuth.ts";
import {Navigate, Outlet} from "react-router-dom";


export const AdminGuard = () => {

    const {isAuthenticated, isAdmin} = useAuth();
    if (!isAuthenticated) return <Navigate to={'/auth'} replace/>;
    if (!isAdmin) return <Navigate to={'/'} replace/>;
    return <Outlet/>; // Cho phép render AdminLayout
}