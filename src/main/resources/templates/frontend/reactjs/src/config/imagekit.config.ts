// src/config/imagekit.config.ts
export const imagekitConfig = {
    publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
    authenticationEndpoint: import.meta.env.VITE_IMAGEKIT_AUTHENTICATION_ENDPOINT,
};
