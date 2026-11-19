import { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';
import PhoneField from './PhoneField';
import { isValidPhone, toInternationalPhone } from '../lib/phone';

export default function InvestorRequestForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    projectSummary: '',
    occupantId: '',
    consentApizf: false,
  });
  const [occupants, setOccupants] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  useEffect(() => {
    api.publicOccupants()
      .then(setOccupants)
      .catch((requestError) => setError(publicErrorMessage(t, requestError)));
  }, [t]);

  const submit = async (event) => {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      setError('');
      return;
    }

    setPhoneChecked(true);
    if (!isValidPhone(form.phone)) return;
    setLoading(true);
    setError('');
    try {
      await api.createInvestorRequest({ ...form, phone: toInternationalPhone(form.phone) });
      setReceived(true);
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
    } finally {
      setLoading(false);
    }
  };

  if (received) {
    return (
      <div className="investor-request-success" role="status">
        <span><BriefcaseBusiness size={23} /></span>
        <div><h2>{t('investor.successTitle')}</h2><p>{t('investor.successText')}</p></div>
      </div>
    );
  }

  return (
    <form className="investor-request-form" onSubmit={submit}>
      <div className="investor-step-progress" aria-label={t('common.step', { step })}>
        <span>{step} / 2</span>
        <div aria-hidden="true"><i className="is-complete" /><i className={step === 2 ? 'is-complete' : ''} /></div>
      </div>

      {step === 1 ? (
        <div className="investor-step">
          <label>{t('investor.institution')}<select value={form.occupantId} onChange={(event) => field('occupantId', event.target.value)} autoFocus required><option value="">{t('investor.chooseInstitution')}</option>{occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}</select></label>
          <label>{t('investor.question')}<textarea value={form.projectSummary} onChange={(event) => field('projectSummary', event.target.value)} rows={7} minLength={10} maxLength={6000} required /></label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary investor-next-button" type="submit">{t('common.continue')} <ArrowRight size={17} /></button>
        </div>
      ) : (
        <div className="investor-step">
          <header><h2>{t('investor.details')}</h2></header>
          <label>{t('fields.fullName')}<input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} minLength={2} maxLength={160} autoComplete="name" autoFocus required /></label>
          <div className="public-field-row">
            <label>{t('fields.email')}<input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} maxLength={180} autoComplete="email" required /></label>
            <PhoneField value={form.phone} onChange={(phone) => field('phone', phone)} showError={phoneChecked} />
          </div>
          <label className="request-consent investor-consent">
            <input type="checkbox" checked={form.consentApizf} onChange={(event) => field('consentApizf', event.target.checked)} required />
            <span>{t('investor.consent')}</span>
          </label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <div className="investor-form-actions">
            <button className="button button-secondary" type="button" onClick={() => setStep(1)} disabled={loading}>{t('common.back')}</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? t('common.sending') : t('investor.submit')}</button>
          </div>
        </div>
      )}
    </form>
  );
}
