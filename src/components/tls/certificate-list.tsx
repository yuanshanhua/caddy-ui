/**
 * Certificate list component — displays auto-managed and loaded certificates.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TlsCertificates } from "@/types/tls-app";
import { Globe, KeyRound, ShieldCheck } from "lucide-react";

interface CertificateListProps {
  certificates?: TlsCertificates;
}

export function CertificateList({ certificates }: CertificateListProps) {
  const automatedDomains = certificates?.automate ?? [];
  const loadedFiles = certificates?.load_files ?? [];
  const loadedPem = certificates?.load_pem ?? [];
  const loadedFolders = certificates?.load_folders ?? [];

  const hasAnyCertificates =
    automatedDomains.length > 0 ||
    loadedFiles.length > 0 ||
    loadedPem.length > 0 ||
    loadedFolders.length > 0;

  if (!hasAnyCertificates) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No Certificates Configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Caddy automatically manages certificates for domains configured in HTTP servers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-managed domains */}
      {automatedDomains.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              Automated Certificates
            </CardTitle>
            <CardDescription>
              Domains with automatic certificate management via ACME.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {automatedDomains.map((domain) => (
                <div key={domain} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono">{domain}</span>
                  <Badge variant="success" className="text-xs">
                    auto
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loaded from files */}
      {loadedFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-500" />
              Loaded from Files
            </CardTitle>
            <CardDescription>Certificates loaded from certificate/key file pairs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loadedFiles.map((file) => (
                <div
                  key={file.certificate}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-mono">{file.certificate}</p>
                    <p className="text-xs text-muted-foreground">Key: {file.key}</p>
                  </div>
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex gap-1">
                      {file.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loaded from PEM */}
      {loadedPem.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-500" />
              Loaded from PEM
            </CardTitle>
            <CardDescription>Certificates loaded from inline PEM data.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {loadedPem.length} PEM certificate(s) loaded.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loaded from folders */}
      {loadedFolders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-orange-500" />
              Certificate Folders
            </CardTitle>
            <CardDescription>Directories scanned for certificate files.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {loadedFolders.map((folder) => (
                <p key={folder} className="text-sm font-mono">
                  {folder}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
