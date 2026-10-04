import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "SkyTrak - Live Flight Tracker",
  description: "Tracciamento voli in tempo reale",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-base-950 text-gray-100">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
