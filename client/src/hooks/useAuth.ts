import { useState, useEffect } from 'react';

export function useAuth() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [user, setUser] = useState<{ email: string | null }>({ email: localStorage.getItem('userEmail') });

    useEffect(() => {
        // Optional: listen to storage events if multiple tabs need sync, 
        // or just rely on mount state for now.
        const t = localStorage.getItem('token');
        const e = localStorage.getItem('userEmail');
        setToken(t);
        setUser({ email: e });
    }, []);

    return { token, user };
}
