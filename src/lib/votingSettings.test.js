import test from 'node:test';
import assert from 'node:assert/strict';
import {
	getEligibleProjectIdSet,
	getVotingScheduleStatus,
	parseSeoulDateTimeInput,
	requiresExplicitVotingTargets,
	toVotingStartDate
} from './votingSettings.js';

test('3기는 기존 전체 팀 투표를 유지하고 4기부터는 저장된 대상을 요구한다', () => {
	assert.equal(requiresExplicitVotingTargets(3), false);
	assert.equal(getEligibleProjectIdSet({}, 3), null);

	assert.equal(requiresExplicitVotingTargets(4), true);
	assert.deepEqual([...getEligibleProjectIdSet({}, 4)], []);
	assert.deepEqual(
		[...getEligibleProjectIdSet({ eligibleProjectIdsByGeneration: { 4: ['team-a', 'team-b'] } }, 4)],
		['team-a', 'team-b']
	);
});

test('한국 시간 예약은 시작 시각 전에는 닫히고, 시각이 지나면 자동으로 열린다', () => {
	const startAt = parseSeoulDateTimeInput('2026-08-20T18:30');
	assert.equal(startAt.toISOString(), '2026-08-20T09:30:00.000Z');

	const settings = { isActive: true, startAt };
	assert.equal(getVotingScheduleStatus(settings, new Date('2026-08-20T09:29:59.000Z')).isOpen, false);
	assert.equal(getVotingScheduleStatus(settings, new Date('2026-08-20T09:30:00.000Z')).isOpen, true);
	assert.equal(getVotingScheduleStatus({ ...settings, isActive: false }, new Date('2026-08-20T10:00:00.000Z')).isOpen, false);
});

test('기존 자유 형식 안내 문구는 예약 시간으로 해석하지 않는다', () => {
	assert.equal(toVotingStartDate('8월 20일 오후 6시'), null);
});
