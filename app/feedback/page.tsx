import type { Metadata } from 'next';
import FeedbackForm from '@/components/FeedbackForm';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Feedback and Data Requests',
  description: 'Submit anonymous feedback, data requests, and data accuracy reports for the GME Dashboard.',
  alternates: {
    canonical: 'https://gmedash.vercel.app/feedback',
  },
};

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-gme-light-100 dark:bg-gme-dark transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FeedbackForm />
      </main>
      <Footer />
    </div>
  );
}
