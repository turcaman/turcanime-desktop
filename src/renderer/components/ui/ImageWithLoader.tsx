import React, { useState, useEffect } from 'react';

interface ImageWithLoaderProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackText?: string;
}

export const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({
  src,
  alt = '',
  className = '',
  style,
  fallbackText = 'Error',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!hasError && src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-neutral-900 ${className}`} style={style}>
      <span className="text-sm text-neutral-500">{fallbackText}</span>
    </div>
  );
};
