import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setDevicePreferences } from '../../store/slices/callSlice';
import { Settings, X } from 'lucide-react';

export function DeviceSettingsMenu({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { devices } = useSelector(state => state.call);
  
  const [audioInputs, setAudioInputs] = useState([]);
  const [audioOutputs, setAudioOutputs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
        const inputs = deviceInfos.filter(d => d.kind === 'audioinput');
        const outputs = deviceInfos.filter(d => d.kind === 'audiooutput');
        setAudioInputs(inputs);
        setAudioOutputs(outputs);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-background rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Device Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Microphone</label>
            <select 
              value={devices.audioInput}
              onChange={(e) => dispatch(setDevicePreferences({ audioInput: e.target.value }))}
              className="w-full bg-muted border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="default">Default</option>
              {audioInputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${device.deviceId.substring(0,5)}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Speaker</label>
            <select 
              value={devices.audioOutput}
              onChange={(e) => dispatch(setDevicePreferences({ audioOutput: e.target.value }))}
              className="w-full bg-muted border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="default">Default</option>
              {audioOutputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${device.deviceId.substring(0,5)}`}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={devices.noiseSuppression}
                onChange={(e) => dispatch(setDevicePreferences({ noiseSuppression: e.target.checked }))}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Noise Suppression</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={devices.echoCancellation}
                onChange={(e) => dispatch(setDevicePreferences({ echoCancellation: e.target.checked }))}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Echo Cancellation</span>
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
