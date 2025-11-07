import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export const DashboardLayout = ({ children, title, description }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
};
