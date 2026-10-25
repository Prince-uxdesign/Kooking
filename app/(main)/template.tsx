/**
 * Re-mounts on every navigation inside the main app, so each screen
 * arrives with the same short fade (reduced motion: instant).
 */
export default function MainTemplate({ children }: { children: React.ReactNode }) {
  return <div className="screen-enter">{children}</div>;
}
