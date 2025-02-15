const isBrowser = typeof window !== 'undefined';

const config = {
    baseURL: isBrowser 
        ? window.location.origin 
        : process.env.BASE_URL || 'http://localhost:3000'
};

export default config;
