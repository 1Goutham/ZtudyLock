/** Re-mounts on every navigation so each page arrives with the same quiet rise. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade">{children}</div>;
}
