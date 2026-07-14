import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture,
  RotateCcw,
  SkipForward,
  SkipBack,
  Video
} from 'lucide-react';

const VideoPlayer = ({ 
  videoUrl, 
  title, 
  onProgressUpdate, 
  onVideoEnd,
  lessonId,
  autoPlayNext = false 
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Helper to extract YouTube video ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper to extract Vimeo video ID
  const getVimeoId = (url) => {
    if (!url) return null;
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[3] : null;
  };

  const ytId = getYouTubeId(videoUrl);
  const vimeoId = getVimeoId(videoUrl);
  const isEmbedVideo = !!(ytId || vimeoId);

  useEffect(() => {
    if (isEmbedVideo) return; // Standard player logic only for direct files
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onProgressUpdate) {
        onProgressUpdate({
          currentTime: video.currentTime,
          duration: video.duration,
          percentage: (video.currentTime / video.duration) * 100
        });
      }
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onVideoEnd) {
        onVideoEnd(lessonId);
      }
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onProgressUpdate, lessonId, onVideoEnd, isEmbedVideo, videoUrl]);

  useEffect(() => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate, isEmbedVideo]);

  useEffect(() => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    if (video) video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, isEmbedVideo]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e) => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    const seekTime = (e.target.value / 100) * duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const togglePictureInPicture = async () => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  };

  const skipForward = (seconds = 10) => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    video.currentTime = Math.min(video.currentTime + seconds, duration);
  };

  const skipBackward = (seconds = 10) => {
    if (isEmbedVideo) return;
    const video = videoRef.current;
    video.currentTime = Math.max(video.currentTime - seconds, 0);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
  };

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ── 1. IF YOUTUBE / VIMEO EMBED DETECTED ──
  if (isEmbedVideo) {
    let embedUrl = '';
    if (ytId) {
      // modestbranding=1 rel=0 and playlist=ytId disables related videos from external channels and hides logo
      embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&showinfo=0&playlist=${ytId}`;
    } else if (vimeoId) {
      embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }

    return (
      <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white border-opacity-5">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
        {/* Invisible overlay over the bottom right corner to block clicks on the YouTube logo */}
        {ytId && (
          <div 
            className="absolute bottom-0 right-0 w-24 h-12 z-20 bg-transparent cursor-default"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        )}
      </div>
    );
  }

  // ── 2. HTML5 NATIVE PLAYER WITH PREMIUM STYLES (for Cloudinary / Local storage files) ──
  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video border border-white border-opacity-5"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && showControls) {
          setShowControls(false);
        }
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />
      
      {/* Title Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/85 to-transparent">
        <h3 className="text-white font-extrabold text-sm tracking-wide">{title}</h3>
      </div>
      
      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/85 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress seek bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            // We use bg-white bg-opacity-20 to avoid index.css glob class matching overrides
            value={(currentTime / duration) * 100 || 0}
            onChange={handleSeek}
            className="w-full h-1 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer outline-none transition-all hover:h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF7043] hover:[&::-webkit-slider-thumb]:scale-110"
          />
          <div className="flex justify-between text-[11px] font-bold text-slate-300 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Controls action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white fill-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-white" />
              )}
            </button>
            
            {/* Skip Back */}
            <button
              onClick={() => skipBackward()}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
            >
              <SkipBack className="w-4 h-4 text-white" />
            </button>
            
            {/* Skip Forward */}
            <button
              onClick={() => skipForward()}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
            >
              <SkipForward className="w-4 h-4 text-white" />
            </button>
            
            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Playback speed selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1 bg-white bg-opacity-10 text-white text-[10px] font-extrabold rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors outline-none"
              >
                {playbackRate}x
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-slate-900/95 border border-white border-opacity-5 rounded-2xl shadow-xl py-2 min-w-28 z-50">
                  {playbackRates.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full px-4 py-2 text-[10px] font-bold text-left hover:bg-white hover:bg-opacity-5 transition-colors ${
                        playbackRate === rate
                          ? 'text-[#FF7043]'
                          : 'text-gray-300'
                      }`}
                    >
                      {rate}x speed
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Picture in Picture */}
            <button
              onClick={togglePictureInPicture}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-4 h-4 text-white" />
            </button>
            
            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-white" />
            </button>
            
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors outline-none"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-white" />
              ) : (
                <Maximize className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Settings popup panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-6 bg-slate-950/95 border border-white border-opacity-5 rounded-2xl shadow-xl p-4 min-w-40 z-50 text-[10px] font-bold">
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">Quality</label>
              <select className="w-full bg-white bg-opacity-5 border border-white border-opacity-5 text-white rounded-lg px-2.5 py-1.5 outline-none">
                <option>Auto</option>
                <option>1080p</option>
                <option>720p</option>
                <option>480p</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Center Big Play Button Overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/10 group outline-none"
        >
          <div className="w-16 h-16 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </button>
      )}
    </div>
  );
};

export default VideoPlayer;