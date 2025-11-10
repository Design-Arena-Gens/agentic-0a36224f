import VoiceAssistant from '../components/VoiceAssistant';

export default function Page() {
  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div>
            <div className="title">Aapka AI Sahayak</div>
            <div className="subtitle">Warm, professional, friendly ? Hindi first</div>
          </div>
          <span className="badge">Voice Ready</span>
        </div>
        <VoiceAssistant />
      </div>
      <div className="footerNote">Tip: Mic se bolein ya text type karein.</div>
    </div>
  );
}
