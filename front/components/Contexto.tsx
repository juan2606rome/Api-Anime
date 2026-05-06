import { createContext, useState } from "react";

export const ContextoConstante = createContext<any>(null);

export function ContextoProvider({children}: any){
    const [dataSeiya, setDataSeiya] = useState(null)
    const [dataHunter, setDataHunter] = useState(null)
    const [dataOnePiece, setDataOnePiece] = useState(null)

    return (
    <ContextoConstante.Provider value={{dataSeiya,setDataSeiya,dataHunter,setDataHunter,dataOnePiece,setDataOnePiece}}>
    {children}
    </ContextoConstante.Provider>
    )
}

