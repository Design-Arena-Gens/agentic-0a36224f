export const runtime = 'edge';

function toSentences(text) {
  if (!text) return [];
  const raw = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return raw;
}

function formatHindiAnswer(raw, question) {
  const sentences = toSentences(raw);
  const chosen = sentences.slice(0, 6);
  const chunks = [];
  let current = [];
  for (const s of chosen) {
    if (current.join(' ').length + s.length > 140 && current.length > 0) {
      chunks.push(current.join(' '));
      current = [s];
    } else {
      current.push(s);
    }
  }
  if (current.length) chunks.push(current.join(' '));
  const limited = chunks.slice(0, 4);
  if (limited.length === 0) {
    return [
      'Yeh raha sankshipt uttar:',
      'Is vishay par saral, seedhi jaankari prastut ki gayi hai.',
      'Agar aap chaahein to main aur udaharan de sakta hoon.'
    ].join('\n\n');
  }
  const bulletOrPara = limited.length <= 3 ? 'para' : 'bullet';
  if (bulletOrPara === 'bullet') {
    return limited.map(line => `- ${line}`).join('\n');
  }
  return limited.join('\n\n');
}

async function fetchDuckDuckGo(q) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const parts = [];
  if (data.AbstractText) parts.push(data.AbstractText);
  if (Array.isArray(data.RelatedTopics)) {
    for (const t of data.RelatedTopics) {
      if (typeof t.Text === 'string' && t.Text.length > 0) parts.push(t.Text);
      if (Array.isArray(t.Topics)) {
        for (const sub of t.Topics) {
          if (sub && sub.Text) parts.push(sub.Text);
        }
      }
    }
  }
  const text = parts.join(' ').slice(0, 1200);
  return text || null;
}

async function fetchWikipedia(q, lang = 'en') {
  const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=1&namespace=0&format=json&origin=*`;
  const sres = await fetch(searchUrl, { cache: 'no-store' });
  if (!sres.ok) return null;
  const sdata = await sres.json();
  const title = sdata?.[1]?.[0];
  if (!title) return null;
  const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const r = await fetch(sumUrl, { cache: 'no-store' });
  if (!r.ok) return null;
  const d = await r.json();
  const text = (d.extract || '').slice(0, 1500);
  return text || null;
}

function buildPersona(answerText, question) {
  const preface = 'Aasaan, seedhi Hindi mein uttar:';
  const formatted = formatHindiAnswer(answerText, question);
  const helpfulTail = '\n\nYadi aap chaahein, main aur vistaar se bata sakta hoon.';
  return `${preface}\n\n${formatted}${helpfulTail}`;
}

export async function POST(request) {
  try {
    const { question } = await request.json();
    const q = String(question || '').trim();
    if (!q) {
      return new Response(JSON.stringify({ answer: 'Kripya apna sawal batayein.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let text = null;

    // Try DDG first (fast, broad)
    try { text = await fetchDuckDuckGo(q); } catch (_) {}

    // Wikipedia in Hindi, then English
    if (!text) {
      try { text = await fetchWikipedia(q, 'hi'); } catch (_) {}
    }
    if (!text) {
      try { text = await fetchWikipedia(q, 'en'); } catch (_) {}
    }

    // Fallback generic helpfulness
    if (!text) {
      const generic = `Aapne pucha: "${q}". Is vishay par vistrit jaankari uplabdh karne ki koshish ki, lekin turant sahi srot nahi mila. Main aapko step-by-step madad kar sakta hoon: paribhasha, sandarbh, aur relevant udaharan ke saath.`;
      const answer = buildPersona(generic, q);
      return new Response(JSON.stringify({ answer }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const answer = buildPersona(text, q);
    return new Response(JSON.stringify({ answer }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ answer: 'Maafi, kuchh galti ho gayi. Kripya dobara koshish karein.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
