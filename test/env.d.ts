declare module 'cloudflare:workers' {
	interface ProvidedEnv extends Env {}
}

declare module '*.sql?raw' {
	const content: string;
	export default content;
}
