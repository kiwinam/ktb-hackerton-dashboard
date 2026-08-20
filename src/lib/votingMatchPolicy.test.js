import test from 'node:test';
import assert from 'node:assert/strict';
import {
	calculateOptimalMatchPolicy,
	getConfiguredMatchesPerVoter,
	getInitialEloForGeneration,
	getKFactorForGeneration,
	getPairCount
} from './votingMatchPolicy.js';

test('8개 본선팀, 120명 투표자, 본선팀 소속 48명이면 13판을 권장한다', () => {
	const result = calculateOptimalMatchPolicy({
		voterCount: 120,
		finalistMemberCount: 48,
		teamCount: 8
	});

	assert.equal(result.isValid, true);
	assert.equal(result.pairCount, 28);
	assert.equal(result.eligibleVotersPerPair, 108);
	assert.equal(result.sampleSizePerPair, 52);
	assert.equal(result.targetTotalMatches, 1456);
	assert.equal(result.matchesPerVoter, 13);
});

test('8개 본선팀에 투표자 120명이 모두 소속되면 11판을 권장한다', () => {
	const result = calculateOptimalMatchPolicy({
		voterCount: 120,
		finalistMemberCount: 120,
		teamCount: 8
	});

	assert.equal(result.isValid, true);
	assert.equal(result.eligibleVotersPerPair, 90);
	assert.equal(result.sampleSizePerPair, 47);
	assert.equal(result.matchesPerVoter, 11);
});

test('2개 팀일 때 본선팀 소속 학생은 제외하고 비본선 학생에게 한 쌍을 배정한다', () => {
	const result = calculateOptimalMatchPolicy({
		voterCount: 120,
		finalistMemberCount: 12,
		teamCount: 2
	});

	assert.equal(result.isValid, true);
	assert.equal(result.pairCount, 1);
	assert.equal(result.matchesPerVoter, 1);
});

test('입력값과 기존 설정의 경계를 검증한다', () => {
	assert.equal(getPairCount(1), 0);
	assert.equal(calculateOptimalMatchPolicy({ voterCount: 0, finalistMemberCount: 0, teamCount: 8 }).isValid, false);
	assert.equal(calculateOptimalMatchPolicy({ voterCount: 10, finalistMemberCount: 11, teamCount: 8 }).isValid, false);
	assert.equal(getConfiguredMatchesPerVoter({}, 4), 40);
	assert.equal(getConfiguredMatchesPerVoter({ matchPolicyByGeneration: { 4: { resolvedMatchesPerVoter: 13 } } }, 4), 13);
	assert.equal(getInitialEloForGeneration({}, 4), 1500);
	assert.equal(getKFactorForGeneration({ matchPolicyByGeneration: { 4: { initialElo: 1200, kFactor: 24 } } }, 4), 24);
});
