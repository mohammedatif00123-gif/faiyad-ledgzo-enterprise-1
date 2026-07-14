import { useState, useEffect, useRef } from 'react';

export function useSpeechDetection(stream, threshold = 0.05) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) {
      setIsSpeaking(false);
      return;
    }

    let audioContext;
    let analyser;
    let microphone;
    let active = true;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      
      microphone = audioContext.createMediaStreamSource(stream);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);

      const array = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!active) return;
        analyser.getByteFrequencyData(array);
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += (array[i]);
        }
        const average = values / length;
        const volume = average / 255;
        
        setIsSpeaking(volume > threshold);
        animationRef.current = requestAnimationFrame(checkVolume);
      };
      
      checkVolume();

    } catch (err) {
      console.error('Error in speech detection:', err);
    }

    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analyser) analyser.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, threshold]);

  return isSpeaking;
}
