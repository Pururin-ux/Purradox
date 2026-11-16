export function LessonProp({ name, x, y, width, height, transform, className, fit = "xMidYMid meet" }) {
  return <image href={`/art/lesson-plates/${name}.webp`} x={x} y={y} width={width} height={height}
    transform={transform} preserveAspectRatio={fit} className={className} aria-hidden="true" />;
}

export function LessonArtwork({ art, className = "", sizes, loading = "eager", decorative = false, thumbnail = false }) {
  const compact = art.compact ? `${art.compact} ${art.width / 2}w, ${art.src} ${art.width}w` : undefined;
  const srcSet = thumbnail && art.thumbnail && compact ? `${art.thumbnail} 264w, ${compact}` : compact;
  return <img
    className={className}
    src={art.src}
    srcSet={srcSet}
    sizes={srcSet ? sizes : undefined}
    width={art.width}
    height={art.height}
    alt={decorative ? "" : art.alt}
    loading={loading}
    decoding="async"
    draggable="false"
  />;
}
