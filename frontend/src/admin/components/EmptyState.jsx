export default function EmptyState({ icon: Icon, title, copy }) {
  return (
    <div className="admin-empty-state">
      <span><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}
