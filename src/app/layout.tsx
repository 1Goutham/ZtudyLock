import './globals.css'
import { Toaster } from "sonner";
export const metadata = {
  title: 'ZtudyLock',
  description: 'AI-powered study recall',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster theme="dark" position="bottom-center"/>
      </body>
    </html>
  );
}
