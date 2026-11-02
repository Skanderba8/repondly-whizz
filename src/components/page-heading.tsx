export function PageHeading({ title, description, action }: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div><h1 className="page-title">{title}</h1><p className="page-description">{description}</p></div>
      {action}
    </div>
  );
}
