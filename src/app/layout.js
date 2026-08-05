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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
