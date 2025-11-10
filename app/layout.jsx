export const metadata = {
  title: 'Aapka AI Sahayak',
  description: 'Warm, professional, friendly voice assistant in Hindi'
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>
        {children}
      </body>
    </html>
  );
}
