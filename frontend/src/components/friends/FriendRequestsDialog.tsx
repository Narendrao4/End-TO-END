'use client';

import { useEffect, useState } from 'react';
import { useFriendStore } from '@/store/friendStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Check, X, Loader2, Inbox, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorMessage';
import type { User } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendRequestsDialog({ open, onOpenChange }: Props) {
  const {
    incomingRequests,
    outgoingRequests,
    fetchIncomingRequests,
    fetchOutgoingRequests,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useFriendStore();

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchIncomingRequests();
      fetchOutgoingRequests();
    }
  }, [open, fetchIncomingRequests, fetchOutgoingRequests]);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await acceptRequest(requestId);
      toast.success('Friend request accepted!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectRequest(requestId);
      toast.success('Request rejected');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await cancelRequest(requestId);
      toast.success('Request cancelled');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Friend Requests</DialogTitle>
          <DialogDescription>
            Manage your incoming and outgoing friend requests.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          {/* Incoming */}
          <div className="mb-4">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Inbox className="h-4 w-4" />
              Incoming ({incomingRequests.length})
            </h4>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">
                No pending requests
              </p>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => {
                  const sender = req.senderId as User;
                  return (
                    <div
                      key={req._id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-accent/30"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {sender.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {sender.username}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7"
                        onClick={() => handleAccept(req._id)}
                        disabled={processingId === req._id}
                      >
                        {processingId === req._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => handleReject(req._id)}
                        disabled={processingId === req._id}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Outgoing */}
          <div className="mt-4">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <SendHorizontal className="h-4 w-4" />
              Outgoing ({outgoingRequests.length})
            </h4>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">
                No outgoing requests
              </p>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((req) => {
                  const receiver = req.receiverId as User;
                  return (
                    <div
                      key={req._id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-accent/30"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {receiver.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {receiver.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pending
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => handleCancel(req._id)}
                        disabled={processingId === req._id}
                      >
                        {processingId === req._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>Cancel</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
