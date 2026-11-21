import { useTranslation } from 'react-i18next';

// Une étape déjà faite, en une ligne simple : ce qui a été choisi, et « Modifier » pour y revenir.
export default function StepSummary({ label, value, onEdit }) {
  const { t } = useTranslation();
  return (
    <p className="step-summary">
      <span>{label} : <strong>{value}</strong></span>
      <button type="button" onClick={onEdit}>{t('slots.edit')}</button>
    </p>
  );
}
