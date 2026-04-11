import { useEffect, useState } from "react";

export default function EventCoverImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  fallbackClassName = "",
  children,
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(src) && !hasImageError;

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(135deg,rgba(14,165,233,0.2),rgba(99,102,241,0.18),rgba(16,185,129,0.16))] ${className}`}
    >
      {shouldShowImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setHasImageError(true)}
          className={`h-full w-full object-cover ${imageClassName}`}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.26),transparent_34%),linear-gradient(135deg,rgba(244,244,245,0.95),rgba(226,232,240,0.82))] text-zinc-500 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(39,39,42,0.92),rgba(15,23,42,0.86))] dark:text-zinc-400 ${fallbackClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
