import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
