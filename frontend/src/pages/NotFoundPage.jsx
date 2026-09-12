import { ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="public-container public-detail">
      <h1>Page introuvable</h1>
      <a className="public-back" href="/stands">Voir les stands <ArrowRight size={18} /></a>
    </main>
  );
}
