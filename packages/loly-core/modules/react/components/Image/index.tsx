import React from 'react';

interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Image component that handles static asset paths.
 *
 * Automatically prefixes relative paths with the static assets directory.
 *
 * @param props - Image component props
 * @returns Image element
 */
export function Image({
  src,
  alt,
  width,
  height,
  className,
  ...rest
}: ImageProps) {
  const style: React.CSSProperties = {};

  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      {...rest}
    />
  );
}
