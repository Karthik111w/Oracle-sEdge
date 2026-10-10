import React from 'react';
import HomeHero from '../components/home/HomeHero';
import TickerTape from '../components/home/TickerTape';
import MarginRanking from '../components/home/MarginRanking';
import VerdictWalkthrough from '../components/home/VerdictWalkthrough';
import LensStack from '../components/home/LensStack';

const HomePage = () => (
  <div className="home">
    <HomeHero />
    <TickerTape />
    <MarginRanking />
    <VerdictWalkthrough />
    <LensStack />

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
