import { Image } from "@lolyjs/core/components";

export default function ImageOptimizationPage() {
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-6">Image Optimization Example</h1>
      <p className="text-lg mb-8 text-muted-foreground">
        This page demonstrates the Loly Image component with automatic optimization,
        lazy loading, responsive images, and more.
      </p>

      {/* Basic Local Image */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">1. Basic Local Image</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Simple local image from public/assets directory with automatic optimization.
        </p>
        <div className="bg-muted p-6 rounded-lg">
          <Image
            src="/assets/logo.svg"
            alt="Loly Logo"
            width={200}
            height={100}
            className="dark:invert"
          />
        </div>
        <pre className="mt-4 text-xs bg-background p-4 rounded overflow-x-auto">
          {`<Image
  src="/assets/logo.svg"
  alt="Loly Logo"
  width={200}
  height={100}
/>`}
        </pre>
      </section>

      {/* Responsive Images with srcset */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">2. Responsive Images</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Automatically generates srcset for different screen sizes. Resize your browser to see the effect.
        </p>
        <div className="bg-muted p-6 rounded-lg">
          <Image
            src="/assets/logo.svg"
            alt="Responsive Logo"
            width={800}
            height={400}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
            className="dark:invert"
          />
        </div>
        <pre className="mt-4 text-xs bg-background p-4 rounded overflow-x-auto">
          {`<Image
  src="/assets/logo.svg"
  alt="Responsive Logo"
  width={800}
  height={400}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
/>`}
        </pre>
      </section>

      {/* Priority Loading */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">3. Priority Loading</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Images with priority=true load immediately (no lazy loading). Useful for above-the-fold content.
        </p>
        <div className="bg-muted p-6 rounded-lg">
          <Image
            src="/assets/logo.svg"
            alt="Priority Logo"
            width={150}
            height={75}
            priority
            className="dark:invert"
          />
        </div>
        <pre className="mt-4 text-xs bg-background p-4 rounded overflow-x-auto">
          {`<Image
  src="/assets/logo.svg"
  alt="Priority Logo"
  width={150}
  height={75}
  priority
/>`}
        </pre>
      </section>

      {/* Custom Quality */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">4. Custom Quality</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Control image quality (1-100). Lower quality = smaller file size.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm mb-2">Quality: 30</p>
            <div className="bg-muted p-4 rounded-lg">
              <Image
                src="/assets/logo.svg"
                alt="Low Quality"
                width={200}
                height={100}
                quality={30}
                className="dark:invert"
              />
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">Quality: 90</p>
            <div className="bg-muted p-4 rounded-lg">
              <Image
                src="/assets/logo.svg"
                alt="High Quality"
                width={200}
                height={100}
                quality={90}
                className="dark:invert"
              />
            </div>
          </div>
        </div>
        <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
          {`<Image
  src="/assets/logo.svg"
  width={200}
  height={100}
  quality={30}  // or 90
/>`}
        </pre>
      </section>

      {/* Format Selection */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">5. Format Selection</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Force specific format (webp, avif, jpeg, png) or use 'auto' for automatic selection.
        </p>
        <div className="bg-muted p-6 rounded-lg">
          <Image
            src="/assets/logo.svg"
            alt="Format Example"
            width={200}
            height={100}
            format="webp"
            className="dark:invert"
          />
        </div>
        <pre className="mt-4 text-xs bg-background p-4 rounded overflow-x-auto">
          {`<Image
  src="/assets/logo.svg"
  width={200}
  height={100}
  format="webp"  // or "avif", "jpeg", "png", "auto"
/>`}
        </pre>
      </section>

      {/* Fill Mode */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">6. Fill Mode</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Image fills its container. Requires a positioned parent element.
        </p>
        <div className="relative h-64 w-full bg-muted rounded-lg overflow-hidden">
          <Image
            src="/assets/logo.svg"
            alt="Fill Example"
            fill
            className="dark:invert object-contain"
          />
        </div>
        <pre className="mt-4 text-xs bg-background p-4 rounded overflow-x-auto">
          {`<div className="relative h-64 w-full">
  <Image
    src="/assets/logo.svg"
    alt="Fill Example"
    fill
  />
</div>`}
        </pre>
      </section>

      {/* Lazy Loading (default) */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">7. Lazy Loading (Default)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Images load lazily by default. Scroll down to see them load as they enter the viewport.
        </p>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-muted p-6 rounded-lg">
              <Image
                src="/assets/logo.svg"
                alt={`Lazy loaded image ${i}`}
                width={300}
                height={150}
                className="dark:invert"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Image {i} - This loads when scrolled into view
              </p>
            </div>
          ))}
        </div>
        <pre className="mt-4 text-xs bg-background p-4 rounded overflow-x-auto">
          {`// Lazy loading is enabled by default
<Image
  src="/assets/logo.svg"
  width={300}
  height={150}
  // No priority prop = lazy loading
/>`}
        </pre>
      </section>

      {/* Remote Images */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">8. Remote Images</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Images from external domains (Unsplash, etc.) are automatically optimized.
          Domains must be configured in <code className="bg-muted px-1 rounded">loly.config.ts</code>.
        </p>
        
        {/* Example 1: Basic Remote Image */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Basic Remote Image</h3>
          <div className="bg-muted p-6 rounded-lg mb-4">
            <Image
              src="https://plus.unsplash.com/premium_photo-1686729237226-0f2edb1e8970?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FsbHBhcGVyfGVufDB8fDB8fHww"
              alt="Wallpaper from Unsplash"
              width={800}
              height={450}
              className="rounded-lg"
            />
          </div>
          <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
            {`<Image
  src="https://plus.unsplash.com/premium_photo-..."
  alt="Wallpaper from Unsplash"
  width={800}
  height={450}
/>`}
          </pre>
        </div>

        {/* Example 2: Responsive Remote Image */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Responsive Remote Image</h3>
          <div className="bg-muted p-6 rounded-lg mb-4">
            <Image
              src="https://plus.unsplash.com/premium_photo-1686729237226-0f2edb1e8970?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FsbHBhcGVyfGVufDB8fDB8fHww"
              alt="Responsive wallpaper"
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
              className="rounded-lg"
            />
          </div>
          <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
            {`<Image
  src="https://plus.unsplash.com/premium_photo-..."
  alt="Responsive wallpaper"
  width={1200}
  height={675}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
/>`}
          </pre>
        </div>

        {/* Example 3: Remote Image with Custom Quality */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Remote Image with Custom Quality</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm mb-2">Quality: 50</p>
              <div className="bg-muted p-4 rounded-lg">
                <Image
                  src="https://plus.unsplash.com/premium_photo-1686729237226-0f2edb1e8970?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FsbHBhcGVyfGVufDB8fDB8fHww"
                  alt="Low quality"
                  width={400}
                  height={225}
                  quality={50}
                  className="rounded-lg"
                />
              </div>
            </div>
            <div>
              <p className="text-sm mb-2">Quality: 90</p>
              <div className="bg-muted p-4 rounded-lg">
                <Image
                  src="https://plus.unsplash.com/premium_photo-1686729237226-0f2edb1e8970?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FsbHBhcGVyfGVufDB8fDB8fHww"
                  alt="High quality"
                  width={400}
                  height={225}
                  quality={90}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
          <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
            {`<Image
  src="https://plus.unsplash.com/premium_photo-..."
  width={400}
  height={225}
  quality={50}  // or 90
/>`}
          </pre>
        </div>

        {/* Example 4: Remote Image with Format Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Remote Image with Format Conversion</h3>
          <div className="bg-muted p-6 rounded-lg mb-4">
            <Image
              src="https://plus.unsplash.com/premium_photo-1686729237226-0f2edb1e8970?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2FsbHBhcGVyfGVufDB8fDB8fHww"
              alt="WebP format"
              width={600}
              height={338}
              format="webp"
              className="rounded-lg"
            />
          </div>
          <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
            {`<Image
  src="https://plus.unsplash.com/premium_photo-..."
  width={600}
  height={338}
  format="webp"  // Automatically converted from original format
/>`}
          </pre>
        </div>

        {/* Configuration Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mt-6">
          <p className="font-semibold mb-2">📝 Configuration Required</p>
          <p className="text-sm mb-4">
            To use remote images, configure allowed domains in <code className="bg-background px-2 py-1 rounded">loly.config.ts</code>:
          </p>
          <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
            {`export default {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',  // Wildcard for subdomains
      },
    ],
    // Or use legacy format:
    domains: ['images.unsplash.com', 'plus.unsplash.com'],
  },
};`}
          </pre>
        </div>
      </section>

      {/* Features List */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">✨ Features</h2>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Automatic image optimization via <code className="bg-muted px-1 rounded">/_loly/image</code> endpoint</li>
          <li>Format conversion (WebP, AVIF, JPEG, PNG)</li>
          <li>Responsive images with automatic srcset generation</li>
          <li>Lazy loading by default (except with priority)</li>
          <li>Quality control (1-100)</li>
          <li>Fill mode for container-filling images</li>
          <li>Remote image support with domain whitelisting</li>
          <li>Cache optimization for better performance</li>
          <li>CLS prevention with aspect ratio containers</li>
        </ul>
      </section>
    </div>
  );
}

