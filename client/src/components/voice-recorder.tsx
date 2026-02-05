import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Send, Square, Play, Pause, Volume2 } from "lucide-react";

interface VoiceRecorderProps {
  onVoiceMessage: (audioBlob: Blob, duration: number) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({ 
  onVoiceMessage, 
  isRecording, 
  onStartRecording, 
  onStopRecording,
  disabled = false 
}: VoiceRecorderProps) {
  const { toast } = useToast();
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      onStartRecording();
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [disabled, onStartRecording, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      onStopRecording();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [onStopRecording]);

  const playPreview = useCallback(() => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
      setIsPlaying(true);
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [audioBlob, isPlaying]);

  const sendVoiceMessage = useCallback(() => {
    if (audioBlob) {
      onVoiceMessage(audioBlob, recordingTime);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  }, [audioBlob, recordingTime, onVoiceMessage]);

  const cancelRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob && !isRecording) {
    // Preview mode
    return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-200 dark:border-green-800">
        <Button
          size="sm"
          variant="ghost"
          onClick={playPreview}
          className="text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/30"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <Volume2 className="h-3 w-3" />
          <span>{formatTime(recordingTime)}</span>
        </div>
        
        <div className="flex-1" />
        
        <Button
          size="sm"
          variant="ghost"
          onClick={cancelRecording}
          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <MicOff className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={sendVoiceMessage}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isRecording) {
    // Recording mode
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">
            Recording: {formatTime(recordingTime)}
          </span>
        </div>
        
        <div className="flex-1" />
        
        <Button
          size="sm"
          onClick={stopRecording}
          variant="ghost"
          className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Default mic button
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled}
      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2"
      title="Record voice message"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}

interface VoiceMessageProps {
  voiceUrl: string;
  duration: number;
  senderType: 'customer' | 'milkman' | 'system';
  timestamp: Date;
}

export function VoiceMessage({ voiceUrl, duration, senderType, timestamp }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(voiceUrl);
      audioRef.current = audio;
      
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      audio.onerror = () => {
        console.error('Error playing voice message');
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [voiceUrl, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg max-w-xs ${
      senderType === 'customer' 
        ? 'bg-blue-500 text-white ml-auto' 
        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
    }`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={togglePlayback}
        className={`${
          senderType === 'customer'
            ? 'text-white hover:bg-blue-600'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        } p-1`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      
      <div className="flex items-center gap-1">
        <Volume2 className="h-3 w-3" />
        <span className="text-xs">
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
      
      {/* Simple waveform visualization */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className={`w-0.5 bg-current rounded-full ${
              isPlaying && currentTime > (duration * i) / 8 ? 'opacity-100' : 'opacity-50'
            }`}
            style={{ height: `${Math.random() * 16 + 8}px` }}
          />
        ))}
      </div>
      
      <div className="text-xs opacity-70">
        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}