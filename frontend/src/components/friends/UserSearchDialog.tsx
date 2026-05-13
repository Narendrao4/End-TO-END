'use client';

import { useState, useMemo } from 'react';
import api from '@/lib/api';
import { useFriendStore } from '@/store/friendStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  UserPlus,
  Loader2,
  Phone,
  Mail,
  Send,
  MessageCircle,
  Link2,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildInviteUrl, getAppBaseUrl } from '@/lib/appUrl';
import type { User } from '@/types';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Detection helpers
const isValidPhone = (q: string) => /^\+?\d[\d\s\-()]{8,14}\d$/.test(q.replace(/\s/g, ''));
const cleanPhone = (q: string) => q.replace(/[\s\-()]/g, '');
const isValidEmail = (q: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q.trim());

export function UserSearchDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSent, setDirectSent] = useState<string | null>(null);
  const [showIntegration, setShowIntegration] = useState<'whatsapp' | 'instagram' | null>(null);
  const { sendRequest } = useFriendStore();

  const trimmedQuery = query.trim();
  const detectedPhone = useMemo(() => isValidPhone(trimmedQuery), [trimmedQuery]);
  const detectedEmail = useMemo(() => isValidEmail(trimmedQuery), [trimmedQuery]);

  const handleSearch = async () => {
    if (!trimmedQuery) return;
    setIsSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(trimmedQuery)}`);
      setResults(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    try {
      await sendRequest(userId);
      toast.success('Friend request sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    } finally {
      setSendingTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Direct send: create invite link and open the platform
  const handleDirectSend = async (method: 'sms' | 'whatsapp' | 'email') => {
    const target = trimmedQuery;
    setIsSendingDirect(true);
    try {
      const { data } = await api.post('/invite/send-direct', {
        target,
        method,
        origin: getAppBaseUrl(),
      });
      const code = data.link.code;
      const inviteUrl = buildInviteUrl(code);
      const text = encodeURIComponent(
        `Hey! Join my secure chat using this invite link: ${inviteUrl}`
      );

      if (method === 'sms') {
        // SMS is sent directly from the server via Twilio — no app to open
        if (data.smsSent) {
          setDirectSent('sms');
          toast.success(`SMS sent to ${target}! They'll receive your invite link.`);
        } else {
          // Twilio not configured — fallback to sms: protocol
          const phone = cleanPhone(target);
          window.open(`sms:${phone}?body=${decodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
          setDirectSent('sms');
          toast.success('Opening SMS app as fallback...');
        }
      } else if (method === 'whatsapp') {
        const phone = cleanPhone(target).replace(/^\+/, '');
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
        setDirectSent('whatsapp');
        toast.success('Opening WhatsApp...');
      } else if (method === 'email') {
        openEmailInvite(target, inviteUrl);
        setDirectSent('email');
        toast.success('Opening Gmail with your invite...');
      }

      setTimeout(() => setDirectSent(null), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send invite');
    } finally {
      setIsSendingDirect(false);
    }
  };

  const handleIntegrationConnect = (platform: 'whatsapp' | 'instagram') => {
    setShowIntegration(platform);
  };

  const openEmailInvite = (recipient: string, inviteUrl: string) => {
    const subject = 'Join my secure chat';
    const body = `Hi,\n\nUse this invite link to join my secure chat:\n${inviteUrl}\n\nSee you there.`;
    
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipient
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Try to open Gmail in new tab
    const gmailWindow = window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer');
    
    // If popup was blocked or failed, fallback to mailto:
    if (!gmailWindow || gmailWindow.closed || typeof gmailWindow.closed === 'undefined') {
      window.location.href = mailtoUrl;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setQuery(''); setResults([]); setShowIntegration(null); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friends</DialogTitle>
          <DialogDescription>
            Search by name, or type a phone number / email to send an invite directly.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, phone number, or email..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDirectSent(null); }}
              onKeyDown={handleKeyDown}
              className="pl-9"
              autoFocus
            />
          </div>
          {!detectedPhone && !detectedEmail && (
            <Button onClick={handleSearch} disabled={isSearching} size="icon" className="shrink-0">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* ===== PHONE NUMBER DETECTED ===== */}
        {detectedPhone && (
          <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Phone className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Phone number detected</p>
                <p className="text-xs text-muted-foreground font-mono">{trimmedQuery}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleDirectSend('sms')}
                disabled={isSendingDirect}
                className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
              >
                {isSendingDirect && directSent !== 'sms' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : directSent === 'sms' ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send via SMS
              </Button>
              <Button
                onClick={() => handleDirectSend('whatsapp')}
                disabled={isSendingDirect}
                className="flex-1 h-10 bg-[#25D366] hover:bg-[#20bd5a] text-white"
              >
                {isSendingDirect && directSent !== 'whatsapp' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : directSent === 'whatsapp' ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <WhatsAppIcon className="h-4 w-4 mr-2" />
                )}
                WhatsApp
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              A single-use invite link will be created and sent instantly
            </p>
          </div>
        )}

        {/* ===== EMAIL DETECTED ===== */}
        {detectedEmail && (
          <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-violet-500/15 flex items-center justify-center">
                <Mail className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Email address detected</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{trimmedQuery}</p>
              </div>
            </div>
            <Button
              onClick={() => handleDirectSend('email')}
              disabled={isSendingDirect}
              className="w-full h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
            >
              {isSendingDirect ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : directSent === 'email' ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {directSent === 'email' ? 'Invite Sent!' : 'Send Invite via Email'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Opens your email app with a pre-written invite message
            </p>
          </div>
        )}

        {/* ===== SEARCH ALSO BUTTON (when phone/email detected) ===== */}
        {(detectedPhone || detectedEmail) && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
            Also search existing users
          </Button>
        )}

        <Separator />

        {/* ===== CONNECT PLATFORMS ===== */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invite from your contacts</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12 flex-col gap-1 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]/50 transition-all"
              onClick={() => handleIntegrationConnect('whatsapp')}
            >
              <WhatsAppIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-col gap-1 text-[#E4405F] border-[#E4405F]/30 hover:bg-[#E4405F]/10 hover:border-[#E4405F]/50 transition-all"
              onClick={() => handleIntegrationConnect('instagram')}
            >
              <InstagramIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium">Instagram</span>
            </Button>
          </div>
        </div>

        {/* ===== INTEGRATION PETITION / CONNECT PANEL ===== */}
        {showIntegration && (
          <div className="rounded-xl border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center",
                showIntegration === 'whatsapp' ? 'bg-[#25D366]/15' : 'bg-[#E4405F]/15'
              )}>
                {showIntegration === 'whatsapp' ? (
                  <WhatsAppIcon className="h-6 w-6 text-[#25D366]" />
                ) : (
                  <InstagramIcon className="h-6 w-6 text-[#E4405F]" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  Connect {showIntegration === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Send invites to your {showIntegration === 'whatsapp' ? 'WhatsApp' : 'Instagram'} contacts
                </p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {showIntegration === 'whatsapp' ? (
                  <>WhatsApp will open with a pre-written invite message. Select a contact or group and send it.</>
                ) : (
                  <>Your invite link will be copied and Instagram will open. Paste the link in any DM to invite friends.</>
                )}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Smartphone className="h-3 w-3" />
                <span>Works best on mobile</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowIntegration(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={cn(
                  "flex-1 text-white",
                  showIntegration === 'whatsapp'
                    ? 'bg-[#25D366] hover:bg-[#20bd5a]'
                    : 'bg-gradient-to-r from-[#E4405F] to-[#FCAF45] hover:from-[#d63a56] hover:to-[#e99e3e]'
                )}
                onClick={async () => {
                  try {
                    const { data } = await api.post('/invite/send-direct', {
                      target: showIntegration,
                      method: showIntegration,
                    });
                    const code = data.link.code;
                    const inviteUrl = buildInviteUrl(code);
                    const text = encodeURIComponent(
                      `Hey! Join my secure chat using this invite link: ${inviteUrl}`
                    );
                    if (showIntegration === 'whatsapp') {
                      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
                    } else {
                      await navigator.clipboard.writeText(
                        `Hey! Join my secure chat using this invite link: ${inviteUrl}`
                      );
                      window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer');
                      toast.success('Invite link copied! Paste it in any Instagram DM.');
                    }
                    setShowIntegration(null);
                  } catch {
                    toast.error('Failed to create invite link');
                  }
                }}
              >
                {showIntegration === 'whatsapp' ? (
                  <><WhatsAppIcon className="h-4 w-4 mr-1.5" /> Open WhatsApp</>
                ) : (
                  <><InstagramIcon className="h-4 w-4 mr-1.5" /> Open Instagram</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ===== SEARCH RESULTS ===== */}
        <ScrollArea className="max-h-52">
          {results.length === 0 && query && !isSearching && !detectedPhone && !detectedEmail && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No users found. Try a phone number or email to send an invite!
            </p>
          )}
          <div className="space-y-2">
            {results.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold text-sm">
                    {u.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.phoneNumber && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {u.phoneNumber}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendRequest(u._id)}
                  disabled={sendingTo === u._id}
                >
                  {sendingTo === u._id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3 mr-1" />
                  )}
                  Add
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
