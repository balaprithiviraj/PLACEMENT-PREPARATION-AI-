import PageHeader from '../components/PageHeader.jsx';
import AiQuizGenerator from '../components/AiQuizGenerator.jsx';

export default function Aptitude() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice"
        title="Aptitude Practice"
        sub="Practice topic-wise or take a timed test."
      />

      <AiQuizGenerator type="aptitude" />
    </div>
  );
}
