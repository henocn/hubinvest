import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';

export default function B2bNeedForm({ need, token, onCancel, onSaved }) {
  const isEditing = Boolean(need);
  const [form, setForm] = useState({ title: need?.title || '', description: need?.description || '', status: need?.status || 'open' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const values = { title: form.title, description: form.description, ...(isEditing && { status: form.status }) };
      const saved = isEditing ? await api.updateB2bNeed(token, need.id, values) : await api.createB2bNeed(token, values);
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="workspace b2b-workspace-form">
      <button type="button" className="back-button" onClick={onCancel}><ArrowLeft size={18} /> Besoins B2B</button>
      <div className="page-heading"><h1>{isEditing ? 'Modifier le besoin' : 'Nouveau besoin'}</h1></div>
      <form className="form-stack" onSubmit={submit}>
        <label>Titre<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} maxLength={180} autoFocus required /></label>
        <label>Description<textarea rows="7" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} minLength={10} maxLength={6000} required /></label>
        {isEditing && <label>Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="open">Ouvert</option><option value="closed">Fermé</option></select></label>}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions"><button className="button button-secondary" type="button" onClick={onCancel}>Annuler</button><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : isEditing ? 'Enregistrer' : 'Publier le besoin'}</button></div>
      </form>
    </main>
  );
}
