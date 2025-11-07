import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CertificateUploadProps {
  userType: 'institution' | 'investor';
  currentCertificateUrl?: string | null;
  onUploadSuccess?: () => void;
}

export const CertificateUpload = ({ userType, currentCertificateUrl, onUploadSuccess }: CertificateUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF, JPG, or PNG file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication error',
          description: 'Please log in to upload a certificate',
          variant: 'destructive',
        });
        return;
      }

      // Create file path: user_id/certificate_timestamp.ext
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/certificate_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Store the file path (not URL) since bucket is private
      // Update the appropriate table with file path
      const table = userType === 'institution' ? 'institutions' : 'investors';
      const { error: updateError } = await supabase
        .from(table)
        .update({ certificate_url: fileName })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Certificate uploaded successfully',
        description: 'Your certificate has been uploaded and is pending verification',
      });

      setFile(null);
      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Error uploading certificate:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload certificate',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove from database
      const table = userType === 'institution' ? 'institutions' : 'investors';
      const { error } = await supabase
        .from(table)
        .update({ certificate_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Certificate removed',
        description: 'Your certificate has been removed',
      });

      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Error removing certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove certificate',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Verification Certificate
        </CardTitle>
        <CardDescription>
          Upload your official {userType} certificate for verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentCertificateUrl ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Certificate uploaded and pending verification</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please upload your certificate to complete verification
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              id="certificate-upload"
              disabled={uploading || !!currentCertificateUrl}
            />
            <label
              htmlFor="certificate-upload"
              className={`flex-1 ${currentCertificateUrl ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {file ? file.name : 'Choose a file or drag it here'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, or PNG (max 5MB)
                  </p>
                </div>
              </div>
            </label>
          </div>

          {file && !currentCertificateUrl && (
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : 'Upload Certificate'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {currentCertificateUrl && (
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              const { data } = await supabase.storage
                .from('certificates')
                .createSignedUrl(currentCertificateUrl, 60);
              if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
              }
            }}
          >
            View Uploaded Certificate
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
