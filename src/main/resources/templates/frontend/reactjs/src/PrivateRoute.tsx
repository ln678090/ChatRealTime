import type {JSX} from "react";
import {useAuthStore} from "./store/auth.store.ts";
import {Navigate} from "react-router-dom";


export default function PrivateRoute({children}: { children: JSX.Element }) {
    const token = useAuthStore((s) => s.accessToken);
    const ready = useAuthStore(s => s.authReady);
    if (!ready) return <div>Loading...</div>; //  chờ refresh thử xong 
    if (!token) return <Navigate to={'/auth'} replace/>;
    return children;
}
