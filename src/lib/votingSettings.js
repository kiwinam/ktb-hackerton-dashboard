export const VOTING_TIME_ZONE = 'Asia/Seoul';

export const requiresExplicitVotingTargets = (generation) => Number(generation) >= 4;

export const getEligibleProjectIdSet = (settings, generation) => {
	const projectIds = settings?.eligibleProjectIdsByGeneration?.[String(Number(generation))];
	if (Array.isArray(projectIds)) return new Set(projectIds);
	return requiresExplicitVotingTargets(generation) ? new Set() : null;
};

export const hasSavedVotingTargets = (settings, generation) => (
	Array.isArray(settings?.eligibleProjectIdsByGeneration?.[String(Number(generation))])
);

export const toVotingStartDate = (value) => {
	if (!value) return null;
	if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
	if (typeof value?.toDate === 'function') return toVotingStartDate(value.toDate());
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
		const parsed = new Date(`${value}:00+09:00`);
		return Number.isFinite(parsed.getTime()) ? parsed : null;
	}
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
		const parsed = new Date(value);
		return Number.isFinite(parsed.getTime()) ? parsed : null;
	}
	return null;
};

export const parseSeoulDateTimeInput = (value) => {
	if (!value) return null;
	const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
	if (!match) return null;
	const parsed = new Date(`${match[1]}:00+09:00`);
	return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const formatDateTimeLocalInSeoul = (value) => {
	const date = toVotingStartDate(value);
	if (!date) return '';
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: VOTING_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const formatVotingStartAt = (value) => {
	const date = toVotingStartDate(value);
	if (!date) return null;
	return new Intl.DateTimeFormat('ko-KR', {
		timeZone: VOTING_TIME_ZONE,
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(date);
};

export const getVotingScheduleStatus = (settings, now = new Date()) => {
	const startAt = toVotingStartDate(settings?.startAt) || toVotingStartDate(settings?.startDate);
	const isActive = Boolean(settings?.isActive);
	const isScheduled = isActive && Boolean(startAt) && now < startAt;
	return {
		startAt,
		isActive,
		isScheduled,
		isOpen: isActive && !isScheduled
	};
};
