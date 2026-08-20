export const DATA_ENVIRONMENT = import.meta.env.MODE === 'development'
	? 'development'
	: 'production';

export const IS_DEVELOPMENT_DATA = DATA_ENVIRONMENT === 'development';

const collectionPrefix = IS_DEVELOPMENT_DATA ? 'dev_' : '';

export const COLLECTIONS = Object.freeze({
	projects: `${collectionPrefix}projects`,
	projectSecrets: `${collectionPrefix}project_secrets`,
	commentSecrets: `${collectionPrefix}comment_secrets`,
	rateLimits: `${collectionPrefix}rate_limits`,
	settings: `${collectionPrefix}settings`,
	students: `${collectionPrefix}students`,
	votes: `${collectionPrefix}votes`,
	matchups: `${collectionPrefix}matchups`,
	generations: `${collectionPrefix}generations`
});

export const getStoragePath = (path) => (
	IS_DEVELOPMENT_DATA ? `dev/${path}` : path
);

export const getBrowserStorageKey = (key) => (
	IS_DEVELOPMENT_DATA ? `dev_${key}` : key
);

if (typeof window !== 'undefined') {
	console.info(`[KTB Gallery] Firebase data environment: ${DATA_ENVIRONMENT}`);
}
