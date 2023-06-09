import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";
import { initializeKeypair } from "./initializeKeypair";
import * as fs from "fs";
import {
    bundlrStorage,
    keypairIdentity,
    Metaplex,
    toMetaplexFile,
} from "@metaplex-foundation/js";

import {
    DataV2,
    createCreateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

const TOKEN_NAME = "BUILD";
const TOKEN_SYMBOL = "BLD";
const TOKEN_DESCRIPTION = "A token for buildoors";
const TOKEN_IMAGE_NAME = "BuildoorCoin512.png"; // Replace unicorn.png with your image name
const TOKEN_IMAGE_PATH = `tokens/bld/assets/${TOKEN_IMAGE_NAME}`;
console.log("TOKEN_IMAGE_PATH is ", TOKEN_IMAGE_PATH);

async function createBldToken(
    connection: web3.Connection,
    payer: web3.Keypair,
    programId: web3.PublicKey
) {
    const [mintAuth] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint")],
        programId
    )
    console.log("found program that will be mint authority")    
    // This will create a token with all the necessary inputs
    const tokenMint = await token.createMint(
        connection, // Connection
        payer, // Payer
        payer.publicKey, // Your wallet public key (mint authority)
        payer.publicKey, // Freeze authority
        2 // Decimals
    );
    console.log("created token mint")    

    // Create a metaplex object so that we can create a metaplex metadata
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(payer))
        .use(
            bundlrStorage({
                address: "https://devnet.bundlr.network",
                providerUrl: "https://api.devnet.solana.com",
                timeout: 60000,
            })
        );

    // Read image file
    const imageBuffer = fs.readFileSync(TOKEN_IMAGE_PATH);
    const file = toMetaplexFile(imageBuffer, TOKEN_IMAGE_NAME);
    const imageUri = await metaplex.storage().upload(file);

    // Upload the rest of offchain metadata
    const { uri } = await metaplex
        .nfts()
        .uploadMetadata({
            name: TOKEN_NAME,
            description: TOKEN_DESCRIPTION,
            image: imageUri,
        }, {commitment: "finalized"});
        console.log("token metadata uploaded")    

    // Finding out the address where the metadata is stored
    const metadataPda = metaplex.nfts().pdas().metadata({ mint: tokenMint });
    console.log("metadata pda found")    
    const tokenMetadata = {
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    } as DataV2

    const instruction = createCreateMetadataAccountV2Instruction({
        metadata: metadataPda,
        mint: tokenMint,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey
    },
        {
            createMetadataAccountArgsV2: {
                data: tokenMetadata,
                isMutable: true
            }
        })

    console.log("CreateMetadataAccountV2Instruction created")
    const transaction = new web3.Transaction()
    transaction.add(instruction)

    const transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
    )
    console.log("created metadata account for token")

    await token.setAuthority(
        connection,
        payer,
        tokenMint,
        payer.publicKey,
        token.AuthorityType.MintTokens,
        mintAuth
    )    

    fs.writeFileSync(
        "tokens/bld/cache.json",
        JSON.stringify({
          mint: tokenMint.toBase58(),
          imageUri: imageUri,
          metadataUri: uri,
          tokenMetadata: metadataPda.toBase58(),
          metadataTransaction: transactionSignature,
        })
      );

}

async function main() {
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    const payer = await initializeKeypair(connection);

    // this is the program at project anchor-nft-staking
    const mintAuthority = new web3.PublicKey("9zezsu8xLYtPfAkWue3vB9NBTkFX2iMGpcetsDTnTLHy")
    await createBldToken(connection, payer, mintAuthority);    
}

main()
    .then(() => {
        console.log("Finished successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });