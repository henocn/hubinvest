import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const typeLabels = { select: 'Liste de choix', text: 'Texte', number: 'Nombre', yesno: 'Oui ou non' };
// Une nouvelle information reçoit une clé fixe : les réponses déjà saisies restent rattachées même si le libellé change.
const newKey = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const toDraft = (fields) => (fields || []).map((field) => ({ ...field, optionsText: (field.options || []).join(', ') }));

// Les informations de qualification de l'Investor Desk (neuf selon le document, liste non fournie) : libellé, type, choix.
export default function InvestorQualificationSettings({ fields, saving, saved, onSave }) {
  const [draft, setDraft] = useState(toDraft(fields));
  useEffect(() => { setDraft(toDraft(fields)); }, [fields]);

  const change = (index, values) => setDraft((current) => current.map((field, position) => (position === index ? { ...field, ...values } : field)));
  const remove = (index) => setDraft((current) => current.filter((_field, position) => position !== index));
  const add = () => setDraft((current) => [...current, { key: newKey(), label: '', type: 'text', optionsText: '' }]);

  const values = draft.map(({ optionsText, ...field }) => ({
    key: field.key,
    label: field.label.trim(),
    type: field.type,
    ...(field.type === 'select' && { options: optionsText.split(',').map((option) => option.trim()).filter(Boolean) }),
  }));
  const valid = values.every((field) => field.label && (field.type !== 'select' || field.options.length));
  const changed = JSON.stringify(values) !== JSON.stringify((fields || []).map((field) => ({ key: field.key, label: field.label, type: field.type, ...(field.type === 'select' && { options: field.options }) })));

  return (
    <form className="qualification-settings" onSubmit={(event) => { event.preventDefault(); if (valid && changed) void onSave('investorQualificationFields', values); }}>
      <p className="field-hint">Informations remplies par le cadre de l’Investor Desk sur chaque fiche. Pour une liste de choix, séparez les choix par des virgules. Retirer une information masque ses réponses sans les effacer.</p>
      {draft.map((field, index) => (
        <div className="qualification-setting" key={field.key}>
          <span className="qualification-setting-number">{index + 1}</span>
          <input value={field.label} onChange={(event) => change(index, { label: event.target.value })} maxLength={120} placeholder="Libellé" aria-label={`Libellé de l’information ${index + 1}`} />
          <select value={field.type} onChange={(event) => change(index, { type: event.target.value })} aria-label={`Type de l’information ${index + 1}`}>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {field.type === 'select'
            ? <input value={field.optionsText} onChange={(event) => change(index, { optionsText: event.target.value })} placeholder="Choix 1, Choix 2…" aria-label={`Choix de l’information ${index + 1}`} />
            : <span />}
          <button className="table-action is-icon is-danger" type="button" onClick={() => remove(index)} title="Retirer" aria-label={`Retirer l’information ${index + 1}`}><Trash2 size={15} /></button>
        </div>
      ))}
      <div className="qualification-settings-actions">
        <button className="button button-secondary" type="button" onClick={add} disabled={draft.length >= 30}><Plus size={15} /> Information</button>
        {saved && <span className="investor-saved">Enregistré</span>}
        <button className="button button-primary" type="submit" disabled={saving || !valid || !changed}>Enregistrer la liste</button>
      </div>
    </form>
  );
}
