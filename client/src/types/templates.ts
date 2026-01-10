export type TemplateCatalogItem = {
  id?: string;
  name: string;
  language?: string;
  description?: string;
  category?: string;
  bodyParams?: number;
  components?: Array<Record<string, any>>;
};
