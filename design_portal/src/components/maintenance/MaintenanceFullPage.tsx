'use client';

const MaintenanceFullPage = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)',
        }}
      />

      {/* Content container */}
      <div className="relative z-10 px-8 text-center">
        {/* Logo */}
        <div
          className="mb-8 text-5xl font-semibold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          BREVENTO
        </div>

        {/* Status icon with spinner */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white/10">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#6366f1]"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <div
            className="absolute h-20 w-20 animate-spin rounded-full border-[3px] border-[#6366f1] border-t-transparent"
            style={{
              animationDuration: '2s',
            }}
          />
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-semibold text-white">System Update in Progress</h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-md text-lg leading-relaxed text-[#94a3b8]">
          We're currently updating our servers to bring you new features. We'll be back online in
          just a few minutes.
        </p>

        {/* Progress bar */}
        <div className="mx-auto h-1 w-52 overflow-hidden rounded-sm bg-white/10">
          <div
            className="h-full w-[30%] animate-[move_2s_ease-in-out_infinite] rounded-sm"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #a855f7)',
            }}
          />
        </div>
      </div>

      <style jsx>{`
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
      `}</style>
    </div>
  );
};

export default MaintenanceFullPage;
