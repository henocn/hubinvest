import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Une nouvelle clé fixe : les invitations déjà faites restent rattachées à leur format même s'il est renommé.
const newKey = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clean = (formats) => (formats || []).map((format) => ({ key: format.key, label: format.label.trim(), labelEn: (format.labelEn || '').trim() }));

// Formats de tournage du Studio proposés à l'invitation : libellé en français et en anglais (e-mails et page de l'invité).
export default function StudioFormatSettings({ formats, saving, saved, onSave }) {
  const [draft, setDraft] = useState(clean(formats));
  useEffect(() => { setDraft(clean(formats)); }, [formats]);

  const change = (index, values) => setDraft((current) => current.map((format, position) => (position === index ? { ...format, ...values } : format)));
  const remove = (index) => setDraft((current) => current.filter((_format, position) => position !== index));
  const add = () => setDraft((current) => [...current, { key: newKey(), label: '', labelEn: '' }]);

  const values = clean(draft);
  const valid = values.length > 0 && values.every((format) => format.label);
  const changed = JSON.stringify(values) !== JSON.stringify(clean(formats));

  return (
    <form className="qualification-settings" onSubmit={(event) => { event.preventDefault(); if (valid && changed) void onSave('studioFormats', values); }}>
      <p className="field-hint">Formats de tournage proposés à l’invitation. Un format encore utilisé par une invitation ne peut pas être retiré, mais peut être renommé.</p>
      {draft.map((format, index) => (
        <div className="qualification-setting studio-format-setting" key={format.key}>
          <span className="qualification-setting-number">{index + 1}</span>
          <input value={format.label} onChange={(event) => change(index, { label: event.target.value })} maxLength={80} placeholder="Libellé en français" aria-label={`Libellé du format ${index + 1}`} />
          <input value={format.labelEn} onChange={(event) => change(index, { labelEn: event.target.value })} maxLength={80} placeholder="Libellé en anglais" aria-label={`Libellé anglais du format ${index + 1}`} />
          <button className="table-action is-icon is-danger" type="button" onClick={() => remove(index)} disabled={draft.length <= 1} title="Retirer" aria-label={`Retirer le format ${index + 1}`}><Trash2 size={15} /></button>
        </div>
      ))}
      <div className="qualification-settings-actions">
        <button className="button button-secondary" type="button" onClick={add} disabled={draft.length >= 20}><Plus size={15} /> Format</button>
        {saved && <span className="investor-saved">Enregistré</span>}
        <button className="button button-primary" type="submit" disabled={saving || !valid || !changed}>Enregistrer les formats</button>
      </div>
    </form>
  );
}
