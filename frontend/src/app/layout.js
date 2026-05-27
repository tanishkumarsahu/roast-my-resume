import "./globals.css";

export const metadata = {
  title: "Roast My Resume - Savage AI Resume Reviewer",
  description: "Upload your resume for a brutal, hilarious, and spicy AI roast, along with actionable advice to redeem your career prospects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
