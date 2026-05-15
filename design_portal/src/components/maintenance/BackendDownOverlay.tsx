'use client';

const BackendDownOverlay = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="backend-down-wrapper">
      <link
        href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="glow"></div>
      <div className="container">
        <div className="logo">BRAVENTO</div>
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
            style={{ color: '#9078dd' }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h1>Connection Lost</h1>
        <p>
          We're having trouble connecting to our servers. This usually happens when the backend service is restarting or temporarily unavailable.
        </p>
        <button onClick={handleRefresh} className="refresh-button">
          Refresh Page
        </button>
        <p className="sub-text">Please restart your browser if the problem persists.</p>
      </div>

      <style jsx>{`
        .backend-down-wrapper {
          --bg: rgba(10, 10, 10, 0.95);
          --primary: #392579;
          --secondary: #9078dd;
          --text: #ffffff;
          --text-dim: #94a3b8;

          position: fixed;
          inset: 0;
          z-index: 2147483647;
          font-family: 'Comfortaa', sans-serif;
          background-color: var(--bg);
          backdrop-filter: blur(10px);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .container {
          text-align: center;
          padding: 3rem;
          position: relative;
          z-index: 1;
          max-width: 500px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .logo {
          font-size: 2.5rem;
          font-weight: 600;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1px;
        }

        .status-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem;
          border: 3px solid rgba(144, 120, 221, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(144, 120, 221, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(144, 120, 221, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(144, 120, 221, 0); }
        }

        h1 {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          color: #fff;
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
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border: none;
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 15px -3px rgba(57, 37, 121, 0.3);
        }

        .refresh-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(57, 37, 121, 0.4);
          filter: brightness(1.1);
        }

        .refresh-button:active {
          transform: translateY(0);
        }

        .glow {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(144, 120, 221, 0.1) 0%, rgba(0, 0, 0, 0) 70%);
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
