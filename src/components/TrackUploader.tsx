import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TrackUploaderProps {
  onUploadComplete: () => void;
}

export function TrackUploader({ onUploadComplete }: TrackUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [trackName, setTrackName] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const audioFile = acceptedFiles[0];
    if (audioFile) {
      setFile(audioFile);
      if (!trackName) {
        setTrackName(audioFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [trackName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file || !trackName.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select a file and enter a track name.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tracks')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tracks')
        .getPublicUrl(fileName);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('tracks')
        .insert({
          name: trackName.trim(),
          file_url: publicUrl,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Track uploaded!',
        description: `"${trackName}" has been added to the library.`,
      });

      setFile(null);
      setTrackName('');
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload track.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setTrackName('');
  };

  return (
    <div className="ambient-card rounded-xl p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Add New Track
      </h3>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          file && "border-primary/50 bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <Music className="w-8 h-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {isDragActive
                ? "Drop your audio file here..."
                : "Drag & drop an audio file, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              MP3, WAV, OGG, M4A, FLAC supported
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Track Name
            </label>
            <Input
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="Enter track name..."
              className="bg-input border-border"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !trackName.trim()}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Add Track
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
