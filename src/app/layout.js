import './globals.css';

export const metadata = {
  title: "GMUNC's Status Quo",
  description:
    'A monthly macro-recap of critical world news by GMUNC. Covers international relations, global political economies, and security frameworks across seven key regions.',
  icons: {
    icon: [
      { url: '/gmunc-logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/gmunc-logo.png',
    apple: '/gmunc-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
