import React from 'react';

interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  className?: string;
  // Device sizes for srcset generation (defaults if not provided)
  deviceSizes?: number[];
  // Image sizes for srcset generation (defaults if not provided)
  imageSizes?: number[];
}

/**
 * Generates an optimized image URL.
 */
function getOptimizedImageUrl(
  src: string,
  width?: number,
  height?: number,
  quality?: number,
  format?: 'webp' | 'avif' | 'auto'
): string {
  const params = new URLSearchParams();
  params.set('src', src);
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality) params.set('q', quality.toString());
  if (format && format !== 'auto') params.set('format', format);
  
  return `/_loly/image?${params.toString()}`;
}

/**
 * Generates srcset for responsive images.
 */
function generateSrcSet(
  src: string,
  sizes: number[],
  height?: number,
  quality?: number,
  format?: 'webp' | 'avif' | 'auto'
): string {
  return sizes
    .map((size) => {
      const url = getOptimizedImageUrl(src, size, height, quality, format);
      return `${url} ${size}w`;
    })
    .join(', ');
}

/**
 * Image component with automatic optimization, lazy loading, and responsive images.
 *
 * Features:
 * - Automatic image optimization via /_loly/image endpoint
 * - Lazy loading by default (unless priority is true)
 * - Responsive images with srcset
 * - Placeholder support (blur)
 * - Fill mode for container-filling images
 *
 * @param props - Image component props
 * @returns Image element
 */
export function Image({
  src,
  alt,
  width,
  height,
  priority = false,
  fill = false,
  sizes,
  placeholder,
  blurDataURL,
  quality,
  format,
  className,
  deviceSizes,
  imageSizes,
  style,
  ...rest
}: ImageProps) {
  // Default device sizes (matching Next.js defaults)
  const defaultDeviceSizes = deviceSizes || [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  const defaultImageSizes = imageSizes || [16, 32, 48, 64, 96, 128, 256, 384];
  
  // Validate props
  if (!fill && (!width || !height)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Image] width and height are required when fill is false. ' +
        'This helps prevent layout shift (CLS).'
      );
    }
  }
  
  // Generate optimized image URL
  const optimizedSrc = getOptimizedImageUrl(src, width, height, quality, format);
  
  // Generate srcset for responsive images
  // Use deviceSizes if width is provided, otherwise use imageSizes
  const srcSetSizes = width ? defaultDeviceSizes.filter(s => s <= (width * 2)) : defaultImageSizes;
  const srcSet = srcSetSizes.length > 0 ? generateSrcSet(src, srcSetSizes, height, quality, format) : undefined;
  
  // Build styles
  const imageStyle: React.CSSProperties = {
    ...style,
  };
  
  if (fill) {
    imageStyle.position = 'absolute';
    imageStyle.height = '100%';
    imageStyle.width = '100%';
    imageStyle.objectFit = 'cover';
    imageStyle.objectPosition = 'center';
  } else {
    if (width) imageStyle.width = width;
    if (height) imageStyle.height = height;
  }
  
  // Aspect ratio container to prevent CLS (only if width and height are provided)
  if (!fill && width && height) {
    const aspectRatio = (height / width) * 100;
    return (
      <span
        style={{
          display: 'block',
          position: 'relative',
          width: width,
          maxWidth: '100%',
        }}
        className={className}
      >
        <span
          style={{
            display: 'block',
            paddingBottom: `${aspectRatio}%`,
          }}
        />
        {placeholder === 'blur' && blurDataURL && (
          <img
            src={blurDataURL}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
            }}
          />
        )}
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          srcSet={srcSet}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            ...imageStyle,
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
          }}
          {...rest}
        />
      </span>
    );
  }
  
  // Simple case without aspect ratio container
  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={imageStyle}
      {...rest}
    />
  );
}
