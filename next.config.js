/** @type {import('next').NextConfig} */
const nextConfig = {
    // Turbopack configuration (default in Next.js 16)
    turbopack: {
        resolveAlias: {
            '@/components': './components',
            '@/hooks': './hooks',
            '@/lib': './lib',
            '@/utils': './lib',
            '@/constants': './constants',
            '@/translations': './translations',
            '@/public': './public',
            '@/styles': './styles',
        },
    },
};

export default nextConfig;
