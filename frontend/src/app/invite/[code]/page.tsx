'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Check, Lock, Target } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/errorMessage';
import type { User } from '@/types';

interface InviteInfo {
  _id: string;
  creatorId: User;
  code: string;
  expiresAt: string;
  uses: number;
  isActive: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data } = await api.get(`/invite/info/${code}`);
        setInviteInfo(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Invalid or expired invite link'));
      } finally {
        setIsLoading(false);
      }
    };
    if (code) fetchInfo();
  }, [code]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Store invite code and redirect to register
      localStorage.setItem('pendingInviteCode', code);
      router.push('/register');
      return;
    }

    setIsAccepting(true);
    try {
      await api.post(`/invite/accept/${code}`);
      setAccepted(true);
      toast.success('You are now friends!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to accept invite'));
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-background to-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-background to-background">
      <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-red-500/5 bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <Target className="h-7 w-7 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-xl">Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const creator = inviteInfo?.creatorId as User;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-background to-background">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl shadow-red-500/5 bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg shadow-red-500/25">
                <Target className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {accepted ? 'You\'re Connected!' : 'Friend Invite'}
            </CardTitle>
            <CardDescription>
              {accepted
                ? 'You are now friends and can chat securely'
                : 'You\'ve been invited to connect on EndToEnd'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Inviter info */}
            <div className="flex flex-col items-center gap-3 py-4 rounded-xl bg-muted/50">
              <Avatar className="h-16 w-16 ring-4 ring-background">
                <AvatarFallback className="text-xl bg-gradient-to-br from-red-600 to-red-900 text-white font-bold">
                  {creator?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-bold text-lg">{creator?.username}</p>
                {creator?.bio && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {creator.bio}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                wants to chat with you on EndToEnd
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/50 p-2.5 text-center">
                <Lock className="h-4 w-4 mx-auto mb-1 text-red-500" />
                <p className="text-[11px] text-muted-foreground">
                  End-to-end encrypted
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-2.5 text-center">
                <Target className="h-4 w-4 mx-auto mb-1 text-red-500" />
                <p className="text-[11px] text-muted-foreground">
                  Zero knowledge
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3 pt-2">
            {accepted ? (
              <Button
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                onClick={() => router.push('/dashboard')}
              >
                <Check className="h-4 w-4 mr-2" />
                Go to Chat
              </Button>
            ) : (
              <>
                <Button
                  className="w-full h-11 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-lg shadow-red-500/25"
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isAuthenticated
                    ? 'Accept & Start Chatting'
                    : 'Sign Up & Connect'}
                </Button>
                {!isAuthenticated && (
                  <p className="text-xs text-muted-foreground text-center">
                    Already have an account?{' '}
                    <Link
                      href={`/login?invite=${code}`}
                      className="text-red-500 hover:underline font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                )}
              </>
            )}
          </CardFooter>
        </Card>
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/50">
            End-to-end encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
