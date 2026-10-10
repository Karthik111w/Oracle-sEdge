import React from 'react';
import SearchBar from '../components/SearchBar';
import LensVerdictCard from '../components/home/LensVerdictCard';
import MarketStrip from '../components/home/MarketStrip';
import MarginRanking from '../components/home/MarginRanking';
import LensGuide from '../components/home/LensGuide';
import VerdictWalkthrough from '../components/home/VerdictWalkthrough';

const HomePage = () => (
  <div className="home">
    <section className="home-hero">
      <div className="home-hero-copy">
        <h1 className="home-title">See any stock the way Buffett would.</h1>
        <p className="home-subtitle">
          Score any stock through six investing lenses. See fair value, margin of safety, and what each legend would say.
        </p>
        <SearchBar placeholder="Try KO, AAPL or BRK-B" />
      </div>
      <LensVerdictCard />
    </section>

    <MarketStrip />
    <MarginRanking />
    <VerdictWalkthrough />
    <LensGuide />

    <footer className="home-footer">
      <div>
        <h2>Methodology</h2>
        <p>
          Each lens scores eight fundamentals (earnings consistency, ROIC, FCF growth, profit margin, ROE, debt to equity,
          interest coverage and revenue growth) with its own weights, adjusted for the company's sector. Fair value comes
          from a discounted cash flow model; margin of safety is how far the price sits below it.{' '}
          <a href="#lenses">See the lens weights</a>.
        </p>
      </div>
      <p className="home-disclaimer">
        Not financial advice. Data from Yahoo Finance and company filings, and may be delayed or incomplete.
      </p>
    </footer>
  </div>
);

export default HomePage;
