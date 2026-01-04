import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioTrackProps {
  id: string;
  name: string;
  fileUrl: string;
  initialVolume?: number;
  initialEnabled?: boolean;
  onVolumeChange?: (id: string, volume: number) => void;
  onEnabledChange?: (id: string, enabled: boolean) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function AudioTrack({
  id,
  name,
  fileUrl,
  initialVolume = 50,
  initialEnabled = true,
  onVolumeChange,
  onEnabledChange,
  onDelete,
  canDelete = false,
}: AudioTrackProps) {
  const [volume, setVolume] = useState(initialVolume);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(fileUrl);
    audio.loop = true;
    audio.volume = volume / 100;
    audioRef.current = audio;

    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [fileUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
    onVolumeChange?.(id, volume);
  }, [volume, id, onVolumeChange]);

  useEffect(() => {
    if (audioRef.current) {
      if (enabled && volume > 0) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
    onEnabledChange?.(id, enabled);
  }, [enabled, volume, id, onEnabledChange]);

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
  };

  return (
    <div
      className={cn(
        "ambient-card rounded-lg p-4 transition-all duration-300",
        enabled && isPlaying && "ring-1 ring-primary/30 ambient-glow"
      )}
    >
      <div className="flex items-center gap-4">
        <Checkbox
          id={`track-${id}`}
          checked={enabled}
          onCheckedChange={handleEnabledChange}
          className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`track-${id}`}
            className={cn(
              "block font-display text-sm font-medium truncate cursor-pointer transition-colors",
              enabled ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {name}
          </label>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {volume === 0 || !enabled ? (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Volume2 className={cn(
              "w-4 h-4 transition-colors",
              isPlaying ? "text-primary" : "text-muted-foreground"
            )} />
          )}
          
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            disabled={!enabled}
            className="w-24"
          />
          
          <span className="text-xs text-muted-foreground w-8 text-right">
            {volume}%
          </span>
          
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
