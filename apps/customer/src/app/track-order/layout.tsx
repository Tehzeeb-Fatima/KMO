// Utility page: keep it out of Google's index, but let it follow links.
export const metadata = { robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
