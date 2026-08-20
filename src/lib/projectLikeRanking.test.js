import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectLikeRanking } from './projectLikeRanking.js';

test('선택 기수 프로젝트를 좋아요 수 내림차순으로 정렬한다', () => {
	const ranking = buildProjectLikeRanking([
		{ generation: 4, title: '나무', team: '2조', likes: 3 },
		{ generation: 4, title: '가방', team: '1조', likes: 10 },
		{ generation: 3, title: '이전 기수', likes: 99 },
		{ generation: 4, title: '다람쥐', likes: null }
	], 4);

	assert.deepEqual(ranking, [
		{ "순위": 1, "프로젝트명": '가방', "팀/조": '1조', "좋아요 수": 10 },
		{ "순위": 2, "프로젝트명": '나무', "팀/조": '2조', "좋아요 수": 3 },
		{ "순위": 3, "프로젝트명": '다람쥐', "팀/조": '조 정보 없음', "좋아요 수": 0 }
	]);
});

test('좋아요 동률은 프로젝트명 순으로 정렬한다', () => {
	const ranking = buildProjectLikeRanking([
		{ generation: 4, title: '하늘', likes: 5 },
		{ generation: 4, title: '바다', likes: 5 }
	], 4);

	assert.deepEqual(ranking.map((project) => project["프로젝트명"]), ['바다', '하늘']);
});
