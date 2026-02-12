export const ECOSYSTEM_MODULES = [
  "Geral",
  "Amigo Flow",
  "Amigo Clinic",
  "Amigo One",
  "Amigo Pay",
  "Amigo Bot",
  "Contabilidade",
  "Telemedicina",
  "Convênio e Particular",
] as const;

export type EcosystemModule = (typeof ECOSYSTEM_MODULES)[number];
