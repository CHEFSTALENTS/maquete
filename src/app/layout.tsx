import "./globals.css";

export const metadata = {
  title: "SolCard Mock",
  description: "Mock wallet UI for product demo video",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
