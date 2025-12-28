import { SectionWrapper } from "@/components/examples/SectionWrapper";

type ServerToClientPageProps = {
  title?: string;
  count?: number;
  isActive?: boolean;
  score?: number;
  user?: {
    id: number;
    name: string;
    email: string;
    profile: {
      avatar: string;
      bio: string;
      location: {
        city: string;
        country: string;
        coordinates: {
          lat: number;
          lng: number;
        };
      };
    };
    preferences: {
      theme: string;
      notifications: boolean;
      language: string;
    };
  };
  items?: Array<{
    id: number;
    name: string;
    price: number;
    inStock: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  optionalField?: null;
  matrix?: number[][];
  emptyArray?: any[];
  emptyObject?: Record<string, any>;
};

export default function Page(props: ServerToClientPageProps) {
  return (
    <div>
      <h1>Page</h1>
      <SectionWrapper {...props} />
    </div>
  );
}
