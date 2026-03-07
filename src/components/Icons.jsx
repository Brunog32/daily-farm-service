import React from 'react';

export const Cow = ({ size = 24, color = "currentColor", ...props }) => {
    return (
        <img
            src="/logo-cow.png"
            alt="Cow Logo"
            style={{
                width: size,
                height: size,
                objectFit: 'contain'
            }}
            {...props}
        />
    );
};


