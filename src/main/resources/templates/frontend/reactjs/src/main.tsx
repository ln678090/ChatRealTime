import {StrictMode} from 'react'
import './index.css'
import App from './App.tsx'
import {BrowserRouter} from "react-router-dom";
import {bootstrapAuth} from "./bootstrapAuth.ts";
import ReactDom from "react-dom/client";
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AuthInitializer} from './components/AuthInitializer';
//bootstrapAuth gọi refresh 1 lần lúc start app

const queryClinet = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false
        }

    }

})

bootstrapAuth().finally(() => {
    ReactDom.createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <BrowserRouter>
                <QueryClientProvider client={queryClinet}>
                    <AuthInitializer>
                        <App/>
                    </AuthInitializer>
                </QueryClientProvider>

            </BrowserRouter>
        </StrictMode>,
    )
})



