import React from 'react';

const LoyaltyDisloyaltyPage = () => (
  <div className="loyalty-disloyalty-page">
    <h1>Loyalty & Disloyalty</h1>
    <iframe
      src="/pdfs/Loyalty & Disloyalty.pdf"
      title="Loyalty & Disloyalty PDF"
      width="100%"
      height="800px"
      style={{ border: 'none' }}
    />
    <p style={{marginTop: '1rem'}}>If the PDF does not display, <a href="/pdfs/Loyalty & Disloyalty.pdf" target="_blank" rel="noopener noreferrer">click here to download or view it directly</a>.</p>
  </div>
);

export default LoyaltyDisloyaltyPage;
