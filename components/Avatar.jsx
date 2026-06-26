"use client";

// Shows a profile photo if available, otherwise the colored initial circle.
export default function Avatar({ name, avatarUrl, avatarColor, size = 40, className = "", textClassName = "" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const dim = typeof size === "number" ? `${size}px` : size;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Profile"}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: dim, height: dim }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className} ${textClassName}`}
      style={{ width: dim, height: dim, background: avatarColor || "#059669" }}
    >
      {initial}
    </div>
  );
}
