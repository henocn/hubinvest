import InvestorRequestForm from '../components/InvestorRequestForm';

export default function InvestorDeskPage() {
  return (
    <main className="public-container investor-desk-page">
      <section className="investor-desk-intro">
        <h1>Parlez-nous de votre projet</h1>
        <p>Investor Desk</p>
      </section>
      <section className="investor-request-panel"><InvestorRequestForm /></section>
    </main>
  );
}
