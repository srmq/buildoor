import type { NextPage } from "next"
import { PublicKey } from "@solana/web3.js"
import { useState } from "react"

interface StakeProps {
    mint: PublicKey
    imageSrc: string
  }

const Stake: NextPage<StakeProps> = ({ mint, imageSrc }) => {
    const [isStaking, setIsStaking] = useState(false)
    const [level, setLevel] = useState(1)

    Stake.getInitialProps = async ({ query }: any) => {
        const { mint, imageSrc } = query
      
        if (!mint || !imageSrc) throw { error: "no mint" }
      
        try {
          const mintPubkey = new PublicKey(mint)
          return { mint: mintPubkey, imageSrc: imageSrc }
        } catch {
          throw { error: "invalid mint" }
        }
    }    

    return(
    <div></div>
    )
}