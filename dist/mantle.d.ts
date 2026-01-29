export declare function installMantle(): Promise<void>;
export declare function getMantleStateFilePath(configPath: string): string;
export declare function restoreMantleState(configPath: string, mantleState: string | undefined): void;
export declare function saveMantleState(configPath: string): string | undefined;
export interface MantleDeployOptions {
    config: string;
    environment: string;
    access: 'public' | 'private';
    dynamicDescription: boolean;
    branch: string;
    roblosecurity: string;
    openCloudApiKey?: string;
}
export declare function deployWithMantle(options: MantleDeployOptions): Promise<void>;
