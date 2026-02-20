import React from 'react';

const LoadingAnimation = ({ message = "Loading..." }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      <div style={{ position: 'relative' }}>
        {/* Main Loading Container */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          animation: 'slideUp 0.4s ease-out'
        }}>
          {/* Cricket Animation - GIF Loop */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '192px',
              height: '192px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'linear-gradient(to bottom right, #DBEAFE, #E9D5FF)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
              <img
                src="/assets/Untitled file.gif"
                alt="Cricket Animation"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
            
            {/* Pulsing Ring */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '16px',
              border: '4px solid #3B82F6',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
          </div>

          {/* Loading Text */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #3B82F6, #9333EA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px'
            }}>
              {message}
            </h3>
            
            {/* Animated Dots */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#3B82F6',
                borderRadius: '50%',
                animation: 'bounce 1s infinite'
              }}></div>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#9333EA',
                borderRadius: '50%',
                animation: 'bounce 1s infinite 0.15s'
              }}></div>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#EC4899',
                borderRadius: '50%',
                animation: 'bounce 1s infinite 0.3s'
              }}></div>
            </div>
            
            {/* Progress Message */}
            <p style={{
              color: '#6B7280',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Please wait while we process your request
            </p>
          </div>

          {/* Cricket Bat Icon */}
          <div style={{
            position: 'absolute',
            bottom: '-16px',
            right: '-16px',
            fontSize: '64px',
            opacity: 0.2,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            🏏
          </div>
        </div>

        {/* Outer Glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
          borderRadius: '24px',
          filter: 'blur(40px)',
          zIndex: -1,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingAnimation;
