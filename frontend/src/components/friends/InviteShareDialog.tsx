'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Copy,
  Check,
  Link2,
  Share2,
  Loader2,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildInviteUrl } from '@/lib/appUrl';
import { getErrorMessage } from '@/lib/errorMessage';
import type { InviteLink } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function InviteShareDialog({ open, onOpenChange }: Props) {
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiresInHours, setExpiresInHours] = useState(72);

  useEffect(() => {
    if (open) {
      fetchLinks();
    }
  }, [open]);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/invite/my-links');
      setInviteLinks(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const createLink = async () => {
    setIsCreating(true);
    try {
      const { data } = await api.post('/invite/create', { expiresInHours });
      setInviteLinks((prev) => [data, ...prev]);
      toast.success('Invite link created!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create invite link'));
    } finally {
      setIsCreating(false);
    }
  };

  const deactivateLink = async (linkId: string) => {
    try {
      await api.delete(`/invite/${linkId}`);
      setInviteLinks((prev) => prev.filter((l) => l._id !== linkId));
      toast.success('Invite link deactivated');
    } catch {
      toast.error('Failed to deactivate link');
    }
  };

  const getInviteUrl = (code: string) => {
    return buildInviteUrl(code);
  };

  const copyToClipboard = async (code: string, linkId: string) => {
    const url = getInviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(linkId);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareVia = (platform: string, code: string) => {
    const url = encodeURIComponent(getInviteUrl(code));
    const text = encodeURIComponent('Hey! Join my secure chat using this invite link:');

    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct URL sharing, copy to clipboard instead
        navigator.clipboard.writeText(
          `Hey! Join my secure chat using this invite link: ${getInviteUrl(code)}`
        );
        toast.success(
          'Link copied! Paste it in your Instagram DM or story.'
        );
        return;
      case 'sms':
        shareUrl = `sms:?body=${text}%20${url}`;
        break;
      case 'email':
        const emailSubject = 'Join my secure chat';
        const emailBody = `Hi,\n\nUse this invite link to join my secure chat:\n${getInviteUrl(code)}\n\nSee you there.`;
        shareUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
          emailSubject
        )}&body=${encodeURIComponent(emailBody)}`;
        break;
    }

    if (shareUrl) {
      if (platform === 'email') {
        // Try to open Gmail in new tab
        const gmailWindow = window.open(shareUrl, '_blank', 'noopener,noreferrer');
        // If popup blocked, fallback to mailto:
        if (!gmailWindow || gmailWindow.closed || typeof gmailWindow.closed === 'undefined') {
          const mailtoUrl = `mailto:?subject=${encodeURIComponent(
            'Join my secure chat'
          )}&body=${encodeURIComponent(
            `Hi,\n\nUse this invite link to join my secure chat:\n${getInviteUrl(code)}\n\nSee you there.`
          )}`;
          window.location.href = mailtoUrl;
        }
      } else {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const useNativeShare = async (code: string) => {
    const url = getInviteUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my secure chat',
          text: 'Use this invite link to connect with me.',
          url,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const formatExpiry = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Expires soon';
    if (diffHours < 24) return `${diffHours}h left`;
    return `${Math.floor(diffHours / 24)}d left`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-red-500" />
            Invite Friends
          </DialogTitle>
          <DialogDescription>
            Create an invite link and share it via WhatsApp, Facebook,
            Instagram, SMS, or any platform. Friends who click the link become
            your friend instantly!
          </DialogDescription>
        </DialogHeader>

        {/* Create new link */}
        <div className="flex items-center gap-2">
          <select
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
            <option value={720}>30 days</option>
          </select>
          <Button
            onClick={createLink}
            disabled={isCreating}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Generate Invite Link
          </Button>
        </div>

        {/* Links list */}
        <ScrollArea className="max-h-72">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : inviteLinks.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No invite links yet. Generate one to share!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inviteLinks.map((link) => (
                <div
                  key={link._id}
                  className="rounded-xl border bg-card p-3 space-y-2"
                >
                  {/* Link URL + copy */}
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={getInviteUrl(link.code)}
                      className="text-xs font-mono h-9"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={() => copyToClipboard(link.code, link._id)}
                    >
                      {copiedId === link._id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {link.uses} use{link.uses !== 1 ? 's' : ''} ·{' '}
                      {formatExpiry(link.expiresAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => deactivateLink(link._id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>

                  {/* Share buttons */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs gap-1.5 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10"
                      onClick={() => shareVia('whatsapp', link.code)}
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs gap-1.5 text-[#1877F2] border-[#1877F2]/30 hover:bg-[#1877F2]/10"
                      onClick={() => shareVia('facebook', link.code)}
                    >
                      <FacebookIcon className="h-3.5 w-3.5" />
                      Facebook
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs gap-1.5 text-[#E4405F] border-[#E4405F]/30 hover:bg-[#E4405F]/10"
                      onClick={() => shareVia('instagram', link.code)}
                    >
                      <InstagramIcon className="h-3.5 w-3.5" />
                      Instagram
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs gap-1.5"
                      onClick={() => shareVia('sms', link.code)}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      SMS
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs gap-1.5"
                      onClick={() => shareVia('email', link.code)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </Button>
                    {typeof navigator !== 'undefined' &&
                      'share' in navigator && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1 text-xs gap-1.5"
                          onClick={() => useNativeShare(link.code)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          More
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
