import React, { createContext, useContext, useState } from 'react';
import { DexClient, type DexConfig } from '../dex-client';
import { EctoplasmConfig } from '../config/ectoplasm';

// Adapt EctoplasmConfig to DexConfig
const getDexConfig = (): DexConfig => {
    const network = EctoplasmConfig.getNetwork();
    
    // Config tokens map
    const tokens: DexConfig['tokens'] = {};
    for (const [symbol, tokenConfig] of Object.entries(EctoplasmConfig.tokens)) {
        // Only include tokens that have defined hashes
        if (tokenConfig.hash) {
             tokens[symbol] = {
                 packageHash: tokenConfig.packageHash || tokenConfig.hash, // Fallback if packageHash missing (native?)
                 contractHash: tokenConfig.hash,
                 decimals: tokenConfig.decimals
             };
        }
    }

    // Build launchpad config if available
    const launchpadConfig = EctoplasmConfig.launchpad.isDeployed
        ? {
            controllerHash: EctoplasmConfig.launchpad.controller,
            tokenFactoryHash: EctoplasmConfig.launchpad.tokenFactory,
        }
        : undefined;

    return {
        nodeUrl: network.rpcUrl,
        chainName: network.chainName,
        routerPackageHash: EctoplasmConfig.contracts.routerPackage,
        routerContractHash: EctoplasmConfig.contracts.router,
        factoryHash: EctoplasmConfig.contracts.factory,
        tokens,
        pairs: EctoplasmConfig.contracts.pairs,
        launchpad: launchpadConfig,
    };
};

interface DexContextType {
    dex: DexClient;
    config: DexConfig;
}

const DexContext = createContext<DexContextType | null>(null);

export const DexProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize config once
    const [config] = useState(() => getDexConfig());
    const [dex] = useState(() => new DexClient(config));

    return (
        <DexContext.Provider value={{ dex, config }}>
            {children}
        </DexContext.Provider>
    );
};

export const useDex = () => {
    const context = useContext(DexContext);
    if (!context) throw new Error("useDex must be used within DexProvider");
    return context;
};
