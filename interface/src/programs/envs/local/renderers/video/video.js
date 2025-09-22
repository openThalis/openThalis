const params = new URLSearchParams(location.search);
const path = params.get('path') || '';
if (!window.__BACKEND_URL__) throw new Error('Backend URL is not configured');
const base = String(window.__BACKEND_URL__).replace(/\/$/, '');
const url = `${base}/api/raw?path=${encodeURIComponent(path)}`;
const name = (path.split(/\\|\//).pop() || 'Video');
document.getElementById('title').textContent = name;

// Media controls
const video = document.getElementById('vid');
const playPauseBtn = document.getElementById('play-pause');
const seekBar = document.getElementById('seek-bar');
const seekProgress = document.getElementById('seek-progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const volumeBtn = document.getElementById('volume-btn');
const volumeBar = document.getElementById('volume-bar');
const volumeProgress = document.getElementById('volume-progress');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const bufferedRangesEl = document.getElementById('buffered-ranges');

// Improve video loading - try to buffer more data and set CORS before src
video.preload = 'auto';
if (url.includes('api/raw')) {
  try { video.crossOrigin = 'anonymous'; } catch {}
}
video.src = url;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateSeekBar() {
  if (!video.duration) return;
  const progress = (video.currentTime / video.duration) * 100;
  seekProgress.style.width = `${progress}%`;
  currentTimeEl.textContent = formatTime(video.currentTime);
}

function updateDuration() {
  if (video.duration) {
    durationEl.textContent = formatTime(video.duration);
  }
}

function updateBufferedRanges() {
  if (!video.duration || !bufferedRangesEl) return;
  bufferedRangesEl.innerHTML = '';
  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    const startPercent = (start / video.duration) * 100;
    const widthPercent = ((end - start) / video.duration) * 100;
    const rangeEl = document.createElement('div');
    rangeEl.className = 'buffered-range';
    rangeEl.style.left = `${startPercent}%`;
    rangeEl.style.width = `${widthPercent}%`;
    rangeEl.title = `Buffered: ${formatTime(start)} - ${formatTime(end)}`;
    bufferedRangesEl.appendChild(rangeEl);
  }
}

playPauseBtn.addEventListener('click', () => {
  if (video.paused) {
    video.play();
    playPauseBtn.textContent = '⏸';
  } else {
    video.pause();
    playPauseBtn.textContent = '▶';
  }
});

video.addEventListener('timeupdate', updateSeekBar);
video.addEventListener('loadedmetadata', () => {
  updateDuration();
  updateBufferedRanges();
});
video.addEventListener('ended', () => {
  playPauseBtn.textContent = '▶';
});

// Update buffered ranges as more data loads
video.addEventListener('progress', updateBufferedRanges);
video.addEventListener('canplay', updateBufferedRanges);
video.addEventListener('canplaythrough', updateBufferedRanges);


  // Simple click-to-seek functionality only
  seekBar.addEventListener('click', (e) => {
    if (!video.duration) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = seekBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * video.duration;

    // Check if target time is in a buffered range
    let canSeek = false;
    let nearestBufferedTime = targetTime;

    for (let i = 0; i < video.buffered.length; i++) {
      const start = video.buffered.start(i);
      const end = video.buffered.end(i);

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
      video.currentTime = finalTargetTime;
    } catch (error) {
      console.error('Seek failed:', error);
    }
  });

volumeBtn.addEventListener('click', () => {
  if (video.muted) {
    video.muted = false;
    volumeBtn.textContent = '🔊';
    volumeProgress.style.width = `${video.volume * 100}%`;
  } else {
    video.muted = true;
    volumeBtn.textContent = '🔇';
    volumeProgress.style.width = '0%';
  }
});

volumeBar.addEventListener('click', (e) => {
  const rect = volumeBar.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  video.volume = Math.max(0, Math.min(1, pos));
  volumeProgress.style.width = `${video.volume * 100}%`;
  video.muted = false;
  volumeBtn.textContent = '🔊';
});

fullscreenBtn.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    fullscreenBtn.textContent = '⛶';
  } else {
    document.documentElement.requestFullscreen();
    fullscreenBtn.textContent = '⛷';
  }
});

// Handle fullscreen change
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    fullscreenBtn.textContent = '⛷';
  } else {
    fullscreenBtn.textContent = '⛶';
  }
});

// Initialize volume display
video.volume = 1.0;
volumeProgress.style.width = '100%';


