import test from 'node:test';
import assert from 'node:assert/strict';
import { isStudentActive, normalizeStudentInput } from './studentManagement.js';

test('학생 입력값을 정규화한다', () => {
	assert.deepEqual(normalizeStudentInput({
		name: '  charlie.park(박천명) ',
		kor_name: ' 박천명 ',
		course: '풀스택',
		birthdate: '00-01-17',
		generation: '4',
		status: 'active'
	}), {
		name: 'charlie.park(박천명)',
		kor_name: '박천명',
		course: '풀스택',
		birthdate: '000117',
		generation: 4,
		status: 'active'
	});
});

test('잘못된 학생 입력값을 거부한다', () => {
	assert.throws(() => normalizeStudentInput({
		name: '홍길동', kor_name: '홍길동', course: '기타', birthdate: '000117', generation: 4
	}), /과정/);
	assert.throws(() => normalizeStudentInput({
		name: '홍길동', kor_name: '홍길동', course: '풀스택', birthdate: '0001', generation: 4
	}), /생년월일/);
});

test('기존 학생은 status가 없어도 활성으로 처리한다', () => {
	assert.equal(isStudentActive({}), true);
	assert.equal(isStudentActive({ status: 'inactive' }), false);
});
