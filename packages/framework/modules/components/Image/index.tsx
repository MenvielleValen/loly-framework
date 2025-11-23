import React from 'react';

const BASE_DIR = "/static/assets";

interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

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

  const isRelative = !src.startsWith('http');
  const FULL_ROUTE = isRelative ? `${BASE_DIR}/${src}` : src;

  return (
    <img
      src={FULL_ROUTE}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      {...rest}
    />
  );
}
