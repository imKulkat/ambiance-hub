import { useState, useEffect, useCallback } from 'react';
import { AudioTrack } from './AudioTrack';
import { TrackUploader } from './TrackUploader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Music2 } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  file_url: string;
}

interface TrackSettings {
  [trackId: string]: {
    volume: number;
    enabled: boolean;
  };
}

export function AmbiencePlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackSettings, setTrackSettings] = useState<TrackSettings>({});
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchTracks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tracks.',
        variant: 'destructive',
      });
      return;
    }

    setTracks(data || []);
    setLoading(false);
  }, [toast]);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('track_settings')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching preferences:', error);
      return;
    }

    if (data?.track_settings) {
      setTrackSettings(data.track_settings as TrackSettings);
    }
  }, [user]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user, fetchPreferences]);

  const savePreferences = useCallback(async (newSettings: TrackSettings) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        track_settings: newSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving preferences:', error);
    }
  }, [user]);

  const handleVolumeChange = useCallback((id: string, volume: number) => {
    setTrackSettings((prev) => {
      const newSettings = {
        ...prev,
        [id]: { ...prev[id], volume, enabled: prev[id]?.enabled ?? true },
      };
      savePreferences(newSettings);
      return newSettings;
    });
  }, [savePreferences]);

  const handleEnabledChange = useCallback((id: string, enabled: boolean) => {
    setTrackSettings((prev) => {
      const newSettings = {
        ...prev,
        [id]: { ...prev[id], enabled, volume: prev[id]?.volume ?? 50 },
      };
      savePreferences(newSettings);
      return newSettings;
    });
  }, [savePreferences]);

  const handleDeleteTrack = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Track deleted',
        description: 'The track has been removed.',
      });

      fetchTracks();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete track.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isAdmin && (
        <TrackUploader onUploadComplete={fetchTracks} />
      )}

      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <Music2 className="w-5 h-5 text-primary" />
          Sound Library
        </h2>

        {tracks.length === 0 ? (
          <div className="ambient-card rounded-xl p-12 text-center">
            <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tracks available yet.
              {isAdmin && " Upload some ambient sounds to get started!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <AudioTrack
                key={track.id}
                id={track.id}
                name={track.name}
                fileUrl={track.file_url}
                initialVolume={trackSettings[track.id]?.volume ?? 50}
                initialEnabled={trackSettings[track.id]?.enabled ?? false}
                onVolumeChange={handleVolumeChange}
                onEnabledChange={handleEnabledChange}
                onDelete={handleDeleteTrack}
                canDelete={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
