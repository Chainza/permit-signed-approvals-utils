import {ProviderConnector} from './provider.connector';
import type ethers from 'ethers';
import {AbiItem} from '../model/abi.model';
import type {AbiInput} from 'web3-utils';
import {EIP712TypedData} from '../model/eip712.model';

export class EthersProviderConnector implements ProviderConnector {
    constructor(
        protected readonly ethersProviderOrSigner: ethers.JsonRpcProvider | ethers.Signer,
        protected readonly abiCoder: ethers.AbiCoder,
        protected readonly EthersContract: typeof ethers.Contract
    ) {}

    contractEncodeABI(
        abi: AbiItem[],
        address: string | null,
        methodName: string,
        methodParams: unknown[]
    ): string {
        const contract = new this.EthersContract(
            address === null ? '0x' : address,
            abi,
        );

        return contract.interface.encodeFunctionData(methodName, methodParams);
    }

    signTypedData(
        walletAddress: string,
        { domain, types, message }: EIP712TypedData,
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        _typedDataHash: string
    ): Promise<string> {
        const typesWithoutDomain: Omit<typeof types, 'EIP712Domain'> = types;
        delete typesWithoutDomain.EIP712Domain;

        const signer = 'getSigner' in this.ethersProviderOrSigner
            ? this.ethersProviderOrSigner.getSigner(walletAddress)
            : Promise.resolve(this.ethersProviderOrSigner);

        return signer.then(signer => signer.signTypedData(domain, typesWithoutDomain, message))
    }

    ethCall(contractAddress: string, callData: string): Promise<string> {
        return this.ethersProviderOrSigner.call({
            to: contractAddress,
            data: callData,
        });
    }

    decodeABIParameter<T>(type: string, hex: string): T {
        return this.abiCoder.decode([type], hex).toObject() as T;
    }

    decodeABIParameters<T>(abiInputs: AbiInput[], hex: string): T {
        const types = abiInputs.map(({name, type}) => `${type} ${name}`);
        const decoded = this.abiCoder.decode(types, hex).toObject();

        for (const key in decoded) {
            const value = decoded[key];
            if (typeof value === 'bigint') {
                decoded[key] = value.toString();
            }
        }

        return decoded as T;
    }
}
