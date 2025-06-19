"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Shield,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ConsentRecord {
  id: string;
  consentType: string;
  status: string;
  grantedAt?: string;
  expiresAt?: string;
}

interface PrivacyRequest {
  id: string;
  type: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  description?: string;
}

export function PrivacyDashboard({ userId }: { userId: string }) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    try {
      // Load consent records
      const consentsResponse = await fetch(
        `/api/privacy/consents?userId=${userId}`,
      );
      if (consentsResponse.ok) {
        const consentsData = await consentsResponse.json();
        setConsents(consentsData);
      }

      // Load privacy requests
      const requestsResponse = await fetch(
        `/api/privacy/requests?userId=${userId}`,
      );
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRequests(requestsData);
      }
    } catch (error) {
      console.error("Failed to load privacy data:", error);
      toast.error("Failed to load privacy information.");
    }
  };

  const createPrivacyRequest = async (type: string, description?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/privacy/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type,
          description,
        }),
      });

      if (response.ok) {
        await loadPrivacyData();
        toast.success(
          `Your ${type} request has been submitted and will be processed within 30 days.`,
        );
      } else {
        throw new Error("Failed to create request");
      }
    } catch (error) {
      console.error("Failed to create privacy request:", error);
      toast.error("Failed to submit privacy request.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMyData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/privacy/export?userId=${userId}&format=json`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `kissa-data-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Your data has been downloaded successfully.");
      } else {
        throw new Error("Failed to export data");
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      toast.error("Failed to export your data.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMyAccount = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/privacy/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success(
          "Your account deletion request has been submitted. You will receive a confirmation email.",
        );
        setShowDeleteConfirm(false);
      } else {
        throw new Error("Failed to delete account");
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to process account deletion.");
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawConsent = async (consentType: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/privacy/withdraw-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          consentType,
        }),
      });

      if (response.ok) {
        await loadPrivacyData();
        toast.success(`Your consent for ${consentType} has been withdrawn.`);
      } else {
        throw new Error("Failed to withdraw consent");
      }
    } catch (error) {
      console.error("Failed to withdraw consent:", error);
      toast.error("Failed to withdraw consent.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "granted":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "rejected":
      case "denied":
      case "withdrawn":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatConsentType = (type: string): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatRequestType = (type: string): string => {
    const typeMap: Record<string, string> = {
      access: "Data Access",
      rectification: "Data Correction",
      erasure: "Data Deletion",
      portability: "Data Export",
      restriction: "Processing Restriction",
      objection: "Processing Objection",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Privacy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Data Protection
          </CardTitle>
          <CardDescription>
            Manage your privacy settings and exercise your data protection
            rights under GDPR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <UserCheck className="w-4 h-4" />
            <AlertDescription>
              Your privacy is important to us. You have full control over your
              personal data and can exercise your rights at any time. All
              requests are processed within 30 days as required by law.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data Protection Rights</CardTitle>
          <CardDescription>
            Under GDPR, you have several rights regarding your personal data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start space-y-2"
              onClick={() => createPrivacyRequest("access")}
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Access My Data</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                See what personal data we have about you
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start space-y-2"
              onClick={downloadMyData}
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="font-medium">Download My Data</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                Get a copy of your data in a portable format
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start space-y-2"
              onClick={() => createPrivacyRequest("rectification")}
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                <span className="font-medium">Correct My Data</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                Request correction of inaccurate data
              </span>
            </Button>

            <Dialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2 border-red-200 text-red-700 hover:bg-red-50"
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span className="font-medium">Delete My Account</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    Permanently delete your account and data
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Your Account</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data from our servers.
                  </DialogDescription>
                </DialogHeader>

                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Some data may be retained for legal compliance purposes for
                    up to 7 years. You will receive a confirmation email with
                    details about what data is retained.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={deleteMyAccount}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Delete Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Management</CardTitle>
          <CardDescription>
            View and manage your consent preferences for different types of data
            processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No consent records found.
            </p>
          ) : (
            <div className="space-y-4">
              {consents.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(consent.status)}
                      <span className="font-medium">
                        {formatConsentType(consent.consentType)}
                      </span>
                      <Badge
                        variant={
                          consent.status === "granted" ? "default" : "secondary"
                        }
                      >
                        {consent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {consent.grantedAt &&
                        `Granted: ${new Date(consent.grantedAt).toLocaleDateString()}`}
                      {consent.expiresAt &&
                        ` • Expires: ${new Date(consent.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {consent.status === "granted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => withdrawConsent(consent.consentType)}
                      disabled={isLoading}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Request History</CardTitle>
          <CardDescription>
            Track the status of your data protection requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No privacy requests found.
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="font-medium">
                        {formatRequestType(request.type)}
                      </span>
                      <Badge
                        variant={
                          request.status === "completed"
                            ? "default"
                            : request.status === "in_progress"
                              ? "secondary"
                              : request.status === "rejected"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {request.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {request.description}
                    </p>
                  )}

                  <div className="text-sm text-muted-foreground">
                    {request.processedAt && (
                      <span>
                        Processed:{" "}
                        {new Date(request.processedAt).toLocaleDateString()}
                      </span>
                    )}
                    {request.completedAt && (
                      <span>
                        {" "}
                        • Completed:{" "}
                        {new Date(request.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Legal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/privacy-policy"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <h4 className="font-medium mb-1">Privacy Policy</h4>
              <p className="text-sm text-muted-foreground">
                How we collect, use, and protect your data
              </p>
            </a>

            <a
              href="/cookie-policy"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <h4 className="font-medium mb-1">Cookie Policy</h4>
              <p className="text-sm text-muted-foreground">
                Information about cookies and tracking
              </p>
            </a>

            <a
              href="/terms-of-service"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <h4 className="font-medium mb-1">Terms of Service</h4>
              <p className="text-sm text-muted-foreground">
                Legal terms and conditions
              </p>
            </a>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Data Protection Officer:</strong> privacy@kissa.app
            </p>
            <p>
              <strong>Supervisory Authority:</strong> Your local data protection
              authority
            </p>
            <p className="mt-2">
              If you have concerns about how we handle your data, you have the
              right to lodge a complaint with your local data protection
              authority.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
