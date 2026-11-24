'use client';

const MaintenanceFullPage = () => {
  return (
    <div className="maintenance-wrapper">
      <div className="glow"></div>
      <div className="container">
        <div className="logo">PHINX</div>
        <div className="status-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--primary)' }}
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
        </div>
        <h1>Workshop upgrade in progress</h1>
        <p>
          We&apos;re fitting new features into Phinx. Your designs and cut lists are safe, and
          we&apos;ll be back in a few minutes.
        </p>
        <div className="progress-bar">
          <div></div>
        </div>
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

        .status-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem;
          border: 3px solid var(--bv-glass-border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .status-icon::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid var(--primary);
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 2s linear infinite;
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

        .progress-bar {
          width: 200px;
          height: 4px;
          background: var(--bv-glass-border);
          margin: 0 auto;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar div {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          width: 30%;
          border-radius: 2px;
          animation: move 2s ease-in-out infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes move {
          0% {
            transform: translateX(-100%);
            width: 30%;
          }
          50% {
            width: 60%;
          }
          100% {
            transform: translateX(200%);
            width: 30%;
          }
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
