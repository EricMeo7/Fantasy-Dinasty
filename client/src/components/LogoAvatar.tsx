import React, { useState } from 'react';

interface LogoAvatarProps {
    src?: string;
    alt: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'circle' | 'square';
    className?: string;
    fallbackType?: 'team' | 'league';
    version?: number;
}

const LogoAvatar: React.FC<LogoAvatarProps> = ({
    src,
    alt,
    size = 'md',
    shape = 'circle',
    className = '',
    fallbackType = 'team',
    version
}) => {
    const [error, setError] = useState(false);

    const sizeClasses = {
        xs: 'w-6 h-6',
        sm: 'w-10 h-10',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    const shapeClasses = {
        circle: 'rounded-full',
        square: 'rounded-2xl'
    };

    const defaultLogo = fallbackType === 'team' ? '/defaults/team-default.png' : '/defaults/league-default.png';
    const versionSuffix = version ? `?v=${version}` : '';

    // If version is explicitly 0, we know there is no logo, so satisfy fallback immediately without triggering 404
    const shouldFetch = src && (version === undefined || version > 0);
    const displaySrc = (shouldFetch && !error) ? `${src}${versionSuffix}` : defaultLogo;

    return (
        <div className={`
            relative flex items-center justify-center 
            bg-white/10 backdrop-blur-sm border border-white/5 
            overflow-hidden p-1 shadow-inner
            ${sizeClasses[size]} 
            ${shapeClasses[shape]} 
            ${className}
        `}>
            <img
                src={displaySrc}
                alt={alt}
                onError={() => setError(true)}
                className="w-full h-full object-contain object-center"
            />
        </div>
    );
};

export default LogoAvatar;
