import React from 'react';
import { 
  Badge, 
  Button, 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem 
} from "@heroui/react";
import { Bell, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ notifications = [], user }) {
  const count = notifications.length;
  const navigate = useNavigate();

  const handleAction = (eventId) => {
    if (eventId !== "header" && eventId !== "no-notif") {
      navigate(`/events/${eventId}`);
    }
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button isIconOnly variant="light" radius="full">
          <Badge color="danger" content={count} isInvisible={count === 0} shape="circle">
            <Bell size={24} className="text-white" />
          </Badge>
        </Button>
      </DropdownTrigger>
      
      <DropdownMenu 
        aria-label="Notifications" 
        className="w-80"
        onAction={handleAction}
      >
        <DropdownItem key="header" isReadOnly className="opacity-100 font-bold border-b">
          Notifications ({count})
        </DropdownItem>
        
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <DropdownItem 
              key={notif.eventId} 
              description={new Date(notif.date).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}
              startContent={<Calendar className="text-primary" size={18} />}
            >
              <span className="font-semibold">Nouveau booking : {notif.title}</span>
            </DropdownItem>
          ))
        ) : (
          <DropdownItem key="no-notif" isReadOnly>
            Aucune nouvelle notification
          </DropdownItem>
        )}
      </DropdownMenu>
    </Dropdown>
  );
}