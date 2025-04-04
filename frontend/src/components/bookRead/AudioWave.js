import React from 'react';

const AudioWave = () => {
  return (
    <div style={styles.waveContainer}>
      {Array.from({ length: 10 }).map((_, index) => (
        <div style={{ ...styles.waveBar, animationDelay: `${-0.9 + index * 0.1}s` }} key={index}></div>
      ))}
    </div>
  );
};

const styles = {
  waveContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    height: '100%',
  },
  waveBar: {
    width: '4px',
    height: '20px',
    backgroundColor: '#7AA2E3',
    borderRadius: '2px',
    animation: 'wave 1s ease-in-out infinite',
  },
};

// 添加新的样式标签到head中
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes wave {
    0%, 100% { height: 20px; }
    50% { height: 40px; }
  }
`;
document.head.appendChild(styleSheet);

export default AudioWave;