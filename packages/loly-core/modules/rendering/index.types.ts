export interface InitialData {
  pathname: string;
  params: Record<string, string>;
  props: any;
  metadata: any;
  className: string;
  notFound?: boolean;
  error?: boolean;
}

export interface RouterData {
  pathname: string;
  params: Record<string, string>;
  searchParams: Record<string, unknown>;
}