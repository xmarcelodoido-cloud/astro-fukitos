import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export interface NotificationData {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

interface NotificationProps {
  notification: NotificationData;
  onRemove: (id: string) => void;
  index: number;
}

export function Notification({ notification, onRemove, index }: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(notification.id), 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: isExiting ? 320 : 0, opacity: isExiting ? 0 : 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ bottom: `${20 + index * 80}px` }}
      className="fixed right-5 w-80 bg-background border border-border rounded-lg p-3 z-50"
    >
      <div className="relative h-full">
        <p className="text-sm text-foreground break-words pr-2">{notification.message}</p>
        <div className="absolute -bottom-1 left-0 right-0 h-1 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-brand progress-bar-animate" />
        </div>
      </div>
    </motion.div>
  );
}

interface NotificationContainerProps {
  notifications: NotificationData[];
  onRemove: (id: string) => void;
}

export function NotificationContainer({ notifications, onRemove }: NotificationContainerProps) {
  return (
    <AnimatePresence>
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
          index={index}
        />
      ))}
    </AnimatePresence>
  );
}
