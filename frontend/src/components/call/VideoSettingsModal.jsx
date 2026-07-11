import React, { useEffect, useState } from 'react';
import { X, Mic, Volume2, Video, Settings } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setDevicePreferences } from '../../store/slices/callSlice';

export function VideoSettingsModal({ onClose }) {
  const dispatch = useDispatch();
  const { devices } = useSelector(state => state.call);
  
  const [availableDevices, setAvailableDevices] = useState({
    audioinput: [],
    audiooutput: [],
    videoinput: []
  });

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const grouped = { audioinput: [], audiooutput: [], videoinput: [] };
      devices.forEach(device => {
        if (grouped[device.kind]) {
          grouped[device.kind].push(device);
        }
      });
      setAvailableDevices(grouped);
    }).catch(console.error);
  }, []);

  const handleChange = (key, value) => {
    dispatch(setDevicePreferences({ [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white">Device Settings</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Camera Settings */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Video className="w-4 h-4" /> Camera
            </label>
            <select 
              value={devices.videoInput || 'default'}
              onChange={(e) => handleChange('videoInput', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
            >
              <option value="default">Default Camera</option>
              {availableDevices.videoinput.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.substr(0,5)}`}</option>
              ))}
            </select>
          </div>

          {/* Microphone Settings */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Mic className="w-4 h-4" /> Microphone
            </label>
            <select 
              value={devices.audioInput || 'default'}
              onChange={(e) => handleChange('audioInput', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
            >
              <option value="default">Default Microphone</option>
              {availableDevices.audioinput.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.substr(0,5)}`}</option>
              ))}
            </select>
            
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/5">
              <label className="flex items-center justify-between text-sm text-white/80 cursor-pointer">
                <span>Noise Suppression</span>
                <input 
                  type="checkbox" 
                  checked={devices.noiseSuppression}
                  onChange={(e) => handleChange('noiseSuppression', e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
              </label>
              <label className="flex items-center justify-between text-sm text-white/80 cursor-pointer">
                <span>Echo Cancellation</span>
                <input 
                  type="checkbox" 
                  checked={devices.echoCancellation}
                  onChange={(e) => handleChange('echoCancellation', e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
              </label>
            </div>
          </div>

          {/* Speaker Settings */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Volume2 className="w-4 h-4" /> Speakers
            </label>
            <select 
              value={devices.audioOutput || 'default'}
              onChange={(e) => handleChange('audioOutput', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
            >
              <option value="default">Default Speaker</option>
              {availableDevices.audiooutput.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.substr(0,5)}`}</option>
              ))}
            </select>
          </div>

        </div>
        
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
