import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

export interface AnimePersonalizado {
  nombre_clave: string;
  nombre_display: string;
}

export interface ConsultaAnimePersonalizado {
  nombre_clave: string;
  nombre_display: string;
  emoji?: string;
  color?: string;
  data: any;
}

interface ContextoType {
  usuarioLogueado: string | null;
  setUsuarioLogueado: Dispatch<SetStateAction<string | null>>;

  dataSeiya: any;
  setDataSeiya: Dispatch<SetStateAction<any>>;

  dataHunter: any;
  setDataHunter: Dispatch<SetStateAction<any>>;

  dataOnePiece: any;
  setDataOnePiece: Dispatch<SetStateAction<any>>;

  animesPersonalizados: AnimePersonalizado[];
  setAnimesPersonalizados: Dispatch<SetStateAction<AnimePersonalizado[]>>;

  consultasPersonalizadas: ConsultaAnimePersonalizado[];
  setConsultasPersonalizadas: Dispatch<SetStateAction<ConsultaAnimePersonalizado[]>>;
}

export const ContextoConstante = createContext<ContextoType>({} as ContextoType);

export function ContextoProvider({ children }: { children: ReactNode }) {
  const [usuarioLogueado, setUsuarioLogueado] = useState<string | null>(null);

  const [dataSeiya, setDataSeiya] = useState<any>(null);
  const [dataHunter, setDataHunter] = useState<any>(null);
  const [dataOnePiece, setDataOnePiece] = useState<any>(null);

  const [animesPersonalizados, setAnimesPersonalizados] = useState<AnimePersonalizado[]>([]);
  const [consultasPersonalizadas, setConsultasPersonalizadas] = useState<ConsultaAnimePersonalizado[]>([]);

  return (
    <ContextoConstante.Provider
      value={{
        usuarioLogueado,
        setUsuarioLogueado,
        dataSeiya,
        setDataSeiya,
        dataHunter,
        setDataHunter,
        dataOnePiece,
        setDataOnePiece,
        animesPersonalizados,
        setAnimesPersonalizados,
        consultasPersonalizadas,
        setConsultasPersonalizadas,
      }}
    >
      {children}
    </ContextoConstante.Provider>
  );
}