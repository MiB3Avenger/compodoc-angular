import { Command } from 'commander';

import { InternalConfiguration } from './internal-configuration';

// @ts-ignore
export interface CLIProgram extends InternalConfiguration, Command {
    option(
        flags: string,
        description?: string,
        fn?: ((arg1: any, arg2: any) => void) | RegExp,
        defaultValue?: any
    );
    option(flags: string, description?: string, defaultValue?: any);
}
