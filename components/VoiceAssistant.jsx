"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

function speak(text, enabled, voicePref) {
  if (!enabled) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voicePref) {
      const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith(voicePref));
      if (voice) utterance.voice = voice;
    }
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  } catch (_) {}
}

export default function VoiceAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Namaste! Main aapki madad ke liye tayyar hoon. Aap kya jaanna chahenge?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [errorText, setErrorText] = useState('');

  const recognitionRef = useRef(null);
  const supportsSpeech = typeof window !== 'undefined' && ('speechSynthesis' in window);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const personaHint = useMemo(() => (
    'Aap ek General Purpose Conversational AI Assistant hain. Hamesha seedhi, saaf, friendly Hindi mein jawab dijiye. Jawab ko 3-4 chhote paragraphs ya bullet points mein baantkar dijiye. Tone warm, professional aur thodi si friendly rahe.'
  ), []);

  async function ask(question) {
    setIsLoading(true);
    setErrorText('');
    const userMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, personaHint })
      });
      if (!res.ok) throw new Error('request_failed');
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, assistantMsg]);
      speak(data.answer, voiceEnabled && supportsSpeech, 'hi');
    } catch (err) {
      setErrorText('Maafi, abhi jawab laane mein dikkat aa rahi hai. Thodi der baad koshish karein.');
    } finally {
      setIsLoading(false);
      setInput('');
    }
  }

  return (
    <div>
      <div className="chatArea">
        {messages.map((m, idx) => (
          <div key={idx} className={`message ${m.role}`}>
            <div className="role">{m.role === 'user' ? 'Aap' : 'Sahayak'}</div>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        {errorText && (
          <div className="message">
            <div className="role">Note</div>
            <div className="bubble">{errorText}</div>
          </div>
        )}
      </div>
      <div className="inputBar">
        <input
          className="textInput"
          placeholder="Apna sawal ya kaam likhein..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && input.trim() && !isLoading) ask(input.trim()); }}
          disabled={isLoading}
        />
        <div className="controls">
          <button
            className="secondaryBtn"
            onClick={() => {
              if (!recognitionRef.current) return;
              if (listening) {
                recognitionRef.current.stop();
                setListening(false);
              } else {
                setListening(true);
                recognitionRef.current.start();
              }
            }}
          >{listening ? 'Stop' : '?? Bol Kar'}</button>
          <button
            className="secondaryBtn"
            onClick={() => setVoiceEnabled(v => !v)}
          >{voiceEnabled ? '?? Voice ON' : '?? Voice OFF'}</button>
        </div>
        <button
          className="primaryBtn"
          disabled={!input.trim() || isLoading}
          onClick={() => ask(input.trim())}
        >{isLoading ? 'Soch raha hai?' : 'Bhejein'}</button>
      </div>
      <div className="small" style={{ padding: '0 12px 12px' }}>
        Privacy: Sawal server ko bheja jaata hai taaki jawaab ban sake.
      </div>
    </div>
  );
}
