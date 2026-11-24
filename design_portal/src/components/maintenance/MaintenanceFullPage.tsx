'use client';

import PhinxLoader from '@/components/common/PhinxLoader';

const MaintenanceFullPage = () => {
  return (
    <div className="maintenance-wrapper">
      <div className="glow"></div>
      <div className="container">
        <div className="logo">PHINX</div>
        <div className="loader-tile">
          <PhinxLoader scene="cabinet" size="md" label="" />
        </div>
        <h1>Workshop upgrade in progress</h1>
        <p>
          We&apos;re fitting new features into Phinx. Your designs and cut lists are safe, and
          we&apos;ll be back in a few minutes.
        </p>
      </div>

      <style jsx>{`
        .maintenance-wrapper {
          --bg: var(--bv-ink-2);
          --primary: var(--bv-accent);
          --secondary: var(--bv-accent-light);
          --text: var(--bv-on-ink);
          --text-dim: var(--bv-on-ink-muted);

          position: fixed;
          inset: 0;
          z-index: 9999;
          font-family: var(--bv-font);
          background-color: var(--bg);
          background-image:
            linear-gradient(var(--bv-glass) 1px, transparent 1px),
            linear-gradient(90deg, var(--bv-glass) 1px, transparent 1px);
          background-size: 28px 28px;
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .container {
          text-align: center;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }

        .logo {
          font-size: 3rem;
          font-weight: 600;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.08em;
        }

        .loader-tile {
          display: inline-flex;
          margin: 0 auto 2rem;
          padding: 20px 28px 18px;
          border-radius: 18px;
          background: var(--bv-surface);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        p {
          color: var(--text-dim);
          font-size: 1.1rem;
          max-width: 450px;
          margin: 0 auto 2rem;
          line-height: 1.6;
        }

        .glow {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, var(--bv-accent-glow) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default MaintenanceFullPage;
