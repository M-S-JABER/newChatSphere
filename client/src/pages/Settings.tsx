import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ShieldAlert,
  Copy,
  Zap,
  Save,
  RotateCcw,
  Globe,
  Link2,
  MessageSquare,
  FileText,
  RefreshCcw,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { type ReadyMessage } from "@shared/schema";
import { type TemplateCatalogItem } from "@/types/templates";

interface DefaultInstance {
  id: string;
  name: string;
  phoneNumberId: string;
  isActive: boolean;
  source?: "custom" | "env";
  updatedAt: string | null;
  accessTokenConfigured: boolean;
}

interface DefaultInstanceResponse {
  instance: DefaultInstance | null;
}

interface WebhookConfig {
  path: string;
  updatedAt?: string | null;
}

interface TemplateCatalogResponse {
  items: TemplateCatalogItem[];
}

type RemoteTemplateItem = TemplateCatalogItem & {
  status?: string;
};

const DEFAULT_WEBHOOK_PATH = "/webhook/meta";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [instanceName, setInstanceName] = useState("Default WhatsApp Instance");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [isInstanceActive, setIsInstanceActive] = useState(true);
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [accessTokenDirty, setAccessTokenDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [webhookPath, setWebhookPath] = useState<string>(DEFAULT_WEBHOOK_PATH);
  const [webhookUpdatedAt, setWebhookUpdatedAt] = useState<string | null>(null);
  const [readyMessageName, setReadyMessageName] = useState("");
  const [readyMessageBody, setReadyMessageBody] = useState("");
  const [readyMessageError, setReadyMessageError] = useState<string | null>(null);
  const [editingReadyMessageId, setEditingReadyMessageId] = useState<string | null>(null);
  const [editingReadyMessageName, setEditingReadyMessageName] = useState("");
  const [editingReadyMessageBody, setEditingReadyMessageBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateBodyParams, setTemplateBodyParams] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateLanguage, setEditingTemplateLanguage] = useState("");
  const [editingTemplateDescription, setEditingTemplateDescription] = useState("");
  const [editingTemplateBodyParams, setEditingTemplateBodyParams] = useState("");
  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(null);
  const webhookBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const origin = window.location.origin || "";
      return origin.replace(/\/+$/, "");
    } catch {
      return "";
    }
  }, []);

  const buildWebhookUrl = useCallback(
    (path: string) => {
      if (!webhookBaseUrl) return path;
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return `${webhookBaseUrl}${normalized}`;
    },
    [webhookBaseUrl],
  );

  const resolveTemplateId = useCallback((template: TemplateCatalogItem) => {
    const name = typeof template.name === "string" ? template.name.trim() : "";
    const language = typeof template.language === "string" ? template.language.trim() : "";
    const id = typeof template.id === "string" ? template.id.trim() : "";
    if (id) return id;
    return `${name}::${language || "default"}`;
  }, []);

  const populateInstanceForm = useCallback((data: DefaultInstance | null | undefined) => {
    if (data) {
      setInstanceName(data.name || "Default WhatsApp Instance");
      setPhoneNumberId(data.phoneNumberId || "");
      setIsInstanceActive(data.isActive ?? true);
    } else {
      setInstanceName("Default WhatsApp Instance");
      setPhoneNumberId("");
      setIsInstanceActive(true);
    }

    setAccessTokenInput("");
    setAccessTokenDirty(false);
    setFormError(null);
  }, []);

  const { data: defaultInstanceData, isLoading: isInstanceLoading } = useQuery<DefaultInstanceResponse>({
    queryKey: ['/api/admin/whatsapp/default-instance'],
    queryFn: async () => {
      const res = await fetch('/api/admin/whatsapp/default-instance', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    retry: false,
  });

  const { data: webhookConfigData, isLoading: isWebhookConfigLoading } = useQuery<WebhookConfig>({
    queryKey: ['/api/admin/webhook-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/webhook-config', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      const config = payload?.config as WebhookConfig | undefined;
      return {
        path: config?.path?.trim() || DEFAULT_WEBHOOK_PATH,
        updatedAt: config?.updatedAt ?? null,
      };
    },
    retry: false,
  });

  const { data: readyMessagesData, isLoading: readyMessagesLoading } = useQuery<{ items: ReadyMessage[] }>({
    queryKey: ["/api/admin/ready-messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/ready-messages");
      return await res.json();
    },
    retry: false,
  });

  const templateCatalogQuery = useQuery<TemplateCatalogResponse>({
    queryKey: ["/api/admin/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/templates");
      return await res.json();
    },
    retry: false,
  });

  const remoteTemplatesQuery = useQuery<{ items: RemoteTemplateItem[] }>({
    queryKey: ["/api/admin/templates/remote"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/templates/remote");
      return await res.json();
    },
    retry: false,
  });

  const readyMessages = readyMessagesData?.items ?? [];
  const templateCatalog = templateCatalogQuery.data?.items ?? [];
  const remoteTemplates = remoteTemplatesQuery.data?.items ?? [];
  const templateCatalogError = templateCatalogQuery.error as Error | null;
  const remoteTemplatesError = remoteTemplatesQuery.error as Error | null;
  const templateCatalogLoading = templateCatalogQuery.isLoading;
  const remoteTemplatesLoading = remoteTemplatesQuery.isLoading;

  const instance = defaultInstanceData?.instance ?? null;

  const storedTemplates = useMemo(() => {
    return templateCatalog
      .map((template) => {
        const name = typeof template.name === "string" ? template.name.trim() : "";
        const language = typeof template.language === "string" ? template.language.trim() : "";
        if (!name) return null;
        const id = resolveTemplateId(template);
        return {
          ...template,
          id,
          name,
          language,
        };
      })
      .filter((template): template is TemplateCatalogItem & { id: string } => Boolean(template))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resolveTemplateId, templateCatalog]);

  const availableRemoteTemplates = useMemo(() => {
    return remoteTemplates
      .map((template) => {
        const name = typeof template.name === "string" ? template.name.trim() : "";
        const language = typeof template.language === "string" ? template.language.trim() : "";
        if (!name) return null;
        const id = resolveTemplateId(template);
        return {
          ...template,
          id,
          name,
          language,
        };
      })
      .filter((template): template is RemoteTemplateItem & { id: string } => Boolean(template))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [remoteTemplates, resolveTemplateId]);

  useEffect(() => {
    if (defaultInstanceData === undefined) return;
    populateInstanceForm(defaultInstanceData.instance);
  }, [defaultInstanceData, populateInstanceForm]);

  useEffect(() => {
    if (!webhookConfigData) return;
    setWebhookPath(webhookConfigData.path || DEFAULT_WEBHOOK_PATH);
    setWebhookUpdatedAt(webhookConfigData.updatedAt ?? null);
  }, [webhookConfigData]);

  const updateInstanceMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await apiRequest("PUT", "/api/admin/whatsapp/default-instance", payload);
      return (await res.json()) as DefaultInstanceResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<DefaultInstanceResponse>(['/api/admin/whatsapp/default-instance'], data);
      toast({
        title: "Instance updated",
        description: "Default WhatsApp instance settings saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update instance",
        description: error.message,
      });
    },
  });

  const updateWebhookConfigMutation = useMutation({
    mutationFn: async (payload: { path: string }) => {
      const res = await apiRequest("PUT", "/api/admin/webhook-config", payload);
      const data = await res.json();
      const config = data?.config as WebhookConfig | undefined;
      return {
        path: config?.path?.trim() || DEFAULT_WEBHOOK_PATH,
        updatedAt: config?.updatedAt ?? null,
      };
    },
    onSuccess: (config) => {
      setWebhookPath(config.path);
      setWebhookUpdatedAt(config.updatedAt ?? null);
      queryClient.setQueryData<WebhookConfig>(['/api/admin/webhook-config'], config);
      toast({
        title: "Webhook configuration updated",
        description: "Webhook endpoint updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update webhook configuration",
        description: error.message,
      });
    },
  });

  const createReadyMessageMutation = useMutation({
    mutationFn: async (payload: { name: string; body: string }) => {
      const res = await apiRequest("POST", "/api/admin/ready-messages", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ready-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ready-messages"] });
      setReadyMessageName("");
      setReadyMessageBody("");
      setReadyMessageError(null);
      toast({
        title: "Ready message added",
        description: "The quick message is now available in the template panel.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to add ready message",
        description: error.message,
      });
    },
  });

  const updateReadyMessageMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; body: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/ready-messages/${payload.id}`, {
        name: payload.name,
        body: payload.body,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ready-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ready-messages"] });
      setEditingReadyMessageId(null);
      setEditingReadyMessageName("");
      setEditingReadyMessageBody("");
      toast({
        title: "Ready message updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update ready message",
        description: error.message,
      });
    },
  });

  const deleteReadyMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/ready-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ready-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ready-messages"] });
      toast({
        title: "Ready message deleted",
        description: "The message has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete ready message",
        description: error.message,
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      language?: string;
      description?: string;
      bodyParams?: number;
      category?: string;
      components?: Array<Record<string, any>>;
    }) => {
      const res = await apiRequest("POST", "/api/admin/templates", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates/remote"] });
      setTemplateName("");
      setTemplateLanguage("");
      setTemplateDescription("");
      setTemplateBodyParams("");
      setTemplateError(null);
      toast({
        title: "Template added",
        description: "The template is now available in the template panel.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to add template",
        description: error.message,
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      updates: {
        name: string;
        language?: string;
        description?: string;
        bodyParams?: number | null;
        category?: string;
      };
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/templates/${payload.id}`, payload.updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates/remote"] });
      setEditingTemplateId(null);
      setEditingTemplateName("");
      setEditingTemplateLanguage("");
      setEditingTemplateDescription("");
      setEditingTemplateBodyParams("");
      toast({
        title: "Template updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update template",
        description: error.message,
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates/remote"] });
      toast({
        title: "Template deleted",
        description: "The template has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete template",
        description: error.message,
      });
    },
  });

  const importTemplateMutation = useMutation({
    mutationFn: async (template: RemoteTemplateItem) => {
      const payload = {
        name: template.name,
        language: template.language,
        description: template.description,
        category: template.category,
        bodyParams: template.bodyParams,
        components: template.components,
      };
      const res = await apiRequest("POST", "/api/admin/templates", payload);
      return await res.json();
    },
    onMutate: (template) => {
      setImportingTemplateId(resolveTemplateId(template));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates/remote"] });
      toast({
        title: "Template imported",
        description: "The template is now available in the template panel.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to import template",
        description: error.message,
      });
    },
    onSettled: () => {
      setImportingTemplateId(null);
    },
  });

  const handleInstanceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (defaultInstanceData === undefined || updateInstanceMutation.isPending) {
      return;
    }

    const payload: Record<string, any> = {
      name: instanceName.trim() || "Default WhatsApp Instance",
      phoneNumberId: phoneNumberId.trim(),
      isActive: isInstanceActive,
    };

    if (!payload.phoneNumberId) {
      setFormError("Phone Number ID is required.");
      return;
    }

    if (accessTokenDirty) {
      const trimmed = accessTokenInput.trim();
      if (!trimmed) {
        setFormError("Access token cannot be empty.");
        return;
      }
      payload.accessToken = trimmed;
    } else if (!instance?.accessTokenConfigured) {
      setFormError("Access token is required.");
      return;
    }

    setFormError(null);
    updateInstanceMutation.mutate(payload);
  };

  const handleInstanceReset = () => {
    if (defaultInstanceData === undefined) return;
    populateInstanceForm(defaultInstanceData.instance);
  };

  const handleWebhookConfigSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPath = webhookPath.trim();
    if (!trimmedPath) {
      toast({
        variant: "destructive",
        title: "Invalid webhook path",
        description: "Please enter a valid path that starts with /webhook.",
      });
      return;
    }

    if (!trimmedPath.startsWith("/webhook")) {
      toast({
        variant: "destructive",
        title: "Invalid webhook path",
        description: "The path must start with /webhook to ensure raw payload capture.",
      });
      return;
    }

    updateWebhookConfigMutation.mutate({ path: trimmedPath });
  };

  const handleWebhookReset = () => {
    setWebhookPath(DEFAULT_WEBHOOK_PATH);
    setWebhookUpdatedAt(null);
  };

  const handleReadyMessageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = readyMessageName.trim();
    const trimmedBody = readyMessageBody.trim();

    if (!trimmedName) {
      setReadyMessageError("Message name is required.");
      return;
    }

    if (!trimmedBody) {
      setReadyMessageError("Message body is required.");
      return;
    }

    setReadyMessageError(null);
    createReadyMessageMutation.mutate({ name: trimmedName, body: trimmedBody });
  };

  const handleStartEditReadyMessage = (message: ReadyMessage) => {
    setEditingReadyMessageId(message.id);
    setEditingReadyMessageName(message.name ?? "");
    setEditingReadyMessageBody(message.body ?? "");
  };

  const handleCancelEditReadyMessage = () => {
    setEditingReadyMessageId(null);
    setEditingReadyMessageName("");
    setEditingReadyMessageBody("");
  };

  const handleSaveReadyMessage = () => {
    if (!editingReadyMessageId) return;
    const trimmedName = editingReadyMessageName.trim();
    const trimmedBody = editingReadyMessageBody.trim();

    if (!trimmedName || !trimmedBody) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Ready message name and body are required.",
      });
      return;
    }

    updateReadyMessageMutation.mutate({
      id: editingReadyMessageId,
      name: trimmedName,
      body: trimmedBody,
    });
  };

  const handleDeleteReadyMessage = (message: ReadyMessage) => {
    const confirmed = window.confirm(`Delete "${message.name}"? This cannot be undone.`);
    if (!confirmed) return;
    deleteReadyMessageMutation.mutate(message.id);
  };

  const parseBodyParamsInput = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { value: undefined, error: null };
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { value: null, error: "Body parameters must be a non-negative number." };
    }

    return { value: Math.floor(parsed), error: null };
  }, []);

  const handleTemplateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = templateName.trim();
    const trimmedLanguage = templateLanguage.trim();
    const trimmedDescription = templateDescription.trim();

    if (!trimmedName) {
      setTemplateError("Template name is required.");
      return;
    }

    const bodyParamsResult = parseBodyParamsInput(templateBodyParams);
    if (bodyParamsResult.error) {
      setTemplateError(bodyParamsResult.error);
      return;
    }

    const payload: {
      name: string;
      language?: string;
      description?: string;
      bodyParams?: number;
    } = {
      name: trimmedName,
    };

    if (trimmedLanguage) {
      payload.language = trimmedLanguage;
    }

    if (trimmedDescription) {
      payload.description = trimmedDescription;
    }

    if (bodyParamsResult.value !== undefined) {
      payload.bodyParams = bodyParamsResult.value;
    }

    setTemplateError(null);
    createTemplateMutation.mutate(payload);
  };

  const handleStartEditTemplate = (template: TemplateCatalogItem) => {
    setEditingTemplateId(resolveTemplateId(template));
    setEditingTemplateName(template.name ?? "");
    setEditingTemplateLanguage(template.language ?? "");
    setEditingTemplateDescription(template.description ?? "");
    setEditingTemplateBodyParams(
      template.bodyParams !== undefined && template.bodyParams !== null
        ? String(template.bodyParams)
        : "",
    );
  };

  const handleCancelEditTemplate = () => {
    setEditingTemplateId(null);
    setEditingTemplateName("");
    setEditingTemplateLanguage("");
    setEditingTemplateDescription("");
    setEditingTemplateBodyParams("");
  };

  const handleSaveTemplate = () => {
    if (!editingTemplateId) return;

    const trimmedName = editingTemplateName.trim();
    const trimmedLanguage = editingTemplateLanguage.trim();
    const trimmedDescription = editingTemplateDescription.trim();

    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Template name is required.",
      });
      return;
    }

    const bodyParamsResult = parseBodyParamsInput(editingTemplateBodyParams);
    if (bodyParamsResult.error) {
      toast({
        variant: "destructive",
        title: "Invalid parameters",
        description: bodyParamsResult.error,
      });
      return;
    }

    const updates: {
      name: string;
      language?: string;
      description?: string;
      bodyParams?: number | null;
    } = {
      name: trimmedName,
      language: trimmedLanguage,
      description: trimmedDescription,
    };

    if (bodyParamsResult.value !== undefined) {
      updates.bodyParams = bodyParamsResult.value;
    }

    updateTemplateMutation.mutate({
      id: editingTemplateId,
      updates,
    });
  };

  const handleDeleteTemplate = (template: TemplateCatalogItem) => {
    const templateName = template.name ?? "template";
    const confirmed = window.confirm(`Delete "${templateName}"? This cannot be undone.`);
    if (!confirmed) return;
    const id = resolveTemplateId(template);
    deleteTemplateMutation.mutate(id);
  };

  const handleImportTemplate = (template: RemoteTemplateItem) => {
    importTemplateMutation.mutate(template);
  };

  // Redirect non-admin users to home page
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access settings.",
      });
    }
  }, [user, setLocation, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied to clipboard",
    });
  };

  // Show access denied if user is not admin
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to access this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link href="/">
                  <Button>Go Back Home</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background">
      <div className="w-full px-4 py-6 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">
                Manage your WhatsApp configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        <div className="grid gap-6">
          {/* WhatsApp Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Default WhatsApp Instance
              </CardTitle>
              <CardDescription>
                Configure the credentials used for WhatsApp Business API requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isInstanceLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading instance configuration...
                </div>
              ) : (
                <>
                  {instance ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={instance.isActive ? "default" : "destructive"}>
                          {instance.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          Source: {(instance.source ?? "custom").toUpperCase()}
                        </Badge>
                        <Badge variant={instance.accessTokenConfigured ? "default" : "destructive"}>
                          {instance.accessTokenConfigured ? "Access token stored" : "Access token missing"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {instance.updatedAt
                          ? `Last updated ${new Date(instance.updatedAt).toLocaleString()}`
                          : "Loaded from environment variables. Save changes below to override them."}
                      </p>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No default WhatsApp instance is configured yet. Add your business phone and access token to enable messaging.
                      </AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={handleInstanceSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="instance-name">Instance Name</Label>
                        <Input
                          id="instance-name"
                          value={instanceName}
                          onChange={(event) => setInstanceName(event.target.value)}
                          placeholder="Default WhatsApp Instance"
                        />
                        <p className="text-xs text-muted-foreground">
                          Friendly name shown in diagnostics and logs.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone-number-id">Phone Number ID</Label>
                        <Input
                          id="phone-number-id"
                          value={phoneNumberId}
                          onChange={(event) => setPhoneNumberId(event.target.value)}
                          placeholder="e.g. 123456789012345"
                        />
                        <p className="text-xs text-muted-foreground">
                          Copy it from <span className="font-medium">WhatsApp Manager → API Setup</span>.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access-token">Permanent Access Token</Label>
                      <Input
                        id="access-token"
                        type="password"
                        value={accessTokenInput}
                        placeholder={instance?.accessTokenConfigured ? "••••••••••" : "Enter access token"}
                        onChange={(event) => {
                          setAccessTokenInput(event.target.value);
                          setAccessTokenDirty(true);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {instance?.accessTokenConfigured
                          ? "Leave blank to keep the current token. Paste a new value to overwrite it."
                          : "Paste the permanent token with whatsapp_business_messaging scope."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Need help?</p>
                      <p className="mt-1">
                        1) Generate a permanent token in Business Manager. 2) Paste it above. 3) Use the webhook URLs below to finish Meta verification.
                      </p>
                    </div>

                    {formError && (
                      <Alert variant="destructive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          id="instance-active"
                          checked={isInstanceActive}
                          onCheckedChange={(checked) => setIsInstanceActive(checked)}
                        />
                        <Label htmlFor="instance-active" className="cursor-pointer">
                          Instance is active
                        </Label>
                      </div>
                      <div className="flex gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleInstanceReset}
                          disabled={updateInstanceMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button type="submit" disabled={updateInstanceMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          {updateInstanceMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          {/* Webhook Endpoint */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoint</CardTitle>
              <CardDescription>
                Manage the public path WhatsApp uses for verification and incoming messages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Public base URL</p>
                    <p className="text-xs text-muted-foreground">
                      {webhookBaseUrl
                        ? webhookBaseUrl
                        : "The full URL will appear once the app is running in a browser."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="md:self-end"
                  disabled={!webhookBaseUrl}
                  onClick={() => webhookBaseUrl && copyToClipboard(webhookBaseUrl)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy base URL
                </Button>
              </div>
              <form onSubmit={handleWebhookConfigSubmit} className="space-y-6">
                {isWebhookConfigLoading ? (
                  <div className="text-sm text-muted-foreground">Loading webhook endpoint…</div>
                ) : (
                  <div className="space-y-4 rounded border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Full webhook URL
                        </p>
                        <p className="font-mono text-sm text-foreground break-all">
                          {buildWebhookUrl(webhookPath)}
                        </p>
                        {webhookUpdatedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last updated {new Date(webhookUpdatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="self-start sm:self-auto"
                        onClick={() => copyToClipboard(buildWebhookUrl(webhookPath))}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Copy URL
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="webhook-path">Path</Label>
                      <Input
                        id="webhook-path"
                        value={webhookPath}
                        onChange={(event) => setWebhookPath(event.target.value)}
                        placeholder="/webhook/meta"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This endpoint handles both the GET verification challenge and incoming POST
                        messages. Keep the path under <code>/webhook/…</code> so Meta can verify
                        signatures correctly.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWebhookReset}
                    disabled={updateWebhookConfigMutation.isPending}
                  >
                    Reset to defaults
                  </Button>
                  <Button type="submit" disabled={updateWebhookConfigMutation.isPending}>
                    {updateWebhookConfigMutation.isPending ? "Saving..." : "Save webhook URL"}
                  </Button>
                </div>
              </form>

              <p className="text-xs text-muted-foreground">
                WhatsApp will perform a GET request for verification and POST messages to the same URL.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ready messages
              </CardTitle>
              <CardDescription>
                Create reusable replies that appear in the template panel for all agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleReadyMessageSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ready-message-name">Message name</Label>
                    <Input
                      id="ready-message-name"
                      value={readyMessageName}
                      onChange={(event) => setReadyMessageName(event.target.value)}
                      placeholder="e.g. Welcome note"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ready-message-body">Message body</Label>
                    <Textarea
                      id="ready-message-body"
                      value={readyMessageBody}
                      onChange={(event) => setReadyMessageBody(event.target.value)}
                      placeholder="Type the response text..."
                      rows={3}
                    />
                  </div>
                </div>
                {readyMessageError && (
                  <Alert variant="destructive">
                    <AlertDescription>{readyMessageError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={createReadyMessageMutation.isPending}>
                    {createReadyMessageMutation.isPending ? "Adding..." : "Add ready message"}
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                {readyMessagesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading ready messages...</p>
                ) : readyMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ready messages created yet.</p>
                ) : (
                  readyMessages.map((message) => {
                    const isEditing = editingReadyMessageId === message.id;
                    return (
                      <div
                        key={message.id}
                        className="rounded-lg border border-border/60 bg-background/60 p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor={`ready-message-edit-name-${message.id}`}>
                                Message name
                              </Label>
                              <Input
                                id={`ready-message-edit-name-${message.id}`}
                                value={editingReadyMessageName}
                                onChange={(event) => setEditingReadyMessageName(event.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`ready-message-edit-body-${message.id}`}>
                                Message body
                              </Label>
                              <Textarea
                                id={`ready-message-edit-body-${message.id}`}
                                value={editingReadyMessageBody}
                                onChange={(event) => setEditingReadyMessageBody(event.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelEditReadyMessage}
                                disabled={updateReadyMessageMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleSaveReadyMessage}
                                disabled={updateReadyMessageMutation.isPending}
                              >
                                {updateReadyMessageMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{message.name}</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                  {message.body}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEditReadyMessage(message)}
                                  disabled={deleteReadyMessageMutation.isPending}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteReadyMessage(message)}
                                  disabled={deleteReadyMessageMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>
                Manage the templates shown in the template panel and import from your WhatsApp account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template name</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      placeholder="e.g. order_update"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-language">Language</Label>
                    <Input
                      id="template-language"
                      value={templateLanguage}
                      onChange={(event) => setTemplateLanguage(event.target.value)}
                      placeholder="e.g. ar or en_US"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-body-params">Body parameters</Label>
                    <Input
                      id="template-body-params"
                      type="number"
                      min="0"
                      value={templateBodyParams}
                      onChange={(event) => setTemplateBodyParams(event.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of body parameters like {"{1}"} and {"{2}"}. Leave blank to auto-detect.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={templateDescription}
                      onChange={(event) => setTemplateDescription(event.target.value)}
                      placeholder="Optional description for agents"
                      rows={2}
                    />
                  </div>
                </div>
                {templateError && (
                  <Alert variant="destructive">
                    <AlertDescription>{templateError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? "Adding..." : "Add template"}
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Saved templates</p>
                  <p className="text-xs text-muted-foreground">
                    These templates appear in the template panel for agents.
                  </p>
                </div>

                {templateCatalogError && (
                  <Alert variant="destructive">
                    <AlertDescription>{templateCatalogError.message}</AlertDescription>
                  </Alert>
                )}

                {templateCatalogLoading ? (
                  <p className="text-sm text-muted-foreground">Loading templates...</p>
                ) : storedTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates added yet.</p>
                ) : (
                  storedTemplates.map((template) => {
                    const isEditing = editingTemplateId === template.id;
                    return (
                      <div
                        key={template.id}
                        className="rounded-lg border border-border/60 bg-background/60 p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label htmlFor={`template-edit-name-${template.id}`}>
                                  Template name
                                </Label>
                                <Input
                                  id={`template-edit-name-${template.id}`}
                                  value={editingTemplateName}
                                  onChange={(event) => setEditingTemplateName(event.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`template-edit-language-${template.id}`}>
                                  Language
                                </Label>
                                <Input
                                  id={`template-edit-language-${template.id}`}
                                  value={editingTemplateLanguage}
                                  onChange={(event) => setEditingTemplateLanguage(event.target.value)}
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label htmlFor={`template-edit-params-${template.id}`}>
                                  Body parameters
                                </Label>
                                <Input
                                  id={`template-edit-params-${template.id}`}
                                  type="number"
                                  min="0"
                                  value={editingTemplateBodyParams}
                                  onChange={(event) => setEditingTemplateBodyParams(event.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`template-edit-description-${template.id}`}>
                                  Description
                                </Label>
                                <Textarea
                                  id={`template-edit-description-${template.id}`}
                                  value={editingTemplateDescription}
                                  onChange={(event) => setEditingTemplateDescription(event.target.value)}
                                  rows={2}
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelEditTemplate}
                                disabled={updateTemplateMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleSaveTemplate}
                                disabled={updateTemplateMutation.isPending}
                              >
                                {updateTemplateMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {template.language && (
                                    <Badge variant="outline">{template.language}</Badge>
                                  )}
                                  {typeof template.bodyParams === "number" && (
                                    <span>Params: {template.bodyParams}</span>
                                  )}
                                  {template.category && (
                                    <Badge variant="outline">{template.category}</Badge>
                                  )}
                                </div>
                                {template.description && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEditTemplate(template)}
                                  disabled={deleteTemplateMutation.isPending}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteTemplate(template)}
                                  disabled={deleteTemplateMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Templates on your WhatsApp account
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Not added to this workspace yet.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => remoteTemplatesQuery.refetch()}
                    disabled={remoteTemplatesLoading}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                {remoteTemplatesError && (
                  <Alert variant="destructive">
                    <AlertDescription>{remoteTemplatesError.message}</AlertDescription>
                  </Alert>
                )}

                {remoteTemplatesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading account templates...</p>
                ) : availableRemoteTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No additional templates found.</p>
                ) : (
                  availableRemoteTemplates.map((template) => {
                    const isImporting = importingTemplateId === template.id;
                    return (
                      <div
                        key={template.id}
                        className="rounded-lg border border-border/60 bg-background/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{template.name}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {template.language && (
                                <Badge variant="outline">{template.language}</Badge>
                              )}
                              {template.status && (
                                <Badge variant="secondary">{template.status.toUpperCase()}</Badge>
                              )}
                              {template.category && (
                                <Badge variant="outline">{template.category}</Badge>
                              )}
                              {typeof template.bodyParams === "number" && (
                                <span>Params: {template.bodyParams}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleImportTemplate(template)}
                            disabled={importTemplateMutation.isPending || isImporting}
                          >
                            {isImporting ? "Adding..." : "Add template"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
