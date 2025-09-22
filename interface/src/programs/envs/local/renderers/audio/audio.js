const params = new URLSearchParams(location.search);
const path = params.get('path') || '';
if (!window.__BACKEND_URL__) throw new Error('Backend URL is not configured');
const base = String(window.__BACKEND_URL__).replace(/\/$/, '');
const url = `${base}/api/raw?path=${encodeURIComponent(path)}`;
const name = (path.split(/\\|\//).pop() || 'Audio');
document.getElementById('title').textContent = name;

// Media controls
const audio = document.getElementById('aud');
const playPauseBtn = document.getElementById('play-pause');
const seekBar = document.getElementById('seek-bar');
const seekProgress = document.getElementById('seek-progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const volumeBtn = document.getElementById('volume-btn');
const volumeBar = document.getElementById('volume-bar');
const volumeProgress = document.getElementById('volume-progress');
const bufferedRangesEl = document.getElementById('buffered-ranges');

// Improve audio loading - try to buffer more data and set CORS before src
audio.preload = 'auto';
if (url.includes('api/raw')) {
  try { audio.crossOrigin = 'anonymous'; } catch {}
}
audio.src = url;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateSeekBar() {
  if (!audio.duration) return;
  const progress = (audio.currentTime / audio.duration) * 100;
  seekProgress.style.width = `${progress}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
}

function updateDuration() {
  if (audio.duration) {
    durationEl.textContent = formatTime(audio.duration);
  }
}

function updateBufferedRanges() {
  if (!audio.duration || !bufferedRangesEl) return;
  bufferedRangesEl.innerHTML = '';
  for (let i = 0; i < audio.buffered.length; i++) {
    const start = audio.buffered.start(i);
    const end = audio.buffered.end(i);
    const startPercent = (start / audio.duration) * 100;
    const widthPercent = ((end - start) / audio.duration) * 100;
    const rangeEl = document.createElement('div');
    rangeEl.className = 'buffered-range';
    rangeEl.style.left = `${startPercent}%`;
    rangeEl.style.width = `${widthPercent}%`;
    rangeEl.title = `Buffered: ${formatTime(start)} - ${formatTime(end)}`;
    bufferedRangesEl.appendChild(rangeEl);
  }
}

playPauseBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = '⏸';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶';
  }
});

audio.addEventListener('timeupdate', updateSeekBar);
audio.addEventListener('loadedmetadata', () => {
  updateDuration();
  updateBufferedRanges();
});
audio.addEventListener('ended', () => {
  playPauseBtn.textContent = '▶';
});


// Update buffered ranges as more data loads
audio.addEventListener('progress', updateBufferedRanges);
audio.addEventListener('canplay', updateBufferedRanges);
audio.addEventListener('canplaythrough', updateBufferedRanges);

// Clickable time display for manual time input
currentTimeEl.addEventListener('click', async () => {
  if (!audio.duration) return;

  // Simple time input using prompt
  const timeInput = prompt('Enter time (MM:SS or seconds):', formatTime(audio.currentTime));

  if (timeInput && timeInput.trim()) {
    let targetTime = 0;

    // Try to parse MM:SS format first
    const mmssMatch = timeInput.trim().match(/^(\d+):(\d{1,2})$/);
    if (mmssMatch) {
      const minutes = parseInt(mmssMatch[1], 10);
      const seconds = parseInt(mmssMatch[2], 10);
      targetTime = minutes * 60 + seconds;
    } else {
      // Try to parse as seconds
      const secondsMatch = timeInput.trim().match(/^(\d+(?:\.\d+)?)$/);
      if (secondsMatch) {
        targetTime = parseFloat(secondsMatch[1]);
      }
    }

    // Validate and clamp the time
    if (!isNaN(targetTime) && targetTime >= 0) {
      const clampedTime = Math.max(0, Math.min(targetTime, audio.duration));
      audio.currentTime = clampedTime;
    } else {
      alert('Invalid time format. Use MM:SS (e.g., 2:30) or seconds (e.g., 150)');
    }
  }
});

// Simple click-to-seek functionality with buffering support
seekBar.addEventListener('click', (e) => {
  if (!audio.duration) return;
  e.preventDefault();
  e.stopPropagation();
  const rect = seekBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percentage = Math.max(0, Math.min(1, clickX / rect.width));
  const targetTime = percentage * audio.duration;

  // Check if target time is in a buffered range
  let canSeek = false;
  let nearestBufferedTime = targetTime;

  for (let i = 0; i < audio.buffered.length; i++) {
    const start = audio.buffered.start(i);
    const end = audio.buffered.end(i);

    if (targetTime >= start && targetTime <= end) {
      canSeek = true;
      break;
    } else {
      // Find nearest buffered time if target isn't buffered
      if (targetTime < start && Math.abs(targetTime - start) < Math.abs(targetTime - nearestBufferedTime)) {
        nearestBufferedTime = start;
      } else if (targetTime > end && Math.abs(targetTime - end) < Math.abs(targetTime - nearestBufferedTime)) {
        nearestBufferedTime = end;
      }
    }
  }

  // Use buffered time if target isn't available
  const finalTargetTime = canSeek ? targetTime : nearestBufferedTime;
  try {
    audio.currentTime = finalTargetTime;
  } catch (error) {
    console.error('Audio seek failed:', error);
  }
});

volumeBtn.addEventListener('click', () => {
  if (audio.muted) {
    audio.muted = false;
    volumeBtn.textContent = '🔊';
    volumeProgress.style.width = `${audio.volume * 100}%`;
  } else {
    audio.muted = true;
    volumeBtn.textContent = '🔇';
    volumeProgress.style.width = '0%';
  }
});

volumeBar.addEventListener('click', (e) => {
  const rect = volumeBar.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  audio.volume = Math.max(0, Math.min(1, pos));
  volumeProgress.style.width = `${audio.volume * 100}%`;
  audio.muted = false;
  volumeBtn.textContent = '🔊';
});

// Initialize volume display
audio.volume = 1.0;
volumeProgress.style.width = '100%';
