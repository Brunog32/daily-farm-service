import React from 'react';

export const Cow = ({ size = 24, color = "currentColor", ...props }) => {
    const isWhite = color === "#fff" || color === "white";
    return (
        <img
            src="/logo-cow.png"
            alt="Cow Logo"
            style={{
                width: size,
                height: size,
                objectFit: 'contain',
                filter: isWhite ? 'brightness(0) invert(1)' : 'none'
            }}
            {...props}
        />
    );
};
