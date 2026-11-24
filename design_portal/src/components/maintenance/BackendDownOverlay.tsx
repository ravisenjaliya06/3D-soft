'use client';

const BackendDownOverlay = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="backend-down-wrapper">
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
            style={{ color: 'var(--bv-accent-light)' }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h1>Connection Lost</h1>
        <p>
          We're having trouble connecting to our servers. This usually happens when the backend
          service is restarting or temporarily unavailable.
        </p>
        <button onClick={handleRefresh} className="refresh-button">
          Refresh Page
        </button>
        <p className="sub-text">Please restart your browser if the problem persists.</p>
      </div>

      <style jsx>{`
        .backend-down-wrapper {
          --bg: var(--bv-ink-2);
          --primary: var(--bv-accent);
          --secondary: var(--bv-accent-light);
          --text: var(--bv-on-ink);
          --text-dim: var(--bv-on-ink-muted);

          position: fixed;
          inset: 0;
          z-index: 2147483647;
          font-family: var(--bv-font);
          background-color: var(--bg);
          background-image:
            linear-gradient(var(--bv-glass) 1px, transparent 1px),
            linear-gradient(90deg, var(--bv-glass) 1px, transparent 1px);
          background-size: 28px 28px;
          backdrop-filter: blur(10px);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .container {
          text-align: center;
          padding: 3rem;
          position: relative;
          z-index: 1;
          max-width: 500px;
          background: var(--bv-glass);
          border: 1px solid var(--bv-glass-border);
          border-radius: 2rem;
          box-shadow: var(--bv-shadow-lg);
        }

        .logo {
          font-size: 2.5rem;
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
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 var(--bv-accent-glow);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px transparent;
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 transparent;
          }
        }

        h1 {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        p {
          color: var(--text-dim);
          font-size: 1.1rem;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .sub-text {
          font-size: 0.9rem;
          margin-top: 1.5rem;
          opacity: 0.7;
        }

        .refresh-button {
          background: var(--primary);
          color: var(--bv-on-accent);
          border: none;
          font-family: var(--bv-font);
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: var(--bv-radius-pill);
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--bv-shadow-md);
        }

        .refresh-button:hover {
          transform: translateY(-2px);
          background: var(--bv-accent-hover);
          box-shadow: var(--bv-shadow-lg);
        }

        .refresh-button:active {
          transform: translateY(0);
        }

        .glow {
          position: absolute;
          width: 600px;
          height: 600px;
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

export default BackendDownOverlay;
