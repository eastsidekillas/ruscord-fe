export interface Friend {
  id: number;
  requester: {
    id: number;
    username: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    bio: string;
    created_at: string;
  };
  receiver: {
    id: number;
    username: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    bio: string;
    created_at: string;
  };
  status: string;
  created_at: string;
}
