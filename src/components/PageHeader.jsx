export default function PageHeader({ title, subtitle, icon }) {
  return (
    <div className="page-header">
      <div className="page-icon"><i className={`bi ${icon}`}></i></div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
