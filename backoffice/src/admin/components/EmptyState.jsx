// Tableau vide : une seule ligne, sans pictogramme.
export default function EmptyState({ title, copy }) {
  return (
    <p className="admin-empty-state">
      <strong>{title}.</strong> {copy}
    </p>
  );
}
