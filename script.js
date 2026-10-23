/**
 * MAHADEV Official Landing Page Logic
 * Black & #ffe400 Theme with Dynamic Meta Pixel & Link Config
 */

// Global configuration state with defaults
let SITE_CONFIG = {
  "metaPixelId": "28732861429702738",
  "whatsappPhone": "919376412262",
  "whatsappMessage": "Hello Mahadev, I want mentorship",
  "telegramUrl": "https://t.me/Mahadevbetsbook"
};

// Tracks the currently initialized Pixel ID (matches index.html base code)
let currentInitializedPixelId = '28732861429702738';

document.addEventListener('DOMContentLoaded', async () => {
  await initConfiguration();
  setupVideoPlayer();
  setupRippleEffects();
});

/**
 * Fetch and apply configuration dynamically from API or static fallbacks
 */
async function initConfiguration() {
  let loaded = false;

  // 1. Try server endpoint /api/config
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      SITE_CONFIG = { ...SITE_CONFIG, ...data };
      loaded = true;
    }
  } catch (err) {
    // Server endpoint not available; try static fallback
  }

  // 2. Try static config.json
  if (!loaded) {
    try {
      const resFallback = await fetch('config.json', { cache: 'no-store' });
      if (resFallback.ok) {
        const dataFallback = await resFallback.json();
        SITE_CONFIG = { ...SITE_CONFIG, ...dataFallback };
        loaded = true;
      }
    } catch (e) { }
  }

  // 3. Try cached localStorage
  if (!loaded) {
    const cached = localStorage.getItem('mahadev_config');
    if (cached) {
      try {
        const dataLocal = JSON.parse(cached);
        SITE_CONFIG = { ...SITE_CONFIG, ...dataLocal };
      } catch (err) { }
    }
  }

  // Apply to Meta Pixel & CTA Links
  initMetaPixel();
  applyActionLinks();
}

/**
 * Initialize Meta Pixel dynamically if configured ID changes
 */
function initMetaPixel() {
  const pixelId = (SITE_CONFIG.metaPixelId || '').trim();
  if (!pixelId) {
    console.log('[Meta Pixel] No Pixel ID configured.');
    return;
  }

  if (window.fbq) {
    try {
      // If Pixel ID differs from base code, initialize and track PageView for new ID
      if (pixelId !== currentInitializedPixelId) {
        fbq('init', pixelId);
        fbq('track', 'PageView');
        currentInitializedPixelId = pixelId;
        console.log(`[Meta Pixel] Switched and initialized with new ID: ${pixelId}`);
      } else {
        console.log(`[Meta Pixel] Active with ID: ${pixelId}`);
      }

      // Update noscript tag if present
      const noscriptImg = document.getElementById('fb-pixel-noscript');
      if (noscriptImg) {
        noscriptImg.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
      }
    } catch (e) {
      console.warn('[Meta Pixel] Initialization error:', e);
    }
  }
}

/**
 * Configure WhatsApp and Telegram Buttons and attach Meta Pixel tracking events
 */
function applyActionLinks() {
  const whatsappBtn = document.getElementById('whatsapp-btn');
  const telegramBtn = document.getElementById('telegram-btn');

  // Configure WhatsApp link
  if (whatsappBtn) {
    const phone = (SITE_CONFIG.whatsappPhone || '').replace(/[^0-9]/g, '').trim();
    const msg = encodeURIComponent(SITE_CONFIG.whatsappMessage || '');

    let waUrl = 'https://wa.me/';
    if (phone) {
      waUrl = `https://wa.me/${phone}?text=${msg}`;
    } else if (msg) {
      waUrl = `https://wa.me/?text=${msg}`;
    }
    whatsappBtn.href = waUrl;

    // Track Meta Pixel Lead event on WhatsApp button click
    whatsappBtn.addEventListener('click', () => {
      if (window.fbq) {
        fbq('track', 'Lead');
        console.log('[Meta Pixel] Event fired: Lead (WhatsApp)');
      }
    });
  }

  // Configure Telegram link
  if (telegramBtn) {
    let tgUrl = (SITE_CONFIG.telegramUrl || 'https://t.me/').trim();
    if (tgUrl && !tgUrl.startsWith('http://') && !tgUrl.startsWith('https://')) {
      if (tgUrl.startsWith('@')) tgUrl = tgUrl.substring(1);
      tgUrl = 'https://t.me/' + tgUrl;
    }
    telegramBtn.href = tgUrl;

    // Track Meta Pixel Subscribe (custom) on Telegram button click only
    telegramBtn.addEventListener('click', () => {
      if (window.fbq) {
        fbq('trackCustom', 'Subscribe');
        console.log('[Meta Pixel] Event fired: Subscribe (Telegram)');
      }
    });
  }
}

/**
 * Enhanced Video Player Logic
 */
function setupVideoPlayer() {
  const video = document.getElementById('promo-video');
  const videoWrapper = document.querySelector('.video-wrapper');
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  const audioMutedIcon = document.querySelector('.audio-muted-icon');
  const audioUnmutedIcon = document.querySelector('.audio-unmuted-icon');
  const audioStatusText = document.getElementById('audio-status-text');

  const centerPlayBtn = document.getElementById('center-play-btn');
  const ctrlPlayPause = document.getElementById('ctrl-play-pause');
  const ctrlPlayIcon = document.getElementById('ctrl-play-icon');
  const ctrlMuteBtn = document.getElementById('ctrl-mute-btn');
  const ctrlSoundIcon = document.getElementById('ctrl-sound-icon');
  const ctrlFullscreenBtn = document.getElementById('ctrl-fullscreen-btn');

  const timelineWrap = document.getElementById('video-timeline-wrap');
  const timelineProgress = document.getElementById('timeline-progress');
  const timeDisplay = document.getElementById('video-time-display');

  let hasTrackedVideoPlay = false;

  if (!video) return;

  // Attempt autoplay muted (standard browser requirement)
  video.muted = true;
  video.play().catch(() => {
    updatePlayState(false);
  });

  // Toggle Audio (Mute / Unmute)
  function toggleAudio() {
    video.muted = !video.muted;
    updateAudioUI(video.muted);
  }

  function updateAudioUI(isMuted) {
    if (isMuted) {
      if (audioMutedIcon) audioMutedIcon.style.display = 'block';
      if (audioUnmutedIcon) audioUnmutedIcon.style.display = 'none';
      if (audioStatusText) audioStatusText.textContent = 'Tap For Sound';
      if (ctrlSoundIcon) {
        ctrlSoundIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
      }
    } else {
      if (audioMutedIcon) audioMutedIcon.style.display = 'none';
      if (audioUnmutedIcon) audioUnmutedIcon.style.display = 'block';
      if (audioStatusText) audioStatusText.textContent = 'Sound On';
      if (ctrlSoundIcon) {
        ctrlSoundIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
      }
    }
  }

  if (audioToggleBtn) audioToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAudio();
  });

  if (ctrlMuteBtn) ctrlMuteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAudio();
  });

  // Toggle Play / Pause
  function togglePlayPause() {
    if (video.paused || video.ended) {
      video.play();
      updatePlayState(true);
    } else {
      video.pause();
      updatePlayState(false);
    }
  }

  function updatePlayState(isPlaying) {
    const playIconCenter = document.querySelector('.center-icon.play-icon');
    const pauseIconCenter = document.querySelector('.center-icon.pause-icon');

    if (isPlaying) {
      if (videoWrapper) videoWrapper.classList.remove('is-paused');
      if (playIconCenter) playIconCenter.style.display = 'none';
      if (pauseIconCenter) pauseIconCenter.style.display = 'block';
      if (ctrlPlayIcon) {
        ctrlPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      }

      // Track Custom VideoPlay Event once
      if (!hasTrackedVideoPlay && window.fbq && SITE_CONFIG.metaPixelId) {
        hasTrackedVideoPlay = true;
        fbq('trackCustom', 'VideoPlay', {
          video_title: 'MAHADEV Educational Promo'
        });
        console.log('[Meta Pixel] Custom event fired: VideoPlay');
      }
    } else {
      if (videoWrapper) videoWrapper.classList.add('is-paused');
      if (playIconCenter) playIconCenter.style.display = 'block';
      if (pauseIconCenter) pauseIconCenter.style.display = 'none';
      if (ctrlPlayIcon) {
        ctrlPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
    }
  }

  if (videoWrapper) videoWrapper.addEventListener('click', togglePlayPause);
  if (centerPlayBtn) centerPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });
  if (ctrlPlayPause) ctrlPlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  video.addEventListener('play', () => updatePlayState(true));
  video.addEventListener('pause', () => updatePlayState(false));

  // Progress Bar & Time Update
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const progressPercent = (video.currentTime / video.duration) * 100;
    if (timelineProgress) timelineProgress.style.width = `${progressPercent}%`;
    if (timeDisplay) timeDisplay.textContent = formatTime(video.currentTime);
  });

  // Seek on timeline click
  if (timelineWrap) {
    timelineWrap.addEventListener('click', (e) => {
      const rect = timelineWrap.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (clickX / width) * video.duration;
      if (!isNaN(seekTime)) {
        video.currentTime = seekTime;
      }
    });
  }

  // Fullscreen support
  if (ctrlFullscreenBtn) {
    ctrlFullscreenBtn.addEventListener('click', () => {
      const card = document.querySelector('.video-card-container');
      if (!document.fullscreenElement) {
        if (card.requestFullscreen) {
          card.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }
}

/**
 * Format seconds to M:SS
 */
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Click Ripple Effect for Buttons
 */
function setupRippleEffects() {
  const buttons = document.querySelectorAll('.action-btn');
  buttons.forEach(button => {
    button.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('ripple');

      const ripple = this.querySelector('.ripple');
      if (ripple) {
        ripple.remove();
      }

      this.appendChild(circle);
    });
  });
}
