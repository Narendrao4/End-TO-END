'use client';

import { MessageSquare, Lock, Target } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Target className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-semibold">EndToEnd</h2>
        </div>
        <p className="text-muted-foreground max-w-md">
          Select a conversation from the sidebar or start a new chat with a
          friend. All messages are end-to-end encrypted.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
