interface User {
  id: string;
  username: string;
}

export interface MessageChat {
  text: string;
  sender: User;
  recipient: User;
  sender_username: string;
  recipient_username: string;
  timestamp: string;
}

interface ChannelMember {
  id: string;
  username: string;
}

interface Channel {
  members: ChannelMember[];
}
