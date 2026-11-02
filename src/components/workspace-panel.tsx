export function WorkspacePanel({ id, title, action, children }: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="panel">
      <div className="panel-header"><h2 id={id} className="section-title">{title}</h2>{action}</div>
      {children}
    </section>
  );
}
