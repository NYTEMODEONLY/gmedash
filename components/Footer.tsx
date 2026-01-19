'use client';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">About This Dashboard</h3>
            <p className="text-sm text-gray-600 mb-4">
              100% Real-time GameStop (GME) financial data dashboard sourced directly from official exchanges, 
              regulatory filings, and verified financial data providers. No simulated or mock data.
            </p>
            <div className="text-xs text-gray-500">
              <p>Data sources: Yahoo Finance, SEC EDGAR, FINRA, NASDAQ</p>
              <p>Charts powered by Recharts</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Important Disclaimers</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Not Financial Advice:</strong> This dashboard is for informational purposes only 
                and should not be considered as financial advice.
              </p>
              <p>
                <strong>Data Accuracy:</strong> All data is sourced directly from official financial institutions 
                and regulatory bodies. Real-time data may have minor delays as permitted by exchanges.
              </p>
              <p>
                <strong>Investment Risk:</strong> Stock trading involves substantial risk of loss. 
                Past performance does not guarantee future results.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <a 
                  href="https://www.gamestop.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  GameStop Official Website
                </a>
              </li>
              <li>
                <a 
                  href="https://www.sec.gov/edgar/browse/?CIK=0001326380" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  SEC EDGAR Database
                </a>
              </li>
              <li>
                <a 
                  href="https://finance.yahoo.com/quote/GME" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  Yahoo Finance - GME
                </a>
              </li>
              <li>
                <a
                  href="https://www.marketwatch.com/investing/stock/gme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  MarketWatch - GME
                </a>
              </li>
              <li>
                <a
                  href="https://news.gamestop.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  GameStop Investor Relations
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/ryancohen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  Ryan Cohen on X/Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://whydrs.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  WhyDRS.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              <p>© {new Date().getFullYear()} GameStop Dashboard. Built with Next.js and Tailwind CSS.</p>
              <p className="mt-1">
                a <a href="https://nytemode.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">nytemode</a> project
              </p>
              <p className="mt-1">
                This is not an official GameStop product. Data provided by third-party APIs.
              </p>
            </div>
            <div className="flex space-x-6">
              <a
                href="https://github.com/NYTEMODEONLY/gmedash"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 