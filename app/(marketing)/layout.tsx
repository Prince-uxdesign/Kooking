import "./landing.css";

/**
 * Marketing surfaces (no app shell). The inline script flags the document
 * before first paint so scroll reveals can start hidden; without JS the
 * flag never lands and everything renders visible.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.motion='on'" }}
      />
      <div className="landing min-h-svh bg-surface-50">{children}</div>
    </>
  );
}
