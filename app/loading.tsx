export default function Loading() {
  return (
    <div className="page-wrap route-loading" aria-busy="true" aria-label="页面加载中">
      <div className="route-progress" />
      <div className="route-loading-head">
        <span className="skeleton skeleton-eyebrow" />
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-subtitle" />
      </div>
      <div className="route-loading-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className="skeleton skeleton-card"
            style={{ ["--i" as string]: index }}
          />
        ))}
      </div>
    </div>
  );
}