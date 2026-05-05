export default function StatCard({ icon, label, value, note }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><i className={`bi ${icon}`}></i></div>
      <div>
        <span>{label}</span>
        <h3>{value}</h3>
        <p>{note}</p>
      </div>
    </article>
  );
}
