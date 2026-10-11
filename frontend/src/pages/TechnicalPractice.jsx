import PageHeader from '../components/PageHeader.jsx';
import AiQuizGenerator from '../components/AiQuizGenerator.jsx';

export default function TechnicalPractice() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice"
        title="Technical Practice"
        sub="CS fundamentals, DSA and development — practice or take a timed test."
      />

      <AiQuizGenerator type="technical" />
    </div>
  );
}
