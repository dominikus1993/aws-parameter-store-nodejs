import { SSM } from 'aws-sdk'

interface AwsConfiguration {
    readonly region: string
    readonly prefix: string
}

function getParameterStorePaths(env: NodeJS.ProcessEnv, prefix: string): string[] {
    return Object.entries(env)
        .map(e => e[0])
        .filter(name => name.startsWith(prefix))
        .map(name => name.slice(prefix.length + 1))
        .map(name => `/${prefix}/${name}`)
}

export interface EnvVar {
    readonly name: string;
    readonly value: string;
}

export function *getParameters(parameters: SSM.ParameterList | undefined, prefix: string,) {
    if(!!parameters) {
        for (const env of parameters) {
            // at this point env.Name is prefix/my_var or null
            // we need prefix_my_var form
            const envName = env.Name?.slice(prefix.length+1)
            if(!!envName && !!env.Value){
                const name = `${prefix}_${envName}`
                yield {name, value: env.Value}
            }
            
        }
    }
}

async function getConfiguragionFromSSM({ region, prefix, }: AwsConfiguration): Promise<EnvVar[]> {
    const client = new SSM({ apiVersion: "latest", region })
    const names = getParameterStorePaths(process.env, prefix);
    const envs = await client.getParameters({ Names: names, WithDecryption: true }).promise()
    return [...getParameters(envs.Parameters, prefix)];
}

function overrideDefaultConfiguration(envs: EnvVar[]): void {
    for (const env of envs) {
        process.env[env.name] = env.value;
    }
}

export async function loadAwsSsm(cfg: AwsConfiguration) : Promise<void> {
    const envs = await getConfiguragionFromSSM(cfg);
    overrideDefaultConfiguration(envs);
}