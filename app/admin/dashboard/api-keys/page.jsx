'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminApiKeysPage() {
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('adminActiveTab', 'apiKeys');
        }

        router.replace('/admin/dashboard');
    }, [router]);

    return null;
}
