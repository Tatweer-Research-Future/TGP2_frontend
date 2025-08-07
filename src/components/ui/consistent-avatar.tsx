import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getConsistentAvatar, getInitials } from "@/lib/avatar-utils";
import { useState, useEffect } from "react";

interface ConsistentAvatarProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  className?: string;
  fallbackClassName?: string;
}

export function ConsistentAvatar({
  user,
  className,
  fallbackClassName,
}: ConsistentAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Use user-provided avatar if available, otherwise assign one based on user's identifier
  useEffect(() => {
    if (user.avatar && !user.avatar.endsWith("/avatars/shadcn.jpg")) {
      // Use provided avatar if it's a custom one
      setAvatarUrl(user.avatar);
    } else {
      // Use email as the identifier for consistency (or name if email isn't available)
      const identifier = user.email || user.name;
      // Get consistent avatar based on user identifier
      setAvatarUrl(getConsistentAvatar(identifier));
    }
  }, [user.avatar, user.email, user.name]);

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl} alt={user.name} />
      <AvatarFallback className={fallbackClassName}>
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
