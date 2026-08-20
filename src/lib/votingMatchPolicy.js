export const DEFAULT_MATCH_POLICY = Object.freeze({
	mode: 'auto',
	voterCount: 120,
	finalistMemberCount: 48,
	manualMatchesPerVoter: 13,
	initialElo: 1500,
	kFactor: 32
});

export const MATCH_POLICY_FORMULA_VERSION = 'pairwise-fpc-v1';
export const MATCH_POLICY_CONFIDENCE_LEVEL = 0.95;
export const MATCH_POLICY_MARGIN_OF_ERROR = 0.10;

const Z_SCORE_95 = 1.96;
const WORST_CASE_PROPORTION = 0.5;

export const getPairCount = (teamCount) => {
	const teams = Number(teamCount);
	return Number.isInteger(teams) && teams >= 2 ? (teams * (teams - 1)) / 2 : 0;
};

const getFinalistVoterPairCapacity = (teamCount) => getPairCount(Number(teamCount) - 1);

export const calculateOptimalMatchPolicy = ({
	voterCount,
	finalistMemberCount,
	teamCount
}) => {
	const voters = Number(voterCount);
	const finalistMembers = Number(finalistMemberCount);
	const teams = Number(teamCount);

	if (!Number.isInteger(voters) || voters <= 0) {
		return { isValid: false, error: '투표 참여 인원은 1명 이상의 정수로 입력해주세요.' };
	}
	if (!Number.isInteger(finalistMembers) || finalistMembers < 0) {
		return { isValid: false, error: '본선 진출팀 소속 인원은 0명 이상의 정수로 입력해주세요.' };
	}
	if (finalistMembers > voters) {
		return { isValid: false, error: '본선 진출팀 소속 인원은 전체 투표 참여 인원보다 많을 수 없습니다.' };
	}
	if (!Number.isInteger(teams) || teams < 2) {
		return { isValid: false, error: '투표 대상 팀을 2팀 이상 선택해주세요.' };
	}

	const pairCount = getPairCount(teams);
	const averageMembersPerFinalistTeam = finalistMembers / teams;
	const eligibleVotersPerPair = Math.max(1, voters - (averageMembersPerFinalistTeam * 2));
	const variance = WORST_CASE_PROPORTION * (1 - WORST_CASE_PROPORTION);
	const zSquaredVariance = (Z_SCORE_95 ** 2) * variance;
	const sampleSizePerPair = Math.min(
		Math.ceil(eligibleVotersPerPair),
		Math.ceil(
			(eligibleVotersPerPair * zSquaredVariance)
			/ ((MATCH_POLICY_MARGIN_OF_ERROR ** 2) * (eligibleVotersPerPair - 1) + zSquaredVariance)
		)
	);
	const targetTotalMatches = pairCount * sampleSizePerPair;
	const finalistPairCapacity = getFinalistVoterPairCapacity(teams);

	let matchesPerVoter = pairCount;
	for (let candidate = 1; candidate <= pairCount; candidate += 1) {
		const expectedMatches =
			finalistMembers * Math.min(candidate, finalistPairCapacity)
			+ (voters - finalistMembers) * candidate;
		if (expectedMatches >= targetTotalMatches) {
			matchesPerVoter = candidate;
			break;
		}
	}

	const expectedTotalMatches =
		finalistMembers * Math.min(matchesPerVoter, finalistPairCapacity)
		+ (voters - finalistMembers) * matchesPerVoter;

	return {
		isValid: true,
		formulaVersion: MATCH_POLICY_FORMULA_VERSION,
		confidenceLevel: MATCH_POLICY_CONFIDENCE_LEVEL,
		marginOfError: MATCH_POLICY_MARGIN_OF_ERROR,
		voterCount: voters,
		finalistMemberCount: finalistMembers,
		teamCount: teams,
		pairCount,
		averageMembersPerFinalistTeam,
		eligibleVotersPerPair,
		sampleSizePerPair,
		targetTotalMatches,
		expectedTotalMatches,
		matchesPerVoter,
		maxMatchesPerVoter: pairCount
	};
};

export const getMatchPoliciesByGeneration = (settings) => {
	const policies = settings?.matchPolicyByGeneration;
	return policies && typeof policies === 'object' && !Array.isArray(policies) ? policies : {};
};

export const getMatchPolicyForGeneration = (settings, generation) => {
	const savedPolicy = getMatchPoliciesByGeneration(settings)[String(Number(generation))];
	return {
		...DEFAULT_MATCH_POLICY,
		...(savedPolicy && typeof savedPolicy === 'object' && !Array.isArray(savedPolicy) ? savedPolicy : {})
	};
};

export const getConfiguredMatchesPerVoter = (settings, generation, legacyDefault = 40) => {
	const savedPolicy = getMatchPoliciesByGeneration(settings)[String(Number(generation))];
	const configuredMatches = Number(savedPolicy?.resolvedMatchesPerVoter);
	return Number.isInteger(configuredMatches) && configuredMatches > 0
		? configuredMatches
		: legacyDefault;
};

export const getInitialEloForGeneration = (settings, generation, legacyDefault = 1500) => {
	const initialElo = Number(getMatchPoliciesByGeneration(settings)[String(Number(generation))]?.initialElo);
	return Number.isInteger(initialElo) && initialElo > 0 ? initialElo : legacyDefault;
};

export const getKFactorForGeneration = (settings, generation, legacyDefault = 32) => {
	const kFactor = Number(getMatchPoliciesByGeneration(settings)[String(Number(generation))]?.kFactor);
	return Number.isInteger(kFactor) && kFactor > 0 ? kFactor : legacyDefault;
};
